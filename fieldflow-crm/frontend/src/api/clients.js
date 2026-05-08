import { apiFetch } from './base'

export const getClients = async (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return apiFetch(`/api/clients${qs ? `?${qs}` : ''}`)
}

export const getClient = async (id) =>
  apiFetch(`/api/clients/${id}`)

export const createClient = async (data) =>
  apiFetch('/api/clients', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateClient = async (id, data) =>
  apiFetch(`/api/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })

export const deleteClient = async (id) =>
  apiFetch(`/api/clients/${id}`, { method: 'DELETE' })
