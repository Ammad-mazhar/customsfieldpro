const router       = require('express').Router()
const authenticate = require('../middleware/auth')
const { authorize } = require('../middleware/authorize')
const { checkValidation } = require('../middleware/validate')
const { body, param } = require('express-validator')
const supabase = require('../utils/supabase')
const { QueryHelper } = require('../db/queryHelper')

router.use(authenticate)

function qh(req) { return new QueryHelper(supabase, req.tenantId) }

// GET /api/equipment?client_id=&type=&page=&limit=
router.get('/', async (req, res) => {
  const { client_id, type, page = 1, limit = 100 } = req.query
  const from = (page - 1) * limit

  let query = supabase
    .from('equipment')
    .select('*, clients(id, first_name, last_name, company_name)', { count: 'exact' })
    .eq('tenant_id', req.tenantId)
    .order('created_at', { ascending: false })
    .range(from, from + Number(limit) - 1)

  if (client_id) query = query.eq('client_id', client_id)
  if (type)      query = query.eq('type', type)

  const { data, error, count } = await query
  if (error) return res.status(400).json({ error: error.message })
  res.json({ data, total: count, page: +page, limit: +limit })
})

// GET /api/equipment/:id
router.get('/:id',
  param('id').isUUID().withMessage('Invalid equipment ID'),
  checkValidation,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*, clients(id, first_name, last_name, company_name, phone, email)')
        .eq('id', req.params.id)
        .eq('tenant_id', req.tenantId)
        .single()
      if (error) return res.status(404).json({ error: 'Equipment not found' })
      res.json(data)
    } catch (e) {
      res.status(404).json({ error: 'Equipment not found' })
    }
  }
)

// POST /api/equipment
router.post('/',
  [
    body('client_id').isUUID().withMessage('Valid client_id required'),
    body('type').trim().notEmpty().withMessage('type is required').isLength({ max: 100 }).escape(),
    body('brand').optional().trim().isLength({ max: 100 }).escape(),
    body('model').optional().trim().isLength({ max: 100 }).escape(),
    body('serial_number').optional().trim().isLength({ max: 100 }),
    body('install_date').optional().isISO8601().withMessage('install_date must be a valid date'),
    body('next_service').optional().isISO8601(),
    body('warranty_expiry').optional().isISO8601(),
    body('notes').optional().trim().isLength({ max: 2000 }),
    checkValidation,
  ],
  async (req, res) => {
    const { client_id, type, brand, model, serial_number, install_date, next_service, warranty_expiry, notes } = req.body
    try {
      const data = await qh(req).insert('equipment', {
        client_id, type, brand, model, serial_number,
        install_date, next_service, warranty_expiry, notes,
      })
      res.status(201).json(data)
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  }
)

// PUT /api/equipment/:id
router.put('/:id',
  param('id').isUUID().withMessage('Invalid equipment ID'),
  [
    body('type').optional().trim().notEmpty().isLength({ max: 100 }).escape(),
    body('brand').optional().trim().isLength({ max: 100 }).escape(),
    body('model').optional().trim().isLength({ max: 100 }).escape(),
    body('serial_number').optional().trim().isLength({ max: 100 }),
    body('install_date').optional().isISO8601(),
    body('next_service').optional().isISO8601(),
    body('warranty_expiry').optional().isISO8601(),
    body('notes').optional().trim().isLength({ max: 2000 }),
  ],
  checkValidation,
  async (req, res) => {
    const allowed = ['type', 'brand', 'model', 'serial_number', 'install_date', 'next_service', 'warranty_expiry', 'notes']
    const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))
    try {
      const data = await qh(req).update('equipment', req.params.id, patch)
      res.json(data)
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  }
)

// DELETE /api/equipment/:id — admin only
router.delete('/:id',
  authorize('admin'),
  param('id').isUUID().withMessage('Invalid equipment ID'),
  checkValidation,
  async (req, res) => {
    try {
      await qh(req).delete('equipment', req.params.id)
      res.json({ message: 'Equipment deleted' })
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  }
)

module.exports = router
