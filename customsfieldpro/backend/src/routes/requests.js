const router   = require('express').Router()
const auth     = require('../middleware/auth')
const supabase = require('../utils/supabase')

router.use(auth)

// GET /api/requests
router.get('/', async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query
  const from = (page - 1) * limit

  let query = supabase
    .from('requests')
    .select('*, clients(id, first_name, last_name, email, phone)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (req.tenantId) query = query.eq('tenant_id', req.tenantId)
  if (status)       query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) return res.status(400).json({ error: error.message })
  res.json({ data, total: count, page: +page, limit: +limit })
})

// GET /api/requests/:id
router.get('/:id', async (req, res) => {
  let query = supabase.from('requests').select('*, clients(*)').eq('id', req.params.id)
  if (req.tenantId) query = query.eq('tenant_id', req.tenantId)
  const { data, error } = await query.single()
  if (error) return res.status(404).json({ error: 'Request not found' })
  res.json(data)
})

// POST /api/requests — public-facing, no auth required for portal
router.post('/', async (req, res) => {
  const { client_id, service_type, description, priority = 'normal', preferred_time } = req.body
  if (!service_type || !description) return res.status(400).json({ error: 'service_type and description are required' })

  // Allow unauthenticated submissions (client portal)
  const tenantId = req.tenantId || req.body.tenant_id
  if (!tenantId) return res.status(400).json({ error: 'tenant_id is required for unauthenticated requests' })

  const { data, error } = await supabase
    .from('requests')
    .insert({ tenant_id: tenantId, client_id, service_type, description, priority, preferred_time, status: 'new' })
    .select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
})

// PUT /api/requests/:id
router.put('/:id', async (req, res) => {
  const allowed = ['status', 'priority', 'internal_notes', 'converted_to', 'converted_id']
  const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))

  let updateQuery = supabase.from('requests').update(patch).eq('id', req.params.id)
  if (req.tenantId) updateQuery = updateQuery.eq('tenant_id', req.tenantId)
  const { data, error } = await updateQuery.select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// DELETE /api/requests/:id
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
  let deleteQuery = supabase.from('requests').delete().eq('id', req.params.id)
  if (req.tenantId) deleteQuery = deleteQuery.eq('tenant_id', req.tenantId)
  const { error } = await deleteQuery
  if (error) return res.status(400).json({ error: error.message })
  res.json({ message: 'Request deleted' })
})

// POST /api/requests/:id/convert — convert to job
router.post('/:id/convert', async (req, res) => {
  let reqQuery = supabase.from('requests').select('*').eq('id', req.params.id)
  if (req.tenantId) reqQuery = reqQuery.eq('tenant_id', req.tenantId)
  const { data: request } = await reqQuery.single()
  if (!request) return res.status(404).json({ error: 'Request not found' })

  let jobCountQuery = supabase.from('jobs').select('id', { count: 'exact', head: true })
  if (req.tenantId) jobCountQuery = jobCountQuery.eq('tenant_id', req.tenantId)
  const { count } = await jobCountQuery
  const job_number = `JOB-${String((count || 0) + 1001).padStart(4, '0')}`

  const jobRecord = { job_number, client_id: request.client_id, title: `${request.service_type} — from request`, description: request.description, service_type: request.service_type, priority: request.priority, status: 'new', created_by: req.user.id }
  if (req.tenantId) jobRecord.tenant_id = req.tenantId
  const { data: job, error } = await supabase.from('jobs').insert(jobRecord).select().single()
  if (error) return res.status(400).json({ error: error.message })

  await supabase.from('requests').update({ status: 'converted', converted_to: 'job', converted_id: job.id }).eq('id', req.params.id)
  res.json({ job })
})

module.exports = router
