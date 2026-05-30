const router       = require('express').Router()
const authenticate = require('../middleware/auth')
const { authorize } = require('../middleware/authorize')
const { validateCreateJob, validateUpdateJob, checkValidation } = require('../middleware/validate')
const { param } = require('express-validator')
const { getJobs, getJobById, createJob, updateJob, completeJob, deleteJob } = require('../db/queries/jobQueries')
const { sendJobAssignedEmail } = require('../utils/email')
const { logActivity } = require('../utils/activityLogger')
const supabase = require('../utils/supabase')

router.use(authenticate)

// GET /api/jobs — role-aware: techs only see their own jobs
router.get('/', async (req, res) => {
  try {
    const result = await getJobs(req.tenantId, req.user.id, req.user.role, req.query)
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// GET /api/jobs/:id
router.get('/:id',
  param('id').isUUID().withMessage('Invalid job ID'),
  checkValidation,
  async (req, res) => {
    try {
      const data = await getJobById(req.tenantId, req.params.id)
      if (!data) return res.status(404).json({ error: 'Job not found' })

      if ((req.user.role === 'staff' || req.user.role === 'technician') && data.assigned_to !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      res.json(data)
    } catch (e) {
      res.status(404).json({ error: 'Job not found' })
    }
  }
)

// POST /api/jobs — admin and staff only
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
      await logActivity(req, 'create', 'jobs', data.id, data.job_number || data.title)
      res.status(201).json(data)
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  }
)

// PUT /api/jobs/:id
router.put('/:id',
  validateUpdateJob,
  async (req, res) => {
    try {
      // Pre-fetch for status change detection
      const oldData = await getJobById(req.tenantId, req.params.id).catch(() => null)

      const data = await updateJob(req.tenantId, req.params.id, req.user.id, req.user.role, req.body)
      const label = data.job_number || data.title || data.id

      if (req.body.status !== undefined && oldData?.status !== req.body.status) {
        await logActivity(req, 'status_change', 'jobs', data.id, label, {
          field: 'status', oldValue: oldData?.status, newValue: req.body.status,
        })
      } else {
        await logActivity(req, 'edit', 'jobs', data.id, label)
      }

      res.json(data)
    } catch (e) {
      res.status(e.status || 400).json({ error: e.message })
    }
  }
)

// POST /api/jobs/:id/complete
router.post('/:id/complete',
  param('id').isUUID().withMessage('Invalid job ID'),
  checkValidation,
  async (req, res) => {
    try {
      const data = await completeJob(req.tenantId, req.params.id, req.user.id, req.user.role, req.body)
      await logActivity(req, 'complete', 'jobs', data.id, data.job_number || data.title, {
        field: 'status', oldValue: 'in_progress', newValue: 'completed',
      })
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
      const existing = await getJobById(req.tenantId, req.params.id).catch(() => null)
      await deleteJob(req.tenantId, req.params.id)
      await logActivity(req, 'delete', 'jobs', req.params.id, existing?.job_number || existing?.title || req.params.id)
      res.json({ message: 'Job deleted' })
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  }
)

module.exports = router
