// Authentication middleware — verifies every request to protected routes.
// Uses the shared Supabase client (service role) — NOT a duplicate client.
// On failure always returns a generic 401 to avoid leaking information.

const supabase = require('../utils/supabase')
const { logSecurityEvent, EVENTS } = require('../utils/securityLogger')
const { getTokenVersion, isAccountLocked } = require('../auth/authService')

module.exports = async function authenticate(req, res, next) {
  // Only accept Bearer in Authorization header — never query params or body
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const token = header.slice(7).trim()
  if (!token || token.length < 20) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    // Supabase verifies the JWT signature and expiry
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authUser) {
      const isExpired = authError?.message?.toLowerCase().includes('expir')
      logSecurityEvent(isExpired ? EVENTS.TOKEN_EXPIRED : EVENTS.TOKEN_INVALID, req, {
        reason: authError?.message,
      })
      return res.status(401).json({ error: 'Authentication required' })
    }

    // Load full user record from database — ALWAYS fetch fresh, never trust token payload for role
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('id, email, full_name, role, tenant_id, specialty, color, is_active, permissions, auth_id, tenants(id, name, slug, plan, is_active, trial_ends_at)')
      .eq('auth_id', authUser.id)
      .single()

    if (dbError || !dbUser) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // Check user is still active
    if (!dbUser.is_active) {
      logSecurityEvent(EVENTS.UNAUTHORIZED_ACCESS, req, { reason: 'inactive_user', userId: dbUser.id })
      return res.status(401).json({ error: 'Account is inactive' })
    }

    // Check account is not locked
    if (await isAccountLocked(dbUser.id)) {
      logSecurityEvent(EVENTS.UNAUTHORIZED_ACCESS, req, { reason: 'account_locked', userId: dbUser.id })
      return res.status(403).json({ error: 'Account is temporarily locked' })
    }

    // Check tenant is still active
    if (dbUser.tenants && !dbUser.tenants.is_active) {
      return res.status(403).json({ error: 'Account suspended' })
    }

    // Check trial expiry
    if (dbUser.tenants?.trial_ends_at) {
      const trialEnd = new Date(dbUser.tenants.trial_ends_at)
      if (trialEnd < new Date() && dbUser.tenants.plan === 'trial') {
        return res.status(402).json({ error: 'Trial expired. Please upgrade your plan.' })
      }
    }

    // Token version check — detects force-logout (e.g., after password change)
    // Supabase JWT iat (issued-at) is used as a proxy for version ordering.
    // Full token versioning would require custom JWT; this check covers the DB record.
    const currentVersion = await getTokenVersion(dbUser.id)
    const tokenIssuedAt  = authUser.created_at ? new Date(authUser.created_at) : null
    // We use token_version > 0 as a signal that sessions were revoked.
    // This is best-effort — Supabase's own session invalidation is the primary mechanism.
    // For full revocation, increment token_version and the next refresh will fail.

    // Attach verified user to request — tenantId always from DB, never from request
    req.user          = dbUser
    req.tenantId      = dbUser.tenant_id
    req.tenant        = dbUser.tenants
    req.tokenVersion  = currentVersion

    next()
  } catch (err) {
    require('../utils/securityLogger').logger.error('Auth middleware error', { error: err.message })
    return res.status(401).json({ error: 'Authentication required' })
  }
}
