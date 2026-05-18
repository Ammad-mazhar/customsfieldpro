const router   = require('express').Router()
const auth     = require('../middleware/auth')
const supabase = require('../utils/supabase')

const adminOnly = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admin only' })

// GET /api/tenants/me — current tenant details
router.get('/me', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', req.tenantId)
    .single()
  if (error) return res.status(404).json({ error: error.message })
  res.json(data)
})

// PUT /api/tenants/me — update tenant settings
router.put('/me', auth, adminOnly, async (req, res) => {
  const allowed = ['name', 'phone', 'address', 'city', 'zip', 'country', 'logo_url', 'tax_rate', 'currency']
  const patch   = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))

  const { data, error } = await supabase
    .from('tenants')
    .update(patch)
    .eq('id', req.tenantId)
    .select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// GET /api/tenants/usage — plan usage stats
router.get('/usage', auth, adminOnly, async (req, res) => {
  const tid = req.tenantId
  const [{ count: userCount }, { count: clientCount }, { count: jobCount }] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('tenant_id', tid)
      .gte('created_at', new Date(new Date().setDate(1)).toISOString()),
  ])
  res.json({ users: userCount, clients: clientCount, jobsThisMonth: jobCount, plan: req.tenant.plan })
})

module.exports = router
