// Authentication middleware — verifies every request to protected routes.
// Validates the custom JWT issued by routes/auth.js, then loads a fresh
// user record from the DB so role, tenant, and active-status are never
// stale from the token payload.

const jwt     = require('jsonwebtoken')
const supabase = require('../utils/supabase')

module.exports = async function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const token = header.slice(7).trim()
  if (!token || token.length < 20) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  // 1 — Verify JWT signature and expiry
  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this')
  } catch (err) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  if (!decoded?.id) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    // 2 — Load fresh user from DB — never trust role/active status from the token
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, tenant_id, specialty, color, is_active, permissions')
      .eq('id', decoded.id)
      .single()

    if (error || !user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    if (user.is_active === false) {
      return res.status(401).json({ error: 'Account is inactive' })
    }

    // 3 — Attach verified data — tenantId always from DB, never from request
    req.user     = user
    req.tenantId = user.tenant_id || decoded.tenant_id || null

    next()
  } catch (err) {
    return res.status(401).json({ error: 'Authentication required' })
  }
}
