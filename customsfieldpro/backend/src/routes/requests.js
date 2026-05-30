const router   = require('express').Router()
const auth     = require('../middleware/auth')
const { logActivity } = require('../utils/activityLogger')
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

// POST /api/requests
router.post('/', async (req, res) => {
  const { client_id, service_type, description, priority = 'normal', preferred_time, claim_number } = req.body
  if (!service_type || !description) return res.status(400).json({ error: 'service_type and description are required' })

  const isAuthenticated = !!req.user
  const tenantId = isAuthenticated ? req.tenantId : req.body.tenant_id
  if (!isAuthenticated && !tenantId) return res.status(400).json({ error: 'tenant_id is required for unauthenticated requests' })

  const record = { client_id, service_type, description, priority, preferred_time, status: 'new' }
  if (claim_number) record.claim_number = claim_number
  if (tenantId) record.tenant_id = tenantId

  const { data, error } = await supabase.from('requests').insert(record).select().single()
  if (error) return res.status(400).json({ error: error.message })

  if (req.user) await logActivity(req, 'create', 'requests', data.id, data.service_type || 'Service Request')
  res.status(201).json(data)
})

// PUT /api/requests/:id
router.put('/:id', async (req, res) => {
  const allowed = ['status', 'priority', 'internal_notes', 'converted_to', 'converted_id', 'claim_number']
  const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))

  // Pre-fetch for status change detection
  let oldData = null
  if (patch.status) {
    let oldQ = supabase.from('requests').select('status, service_type').eq('id', req.params.id)
    if (req.tenantId) oldQ = oldQ.eq('tenant_id', req.tenantId)
    const { data: od } = await oldQ.single()
    oldData = od
  }

  let updateQuery = supabase.from('requests').update(patch).eq('id', req.params.id)
  if (req.tenantId) updateQuery = updateQuery.eq('tenant_id', req.tenantId)
  const { data, error } = await updateQuery.select().single()
  if (error) return res.status(400).json({ error: error.message })

  const name = data.service_type || 'Service Request'
  if (patch.status && oldData) {
    await logActivity(req, 'status_change', 'requests', data.id, name, {
      field: 'status', oldValue: oldData.status, newValue: patch.status,
    })
  } else {
    await logActivity(req, 'edit', 'requests', data.id, name)
  }

  res.json(data)
})

// DELETE /api/requests/:id
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' })

  let nameQ = supabase.from('requests').select('service_type').eq('id', req.params.id)
  if (req.tenantId) nameQ = nameQ.eq('tenant_id', req.tenantId)
  const { data: existing } = await nameQ.single()

  let deleteQuery = supabase.from('requests').delete().eq('id', req.params.id)
  if (req.tenantId) deleteQuery = deleteQuery.eq('tenant_id', req.tenantId)
  const { error } = await deleteQuery
  if (error) return res.status(400).json({ error: error.message })

  await logActivity(req, 'delete', 'requests', req.params.id, existing?.service_type || req.params.id)
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

  const jobRecord = {
    job_number,
    client_id:    request.client_id,
    title:        `${request.service_type} — from request`,
    description:  request.description,
    service_type: request.service_type,
    priority:     request.priority,
    status:       'new',
    created_by:   req.user.id,
  }
  if (req.tenantId) jobRecord.tenant_id = req.tenantId

  const { data: job, error } = await supabase.from('jobs').insert(jobRecord).select().single()
  if (error) return res.status(400).json({ error: error.message })

  await supabase.from('requests').update({ status: 'converted', converted_to: 'job', converted_id: job.id }).eq('id', req.params.id)

  await logActivity(req, 'convert', 'requests', request.id, request.service_type || 'Service Request', {
    field: 'converted_to', newValue: job_number,
  })

  res.json({ job })
})

module.exports = router
