// All job queries — tenant-scoped, role-aware, parameterized.

const { QueryHelper } = require('../queryHelper')
const supabase = require('../../utils/supabase')

function qh(tenantId) { return new QueryHelper(supabase, tenantId) }

async function getJobs(tenantId, userId, userRole, { status, assigned_to, client_id, search, page = 1, limit = 50 } = {}) {
  const from = (page - 1) * limit

  let query = supabase
    .from('jobs')
    .select('*, clients(id, first_name, last_name, email, phone), users!assigned_to(id, full_name, color)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (tenantId) query = query.eq('tenant_id', tenantId)

  // Technicians only see their own jobs — enforced on backend, not just frontend
  if (userRole === 'staff' || userRole === 'technician') {
    query = query.eq('assigned_to', userId)
  }

  if (status)      query = query.eq('status', status)
  if (assigned_to && (userRole === 'admin')) query = query.eq('assigned_to', assigned_to) // admin can filter by any tech
  if (client_id)   query = query.eq('client_id', client_id)
  if (search) {
    const s = search.replace(/[%_\\]/g, c => `\\${c}`)
    query = query.or(`job_number.ilike.%${s}%,title.ilike.%${s}%`)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data, total: count, page: +page, limit: +limit }
}

async function getJobById(tenantId, jobId) {
  let query = supabase
    .from('jobs')
    .select('*, clients(*), users!assigned_to(id, full_name, email, color, specialty), time_entries(*), invoices(id, invoice_number, total, status)')
    .eq('id', jobId)
  if (tenantId) query = query.eq('tenant_id', tenantId)
  const { data, error } = await query.single()
  if (error) throw error
  return data
}

async function createJob(tenantId, userId, fields) {
  const allowed = ['client_id', 'title', 'description', 'service_type', 'priority',
                   'assigned_to', 'scheduled_start', 'scheduled_end', 'equipment',
                   'line_items', 'recurrence']
  const clean = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)))

  // Generate job number
  let countQuery = supabase.from('jobs').select('id', { count: 'exact', head: true })
  if (tenantId) countQuery = countQuery.eq('tenant_id', tenantId)
  const { count } = await countQuery
  const job_number = `JOB-${String((count || 0) + 1001).padStart(4, '0')}`

  return qh(tenantId).insert('jobs', {
    ...clean,
    job_number,
    status:   'new',
    created_by: userId,
    equipment:  clean.equipment  || [],
    line_items: clean.line_items || [],
  })
}

async function updateJob(tenantId, jobId, userId, userRole, fields) {
  // Non-admins can only update their own jobs
  if (userRole !== 'admin') {
    const { data: existing } = await supabase.from('jobs').select('assigned_to').eq('id', jobId).single()
    if (!existing || existing.assigned_to !== userId) {
      const err = new Error('Forbidden'); err.status = 403; throw err
    }
  }

  const allowed = [
    'title', 'description', 'service_type', 'status', 'priority', 'assigned_to',
    'scheduled_start', 'scheduled_end', 'actual_start', 'actual_end',
    'equipment', 'line_items', 'photos', 'completion_checklist',
    'signature', 'signature_name', 'completion_notes', 'rating', 'recurrence', 'branch_id',
  ]
  const clean = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)))
  return qh(tenantId).update('jobs', jobId, clean)
}

async function completeJob(tenantId, jobId, userId, userRole, fields) {
  // Verify ownership before marking complete (admins bypass)
  if (userRole !== 'admin' && userRole !== 'staff') {
    let jobQuery = supabase.from('jobs').select('assigned_to').eq('id', jobId)
    if (tenantId) jobQuery = jobQuery.eq('tenant_id', tenantId)
    const { data: job } = await jobQuery.single()
    if (!job || job.assigned_to !== userId) {
      const err = new Error('Forbidden'); err.status = 403; throw err
    }
  }

  const allowed = ['completion_notes', 'completion_checklist', 'signature', 'signature_name', 'rating', 'photos']
  const clean = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)))

  return qh(tenantId).update('jobs', jobId, {
    ...clean,
    status:     'completed',
    actual_end: new Date().toISOString(),
  })
}

async function deleteJob(tenantId, jobId) {
  return qh(tenantId).delete('jobs', jobId)
}

module.exports = { getJobs, getJobById, createJob, updateJob, completeJob, deleteJob }
