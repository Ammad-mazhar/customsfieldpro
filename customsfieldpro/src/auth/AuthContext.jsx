import { createContext, useContext, useState, useEffect } from 'react'
import { readPermissions } from '../data/permissions'
import { setAccessToken, clearAccessToken } from '../utils/apiClient'

const API_URL = import.meta.env.VITE_API_URL ?? 'https://api.customfieldpros.com'

const AuthContext = createContext(null)

const SESSION_KEY = 'customsfieldpro_session'
const TOKEN_KEY = 'token'

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveSession(user, token) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem('user') // Clean up old key if exists
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadSession())
  const [loading, setLoading] = useState(false)

  // Keep session in sync across tabs
  useEffect(() => {
    function onStorage(e) {
      if (e.key === SESSION_KEY) {
        setUser(e.newValue ? JSON.parse(e.newValue) : null)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  async function login(email, password) {
    try {
      setLoading(true)
      const normalizedEmail = email.toLowerCase().trim()

      // Call backend API for authentication
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: normalizedEmail, password })
      })

      const data = await response.json()

      if (!response.ok) {
        return data.error || 'Invalid email or password.'
      }

      if (data.success && data.token && data.user) {
        // Map backend user structure to frontend structure
        const mappedUser = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name || data.user.full_name,
          role: data.user.role,
          tenantId: data.user.tenant_id || 'demo-tenant',
          technicianId: data.user.technician_id
        }

        saveSession(mappedUser, data.token)
        setAccessToken(data.token)
        setUser(mappedUser)
        return null
      }

      return 'Login failed. Please try again.'
    } catch (error) {
      console.error('Login error:', error)
      return 'Network error. Please check your connection and try again.'
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    try {
      await fetch(`${API_URL}/api/auth/logout`, { 
        method: 'POST', 
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
        }
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
    clearAccessToken()
    clearSession()
    setUser(null)
  }

  function updateProfile(updates) {
    if (!user) return 'Not logged in.'
    const updated = { ...user, ...updates }
    saveSession(updated, localStorage.getItem(TOKEN_KEY))
    setUser(updated)
    return null
  }

  function changePassword(currentPassword, newPassword) {
    // TODO: Implement backend password change
    return 'Password change not yet implemented.'
  }

  function hasPermission(key) {
    if (!user) return false
    if (user.role === 'admin') return true
    const perms = readPermissions()
    const roleKey = user.role === 'technician' ? 'technician' : 'staff'
    return perms[roleKey]?.[key] ?? false
  }

  return (
    <AuthContext.Provider value={{
      user,
      role: user?.role ?? null,
      isAdmin: user?.role === 'admin',
      isStaff: user?.role === 'staff',
      loading,
      login, 
      logout, 
      updateProfile, 
      changePassword, 
      hasPermission,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}