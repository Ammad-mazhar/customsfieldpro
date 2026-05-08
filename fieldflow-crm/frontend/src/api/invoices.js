import { apiFetch } from './base'

export const getInvoices = async (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return apiFetch(`/api/invoices${qs ? `?${qs}` : ''}`)
}

export const getInvoice = async (id) =>
  apiFetch(`/api/invoices/${id}`)

export const createInvoice = async (data) =>
  apiFetch('/api/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateInvoice = async (id, data) =>
  apiFetch(`/api/invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })

export const deleteInvoice = async (id) =>
  apiFetch(`/api/invoices/${id}`, { method: 'DELETE' })

export const sendInvoice = async (id) =>
  apiFetch(`/api/invoices/${id}/send`, { method: 'POST' })

export const getInvoicePdf = async (id) =>
  apiFetch(`/api/invoices/${id}/pdf`)
