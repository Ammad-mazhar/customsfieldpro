import { apiGet, apiPost, apiPut, apiDelete } from '../utils/apiClient'

function normalizeList(result) {
  if (Array.isArray(result)) return result
  if (Array.isArray(result?.data)) return result.data
  if (Array.isArray(result?.clients)) return result.clients
  return []
}

function normalizeRecord(result) {
  if (result?.id) return result
  if (result?.data?.id) return result.data
  if (result?.client?.id) return result.client
  return null
}

export const api = {
  async getClients() {
    const result = await apiGet('/api/clients')
    return { data: normalizeList(result) }
  },

  async createClient(data) {
    const result = await apiPost('/api/clients', data)
    const record = normalizeRecord(result)
    return { success: !!record, data: record }
  },

  async updateClient(id, data) {
    const result = await apiPut(`/api/clients/${id}`, data)
    const record = normalizeRecord(result)
    return { success: !!record, data: record }
  },

  async deleteClient(id) {
    return apiDelete(`/api/clients/${id}`)
  },
}
