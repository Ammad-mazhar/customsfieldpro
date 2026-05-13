import { createContext, useContext, useState, useEffect } from 'react'
import { readPermissions } from '../data/permissions'
import { clearAccessToken } from '../utils/apiClient'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const AuthContext = createContext(null)

// ── Demo users ────────────────────────────────────────────────────────────────
const DEMO_USERS = [
  { id: 'user-1', email: 'admin@fieldflow.com', password: 'admin123', name: 'Admin User', role: 'admin', tenantId: 'demo-tenant' },
  { id: 'user-2', email: 'moore@fieldflow.com', password: 'staff123', name: 'D. Moore', role: 'staff', technicianId: 'tech-1', tenantId: 'demo-tenant' },
  { id: 'user-3', email: 'torres@fieldflow.com', password: 'staff123', name: 'A. Torres', role: 'staff', technicianId: 'tech-2', tenantId: 'demo-tenant' },
  { id: 'user-4', email: 'singh@fieldflow.com', password: 'staff123', name: 'R. Singh', role: 'staff', technicianId: 'tech-3', tenantId: 'demo-tenant' },
]

const DEMO_EMAILS = new Set(DEMO_USERS.map(u => u.email))

const SESSION_KEY = 'fieldflow_session'

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadSession())

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
      const normalizedEmail = email.toLowerCase().trim()

      // Demo accounts always take priority
      const demoUser = DEMO_USERS.find(
        u => u.email === normalizedEmail && u.password === password
      )
      if (demoUser) {
        const { password: _, ...safeUser } = demoUser
        saveSession(safeUser)
        setUser(safeUser)
        return null
      }

      // Check localStorage users
      let storedUsers = []
      try {
        const raw = localStorage.getItem('fieldflow_users')
        const parsed = raw ? JSON.parse(raw) : []
        storedUsers = Array.isArray(parsed) ? parsed : []
      } catch { storedUsers = [] }

      const found = storedUsers.find(
        u => u.email?.toLowerCase() === normalizedEmail && u.password === password
      )
      if (!found) return 'Invalid email or password.'

      const { password: _, ...safeUser } = found
      saveSession(safeUser)
      setUser(safeUser)
      return null
    } catch {
      return 'An unexpected error occurred. Please try again.'
    }
  }

  async function logout() {
    try {
      await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' })
    } catch { /* ignore */ }
    clearAccessToken()
    clearSession()
    setUser(null)
  }

  function updateProfile(updates) {
    if (!user) return 'Not logged in.'
    const updated = { ...user, ...updates }
    saveSession(updated)
    setUser(updated)
    return null
  }

  function changePassword(currentPassword, newPassword) {
    if (DEMO_EMAILS.has(user?.email)) {
      return 'Demo account passwords cannot be changed.'
    }
    const found = DEMO_USERS.find(u => u.id === user?.id)
    if (found && found.password !== currentPassword) return 'Current password is incorrect.'
    return null
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
      login, logout, updateProfile, changePassword, hasPermission,
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
