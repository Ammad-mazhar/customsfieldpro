import { apiFetch } from './base'

export const getQuotes = async (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return apiFetch(`/api/quotes${qs ? `?${qs}` : ''}`)
}

export const getQuote = async (id) =>
  apiFetch(`/api/quotes/${id}`)

export const createQuote = async (data) =>
  apiFetch('/api/quotes', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateQuote = async (id, data) =>
  apiFetch(`/api/quotes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })

export const deleteQuote = async (id) =>
  apiFetch(`/api/quotes/${id}`, { method: 'DELETE' })

export const convertQuote = async (id) =>
  apiFetch(`/api/quotes/${id}/convert`, { method: 'POST' })

export const sendQuote = async (id) =>
  apiFetch(`/api/quotes/${id}/send`, { method: 'POST' })
