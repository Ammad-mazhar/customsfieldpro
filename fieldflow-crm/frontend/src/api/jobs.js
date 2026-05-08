import { apiFetch } from './base'

export const getJobs = async (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return apiFetch(`/api/jobs${qs ? `?${qs}` : ''}`)
}

export const getJob = async (id) =>
  apiFetch(`/api/jobs/${id}`)

export const createJob = async (data) =>
  apiFetch('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateJob = async (id, data) =>
  apiFetch(`/api/jobs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })

export const deleteJob = async (id) =>
  apiFetch(`/api/jobs/${id}`, { method: 'DELETE' })

export const completeJob = async (id, data) =>
  apiFetch(`/api/jobs/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
