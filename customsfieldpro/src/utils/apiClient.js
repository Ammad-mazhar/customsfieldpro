// Centralized API client.
// - Attaches Authorization header automatically.
// - On 401: clears token and throws AuthenticationError immediately.
// - On 403: throws AuthorizationError (show Access Denied, do NOT redirect).

console.log('API URL:', import.meta.env.VITE_API_URL)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
console.log('[apiClient] API_URL =', API_URL)

export class AuthorizationError extends Error {
  constructor(msg = 'Access denied') {
    super(msg)
    this.name = 'AuthorizationError'
  }
}

export class AuthenticationError extends Error {
  constructor(msg = 'Authentication required') {
    super(msg)
    this.name = 'AuthenticationError'
  }
}

export class PlanUpgradeError extends Error {
  constructor(msg = 'Feature not available on your current plan') {
    super(msg)
    this.name = 'PlanUpgradeError'
  }
}

let _accessToken = null
let _onUnauthenticated = null   // called on 401 → redirect to login
let _onPlanUpgrade = null       // called on 402 → show upgrade modal

export function setAccessToken(token)           { _accessToken = token }
export function getAccessToken()                { return _accessToken }
export function clearAccessToken()              { _accessToken = null }
export function setOnUnauthenticated(callback)  { _onUnauthenticated = callback }
export function setOnPlanUpgrade(callback)      { _onPlanUpgrade = callback }

export async function apiCall(endpoint, options = {}) {
  console.log('[apiClient] API call to:', API_URL + endpoint)
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',  // always send cookies (for refresh token)
  })

  // Propagate X-Request-ID for error reporting
  const requestId = response.headers.get('X-Request-ID')

  if (response.status === 401) {
    clearAccessToken()
    localStorage.removeItem('token')
    localStorage.removeItem('customsfieldpro_session')
    if (_onUnauthenticated) _onUnauthenticated()
    throw new AuthenticationError()
  }

  if (response.status === 402) {
    const body = await response.json().catch(() => ({}))
    if (_onPlanUpgrade) _onPlanUpgrade(body)
    throw new PlanUpgradeError(body.error)
  }

  if (response.status === 403) {
    throw new AuthorizationError()
  }

  return response
}

// ── Convenience wrappers ──────────────────────────────────────────────────────

export async function apiGet(endpoint, queryParams) {
  const url = queryParams
    ? `${endpoint}?${new URLSearchParams(queryParams)}`
    : endpoint
  const res = await apiCall(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function apiPost(endpoint, body) {
  const res = await apiCall(endpoint, {
    method:  'POST',
    body:    body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function apiPut(endpoint, body) {
  const res = await apiCall(endpoint, {
    method: 'PUT',
    body:   JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function apiPatch(endpoint, body) {
  const res = await apiCall(endpoint, {
    method: 'PATCH',
    body:   JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function apiDelete(endpoint) {
  const res = await apiCall(endpoint, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `Request failed: ${res.status}`)
  }
  return res.json()
}
