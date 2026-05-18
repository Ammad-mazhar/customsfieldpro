import { createContext, useContext, useState } from 'react'
import { readPermissions } from '../data/permissions'
import { logActivity, ACTIONS } from '../utils/activityLog'

// ── Sample users ──────────────────────────────────────────────────────────────
// technicianId matches the TECHS id in Scheduler.jsx ('moore', 'torres', 'singh')
const SAMPLE_USERS = [
  {
    id: 'user-1',
    email: 'admin@customsfieldpro.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
    phone: '',
  },
  {
    id: 'user-2',
    email: 'moore@customsfieldpro.com',
    password: 'staff123',
    name: 'D. Moore',
    role: 'staff',
    technicianId: 'moore',
    phone: '',
  },
  {
    id: 'user-3',
    email: 'torres@customsfieldpro.com',
    password: 'staff123',
    name: 'A. Torres',
    role: 'staff',
    technicianId: 'torres',
    phone: '',
  },
  {
    id: 'user-4',
    email: 'singh@customsfieldpro.com',
    password: 'staff123',
    name: 'R. Singh',
    role: 'staff',
    technicianId: 'singh',
    phone: '',
  },
]

const USERS_KEY   = 'customsfieldpro_users'
const SESSION_KEY = 'customsfieldpro_user'

function seedUsers() {
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(SAMPLE_USERS))
  }
}

function getUsers() {
  seedUsers()
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) } catch { return SAMPLE_USERS }
}

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readSession())

  /** Returns null on success, error string on failure */
  function login(email, password) {
    const users = getUsers()
    const match = users.find(
      u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    )
    if (!match) return 'Invalid email or password.'
    const { password: _pw, ...session } = match
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setUser(session)
    logActivity(ACTIONS.USER_LOGIN, 'Auth', session.id, session.name, 'Logged in successfully.', session)
    return null
  }

  function logout() {
    if (user) {
      logActivity(ACTIONS.USER_LOGOUT, 'Auth', user.id, user.name, 'Logged out.')
    }
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  /** Update profile fields (name, phone). Returns error string or null. */
  function updateProfile(updates) {
    const users = getUsers()
    const newUsers = users.map(u => u.id === user.id ? { ...u, ...updates } : u)
    localStorage.setItem(USERS_KEY, JSON.stringify(newUsers))
    const newSession = { ...user, ...updates }
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession))
    setUser(newSession)
    return null
  }

  /**
   * Check if the current user has a given permission.
   * Admins always return true. Reads live from localStorage so changes
   * made on the Permissions page take effect on next render.
   */
  function hasPermission(key) {
    if (!user) return false
    if (user.role === 'admin') return true
    try {
      const perms   = readPermissions()
      const roleKey = user.role === 'technician' ? 'technician' : 'staff'
      return perms[roleKey]?.[key] ?? false
    } catch { return false }
  }

  /** Returns null on success, error string on failure. */
  function changePassword(currentPwd, newPwd) {
    const users = getUsers()
    const match = users.find(u => u.id === user.id && u.password === currentPwd)
    if (!match) return 'Current password is incorrect.'
    const newUsers = users.map(u => u.id === user.id ? { ...u, password: newPwd } : u)
    localStorage.setItem(USERS_KEY, JSON.stringify(newUsers))
    return null
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
