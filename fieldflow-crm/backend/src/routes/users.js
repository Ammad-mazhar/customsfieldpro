const router   = require('express').Router()
const auth     = require('../middleware/auth')
const supabase = require('../utils/supabase')

router.use(auth)

const adminOnly = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admin only' })

// GET /api/users
router.get('/', async (req, res) => {
  const { role, is_active } = req.query

  let query = supabase
    .from('users')
    .select('id, email, full_name, phone, role, specialty, color, is_active, permissions, created_at')
    .eq('tenant_id', req.tenantId)
    .order('full_name')

  if (role)      query = query.eq('role', role)
  if (is_active !== undefined) query = query.eq('is_active', is_active === 'true')

  const { data, error } = await query
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, phone, role, specialty, color, is_active, permissions, created_at')
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .single()
  if (error) return res.status(404).json({ error: 'User not found' })
  res.json(data)
})

// POST /api/users — invite new team member
router.post('/', adminOnly, async (req, res) => {
  const { email, full_name, role = 'staff', specialty, color, phone, permissions = {} } = req.body
  if (!email || !full_name) return res.status(400).json({ error: 'email and full_name are required' })

  // Create Supabase auth user (sends invite email)
  const { data: authData, error: authErr } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { tenant_id: req.tenantId },
    redirectTo: `${process.env.FRONTEND_URL}/accept-invite`,
  })
  if (authErr) return res.status(400).json({ error: authErr.message })

  const { data, error } = await supabase
    .from('users')
    .insert({ tenant_id: req.tenantId, auth_id: authData.user.id, email, full_name, role, specialty, color, phone, permissions })
    .select('id, email, full_name, role, specialty, color').single()
  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
})

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  // Users can update themselves; admins can update anyone on their tenant
  if (req.user.role !== 'admin' && req.user.id !== req.params.id)
    return res.status(403).json({ error: 'Forbidden' })

  const allowed = req.user.role === 'admin'
    ? ['full_name', 'phone', 'role', 'specialty', 'color', 'is_active', 'permissions']
    : ['full_name', 'phone', 'specialty', 'color']

  const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))

  const { data, error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .select('id, email, full_name, role, specialty, color, is_active, permissions').single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// DELETE /api/users/:id — deactivate (soft delete)
router.delete('/:id', adminOnly, async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot deactivate yourself' })

  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
  if (error) return res.status(400).json({ error: error.message })
  res.json({ message: 'User deactivated' })
})

// PUT /api/users/:id/permissions
router.put('/:id/permissions', adminOnly, async (req, res) => {
  const { permissions } = req.body
  const { data, error } = await supabase
    .from('users')
    .update({ permissions })
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .select('id, full_name, permissions').single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

module.exports = router
