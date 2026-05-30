const router       = require('express').Router()
const authenticate = require('../middleware/auth')
const { authorize } = require('../middleware/authorize')
const { validateCreateInvoice, checkValidation } = require('../middleware/validate')
const { param } = require('express-validator')
const { getInvoices, getInvoiceById, createInvoice, updateInvoice, deleteInvoice } = require('../db/queries/invoiceQueries')
const { sendInvoiceEmail } = require('../utils/email')
const { generateInvoicePDF } = require('../utils/pdf')
const { logActivity } = require('../utils/activityLogger')

router.use(authenticate)

// GET /api/invoices
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

// POST /api/invoices
router.post('/',
  authorize('admin'),
  validateCreateInvoice,
  async (req, res) => {
    try {
      const data = await createInvoice(req.tenantId, req.user.id, req.body)
      await logActivity(req, 'create', 'invoices', data.id, data.invoice_number)
      res.status(201).json(data)
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  }
)

// PUT /api/invoices/:id
router.put('/:id',
  authorize('admin'),
  param('id').isUUID().withMessage('Invalid invoice ID'),
  checkValidation,
  async (req, res) => {
    try {
      // Pre-fetch for status/payment change detection
      const oldData = await getInvoiceById(req.tenantId, req.params.id).catch(() => null)

      const data = await updateInvoice(req.tenantId, req.params.id, req.body)

      const isPayment = req.body.paymentMethod || req.body.amountPaid != null
      if (isPayment) {
        await logActivity(req, 'payment', 'invoices', data.id, data.invoice_number, {
          field: 'amountPaid', newValue: req.body.amountPaid,
        })
      } else if (req.body.status !== undefined && oldData?.status !== req.body.status) {
        await logActivity(req, 'status_change', 'invoices', data.id, data.invoice_number, {
          field: 'status', oldValue: oldData?.status, newValue: req.body.status,
        })
      } else {
        await logActivity(req, 'edit', 'invoices', data.id, data.invoice_number)
      }

      res.json(data)
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  }
)

// DELETE /api/invoices/:id
router.delete('/:id',
  authorize('admin'),
  param('id').isUUID().withMessage('Invalid invoice ID'),
  checkValidation,
  async (req, res) => {
    try {
      const existing = await getInvoiceById(req.tenantId, req.params.id).catch(() => null)
      await deleteInvoice(req.tenantId, req.params.id)
      await logActivity(req, 'delete', 'invoices', req.params.id, existing?.invoice_number || req.params.id)
      res.json({ message: 'Invoice deleted' })
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  }
)

// POST /api/invoices/:id/send
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
      await logActivity(req, 'send', 'invoices', inv.id, inv.invoice_number, {
        field: 'recipient', newValue: inv.clients.email,
      })
      res.json({ message: 'Invoice sent', invoiceId: inv.id })
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  }
)

// GET /api/invoices/:id/pdf
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
