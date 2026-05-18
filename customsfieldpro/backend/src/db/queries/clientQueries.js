// All client queries — tenant-scoped, parameterized via QueryHelper.
// Never build filter strings by concatenating user input.

const { QueryHelper } = require('../queryHelper')
const supabase = require('../../utils/supabase')

function qh(tenantId) { return new QueryHelper(supabase, tenantId) }

async function getClients(tenantId, { search, client_type, page = 1, limit = 50 } = {}) {
  const from = (page - 1) * limit
  let query = supabase
    .from('clients')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (search) {
    // .ilike() is parameterized by the Supabase JS client
    const s = search.replace(/[%_\\]/g, c => `\\${c}`)
    query = query.or(
      [
        `first_name.ilike.%${s}%`,
        `last_name.ilike.%${s}%`,
        `email.ilike.%${s}%`,
        `phone.ilike.%${s}%`,
      ].join(',')
    )
  }
  if (client_type) query = query.eq('client_type', client_type)

  const { data, error, count } = await query
  if (error) throw error
  return { data, total: count, page: +page, limit: +limit }
}

async function getClientById(tenantId, clientId) {
  const { data, error } = await supabase
    .from('clients')
    .select('*, jobs(id, job_number, title, status, scheduled_start, total), invoices(id, invoice_number, total, status)')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()
  if (error) throw error
  return data
}

async function createClient(tenantId, userId, fields) {
  const allowed = ['first_name', 'last_name', 'email', 'phone', 'address', 'city', 'zip',
                   'property_type', 'client_type', 'notes', 'portal_access']
  const clean = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)))
  return qh(tenantId).insert('clients', { ...clean, created_by: userId })
}

async function updateClient(tenantId, clientId, fields) {
  const allowed = ['first_name', 'last_name', 'email', 'phone', 'address', 'city', 'zip',
                   'property_type', 'client_type', 'notes', 'portal_access']
  const clean = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)))
  return qh(tenantId).update('clients', clientId, clean)
}

async function deleteClient(tenantId, clientId) {
  return qh(tenantId).delete('clients', clientId)
}

module.exports = { getClients, getClientById, createClient, updateClient, deleteClient }
