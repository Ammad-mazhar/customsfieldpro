const { body, param, query, validationResult } = require('express-validator')

// ── Global sanitization — applied to every field before route validators ──────
// Strips null bytes, trims whitespace, limits string lengths.
function globalSanitize(req, res, next) {
  function sanitizeValue(val) {
    if (typeof val !== 'string') return val
    return val.replace(/\0/g, '').trim().slice(0, 50000)
  }
  function sanitizeObj(obj) {
    if (!obj || typeof obj !== 'object') return obj
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeValue(obj[key])
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        obj[key] = sanitizeObj(obj[key])
      }
    }
    return obj
  }
  req.body  = sanitizeObj(req.body)
  req.query = sanitizeObj(req.query)
  next()
}

// Run after validation rules — returns 400 with details on failure
function checkValidation(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error:   'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    })
  }
  next()
}

// ── Common field validators ───────────────────────────────────────────────────
const uuidParam = (field = 'id') =>
  param(field).isUUID().withMessage(`Invalid ${field}`)

const emailField = (field = 'email', required = true) => {
  const v = required
    ? body(field).isEmail().withMessage('Valid email required')
    : body(field).optional({ checkFalsy: true }).isEmail().withMessage('Valid email required')
  return v.normalizeEmail().trim()
}

const passwordField = (field = 'password', required = true) => {
  const v = required
    ? body(field).isLength({ min: 8, max: 256 }).withMessage('Password must be 8–256 characters')
    : body(field).optional().isLength({ min: 8, max: 256 }).withMessage('Password must be 8–256 characters')
  return v.not().isEmpty()
}

// ── Auth ──────────────────────────────────────────────────────────────────────

const validateLogin = [
  emailField(),
  passwordField(),
  checkValidation,
]

