// Invoice queries — admin-only writes, tenant-scoped reads.

const { QueryHelper } = require('../queryHelper')
const supabase = require('../../utils/supabase')

function qh(tenantId) { return new QueryHelper(supabase, tenantId) }

async function getInvoices(tenantId, { status, client_id, search, page = 1, limit = 50 } = {}) {
  const from = (page - 1) * limit
  let query = supabase
    .from('invoices')
    .select('*, clients(id, first_name, last_name, email), jobs(id, job_number, title)', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (status)    query = query.eq('status', status)
  if (client_id) query = query.eq('client_id', client_id)
  if (search) {
    const s = search.replace(/[%_\\]/g, c => `\\${c}`)
    query = query.ilike('invoice_number', `%${s}%`)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data, total: count, page: +page, limit: +limit }
}

async function getInvoiceById(tenantId, invoiceId) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, clients(*), jobs(id, job_number, title, service_type)')
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .single()
  if (error) throw error
  return data
}

async function createInvoice(tenantId, userId, fields) {
  const { client_id, job_id, line_items = [], subtotal = 0, tax_rate = 0, notes, issue_date, due_date } = fields

  const { count } = await supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId)
  const invoice_number = `INV-${String((count || 0) + 1001).padStart(4, '0')}`

  const tax_amount = +(subtotal * (tax_rate / 100)).toFixed(2)
  const total      = +(subtotal + tax_amount).toFixed(2)

  return qh(tenantId).insert('invoices', {
    invoice_number, client_id, job_id, line_items,
    subtotal, tax_rate, tax_amount, total, notes,
    issue_date: issue_date || new Date().toISOString().split('T')[0],
    due_date,
    status:     'draft',
    created_by: userId,
  })
}

async function updateInvoice(tenantId, invoiceId, fields) {
  const allowed = ['line_items', 'subtotal', 'tax_rate', 'tax_amount', 'total', 'status',
                   'notes', 'due_date', 'paid_date', 'payment_method', 'stripe_payment_id']
  const clean = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)))
  if (clean.status === 'paid' && !clean.paid_date) clean.paid_date = new Date().toISOString().split('T')[0]
  return qh(tenantId).update('invoices', invoiceId, clean)
}

async function deleteInvoice(tenantId, invoiceId) {
  return qh(tenantId).delete('invoices', invoiceId)
}

module.exports = { getInvoices, getInvoiceById, createInvoice, updateInvoice, deleteInvoice }
