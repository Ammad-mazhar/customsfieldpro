const router       = require('express').Router()
const authenticate = require('../middleware/auth')
const { authorize } = require('../middleware/authorize')
const { validateCreateInvoice, checkValidation } = require('../middleware/validate')
const { param } = require('express-validator')
const { getInvoices, getInvoiceById, createInvoice, updateInvoice, deleteInvoice } = require('../db/queries/invoiceQueries')
const { sendInvoiceEmail } = require('../utils/email')
const { generateInvoicePDF } = require('../utils/pdf')
const supabase = require('../utils/supabase')

router.use(authenticate)

async function log(req, action, recordId, label, details) {
  await supabase.from('activity_log').insert({
    tenant_id: req.tenantId, user_id: req.user.id,
    action, module: 'invoices', record_id: recordId, record_label: label, details,
  }).catch(() => {})
}

// GET /api/invoices — admin only (invoices contain financial data)
router.get('/', authorize('admin'), async (req, res) => {
  try {
    const result = await getInvoices(req.tenantId, req.query)
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// GET /api/invoices/:id
router.get('/:id',
  authorize('admin'),
  param('id').isUUID().withMessage('Invalid invoice ID'),
  checkValidation,
  async (req, res) => {
    try {
      const data = await getInvoiceById(req.tenantId, req.params.id)
      if (!data) return res.status(404).json({ error: 'Invoice not found' })
      res.json(data)
    } catch (e) {
      res.status(404).json({ error: 'Invoice not found' })
    }
  }
)

// POST /api/invoices — admin only
router.post('/',
  authorize('admin'),
  validateCreateInvoice,
  async (req, res) => {
    try {
      const data = await createInvoice(req.tenantId, req.user.id, req.body)
      await log(req, 'INVOICE_CREATED', data.id, data.invoice_number, `Invoice for $${data.total}.`)
      res.status(201).json(data)
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  }
)

// PUT /api/invoices/:id — admin only
router.put('/:id',
  authorize('admin'),
  param('id').isUUID().withMessage('Invalid invoice ID'),
  checkValidation,
  async (req, res) => {
    try {
      const data = await updateInvoice(req.tenantId, req.params.id, req.body)
      await log(req, 'INVOICE_UPDATED', data.id, data.invoice_number, `Status: ${data.status}`)
      res.json(data)
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  }
)

// DELETE /api/invoices/:id — admin only
router.delete('/:id',
  authorize('admin'),
  param('id').isUUID().withMessage('Invalid invoice ID'),
  checkValidation,
  async (req, res) => {
    try {
      await deleteInvoice(req.tenantId, req.params.id)
      await log(req, 'INVOICE_DELETED', req.params.id, req.params.id, 'Invoice deleted.')
      res.json({ message: 'Invoice deleted' })
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  }
)

// POST /api/invoices/:id/send — admin only
router.post('/:id/send',
  authorize('admin'),
  param('id').isUUID(),
  checkValidation,
  async (req, res) => {
    try {
      const inv = await getInvoiceById(req.tenantId, req.params.id)
      if (!inv) return res.status(404).json({ error: 'Invoice not found' })
      if (!inv.clients?.email) return res.status(400).json({ error: 'Client has no email address' })

      await sendInvoiceEmail(inv, inv.clients)
      await updateInvoice(req.tenantId, req.params.id, { status: 'sent' })
      await log(req, 'INVOICE_SENT', inv.id, inv.invoice_number, `Sent to ${inv.clients.email}`)
      res.json({ message: 'Invoice sent', invoiceId: inv.id })
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  }
)

// GET /api/invoices/:id/pdf — admin only
router.get('/:id/pdf',
  authorize('admin'),
  param('id').isUUID(),
  checkValidation,
  async (req, res) => {
    try {
      const inv = await getInvoiceById(req.tenantId, req.params.id)
      if (!inv) return res.status(404).json({ error: 'Invoice not found' })
      const pdf = await generateInvoicePDF(inv)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${inv.invoice_number}.pdf"`)
      res.send(pdf)
    } catch (e) {
      res.status(500).json({ error: 'PDF generation failed' })
    }
  }
)

module.exports = router
