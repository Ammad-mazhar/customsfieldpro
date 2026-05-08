const router   = require('express').Router()
const supabase = require('../utils/supabase')
const authenticate = require('../middleware/auth')
const { authLimiter, resetLimiter, registerLimiter } = require('../middleware/rateLimiter')
const {
  validateLogin, validateRegister, validateChangePassword,
  validateForgotPassword, checkValidation,
} = require('../middleware/validate')
const { logSecurityEvent, EVENTS } = require('../utils/securityLogger')
const {
  isAccountLocked, getLockoutInfo, recordFailedAttempt, clearFailedAttempts,
  storeRefreshToken, verifyAndRotateRefreshToken, revokeAllUserSessions, revokeSession,
} = require('../auth/authService')
const { body } = require('express-validator')

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown'
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge:   7 * 24 * 60 * 60 * 1000,
  path:     '/api/auth',
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', registerLimiter, validateRegister, async (req, res) => {
  const { businessName, email, password, phone } = req.body
  try {
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (authErr) {
      // Do not reveal whether email already exists
      return res.status(400).json({ error: 'Registration failed. Check your details and try again.' })
    }

    const slug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
    const { data: tenant, error: tErr } = await supabase
      .from('tenants')
      .insert({
        name: businessName,
        slug: `${slug}-${Date.now()}`,
        email,
        phone,
        plan: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select().single()
    if (tErr) return res.status(400).json({ error: 'Could not create business account.' })

    const { data: user, error: uErr } = await supabase
      .from('users')
      .insert({
        tenant_id: tenant.id,
        auth_id:   authData.user.id,
        email,
        full_name: businessName,
        role:      'admin',
        phone,
      })
      .select('id, email, role').single()
    if (uErr) return res.status(400).json({ error: 'Could not create user profile.' })

    logSecurityEvent(EVENTS.REGISTER, req, { userId: user.id, tenantId: tenant.id })
    res.status(201).json({ tenant, user })
  } catch {
    res.status(500).json({ error: 'Registration failed' })
  }
})

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', authLimiter, validateLogin, async (req, res) => {
  const { email, password } = req.body
  const ip        = getClientIp(req)
  const userAgent = req.headers['user-agent'] || 'unknown'

  try {
    // Find user in DB first to check lockout (don't hit Supabase if locked)
    const { data: preCheck } = await supabase
      .from('users')
      .select('id, is_active')
      .eq('email', email)
      .single()

    if (preCheck?.id) {
      const locked = await isAccountLocked(preCheck.id)
      if (locked) {
        const info = await getLockoutInfo(preCheck.id)
        return res.status(423).json({
          error: `Account locked. Try again in ${info?.minutesRemaining ?? '?'} minute(s).`,
        })
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data?.session) {
      // Record failed attempt for lockout tracking
      if (preCheck?.id) {
        await recordFailedAttempt(preCheck.id, req)
      }
      logSecurityEvent(EVENTS.LOGIN_FAILED, req, { email: email.toLowerCase(), reason: 'invalid_credentials' })
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const { data: profile, error: pErr } = await supabase
      .from('users')
      .select('id, email, full_name, role, specialty, color, is_active, permissions, tenant_id, tenants(id, name, slug, plan, trial_ends_at, logo_url, currency, tax_rate, is_active)')
      .eq('auth_id', data.user.id)
      .single()

    if (pErr || !profile) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    if (!profile.is_active) {
      logSecurityEvent(EVENTS.UNAUTHORIZED_ACCESS, req, { reason: 'inactive_user', userId: profile.id })
      return res.status(401).json({ error: 'Account is inactive' })
    }

    // Clear failed attempts on success
    await clearFailedAttempts(profile.id)

    // Store refresh token hash in DB
    await storeRefreshToken(profile.id, data.session.refresh_token, userAgent, ip)

    logSecurityEvent(EVENTS.LOGIN_SUCCESS, req, { userId: profile.id, tenantId: profile.tenant_id })

    // Refresh token in httpOnly cookie — inaccessible to JavaScript
    res.cookie('refresh_token', data.session.refresh_token, COOKIE_OPTS)

    // Access token in response body — store in memory, NOT localStorage
    res.json({
      access_token: data.session.access_token,
      user:         profile,
    })
  } catch {
    res.status(500).json({ error: 'Login failed' })
  }
})

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  try {
    const rawToken = req.cookies?.refresh_token
    if (rawToken) await revokeSession(rawToken)

    const accessToken = req.headers.authorization?.slice(7)
    if (accessToken) await supabase.auth.admin.signOut(accessToken).catch(() => {})

    logSecurityEvent(EVENTS.LOGOUT, req, { userId: req.user.id })
    res.clearCookie('refresh_token', { path: '/api/auth' })
    res.json({ message: 'Logged out' })
  } catch {
    res.clearCookie('refresh_token', { path: '/api/auth' })
    res.json({ message: 'Logged out' })
  }
})

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const rawToken = req.cookies?.refresh_token
  if (!rawToken) return res.status(401).json({ error: 'No refresh token' })

  try {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: rawToken })
    if (error || !data?.session) {
      res.clearCookie('refresh_token', { path: '/api/auth' })
      return res.status(401).json({ error: 'Session expired. Please log in again.' })
    }

    // Find user to verify token in our DB
    const { data: authUser } = await supabase.auth.getUser(data.session.access_token)
    const { data: profile } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_id', authUser?.user?.id)
      .single()

    if (profile) {
      const valid = await verifyAndRotateRefreshToken(rawToken, profile.id)
      if (!valid) {
        // Possible token reuse attack — revoke all sessions
        await revokeAllUserSessions(profile.id)
        logSecurityEvent(EVENTS.SUSPICIOUS_ACTIVITY, req, {
          reason: 'refresh_token_reuse',
          userId: profile.id,
        })
        res.clearCookie('refresh_token', { path: '/api/auth' })
        return res.status(401).json({ error: 'Session invalid. Please log in again.' })
      }

      // Store new token hash (rotation)
      const ip = getClientIp(req)
      await storeRefreshToken(profile.id, data.session.refresh_token, req.headers['user-agent'] || 'unknown', ip)
    }

    // Re-fetch full user profile
    const { data: fullProfile } = await supabase
      .from('users')
      .select('id, email, full_name, role, specialty, color, is_active, permissions, tenant_id, tenants(id, name, slug, plan, logo_url, currency, tax_rate)')
      .eq('auth_id', authUser?.user?.id)
      .single()

    logSecurityEvent(EVENTS.TOKEN_REFRESH, req, { userId: fullProfile?.id })

    res.cookie('refresh_token', data.session.refresh_token, COOKIE_OPTS)
    res.json({ access_token: data.session.access_token, user: fullProfile })
  } catch {
    res.clearCookie('refresh_token', { path: '/api/auth' })
    res.status(401).json({ error: 'Session expired. Please log in again.' })
  }
})

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post('/forgot-password', resetLimiter, validateForgotPassword, async (req, res) => {
  const { email } = req.body
  logSecurityEvent(EVENTS.PASSWORD_RESET_REQUEST, req, { email: email.toLowerCase() })
  // Always return success to prevent email enumeration
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
  }).catch(() => {})
  res.json({ message: 'If an account exists for that email, a reset link has been sent.' })
})

