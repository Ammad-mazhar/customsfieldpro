const router   = require('express').Router()
const auth     = require('../middleware/auth')
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
    .eq('tenant_id', req.tenantId)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (status)    query = query.eq('status', status)
  if (client_id) query = query.eq('client_id', client_id)

  const { data, error, count } = await query
  if (error) return res.status(400).json({ error: error.message })
  res.json({ data, total: count, page: +page, limit: +limit })
})

// GET /api/quotes/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, clients(*)')
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .single()
  if (error) return res.status(404).json({ error: 'Quote not found' })
  res.json(data)
})

// POST /api/quotes
router.post('/', async (req, res) => {
  const { client_id, title, line_items = [], subtotal = 0, tax_rate = 0, valid_until, notes } = req.body
  if (!client_id) return res.status(400).json({ error: 'client_id is required' })

  const { count } = await supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('tenant_id', req.tenantId)
  const quote_number = `QUO-${String((count || 0) + 1001).padStart(4, '0')}`
  const total = +(subtotal * (1 + tax_rate / 100)).toFixed(2)

  const { data, error } = await supabase
    .from('quotes')
    .insert({ tenant_id: req.tenantId, quote_number, client_id, title, line_items, subtotal, tax_rate, total, valid_until, notes, status: 'draft', created_by: req.user.id })
    .select('*, clients(*)').single()
  if (error) return res.status(400).json({ error: error.message })

  await logActivity(req, 'QUOTE_CREATED', 'quotes', data.id, data.quote_number, `Quote for $${total}.`)
  res.status(201).json(data)
})

// PUT /api/quotes/:id
router.put('/:id', async (req, res) => {
  const allowed = ['title', 'line_items', 'subtotal', 'tax_rate', 'total', 'status', 'valid_until', 'notes', 'approved_at', 'approved_by_client']
  const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))

  const { data, error } = await supabase
    .from('quotes')
    .update(patch)
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .select().single()
  if (error) return res.status(400).json({ error: error.message })

  await logActivity(req, 'QUOTE_UPDATED', 'quotes', data.id, data.quote_number, `Status: ${data.status}`)
  res.json(data)
})

// DELETE /api/quotes/:id
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' })

  const { error } = await supabase.from('quotes').delete().eq('id', req.params.id).eq('tenant_id', req.tenantId)
  if (error) return res.status(400).json({ error: error.message })

  await logActivity(req, 'QUOTE_DELETED', 'quotes', req.params.id, req.params.id, 'Quote deleted.')
  res.json({ message: 'Quote deleted' })
})

// POST /api/quotes/:id/send
router.post('/:id/send', async (req, res) => {
  const { data: quote } = await supabase.from('quotes').select('*, clients(*)').eq('id', req.params.id).eq('tenant_id', req.tenantId).single()
  if (!quote) return res.status(404).json({ error: 'Quote not found' })
  if (!quote.clients?.email) return res.status(400).json({ error: 'Client has no email' })

  await sendQuoteEmail(quote, quote.clients)
  await supabase.from('quotes').update({ status: 'sent' }).eq('id', req.params.id)

  await logActivity(req, 'QUOTE_SENT', 'quotes', quote.id, quote.quote_number, `Sent to ${quote.clients.email}`)
  res.json({ message: 'Quote sent' })
})

// POST /api/quotes/:id/convert — convert quote to job
router.post('/:id/convert', async (req, res) => {
  const { data: quote } = await supabase.from('quotes').select('*, clients(*)').eq('id', req.params.id).eq('tenant_id', req.tenantId).single()
  if (!quote) return res.status(404).json({ error: 'Quote not found' })

  const { count } = await supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('tenant_id', req.tenantId)
  const job_number = `JOB-${String((count || 0) + 1001).padStart(4, '0')}`

  const { data: job, error } = await supabase
    .from('jobs')
    .insert({ tenant_id: req.tenantId, job_number, client_id: quote.client_id, title: quote.title || quote.quote_number, line_items: quote.line_items, status: 'new', created_by: req.user.id })
    .select().single()
  if (error) return res.status(400).json({ error: error.message })

  await supabase.from('quotes').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', req.params.id)
  await logActivity(req, 'QUOTE_CONVERTED', 'quotes', quote.id, quote.quote_number, `Converted to ${job_number}`)
  res.json({ job, quote: { ...quote, status: 'approved' } })
})

// GET /api/quotes/:id/pdf
router.get('/:id/pdf', async (req, res) => {
  const { data: quote } = await supabase.from('quotes').select('*, clients(*)').eq('id', req.params.id).eq('tenant_id', req.tenantId).single()
  if (!quote) return res.status(404).json({ error: 'Quote not found' })

  const pdf = await generateQuotePDF(quote)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${quote.quote_number}.pdf"`)
  res.send(pdf)
})

async function logActivity(req, action, module, recordId, label, details) {
  await supabase.from('activity_log').insert({
    tenant_id: req.tenantId, user_id: req.user.id,
    action, module, record_id: recordId, record_label: label, details,
  }).catch(() => {})
}

module.exports = router
