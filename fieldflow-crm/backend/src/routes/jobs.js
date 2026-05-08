const router       = require('express').Router()
const authenticate = require('../middleware/auth')
const { authorize, requireOwnJobOrAdmin } = require('../middleware/authorize')
const { validateCreateJob, validateUpdateJob, checkValidation } = require('../middleware/validate')
const { param } = require('express-validator')
const { getJobs, getJobById, createJob, updateJob, completeJob, deleteJob } = require('../db/queries/jobQueries')
const { sendJobAssignedEmail } = require('../utils/email')
const supabase = require('../utils/supabase')

router.use(authenticate)

async function log(req, action, recordId, label, details) {
  await supabase.from('activity_log').insert({
    tenant_id: req.tenantId, user_id: req.user.id,
    action, module: 'jobs', record_id: recordId, record_label: label, details,
  }).catch(() => {})
}

// GET /api/jobs — role-aware: techs only see their own jobs
router.get('/', async (req, res) => {
  try {
    const result = await getJobs(req.tenantId, req.user.id, req.user.role, req.query)
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// GET /api/jobs/:id — verify tenant; techs verified by role in getJobs logic
router.get('/:id',
  param('id').isUUID().withMessage('Invalid job ID'),
  checkValidation,
  async (req, res) => {
    try {
      const data = await getJobById(req.tenantId, req.params.id)
      if (!data) return res.status(404).json({ error: 'Job not found' })

      // Technicians can only view their own jobs
      if ((req.user.role === 'staff' || req.user.role === 'technician') && data.assigned_to !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      res.json(data)
    } catch (e) {
      res.status(404).json({ error: 'Job not found' })
    }
  }
)

// POST /api/jobs — admin and staff only (not technicians)
router.post('/',
  authorize(['admin', 'staff']),
  validateCreateJob,
  async (req, res) => {
    try {
      const data = await createJob(req.tenantId, req.user.id, req.body)
      if (req.body.assigned_to) {
        const { data: assignee } = await supabase.from('users').select('id, full_name, email').eq('id', req.body.assigned_to).single()
        if (assignee) sendJobAssignedEmail(data, assignee).catch(() => {})
      }
      await log(req, 'JOB_CREATED', data.id, data.job_number, `Job "${data.title}" created.`)
      res.status(201).json(data)
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  }
)

// PUT /api/jobs/:id — verifies job ownership for non-admins
router.put('/:id',
  validateUpdateJob,
  async (req, res) => {
    try {
      const data = await updateJob(req.tenantId, req.params.id, req.user.id, req.user.role, req.body)
      await log(req, 'JOB_UPDATED', data.id, data.job_number, `Status: ${data.status}`)
      res.json(data)
    } catch (e) {
      res.status(e.status || 400).json({ error: e.message })
    }
  }
)

// POST /api/jobs/:id/complete — verifies job ownership; admins/staff bypass
router.post('/:id/complete',
  param('id').isUUID().withMessage('Invalid job ID'),
  checkValidation,
  async (req, res) => {
    try {
      const data = await completeJob(req.tenantId, req.params.id, req.user.id, req.user.role, req.body)
      await log(req, 'JOB_COMPLETED', data.id, data.job_number, 'Job marked complete.')
      res.json(data)
    } catch (e) {
      res.status(e.status || 400).json({ error: e.message })
    }
  }
)

// DELETE /api/jobs/:id — admin only
router.delete('/:id',
  authorize('admin'),
  param('id').isUUID().withMessage('Invalid job ID'),
  checkValidation,
  async (req, res) => {
    try {
      await deleteJob(req.tenantId, req.params.id)
      await log(req, 'JOB_DELETED', req.params.id, req.params.id, 'Job deleted.')
      res.json({ message: 'Job deleted' })
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  }
)

module.exports = router
