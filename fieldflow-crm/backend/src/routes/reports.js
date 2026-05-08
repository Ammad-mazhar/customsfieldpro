const router   = require('express').Router()
const auth     = require('../middleware/auth')
const supabase = require('../utils/supabase')

router.use(auth)

const adminOnly = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admin only' })

// GET /api/reports/revenue — revenue over time
router.get('/revenue', adminOnly, async (req, res) => {
  const { from_date, to_date, group_by = 'month' } = req.query

  let query = supabase
    .from('invoices')
    .select('total, paid_date, status')
    .eq('tenant_id', req.tenantId)
    .eq('status', 'paid')

  if (from_date) query = query.gte('paid_date', from_date)
  if (to_date)   query = query.lte('paid_date', to_date)

  const { data, error } = await query
  if (error) return res.status(400).json({ error: error.message })

  // Group by month
  const grouped = {}
  for (const inv of data || []) {
    const date  = new Date(inv.paid_date)
    const key   = group_by === 'month'
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : date.getFullYear().toString()
    grouped[key] = (grouped[key] || 0) + Number(inv.total)
  }

  const series = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, revenue]) => ({ period, revenue: +revenue.toFixed(2) }))

  res.json({ series, total: data.reduce((s, i) => s + Number(i.total), 0) })
})

// GET /api/reports/jobs — job completion stats
router.get('/jobs', adminOnly, async (req, res) => {
  const { from_date, to_date } = req.query

  let query = supabase
    .from('jobs')
    .select('status, service_type, assigned_to, created_at, users!assigned_to(full_name)')
    .eq('tenant_id', req.tenantId)

  if (from_date) query = query.gte('created_at', from_date)
  if (to_date)   query = query.lte('created_at', to_date)

  const { data, error } = await query
  if (error) return res.status(400).json({ error: error.message })

  const byStatus  = {}
  const byType    = {}
  const byTech    = {}

  for (const job of data || []) {
    byStatus[job.status] = (byStatus[job.status] || 0) + 1
    byType[job.service_type || 'Other'] = (byType[job.service_type || 'Other'] || 0) + 1
    const techName = job.users?.full_name || 'Unassigned'
    if (!byTech[techName]) byTech[techName] = { total: 0, completed: 0 }
    byTech[techName].total += 1
    if (job.status === 'completed') byTech[techName].completed += 1
  }

  res.json({
    total: data.length,
    byStatus,
    byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
    byTech: Object.entries(byTech).map(([name, s]) => ({ name, ...s, rate: +(s.completed / s.total * 100).toFixed(1) })),
  })
})

// GET /api/reports/clients — client stats
router.get('/clients', adminOnly, async (req, res) => {
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, client_type, city, created_at')
    .eq('tenant_id', req.tenantId)
  if (error) return res.status(400).json({ error: error.message })

  const byType = {}
  const byMonth = {}
  for (const c of clients || []) {
    byType[c.client_type || 'residential'] = (byType[c.client_type || 'residential'] || 0) + 1
    const month = c.created_at?.slice(0, 7)
    if (month) byMonth[month] = (byMonth[month] || 0) + 1
  }

  res.json({
    total: clients.length,
    byType,
    growth: Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count })),
  })
})

// GET /api/reports/invoices — invoice/AR summary
router.get('/invoices', adminOnly, async (req, res) => {
  const { data, error } = await supabase
    .from('invoices')
    .select('status, total, due_date')
    .eq('tenant_id', req.tenantId)
  if (error) return res.status(400).json({ error: error.message })

  const now = new Date()
  let totalOutstanding = 0, totalOverdue = 0, totalPaid = 0

  for (const inv of data || []) {
    const amount = Number(inv.total)
    if (inv.status === 'paid') { totalPaid += amount }
    else if (inv.status === 'sent' || inv.status === 'overdue') {
      totalOutstanding += amount
      if (inv.due_date && new Date(inv.due_date) < now) totalOverdue += amount
    }
  }

  res.json({
    totalPaid: +totalPaid.toFixed(2),
    totalOutstanding: +totalOutstanding.toFixed(2),
    totalOverdue: +totalOverdue.toFixed(2),
    byStatus: data.reduce((acc, inv) => { acc[inv.status] = (acc[inv.status] || 0) + 1; return acc }, {}),
  })
})

// GET /api/reports/technicians — technician performance
router.get('/technicians', adminOnly, async (req, res) => {
  const { from_date, to_date } = req.query

  let jobQuery = supabase
    .from('jobs')
    .select('assigned_to, status, rating, users!assigned_to(id, full_name, color)')
    .eq('tenant_id', req.tenantId)
    .not('assigned_to', 'is', null)

  if (from_date) jobQuery = jobQuery.gte('created_at', from_date)
  if (to_date)   jobQuery = jobQuery.lte('created_at', to_date)

  const [{ data: jobs }, { data: timeEntries }] = await Promise.all([
    jobQuery,
    supabase.from('time_entries').select('user_id, total_hours, labor_cost').eq('tenant_id', req.tenantId).not('clock_out', 'is', null),
  ])

  const stats = {}
  for (const job of jobs || []) {
    const id = job.assigned_to
    if (!stats[id]) stats[id] = { tech: job.users, totalJobs: 0, completedJobs: 0, totalRating: 0, ratingCount: 0, totalHours: 0 }
    stats[id].totalJobs += 1
    if (job.status === 'completed') stats[id].completedJobs += 1
    if (job.rating?.score) { stats[id].totalRating += Number(job.rating.score); stats[id].ratingCount += 1 }
  }
  for (const te of timeEntries || []) {
    if (stats[te.user_id]) stats[te.user_id].totalHours += Number(te.total_hours || 0)
  }

  const result = Object.values(stats).map(s => ({
    ...s,
    avgRating: s.ratingCount ? +(s.totalRating / s.ratingCount).toFixed(1) : null,
    completionRate: s.totalJobs ? +(s.completedJobs / s.totalJobs * 100).toFixed(1) : 0,
    totalHours: +s.totalHours.toFixed(1),
  }))

  res.json(result)
})

// GET /api/reports/dashboard — combined dashboard stats
router.get('/dashboard', adminOnly, async (req, res) => {
  const tid = req.tenantId
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { count: totalClients },
    { count: openJobs },
    { count: jobsThisMonth },
    { data: invoices },
    { data: lowStock },
  ] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).in('status', ['new', 'in_progress', 'scheduled']),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).gte('created_at', firstOfMonth),
    supabase.from('invoices').select('total, status').eq('tenant_id', tid),
    supabase.from('inventory').select('id').eq('tenant_id', tid).lte('in_stock', 0),
  ])

  const revenueThisMonth = (invoices || [])
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + Number(i.total), 0)

  const outstanding = (invoices || [])
    .filter(i => i.status !== 'paid' && i.status !== 'draft')
    .reduce((s, i) => s + Number(i.total), 0)

  res.json({
    totalClients,
    openJobs,
    jobsThisMonth,
    revenueThisMonth: +revenueThisMonth.toFixed(2),
    outstanding: +outstanding.toFixed(2),
    lowStockCount: lowStock?.length || 0,
  })
})

module.exports = router