// ── POST /api/auth/change-password ───────────────────────────────────────────
router.post('/change-password', authenticate, validateChangePassword, async (req, res) => {
  const { newPassword } = req.body
  try {
    const { error } = await supabase.auth.admin.updateUserById(
      req.user.auth_id || req.user.id,
      { password: newPassword }
    )
    if (error) return res.status(400).json({ error: 'Password change failed' })

    // Revoke all existing sessions — forces re-login everywhere
    await revokeAllUserSessions(req.user.id)
    await supabase.auth.admin.signOut(req.headers.authorization?.slice(7)).catch(() => {})
    res.clearCookie('refresh_token', { path: '/api/auth' })

    logSecurityEvent(EVENTS.PASSWORD_CHANGED, req, { userId: req.user.id })
    res.json({ message: 'Password changed. Please log in again.' })
  } catch {
    res.status(500).json({ error: 'Password change failed' })
  }
})

// ── POST /api/auth/revoke-all ─────────────────────────────────────────────────
// Force-logout from all devices
router.post('/revoke-all', authenticate, async (req, res) => {
  await revokeAllUserSessions(req.user.id)
  await supabase.auth.admin.signOut(req.headers.authorization?.slice(7)).catch(() => {})
  res.clearCookie('refresh_token', { path: '/api/auth' })
  logSecurityEvent(EVENTS.SESSION_REVOKED, req, { userId: req.user.id, scope: 'all' })
  res.json({ message: 'All sessions revoked. Please log in again.' })
})

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  const { auth_id, ...safeUser } = req.user
  res.json(safeUser)
})

module.exports = router
