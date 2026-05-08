import { apiFetch } from './base'

export const getRequests = async (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return apiFetch(`/api/requests${qs ? `?${qs}` : ''}`)
}

export const getRequest = async (id) =>
  apiFetch(`/api/requests/${id}`)

export const createRequest = async (data) =>
  apiFetch('/api/requests', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateRequest = async (id, data) =>
  apiFetch(`/api/requests/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })

export const deleteRequest = async (id) =>
  apiFetch(`/api/requests/${id}`, { method: 'DELETE' })
