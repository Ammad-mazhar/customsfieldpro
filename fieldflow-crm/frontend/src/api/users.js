import { apiFetch } from './base'

export const getUsers = async () =>
  apiFetch('/api/users')

export const getUser = async (id) =>
  apiFetch(`/api/users/${id}`)

export const createUser = async (data) =>
  apiFetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateUser = async (id, data) =>
  apiFetch(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })

export const deleteUser = async (id) =>
  apiFetch(`/api/users/${id}`, { method: 'DELETE' })

export const resetUserPassword = async (id, data) =>
  apiFetch(`/api/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