const validateRegister = [
  body('businessName').trim().notEmpty().withMessage('Business name required').isLength({ max: 200 }).escape(),
  emailField(),
  body('password').isLength({ min: 8, max: 256 }).withMessage('Password must be 8–256 characters'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('plan').optional().isIn(['trial', 'starter', 'pro', 'enterprise']),
  checkValidation,
]

const validateChangePassword = [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword')
    .isLength({ min: 8, max: 256 }).withMessage('New password must be 8–256 characters')
    .custom((val, { req }) => val !== req.body.currentPassword)
    .withMessage('New password must differ from current password'),
  checkValidation,
]

const validateForgotPassword = [
  emailField(),
  checkValidation,
]

// ── Clients ───────────────────────────────────────────────────────────────────

const validateCreateClient = [
  body('first_name').optional().trim().isLength({ max: 100 }).escape(),
  body('last_name').optional().trim().isLength({ max: 100 }).escape(),
  emailField('email', false),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('address').optional().trim().isLength({ max: 300 }).escape(),
  body('address2').optional().trim().isLength({ max: 200 }).escape(),
  body('city').optional().trim().isLength({ max: 100 }).escape(),
  body('state').optional().trim().isLength({ max: 100 }).escape(),
  body('zip').optional().trim().isLength({ max: 20 }),
  body('country').optional().trim().isLength({ max: 100 }).escape(),
  body('client_type').optional().isIn(['residential', 'commercial']).withMessage('Invalid client type'),
  body('property_type').optional().trim().isLength({ max: 100 }).escape(),
  body('notes').optional().trim().isLength({ max: 10000 }),
  body('tags').optional().isArray({ max: 20 }).withMessage('Too many tags'),
  checkValidation,
]

const validateUpdateClient = [
  uuidParam(),
  body('first_name').optional().trim().notEmpty().isLength({ max: 100 }).escape(),
  body('last_name').optional().trim().notEmpty().isLength({ max: 100 }).escape(),
  emailField('email', false),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('client_type').optional().isIn(['residential', 'commercial']),
  body('notes').optional().trim().isLength({ max: 10000 }),
  checkValidation,
]

// ── Jobs ──────────────────────────────────────────────────────────────────────

const VALID_JOB_STATUSES = [
  'new', 'diagnosis_required', 'material_required', 'waiting_on_parts',
  'parts_received', 'ready_to_schedule', 'ready_for_repair',
  'scheduled', 'dispatched', 'in_progress', 'completed', 'cancelled',
]

const validateCreateJob = [
  body('client_id').isUUID().withMessage('Valid client ID required'),
  body('title').trim().notEmpty().withMessage('Title required').isLength({ max: 255 }).escape(),
  body('description').optional().trim().isLength({ max: 10000 }),
  body('service_type')
    .optional()
    .isIn(['HVAC', 'Plumbing', 'Electrical', 'Appliance Repair', 'General', 'Cleaning'])
    .withMessage('Invalid service type'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority'),
  body('status').optional().isIn(VALID_JOB_STATUSES).withMessage('Invalid status'),
  body('assigned_to').optional().isUUID().withMessage('Invalid user ID for assignment'),
  body('scheduled_date').optional().isISO8601().withMessage('Valid date required'),
  body('estimated_duration').optional().isFloat({ min: 0, max: 480 }).withMessage('Duration must be 0–480 minutes'),
  checkValidation,
]

const validateUpdateJob = [
  uuidParam(),
  body('status').optional().isIn(VALID_JOB_STATUSES).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
  body('title').optional().trim().isLength({ max: 255 }).escape(),
  body('description').optional().trim().isLength({ max: 10000 }),
  body('assigned_to').optional().isUUID(),
  body('scheduled_date').optional().isISO8601(),
  checkValidation,
]

// ── Invoices ──────────────────────────────────────────────────────────────────

const validateCreateInvoice = [
  body('client_id').isUUID().withMessage('Valid client ID required'),
  body('job_id').optional().isUUID().withMessage('Valid job ID required'),
  body('subtotal').isFloat({ min: 0, max: 9999999 }).withMessage('Valid subtotal required'),
  body('tax_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be 0–100'),
  body('discount').optional().isFloat({ min: 0, max: 100 }),
  body('line_items').optional().isArray({ max: 200 }).withMessage('Too many line items'),
  body('line_items.*.description').optional().trim().isLength({ max: 500 }).escape(),
  body('line_items.*.amount').optional().isFloat({ min: 0 }),
  body('due_date').optional().isISO8601().withMessage('Valid date required'),
  body('notes').optional().trim().isLength({ max: 5000 }),
  checkValidation,
]

const validateUpdateInvoice = [
  uuidParam(),
  body('status').optional().isIn(['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled']),
  body('subtotal').optional().isFloat({ min: 0, max: 9999999 }),
  body('due_date').optional().isISO8601(),
  checkValidation,
]

// ── Quotes ────────────────────────────────────────────────────────────────────

const validateCreateQuote = [
  body('client_id').isUUID().withMessage('Valid client ID required'),
  body('job_id').optional().isUUID(),
  body('subtotal').isFloat({ min: 0, max: 9999999 }).withMessage('Valid subtotal required'),
  body('tax_rate').optional().isFloat({ min: 0, max: 100 }),
  body('line_items').optional().isArray({ max: 200 }),
  body('valid_until').optional().isISO8601(),
  body('notes').optional().trim().isLength({ max: 5000 }),
  checkValidation,
]

// ── Users ─────────────────────────────────────────────────────────────────────

const validateCreateUser = [
  emailField(),
  body('full_name').trim().notEmpty().withMessage('Full name required').isLength({ max: 200 }).escape(),
  body('role').isIn(['admin', 'staff', 'technician']).withMessage('Invalid role'),
  body('specialty').optional().trim().isLength({ max: 100 }).escape(),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('color').optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('Invalid color hex'),
  checkValidation,
]

const validateUpdateUser = [
  uuidParam(),
  body('role').optional().isIn(['admin', 'staff', 'technician']).withMessage('Invalid role'),
  body('full_name').optional().trim().notEmpty().isLength({ max: 200 }).escape(),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('color').optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('Invalid color hex'),
  checkValidation,
]

// ── Inventory ─────────────────────────────────────────────────────────────────

const validateCreateInventoryItem = [
  body('name').trim().notEmpty().withMessage('Name required').isLength({ max: 255 }).escape(),
  body('sku').optional().trim().isLength({ max: 100 }),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('unit_cost').optional().isFloat({ min: 0, max: 9999999 }),
  body('reorder_point').optional().isInt({ min: 0 }),
  body('category').optional().trim().isLength({ max: 100 }).escape(),
  checkValidation,
]

// ── Requests (service requests) ───────────────────────────────────────────────

const validateCreateRequest = [
  body('client_name').trim().notEmpty().withMessage('Client name required').isLength({ max: 200 }).escape(),
  emailField('client_email', false),
  body('client_phone').optional().trim().isLength({ max: 30 }),
  body('service_type').optional().trim().isLength({ max: 100 }).escape(),
  body('description').trim().notEmpty().withMessage('Description required').isLength({ max: 5000 }),
  body('preferred_date').optional().isISO8601(),
  body('urgency').optional().isIn(['low', 'normal', 'high', 'urgent']),
  checkValidation,
]

// ── Timesheets ────────────────────────────────────────────────────────────────

const validateCreateTimesheet = [
  body('job_id').optional().isUUID(),
  body('date').isISO8601().withMessage('Valid date required'),
  body('hours').isFloat({ min: 0, max: 24 }).withMessage('Hours must be 0–24'),
  body('notes').optional().trim().isLength({ max: 2000 }),
  checkValidation,
]

// ── Pagination / search queries ───────────────────────────────────────────────

const validatePagination = [
  query('page').optional().isInt({ min: 1, max: 1000 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim().isLength({ max: 200 }),
  query('sort').optional().isIn(['created_at', 'updated_at', 'name', 'status', 'date', 'amount']),
  query('order').optional().isIn(['asc', 'desc']),
  checkValidation,
]

module.exports = {
  globalSanitize,
  checkValidation,
  // Auth
  validateLogin,
  validateRegister,
  validateChangePassword,
  validateForgotPassword,
  // Clients
  validateCreateClient,
  validateUpdateClient,
  // Jobs
  validateCreateJob,
  validateUpdateJob,
  // Invoices
  validateCreateInvoice,
  validateUpdateInvoice,
  // Quotes
  validateCreateQuote,
  // Users
  validateCreateUser,
  validateUpdateUser,
  // Inventory
  validateCreateInventoryItem,
  // Requests
  validateCreateRequest,
  // Timesheets
  validateCreateTimesheet,
  // Query
  validatePagination,
}
