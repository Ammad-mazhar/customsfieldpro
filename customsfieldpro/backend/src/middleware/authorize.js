// Authorization middleware — role and permission enforcement.
// Role ALWAYS comes from the database (via authenticate middleware).
// NEVER trust role from request body, query params, or token payload alone.

const { logSecurityEvent, EVENTS } = require('../utils/securityLogger')

// ── Plan feature gates ────────────────────────────────────────────────────────
const PLAN_FEATURES = {
  free:       ['jobs.read', 'clients.read', 'invoices.read'],
  trial:      ['jobs.*', 'clients.*', 'invoices.*', 'quotes.*', 'users.read', 'reports.read'],
  starter:    ['jobs.*', 'clients.*', 'invoices.*', 'quotes.*', 'users.*', 'reports.*'],
  pro:        ['jobs.*', 'clients.*', 'invoices.*', 'quotes.*', 'users.*', 'reports.*', 'api.*', 'integrations.*'],
  enterprise: ['*'],
}

function planAllows(plan, feature) {
  const allowed = PLAN_FEATURES[plan] || PLAN_FEATURES.free
  if (allowed.includes('*')) return true
  if (allowed.includes(feature)) return true
  // Check wildcard — e.g., 'jobs.*' covers 'jobs.create'
  const ns = feature.split('.')[0]
  return allowed.includes(`${ns}.*`)
}

// ── Role-based authorization ──────────────────────────────────────────────────
// Usage: router.delete('/:id', authenticate, authorize('admin'), handler)
// Usage: router.get('/', authenticate, authorize(['admin', 'staff']), handler)
function authorize(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]

  return (req, res, next) => {
    const userRole = req.user?.role
    if (!userRole || !roles.includes(userRole)) {
      logSecurityEvent(EVENTS.PERMISSION_DENIED, req, {
        requiredRoles: roles,
        userRole:      userRole || 'none',
        endpoint:      req.path,
      })
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}

// ── Permission-based authorization ───────────────────────────────────────────
// Uses granular permissions array on the user record.
// Usage: router.post('/', authenticate, requirePermission('invoices.create'), handler)
function requirePermission(permission) {
  return (req, res, next) => {
    const user = req.user
    if (!user) return res.status(401).json({ error: 'Authentication required' })

    // Admins always pass
    if (user.role === 'admin') return next()

    // Check user's permissions array (stored in DB)
    const perms = user.permissions || []
    const hasGlobal = perms.includes('*') || perms.includes(permission)
    const ns = permission.split('.')[0]
    const hasWild = perms.includes(`${ns}.*`)

    if (!hasGlobal && !hasWild) {
      logSecurityEvent(EVENTS.PERMISSION_DENIED, req, {
        requiredPermission: permission,
        userRole:           user.role,
        userId:             user.id,
      })
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

// ── Tenant scope — always derive tenantId from DB, never from request ─────────
function tenantScope(req, res, next) {
  // Double-check: tenantId must already be on req from authenticate()
  if (!req.tenantId) {
    logSecurityEvent(EVENTS.TENANT_VIOLATION, req, { reason: 'missing_tenant_context' })
    return res.status(403).json({ error: 'Forbidden' })
  }

  // Reject if request body or query tries to supply a different tenant_id
  const bodyTenant  = req.body?.tenant_id
  const queryTenant = req.query?.tenant_id

  if (bodyTenant  && bodyTenant  !== req.tenantId) {
    logSecurityEvent(EVENTS.TENANT_VIOLATION, req, { reason: 'body_tenant_mismatch', supplied: bodyTenant })
    return res.status(403).json({ error: 'Forbidden' })
  }
  if (queryTenant && queryTenant !== req.tenantId) {
    logSecurityEvent(EVENTS.TENANT_VIOLATION, req, { reason: 'query_tenant_mismatch', supplied: queryTenant })
    return res.status(403).json({ error: 'Forbidden' })
  }

  next()
}

// ── Job ownership — technicians can only access their own jobs ────────────────
// Usage: router.put('/:id', authenticate, requireOwnJobOrAdmin, handler)
async function requireOwnJobOrAdmin(req, res, next) {
  if (req.user.role === 'admin' || req.user.role === 'staff') return next()

  const supabase = require('../utils/supabase')
  const { data: job, error } = await supabase
    .from('jobs')
    .select('assigned_to')
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .single()

  if (error || !job) return res.status(404).json({ error: 'Not found' })

  if (job.assigned_to !== req.user.id) {
    logSecurityEvent(EVENTS.UNAUTHORIZED_ACCESS, req, {
      resource: 'job',
      jobId:    req.params.id,
      userId:   req.user.id,
    })
    return res.status(403).json({ error: 'Forbidden' })
  }

  next()
}

// ── Plan feature check ────────────────────────────────────────────────────────
// Usage: router.get('/reports', authenticate, planFeatureCheck('reports.read'), handler)
function planFeatureCheck(feature) {
  return (req, res, next) => {
    const plan = req.tenant?.plan || 'free'
    if (!planAllows(plan, feature)) {
      return res.status(402).json({
        error:   'Feature not available on your current plan',
        feature,
        plan,
      })
    }
    next()
  }
}

// Ensure tenantId is always sourced from the authenticated user — never from request
function requireTenantMatch() {
  return (req, res, next) => {
    req.tenantId = req.user.tenant_id  // always from DB, never from request
    next()
  }
}

module.exports = {
  authorize,
  requirePermission,
  tenantScope,
  requireOwnJobOrAdmin,
  planFeatureCheck,
  requireTenantMatch,
}
