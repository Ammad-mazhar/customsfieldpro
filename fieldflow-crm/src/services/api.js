import { apiGet, apiPost, apiPut, apiDelete } from '../utils/apiClient'

// ── Response shape normalisers ────────────────────────────────────────────────
// Backend responses vary: lists are { data: [], total } or { data: [] };
// single records come back as plain objects or { success, data }.

function toList(result) {
  if (Array.isArray(result))       return { data: result,       total: result.length }
  if (Array.isArray(result?.data)) return { data: result.data,  total: result.total ?? result.data.length }
  return { data: [], total: 0 }
}

function toRecord(result) {
  if (result?.data && !Array.isArray(result.data)) return result.data  // { success, data }
  if (result?.id)  return result                                        // plain object
  return null
}

// ── Clients ───────────────────────────────────────────────────────────────────

export const api = {
  async getClients(params) {
    const result = await apiGet('/api/clients', params)
    return toList(result)
  },
  async getClient(id) {
    const result = await apiGet(`/api/clients/${id}`)
    return toRecord(result) ?? result
  },
  async createClient(data) {
    const result = await apiPost('/api/clients', data)
    const record = toRecord(result)
    return { success: !!record, data: record }
  },
  async updateClient(id, data) {
    const result = await apiPut(`/api/clients/${id}`, data)
    const record = toRecord(result)
    return { success: !!record, data: record }
  },
  async deleteClient(id) {
    return apiDelete(`/api/clients/${id}`)
  },

  // ── Jobs ────────────────────────────────────────────────────────────────────

  async getJobs(params) {
    return toList(await apiGet('/api/jobs', params))
  },
  async getJob(id) {
    return apiGet(`/api/jobs/${id}`)
  },
  async createJob(data) {
    return apiPost('/api/jobs', data)
  },
  async updateJob(id, data) {
    return apiPut(`/api/jobs/${id}`, data)
  },
  async completeJob(id, data) {
    return apiPost(`/api/jobs/${id}/complete`, data)
  },
  async deleteJob(id) {
    return apiDelete(`/api/jobs/${id}`)
  },

  // ── Invoices ────────────────────────────────────────────────────────────────

  async getInvoices(params) {
    return toList(await apiGet('/api/invoices', params))
  },
  async getInvoice(id) {
    return apiGet(`/api/invoices/${id}`)
  },
  async createInvoice(data) {
    return apiPost('/api/invoices', data)
  },
  async updateInvoice(id, data) {
    return apiPut(`/api/invoices/${id}`, data)
  },
  async sendInvoice(id) {
    return apiPost(`/api/invoices/${id}/send`)
  },
  async deleteInvoice(id) {
    return apiDelete(`/api/invoices/${id}`)
  },

  // ── Quotes ──────────────────────────────────────────────────────────────────

  async getQuotes(params) {
    return toList(await apiGet('/api/quotes', params))
  },
  async getQuote(id) {
    return apiGet(`/api/quotes/${id}`)
  },
  async createQuote(data) {
    return apiPost('/api/quotes', data)
  },
  async updateQuote(id, data) {
    return apiPut(`/api/quotes/${id}`, data)
  },
  async sendQuote(id) {
    return apiPost(`/api/quotes/${id}/send`)
  },
  async convertQuote(id) {
    return apiPost(`/api/quotes/${id}/convert`)
  },
  async deleteQuote(id) {
    return apiDelete(`/api/quotes/${id}`)
  },

  // ── Service Requests ────────────────────────────────────────────────────────

  async getRequests(params) {
    return toList(await apiGet('/api/requests', params))
  },
  async getRequest(id) {
    return apiGet(`/api/requests/${id}`)
  },
  async createRequest(data) {
    return apiPost('/api/requests', data)
  },
  async updateRequest(id, data) {
    return apiPut(`/api/requests/${id}`, data)
  },
  async convertRequest(id) {
    return apiPost(`/api/requests/${id}/convert`)
  },
  async deleteRequest(id) {
    return apiDelete(`/api/requests/${id}`)
  },

  // ── Users ───────────────────────────────────────────────────────────────────

  async getUsers(params) {
    const result = await apiGet('/api/users', params)
    return Array.isArray(result) ? result : (result?.data ?? [])
  },
  async getUser(id) {
    return apiGet(`/api/users/${id}`)
  },
  async createUser(data) {
    return apiPost('/api/users', data)
  },
  async updateUser(id, data) {
    return apiPut(`/api/users/${id}`, data)
  },
  async updateUserPermissions(id, permissions) {
    return apiPut(`/api/users/${id}/permissions`, { permissions })
  },
  async deleteUser(id) {
    return apiDelete(`/api/users/${id}`)
  },

  // ── Inventory ────────────────────────────────────────────────────────────────

  async getInventory(params) {
    return toList(await apiGet('/api/inventory', params))
  },
  async getInventoryItem(id) {
    return apiGet(`/api/inventory/${id}`)
  },
  async createInventoryItem(data) {
    return apiPost('/api/inventory', data)
  },
  async updateInventoryItem(id, data) {
    return apiPut(`/api/inventory/${id}`, data)
  },
  async adjustStock(id, delta, reason) {
    return apiPost(`/api/inventory/${id}/adjust`, { delta, reason })
  },
  async deleteInventoryItem(id) {
    return apiDelete(`/api/inventory/${id}`)
  },

  // ── Timesheets ────────────────────────────────────────────────────────────────

  async getTimesheets(params) {
    return toList(await apiGet('/api/timesheets', params))
  },
  async getTimesheet(id) {
    return apiGet(`/api/timesheets/${id}`)
  },
  async clockIn(data) {
    return apiPost('/api/timesheets/clock-in', data)
  },
  async clockOut(data) {
    return apiPost('/api/timesheets/clock-out', data)
  },
  async updateTimesheet(id, data) {
    return apiPut(`/api/timesheets/${id}`, data)
  },
  async deleteTimesheet(id) {
    return apiDelete(`/api/timesheets/${id}`)
  },
  async getTimesheetSummary(params) {
    const result = await apiGet('/api/timesheets/summary/by-tech', params)
    return Array.isArray(result) ? result : []
  },

  // ── Equipment ─────────────────────────────────────────────────────────────────

  async getEquipment(params) {
    return toList(await apiGet('/api/equipment', params))
  },
  async getEquipmentItem(id) {
    return apiGet(`/api/equipment/${id}`)
  },
  async createEquipment(data) {
    return apiPost('/api/equipment', data)
  },
  async updateEquipment(id, data) {
    return apiPut(`/api/equipment/${id}`, data)
  },
  async deleteEquipment(id) {
    return apiDelete(`/api/equipment/${id}`)
  },
}
