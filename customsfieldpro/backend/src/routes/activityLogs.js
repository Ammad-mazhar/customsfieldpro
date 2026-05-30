const router   = require('express').Router()
const auth     = require('../middleware/auth')
const { authorize } = require('../middleware/authorize')
const supabase = require('../utils/supabase')

router.use(auth)

// GET /api/activity-logs
router.get('/', authorize('admin'), async (req, res) => {
  const {
    search, module, action_type, user_name,
    start_date, end_date,
    limit = 50, offset = 0,
  } = req.query

  const lim = Math.min(Number(limit) || 50, 200)
  const off = Number(offset) || 0

  let q = supabase
    .from('activity_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(off, off + lim - 1)

  if (req.tenantId) q = q.eq('tenant_id', req.tenantId)
  if (module)       q = q.eq('module', module)
  if (action_type)  q = q.eq('action_type', action_type)
  if (user_name)    q = q.ilike('user_name', `%${user_name}%`)
  if (start_date)   q = q.gte('created_at', `${start_date}T00:00:00Z`)
  if (end_date)     q = q.lte('created_at', `${end_date}T23:59:59Z`)
  if (search)       q = q.or(`record_name.ilike.%${search}%,user_name.ilike.%${search}%`)

  const { data, error, count } = await q
  if (error) return res.status(400).json({ error: error.message })
  res.json({ data: data || [], total: count || 0, limit: lim, offset: off })
})

// GET /api/activity-logs/record/:recordId — full history for one record
router.get('/record/:recordId', authorize('admin'), async (req, res) => {
  let q = supabase
    .from('activity_logs')
    .select('*')
    .eq('record_id', req.params.recordId)
    .order('created_at', { ascending: false })
  if (req.tenantId) q = q.eq('tenant_id', req.tenantId)
  const { data, error } = await q
  if (error) return res.status(400).json({ error: error.message })
  res.json({ data: data || [] })
})

module.exports = router
