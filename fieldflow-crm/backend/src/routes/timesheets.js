const router   = require('express').Router()
const auth     = require('../middleware/auth')
const supabase = require('../utils/supabase')

router.use(auth)

// GET /api/timesheets — list time entries
router.get('/', async (req, res) => {
  const { user_id, job_id, from_date, to_date, page = 1, limit = 100 } = req.query
  const offset = (page - 1) * limit

  let query = supabase
    .from('time_entries')
    .select('*, jobs(id, job_number, title, service_type), users(id, full_name, color)', { count: 'exact' })
    .eq('tenant_id', req.tenantId)
    .order('clock_in', { ascending: false })
    .range(offset, offset + limit - 1)

  // Staff see only their own entries
  if (req.user.role !== 'admin') query = query.eq('user_id', req.user.id)

  if (user_id)   query = query.eq('user_id', user_id)
  if (job_id)    query = query.eq('job_id', job_id)
  if (from_date) query = query.gte('clock_in', from_date)
  if (to_date)   query = query.lte('clock_in', to_date)

  const { data, error, count } = await query
  if (error) return res.status(400).json({ error: error.message })
  res.json({ data, total: count })
})

// GET /api/timesheets/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*, jobs(*), users(id, full_name, color)')
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .single()
  if (error) return res.status(404).json({ error: 'Time entry not found' })
  res.json(data)
})

// POST /api/timesheets/clock-in
router.post('/clock-in', async (req, res) => {
  const { job_id, clock_in_lat, clock_in_lng, distance_from_site } = req.body
  if (!job_id) return res.status(400).json({ error: 'job_id is required' })

  // Check for open entry
  const { data: open } = await supabase
    .from('time_entries')
    .select('id')
    .eq('tenant_id', req.tenantId)
    .eq('user_id', req.user.id)
    .is('clock_out', null)
    .single()
  if (open) return res.status(400).json({ error: 'Already clocked in. Clock out first.' })

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      tenant_id: req.tenantId, job_id, user_id: req.user.id,
      clock_in: new Date().toISOString(),
      clock_in_lat, clock_in_lng, distance_from_site,
    })
    .select('*, jobs(job_number, title)').single()
  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
})

// POST /api/timesheets/clock-out
router.post('/clock-out', async (req, res) => {
  const { clock_out_lat, clock_out_lng, notes, labor_rate = 75 } = req.body

  const { data: entry } = await supabase
    .from('time_entries')
    .select('*')
    .eq('tenant_id', req.tenantId)
    .eq('user_id', req.user.id)
    .is('clock_out', null)
    .single()
  if (!entry) return res.status(400).json({ error: 'No active clock-in found' })

  const clockOut   = new Date()
  const clockIn    = new Date(entry.clock_in)
  const totalHours = +((clockOut - clockIn) / 3600000).toFixed(2)
  const laborCost  = +(totalHours * labor_rate).toFixed(2)

  const { data, error } = await supabase
    .from('time_entries')
    .update({ clock_out: clockOut.toISOString(), clock_out_lat, clock_out_lng, total_hours: totalHours, labor_cost: laborCost, notes })
    .eq('id', entry.id)
    .select('*, jobs(job_number, title)').single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// PUT /api/timesheets/:id — admin correction
router.put('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' })

  const allowed = ['clock_in', 'clock_out', 'total_hours', 'labor_cost', 'notes']
  const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))

  const { data, error } = await supabase
    .from('time_entries')
    .update(patch)
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// DELETE /api/timesheets/:id
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
  const { error } = await supabase.from('time_entries').delete().eq('id', req.params.id).eq('tenant_id', req.tenantId)
  if (error) return res.status(400).json({ error: error.message })
  res.json({ message: 'Entry deleted' })
})

// GET /api/timesheets/summary — aggregate stats per tech
router.get('/summary/by-tech', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' })

  const { from_date, to_date } = req.query
  let query = supabase
    .from('time_entries')
    .select('user_id, total_hours, labor_cost, users(id, full_name, color)')
    .eq('tenant_id', req.tenantId)
    .not('clock_out', 'is', null)

  if (from_date) query = query.gte('clock_in', from_date)
  if (to_date)   query = query.lte('clock_in', to_date)

  const { data, error } = await query
  if (error) return res.status(400).json({ error: error.message })

  // Aggregate by user
  const byTech = {}
  for (const e of data || []) {
    if (!byTech[e.user_id]) {
      byTech[e.user_id] = { user: e.users, totalHours: 0, totalCost: 0, entryCount: 0 }
    }
    byTech[e.user_id].totalHours  += e.total_hours  || 0
    byTech[e.user_id].totalCost   += e.labor_cost   || 0
    byTech[e.user_id].entryCount  += 1
  }
  res.json(Object.values(byTech))
})

module.exports = router
