const router   = require('express').Router()
const auth     = require('../middleware/auth')
const supabase = require('../utils/supabase')

router.use(auth)

// GET /api/inventory
router.get('/', async (req, res) => {
  const { category, low_stock, search, page = 1, limit = 100 } = req.query
  const from = (page - 1) * limit

  let query = supabase
    .from('inventory')
    .select('*', { count: 'exact' })
    .eq('tenant_id', req.tenantId)
    .order('name')
    .range(from, from + limit - 1)

  if (category)  query = query.eq('category', category)
  if (search)    query = query.ilike('name', `%${search}%`)
  if (low_stock === 'true') query = query.lte('in_stock', query.min_stock || 0)

  const { data, error, count } = await query
  if (error) return res.status(400).json({ error: error.message })

  // Annotate low stock flag
  const annotated = (data || []).map(item => ({ ...item, is_low_stock: item.in_stock <= item.min_stock }))
  res.json({ data: annotated, total: count })
})

// GET /api/inventory/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .single()
  if (error) return res.status(404).json({ error: 'Item not found' })
  res.json(data)
})

// POST /api/inventory
router.post('/', async (req, res) => {
  if (req.user.role === 'staff') return res.status(403).json({ error: 'Forbidden' })

  const { name, sku, category, description, in_stock = 0, min_stock = 0, unit_cost, selling_price, supplier, supplier_contact, notes } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })

  const { data, error } = await supabase
    .from('inventory')
    .insert({ tenant_id: req.tenantId, name, sku, category, description, in_stock, min_stock, unit_cost, selling_price, supplier, supplier_contact, notes })
    .select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
})

// PUT /api/inventory/:id
router.put('/:id', async (req, res) => {
  if (req.user.role === 'staff') return res.status(403).json({ error: 'Forbidden' })

  const allowed = ['name', 'sku', 'category', 'description', 'in_stock', 'min_stock', 'unit_cost', 'selling_price', 'supplier', 'supplier_contact', 'notes']
  const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))

  const { data, error } = await supabase
    .from('inventory')
    .update(patch)
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// DELETE /api/inventory/:id
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
  const { error } = await supabase.from('inventory').delete().eq('id', req.params.id).eq('tenant_id', req.tenantId)
  if (error) return res.status(400).json({ error: error.message })
  res.json({ message: 'Item deleted' })
})

// POST /api/inventory/:id/adjust — adjust stock level
router.post('/:id/adjust', async (req, res) => {
  const { delta, reason } = req.body  // delta = +5 or -3
  if (delta === undefined) return res.status(400).json({ error: 'delta is required' })

  const { data: item } = await supabase.from('inventory').select('in_stock').eq('id', req.params.id).eq('tenant_id', req.tenantId).single()
  if (!item) return res.status(404).json({ error: 'Item not found' })

  const newStock = Math.max(0, item.in_stock + Number(delta))
  const { data, error } = await supabase
    .from('inventory')
    .update({ in_stock: newStock })
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json({ ...data, is_low_stock: data.in_stock <= data.min_stock })
})

module.exports = router
