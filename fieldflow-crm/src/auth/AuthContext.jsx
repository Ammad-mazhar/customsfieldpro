import { createContext, useContext, useState, useEffect } from 'react'
import { readPermissions } from '../data/permissions'

const AuthContext = createContext(null)

// ── Demo users ────────────────────────────────────────────────────────────────
const DEMO_USERS = [
  {
    id: 'user-admin-1',
    name: 'Admin User',
    email: 'admin@fieldflow.com',
    password: 'admin123',
    role: 'admin',
    technicianId: null,
  },
  {
    id: 'user-staff-1',
    name: 'D. Moore',
    email: 'moore@fieldflow.com',
    password: 'staff123',
    role: 'technician',
    technicianId: 'moore',
  },
  {
    id: 'user-staff-2',
    name: 'A. Torres',
    email: 'torres@fieldflow.com',
    password: 'staff123',
    role: 'technician',
    technicianId: 'torres',
  },
  {
    id: 'user-staff-3',
    name: 'R. Singh',
    email: 'singh@fieldflow.com',
    password: 'staff123',
    role: 'technician',
    technicianId: 'singh',
  },
]

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

  function login(email, password) {
    const found = DEMO_USERS.find(
      u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    )
    if (!found) return 'Invalid email or password.'
    const { password: _, ...safeUser } = found
    saveSession(safeUser)
    setUser(safeUser)
    return null  // null = success
  }

  function logout() {
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
    const found = DEMO_USERS.find(u => u.id === user?.id)
    if (!found || found.password !== currentPassword) return 'Current password is incorrect.'
    // In demo mode passwords are in-memory only; just confirm success
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
      role:    user?.role    ?? null,
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
