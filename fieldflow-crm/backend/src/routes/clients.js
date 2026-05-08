const router       = require('express').Router()
const authenticate = require('../middleware/auth')
const { authorize } = require('../middleware/authorize')
const { validateCreateClient, validateUpdateClient, checkValidation } = require('../middleware/validate')
const { param } = require('express-validator')
const { getClients, getClientById, createClient, updateClient, deleteClient } = require('../db/queries/clientQueries')
const { logSecurityEvent, EVENTS } = require('../utils/securityLogger')
const supabase = require('../utils/supabase')

router.use(authenticate)

async function log(req, action, recordId, label, details) {
  await supabase.from('activity_log').insert({
    tenant_id: req.tenantId, user_id: req.user.id,
    action, module: 'clients', record_id: recordId, record_label: label, details,
  }).catch(() => {})
}

// GET /api/clients
router.get('/',
  authorize(['admin', 'staff']),
  async (req, res) => {
    try {
      const result = await getClients(req.tenantId, req.query)
      res.json(result)
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  }
)

// GET /api/clients/:id
router.get('/:id',
  authorize(['admin', 'staff']),
  param('id').isUUID().withMessage('Invalid client ID'),
  checkValidation,
  async (req, res) => {
    try {
      const data = await getClientById(req.tenantId, req.params.id)
      if (!data) return res.status(404).json({ error: 'Client not found' })
      res.json(data)
    } catch (e) {
      res.status(404).json({ error: 'Client not found' })
    }
  }
)

// POST /api/clients
router.post('/',
  authorize(['admin', 'staff']),
  validateCreateClient,
  async (req, res) => {
    try {
      const data = await createClient(req.tenantId, req.user.id, req.body)
      await log(req, 'CLIENT_CREATED', data.id, `${data.first_name} ${data.last_name}`, 'Client created.')
      res.status(201).json(data)
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  }
)

// PUT /api/clients/:id
router.put('/:id',
  authorize(['admin', 'staff']),
  validateUpdateClient,
  async (req, res) => {
    try {
      const data = await updateClient(req.tenantId, req.params.id, req.body)
      await log(req, 'CLIENT_UPDATED', data.id, `${data.first_name} ${data.last_name}`, 'Client updated.')
      res.json(data)
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  }
)

// DELETE /api/clients/:id — admin only
router.delete('/:id',
  authorize('admin'),
  param('id').isUUID().withMessage('Invalid client ID'),
  checkValidation,
  async (req, res) => {
    try {
      await deleteClient(req.tenantId, req.params.id)
      await log(req, 'CLIENT_DELETED', req.params.id, req.params.id, 'Client deleted.')
      res.json({ message: 'Client deleted' })
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  }
)

module.exports = router
