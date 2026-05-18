import { supabase } from '../lib/supabase'

export const API_URL = import.meta.env.VITE_API_URL || ''

export const getHeaders = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    }
  } catch {
    return { 'Content-Type': 'application/json' }
  }
}

/**
 * Thin wrapper around fetch that:
 *  - Prepends API_URL
 *  - Injects auth headers
 *  - Throws on HTTP errors
 */
export async function apiFetch(path, options = {}) {
  if (!API_URL) throw new Error('VITE_API_URL not configured')
  const headers = await getHeaders()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}
