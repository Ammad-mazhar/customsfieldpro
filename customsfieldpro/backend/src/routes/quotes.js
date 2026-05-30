const router   = require('express').Router()
const auth     = require('../middleware/auth')
const { logActivity } = require('../utils/activityLogger')
const supabase = require('../utils/supabase')
const { sendQuoteEmail } = require('../utils/email')
const { generateQuotePDF } = require('../utils/pdf')

router.use(auth)

// GET /api/quotes
router.get('/', async (req, res) => {
  const { status, client_id, page = 1, limit = 50 } = req.query
  const from = (page - 1) * limit

  let query = supabase
    .from('quotes')
    .select('*, clients(id, first_name, last_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (req.tenantId) query = query.eq('tenant_id', req.tenantId)
  if (status)       query = query.eq('status', status)
  if (client_id)    query = query.eq('client_id', client_id)

  const { data, error, count } = await query
  if (error) return res.status(400).json({ error: error.message })
  res.json({ data, total: count, page: +page, limit: +limit })
})

// GET /api/quotes/:id
router.get('/:id', async (req, res) => {
  let query = supabase.from('quotes').select('*, clients(*)').eq('id', req.params.id)
  if (req.tenantId) query = query.eq('tenant_id', req.tenantId)
  const { data, error } = await query.single()
  if (error) return res.status(404).json({ error: 'Quote not found' })
  res.json(data)
})

// POST /api/quotes
router.post('/', async (req, res) => {
  const { client_id, title, line_items = [], subtotal = 0, tax_rate = 0, valid_until, notes } = req.body
  if (!client_id) return res.status(400).json({ error: 'client_id is required' })

  let countQuery = supabase.from('quotes').select('id', { count: 'exact', head: true })
  if (req.tenantId) countQuery = countQuery.eq('tenant_id', req.tenantId)
  const { count } = await countQuery
  const quote_number = `QUO-${String((count || 0) + 1001).padStart(4, '0')}`
  const total = +(subtotal * (1 + tax_rate / 100)).toFixed(2)

  const record = { quote_number, client_id, title, line_items, subtotal, tax_rate, total, valid_until, notes, status: 'draft', created_by: req.user.id }
  if (req.tenantId) record.tenant_id = req.tenantId

  const { data, error } = await supabase.from('quotes').insert(record).select('*, clients(*)').single()
  if (error) return res.status(400).json({ error: error.message })

  await logActivity(req, 'create', 'quotes', data.id, data.quote_number)
  res.status(201).json(data)
})

// PUT /api/quotes/:id
router.put('/:id', async (req, res) => {
  const allowed = ['title', 'line_items', 'subtotal', 'tax_rate', 'total', 'status', 'valid_until', 'notes', 'approved_at', 'approved_by_client']
  const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))

  // Pre-fetch for status change detection
  let oldData = null
  if (patch.status) {
    let oldQ = supabase.from('quotes').select('status').eq('id', req.params.id)
    if (req.tenantId) oldQ = oldQ.eq('tenant_id', req.tenantId)
    const { data: od } = await oldQ.single()
    oldData = od
  }

  let updateQuery = supabase.from('quotes').update(patch).eq('id', req.params.id)
  if (req.tenantId) updateQuery = updateQuery.eq('tenant_id', req.tenantId)
  const { data, error } = await updateQuery.select().single()
  if (error) return res.status(400).json({ error: error.message })

  if (patch.status && oldData) {
    await logActivity(req, 'status_change', 'quotes', data.id, data.quote_number, {
      field: 'status', oldValue: oldData.status, newValue: patch.status,
    })
  } else {
    await logActivity(req, 'edit', 'quotes', data.id, data.quote_number)
  }

  res.json(data)
})

// DELETE /api/quotes/:id
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' })

  let nameQ = supabase.from('quotes').select('quote_number').eq('id', req.params.id)
  if (req.tenantId) nameQ = nameQ.eq('tenant_id', req.tenantId)
  const { data: existing } = await nameQ.single()

  let deleteQuery = supabase.from('quotes').delete().eq('id', req.params.id)
  if (req.tenantId) deleteQuery = deleteQuery.eq('tenant_id', req.tenantId)
  const { error } = await deleteQuery
  if (error) return res.status(400).json({ error: error.message })

  await logActivity(req, 'delete', 'quotes', req.params.id, existing?.quote_number || req.params.id)
  res.json({ message: 'Quote deleted' })
})

// POST /api/quotes/:id/send
router.post('/:id/send', async (req, res) => {
  let sendQuery = supabase.from('quotes').select('*, clients(*)').eq('id', req.params.id)
  if (req.tenantId) sendQuery = sendQuery.eq('tenant_id', req.tenantId)
  const { data: quote } = await sendQuery.single()
  if (!quote) return res.status(404).json({ error: 'Quote not found' })
  if (!quote.clients?.email) return res.status(400).json({ error: 'Client has no email' })

  await sendQuoteEmail(quote, quote.clients)
  await supabase.from('quotes').update({ status: 'sent' }).eq('id', req.params.id)

  await logActivity(req, 'send', 'quotes', quote.id, quote.quote_number, {
    field: 'recipient', newValue: quote.clients.email,
  })
  res.json({ message: 'Quote sent' })
})

// POST /api/quotes/:id/convert — convert quote to job
router.post('/:id/convert', async (req, res) => {
  let convertQuery = supabase.from('quotes').select('*, clients(*)').eq('id', req.params.id)
  if (req.tenantId) convertQuery = convertQuery.eq('tenant_id', req.tenantId)
  const { data: quote } = await convertQuery.single()
  if (!quote) return res.status(404).json({ error: 'Quote not found' })

  let jobCountQuery = supabase.from('jobs').select('id', { count: 'exact', head: true })
  if (req.tenantId) jobCountQuery = jobCountQuery.eq('tenant_id', req.tenantId)
  const { count } = await jobCountQuery
  const job_number = `JOB-${String((count || 0) + 1001).padStart(4, '0')}`

  const jobRecord = { job_number, client_id: quote.client_id, title: quote.title || quote.quote_number, line_items: quote.line_items, status: 'new', created_by: req.user.id }
  if (req.tenantId) jobRecord.tenant_id = req.tenantId

  const { data: job, error } = await supabase.from('jobs').insert(jobRecord).select().single()
  if (error) return res.status(400).json({ error: error.message })

  await supabase.from('quotes').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', req.params.id)

  await logActivity(req, 'convert', 'quotes', quote.id, quote.quote_number, {
    field: 'converted_to', newValue: job_number,
  })

  res.json({ job, quote: { ...quote, status: 'approved' } })
})

// GET /api/quotes/:id/pdf
router.get('/:id/pdf', async (req, res) => {
  let pdfQuery = supabase.from('quotes').select('*, clients(*)').eq('id', req.params.id)
  if (req.tenantId) pdfQuery = pdfQuery.eq('tenant_id', req.tenantId)
  const { data: quote } = await pdfQuery.single()
  if (!quote) return res.status(404).json({ error: 'Quote not found' })

  const pdf = await generateQuotePDF(quote)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${quote.quote_number}.pdf"`)
  res.send(pdf)
})

module.exports = router
