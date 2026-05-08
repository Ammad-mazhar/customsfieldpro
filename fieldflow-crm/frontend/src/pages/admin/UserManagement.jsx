import { useState, useMemo } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { logActivity, ACTIONS } from '../../utils/activityLog'
import { notifyAdmins, NOTIF_TYPES } from '../../utils/notifications'

// ─── Constants ────────────────────────────────────────────────────────────────

const USERS_KEY = 'fieldflow_users'

const SPECIALTIES   = ['HVAC', 'Plumbing', 'Electrical', 'Appliance Repair', 'General']
const PRESET_COLORS = [
  { label: 'Blue',   value: '#2563eb' },
  { label: 'Teal',   value: '#0891b2' },
  { label: 'Amber',  value: '#d97706' },
  { label: 'Green',  value: '#16a34a' },
  { label: 'Red',    value: '#dc2626' },
  { label: 'Purple', value: '#7c3aed' },
]

const ROLE_STYLE = {
  admin:      { bg: '#eff6ff', color: '#2563eb', label: 'Admin' },
  staff:      { bg: '#f0fdf4', color: '#16a34a', label: 'Staff' },
  technician: { bg: '#f5f3ff', color: '#7c3aed', label: 'Technician' },
}

const STATUS_STYLE = {
  active:   { bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e' },
  inactive: { bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af' },
}

const FILTER_OPTIONS = ['All', 'Admin', 'Staff', 'Technician']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    // Back-fill status for legacy users
    return arr.map(u => ({ status: 'active', ...u }))
  } catch { return [] }
}

function writeUsers(arr) {
  localStorage.setItem(USERS_KEY, JSON.stringify(arr))
}

function initials(name) {
  return (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function avatarColor(role) {
  return ROLE_STYLE[role]?.color ?? '#6b7280'
}

function passwordStrength(pwd) {
  if (!pwd) return null
  if (pwd.length < 8) return 'Weak'
  const hasLower = /[a-z]/.test(pwd)
  const hasUpper = /[A-Z]/.test(pwd)
  const hasNum   = /[0-9]/.test(pwd)
  const hasSpec  = /[^a-zA-Z0-9]/.test(pwd)
  const types    = [hasLower || hasUpper, hasNum, hasSpec].filter(Boolean).length
  if (types >= 3 || (types >= 2 && pwd.length >= 12)) return 'Strong'
  if (types >= 2) return 'Fair'
  return 'Weak'
}

const STRENGTH_STYLE = {
  Weak:   { color: '#dc2626', bar: '#dc2626', width: '33%' },
  Fair:   { color: '#d97706', bar: '#f59e0b', width: '66%' },
  Strong: { color: '#16a34a', bar: '#22c55e', width: '100%' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const s = ROLE_STYLE[role] ?? { bg: '#f3f4f6', color: '#6b7280', label: role }
  return (
    <span style={{ display: 'inline-block', fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.inactive
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: s.bg, color: s.color }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {status === 'active' ? 'Active' : 'Inactive'}
    </span>
  )
}

const LB  = { display: 'block', fontSize: 11.5, fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 7 }
const ERR = { fontSize: 12, color: '#dc2626', margin: '4px 0 0' }

function FormInput({ label, error, children }) {
  return (
    <div>
      {label && <label style={LB}>{label}</label>}
      {children}
      {error && <p style={ERR}>{error}</p>}
    </div>
  )
}

function inp(value, onChange, hasErr, extra = {}) {
  return {
    value,
    onChange,
    style: {
      width: '100%', boxSizing: 'border-box', height: 40,
      border: `1px solid ${hasErr ? '#dc2626' : '#e8e9ec'}`,
      borderRadius: 8, padding: '0 12px', fontSize: 13.5,
      color: '#374151', outline: 'none', background: '#fff',
      ...extra,
    },
  }
}

function sel(value, onChange, hasErr) {
  return {
    value,
    onChange,
    style: {
      width: '100%', height: 40,
      border: `1px solid ${hasErr ? '#dc2626' : '#e8e9ec'}`,
      borderRadius: 8, padding: '0 12px', fontSize: 13.5,
      color: '#374151', background: '#fff', outline: 'none',
    },
  }
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ user: target, currentUserId, onSave, onClose }) {
  const isSelf = target.id === currentUserId

  const [form, setForm] = useState({
    name:            target.name      ?? '',
    email:           target.email     ?? '',
    role:            target.role      ?? 'staff',
    phone:           target.phone     ?? '',
    specialty:       target.specialty ?? '',
    color:           target.color     ?? '#2563eb',
    status:          target.status    ?? 'active',
    newPassword:     '',
    confirmPassword: '',
  })
  const [errs, setErrs]       = useState({})
  const [showPwd, setShowPwd] = useState(false)
  const [saved, setSaved]     = useState(false)

  const needsSpecialty  = form.role === 'staff' || form.role === 'technician'
  const needsColor      = form.role === 'technician'
  const roleChanged     = form.role !== target.role
  const strength        = passwordStrength(form.newPassword)
  const strengthStyle   = strength ? STRENGTH_STYLE[strength] : null

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!isSelf) {
      // Admin can change other users' emails
      if (!form.email.trim()) e.email = 'Required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format'
      else {
        const existing = readUsers().find(u => u.email.toLowerCase() === form.email.trim().toLowerCase() && u.id !== target.id)
        if (existing) e.email = 'This email is already registered'
      }
    }
    if (form.newPassword) {
      if (form.newPassword.length < 8) e.newPassword = 'Must be at least 8 characters'
      if (form.newPassword !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
    }
    return e
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrs(e); return }

    const updated = {
      ...target,
      name:      form.name.trim(),
      email:     isSelf ? target.email : form.email.trim().toLowerCase(),
      role:      form.role,
      phone:     form.phone.trim(),
      specialty: needsSpecialty ? form.specialty : undefined,
      color:     needsColor ? form.color : undefined,
      status:    form.status,
      // Only update password if a new one was provided
      ...(form.newPassword ? { password: form.newPassword } : {}),
    }

    const users = readUsers()
    writeUsers(users.map(u => u.id === target.id ? updated : u))
    logActivity(ACTIONS.USER_UPDATED, 'Users', updated.id, updated.name, `User profile updated${form.role !== target.role ? ` (role changed from ${target.role} to ${form.role})` : ''}.`)
    setSaved(true)
    setTimeout(() => { onSave(updated); onClose() }, 700)
  }

  function f(field) {
    return (e) => { setForm(p => ({ ...p, [field]: e.target.value })); setErrs(p => ({ ...p, [field]: undefined })) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(2px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '28px 28px 24px', width: 500, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Edit User</h3>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: '3px 0 0' }}>{target.email}</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #e8e9ec', background: '#f9fafb', fontSize: 20, color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Name + Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormInput label="Full Name *" error={errs.name}>
              <input {...inp(form.name, f('name'), errs.name)} placeholder="Full name" />
            </FormInput>
            <FormInput label="Phone">
              <input {...inp(form.phone, f('phone'), false)} placeholder="(555) 000-0000" />
            </FormInput>
          </div>

          {/* Email */}
          <FormInput label="Email" error={errs.email}>
            <input
              {...inp(form.email, f('email'), errs.email)}
              type="email"
              placeholder="email@example.com"
              disabled={isSelf}
              style={{ width: '100%', boxSizing: 'border-box', height: 40, border: `1px solid ${errs.email ? '#dc2626' : '#e8e9ec'}`, borderRadius: 8, padding: '0 12px', fontSize: 13.5, color: isSelf ? '#9ca3af' : '#374151', outline: 'none', background: isSelf ? '#f8f9fa' : '#fff' }}
            />
            {isSelf && <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '4px 0 0' }}>You cannot change your own email address.</p>}
          </FormInput>

          {/* Role */}
          <FormInput label="Role">
            <select {...sel(form.role, f('role'), false)}>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="technician">Technician</option>
            </select>
          </FormInput>

          {/* Role change warning */}
          {roleChanged && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 8 }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#d97706" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round"/>
                <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round"/>
              </svg>
              <p style={{ fontSize: 12.5, color: '#92400e', margin: 0, lineHeight: 1.5 }}>
                Changing this user's role will update their access immediately on their next page load.
              </p>
            </div>
          )}

          {needsSpecialty && (
            <FormInput label="Specialty">
              <select {...sel(form.specialty, f('specialty'), false)}>
                <option value="">— Select specialty —</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormInput>
          )}

          {needsColor && (
            <div>
              <label style={LB}>Scheduler Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {PRESET_COLORS.map(c => (
                  <button type="button" key={c.value} title={c.label}
                    onClick={() => setForm(p => ({ ...p, color: c.value }))}
                    style={{ width: 30, height: 30, borderRadius: '50%', background: c.value, border: form.color === c.value ? '3px solid #1a1d23' : '3px solid transparent', cursor: 'pointer', outline: 'none', flexShrink: 0 }} />
                ))}
              </div>
            </div>
          )}

          {/* Password (optional) */}
          <div style={{ borderTop: '1px solid #f0f1f3', paddingTop: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px' }}>
              Change Password — leave blank to keep current
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormInput label="New Password" error={errs.newPassword}>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={form.newPassword}
                    onChange={f('newPassword')}
                    placeholder="Min 8 characters"
                    style={{ width: '100%', boxSizing: 'border-box', height: 40, border: `1px solid ${errs.newPassword ? '#dc2626' : '#e8e9ec'}`, borderRadius: 8, padding: '0 44px 0 12px', fontSize: 13.5, color: '#374151', outline: 'none', background: '#fff' }}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 11.5, padding: 0 }}>
                    {showPwd ? 'Hide' : 'Show'}
                  </button>
                </div>
                {form.newPassword && strengthStyle && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ height: 3, background: '#f0f1f3', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: strengthStyle.width, background: strengthStyle.bar, borderRadius: 2, transition: 'width 0.3s' }} />
                    </div>
                    <p style={{ fontSize: 11, margin: '3px 0 0', color: strengthStyle.color, fontWeight: 600 }}>{strength}</p>
                  </div>
                )}
              </FormInput>
              <FormInput label="Confirm Password" error={errs.confirmPassword}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={f('confirmPassword')}
                  placeholder="Re-enter password"
                  style={{ width: '100%', boxSizing: 'border-box', height: 40, border: `1px solid ${errs.confirmPassword ? '#dc2626' : '#e8e9ec'}`, borderRadius: 8, padding: '0 12px', fontSize: 13.5, color: '#374151', outline: 'none', background: '#fff' }}
                />
              </FormInput>
            </div>
          </div>

          {/* Status */}
          <div>
            <label style={LB}>Account Status</label>
            <div style={{ display: 'flex', border: '1px solid #e8e9ec', borderRadius: 8, overflow: 'hidden', width: 'fit-content' }}>
              {['active', 'inactive'].map(s => (
                <button type="button" key={s} onClick={() => setForm(p => ({ ...p, status: s }))}
                  style={{ height: 36, padding: '0 18px', background: form.status === s ? (s === 'active' ? '#16a34a' : '#6b7280') : '#fff', color: form.status === s ? '#fff' : '#6b7280', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 18, borderTop: '1px solid #f0f1f3' }}>
          <button onClick={onClose} style={{ height: 40, padding: '0 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave}
            style={{ height: 40, padding: '0 22px', background: saved ? '#16a34a' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
            {saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Create Account Form ──────────────────────────────────────────────────────

const BLANK = {
  name: '', email: '', password: '', confirmPassword: '',
  role: 'staff', phone: '', specialty: '', color: '#2563eb', status: 'active',
}

function CreateForm({ onCreated }) {
  const [form, setForm]       = useState(BLANK)
  const [errs, setErrs]       = useState({})
  const [showPwd, setShowPwd] = useState(false)
  const [showCPwd, setShowCPwd] = useState(false)

  const needsSpecialty = form.role === 'staff' || form.role === 'technician'
  const needsColor     = form.role === 'technician'
  const strength       = passwordStrength(form.password)
  const strengthStyle  = strength ? STRENGTH_STYLE[strength] : null

  function f(field) {
    return (e) => { setForm(p => ({ ...p, [field]: e.target.value })); setErrs(p => ({ ...p, [field]: undefined })) }
  }

  function validate() {
    const e = {}
    if (!form.name.trim())  e.name  = 'Required'
    if (!form.email.trim()) e.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format'
    else {
      const exists = readUsers().find(u => u.email.toLowerCase() === form.email.trim().toLowerCase())
      if (exists) e.email = 'This email is already registered'
    }
    if (!form.password)        e.password = 'Required'
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (!form.confirmPassword) e.confirmPassword = 'Required'
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
    return e
  }

  function submit(ev) {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrs(e); return }

    const users  = readUsers()
    const maxNum = users.reduce((acc, u) => {
      const n = parseInt(u.id?.replace('user-', '') || '0', 10)
      return n > acc ? n : acc
    }, 0)
    const newId = `user-${maxNum + 1}`

    const techId = form.role === 'technician'
      ? form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 20)
      : undefined

    const newUser = {
      id:          newId,
      name:        form.name.trim(),
      email:       form.email.trim().toLowerCase(),
      password:    form.password,
      role:        form.role,
      phone:       form.phone.trim(),
      specialty:   needsSpecialty ? form.specialty : undefined,
      color:       needsColor ? form.color : undefined,
      technicianId: form.role === 'technician' ? techId : undefined,
      status:      form.status,
    }

    writeUsers([...users, newUser])
    logActivity(ACTIONS.USER_CREATED, 'Users', newUser.id, newUser.name, `New ${newUser.role} account created: ${newUser.name}.`)
    notifyAdmins(NOTIF_TYPES.USER_CREATED, 'New Account Created', `New account created for ${newUser.name} (${newUser.role}).`, 'Users', newUser.id)
    setForm(BLANK)
    setErrs({})
    onCreated()
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 560 }}>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <FormInput label="Full Name *" error={errs.name}>
          <input {...inp(form.name, f('name'), errs.name)} placeholder="Jane Smith" />
        </FormInput>
        <FormInput label="Phone">
          <input {...inp(form.phone, f('phone'), false)} placeholder="(555) 000-0000" />
        </FormInput>
      </div>

      <FormInput label="Email Address *" error={errs.email}>
        <input {...inp(form.email, f('email'), errs.email)} type="email" placeholder="jane@example.com" />
      </FormInput>

      {/* Password */}
      <FormInput label="Password *" error={errs.password}>
        <div style={{ position: 'relative' }}>
          <input
            {...inp(form.password, f('password'), errs.password)}
            type={showPwd ? 'text' : 'password'}
            placeholder="Minimum 8 characters"
            style={{ width: '100%', boxSizing: 'border-box', height: 40, border: `1px solid ${errs.password ? '#dc2626' : '#e8e9ec'}`, borderRadius: 8, padding: '0 44px 0 12px', fontSize: 13.5, color: '#374151', outline: 'none', background: '#fff' }}
          />
          <button type="button" onClick={() => setShowPwd(v => !v)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 12, padding: 0 }}>
            {showPwd ? 'Hide' : 'Show'}
          </button>
        </div>
        {/* Strength indicator */}
        {form.password && (
          <div style={{ marginTop: 8 }}>
            <div style={{ height: 4, background: '#f0f1f3', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: strengthStyle.width, background: strengthStyle.bar, borderRadius: 2, transition: 'width 0.3s, background 0.3s' }} />
            </div>
            <p style={{ fontSize: 11.5, margin: '4px 0 0', color: strengthStyle.color, fontWeight: 600 }}>
              Password strength: {strength}
            </p>
          </div>
        )}
      </FormInput>

      <FormInput label="Confirm Password *" error={errs.confirmPassword}>
        <div style={{ position: 'relative' }}>
          <input
            {...inp(form.confirmPassword, f('confirmPassword'), errs.confirmPassword)}
            type={showCPwd ? 'text' : 'password'}
            placeholder="Re-enter password"
            style={{ width: '100%', boxSizing: 'border-box', height: 40, border: `1px solid ${errs.confirmPassword ? '#dc2626' : '#e8e9ec'}`, borderRadius: 8, padding: '0 44px 0 12px', fontSize: 13.5, color: '#374151', outline: 'none', background: '#fff' }}
          />
          <button type="button" onClick={() => setShowCPwd(v => !v)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 12, padding: 0 }}>
            {showCPwd ? 'Hide' : 'Show'}
          </button>
        </div>
      </FormInput>

      <FormInput label="Role *">
        <select {...sel(form.role, f('role'), false)}>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
          <option value="technician">Technician</option>
        </select>
      </FormInput>

      {needsSpecialty && (
        <FormInput label="Specialty">
          <select {...sel(form.specialty, f('specialty'), false)}>
            <option value="">— Select specialty —</option>
            {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormInput>
      )}

      {needsColor && (
        <div>
          <label style={LB}>Scheduler Color</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {PRESET_COLORS.map(c => (
              <button type="button" key={c.value} title={c.label}
                onClick={() => setForm(p => ({ ...p, color: c.value }))}
                style={{ width: 34, height: 34, borderRadius: '50%', background: c.value, border: form.color === c.value ? '3px solid #1a1d23' : '3px solid transparent', cursor: 'pointer', outline: 'none', flexShrink: 0, position: 'relative' }}>
                {form.color === c.value && (
                  <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>✓</span>
                )}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '6px 0 0' }}>
            This color appears on the Scheduler map pins and calendar blocks.
          </p>
        </div>
      )}

      <div>
        <label style={LB}>Account Status</label>
        <div style={{ display: 'flex', gap: 0, border: '1px solid #e8e9ec', borderRadius: 8, overflow: 'hidden', width: 'fit-content' }}>
          {['active', 'inactive'].map(s => (
            <button type="button" key={s}
              onClick={() => setForm(p => ({ ...p, status: s }))}
              style={{ height: 38, padding: '0 20px', background: form.status === s ? (s === 'active' ? '#16a34a' : '#6b7280') : '#fff', color: form.status === s ? '#fff' : '#6b7280', border: 'none', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ paddingTop: 6 }}>
        <button type="submit"
          style={{ height: 44, padding: '0 28px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.1px' }}>
          Create Account →
        </button>
      </div>
    </form>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UserManagement() {
  const { user: currentUser } = useAuth()

  const [users, setUsers]       = useState(() => readUsers())
  const [tab, setTab]           = useState('all')
  const [filter, setFilter]     = useState('All')
  const [search, setSearch]     = useState('')
  const [editTarget, setEditTarget] = useState(null)
  const [toast, setToast]       = useState('')

  function reload() { setUsers(readUsers()) }

  function flash(msg) { setToast(msg); setTimeout(() => setToast(''), 3500) }

  function toggleStatus(userId) {
    const updated = readUsers().map(u =>
      u.id === userId ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u
    )
    writeUsers(updated)
    setUsers(updated)
  }

  function deleteUser(userId) {
    if (!window.confirm('Delete this user? This cannot be undone.')) return
    const target = readUsers().find(u => u.id === userId)
    const updated = readUsers().filter(u => u.id !== userId)
    writeUsers(updated)
    setUsers(updated)
    if (target) logActivity(ACTIONS.USER_DELETED, 'Users', userId, target.name, `User account deleted: ${target.name}.`)
    flash('User deleted.')
  }

  function handleSaved(updated) {
    reload()
    flash(`${updated.name}'s profile updated.`)
  }

  function handleCreated() {
    reload()
    setTab('all')
    flash('Account created successfully.')
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter(u => {
      const roleMatch = filter === 'All' || u.role === filter.toLowerCase()
      const searchMatch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      return roleMatch && searchMatch
    })
  }, [users, filter, search])

  const tabs = [
    { id: 'all',    label: 'All Users' },
    { id: 'create', label: '+ Create New Account' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Toast */}
      {toast && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: 8, padding: '10px 16px', fontSize: 13.5, fontWeight: 600 }}>
          ✓ {toast}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e8e9ec' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: '12px 22px', fontSize: 13.5, fontWeight: tab === t.id ? 700 : 500,
                color: tab === t.id ? '#2563eb' : '#6b7280',
                background: 'none', border: 'none',
                borderBottom: `2px solid ${tab === t.id ? '#2563eb' : 'transparent'}`,
                cursor: 'pointer', marginBottom: -1, whiteSpace: 'nowrap',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 24 }}>

          {/* ── All Users tab ───────────────────────────────────────────── */}
          {tab === 'all' && (
            <div>
              {/* Toolbar */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 300 }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2"
                    style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round"/>
                  </svg>
                  <input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', height: 36, paddingLeft: 32, paddingRight: 12, border: '1px solid #e8e9ec', borderRadius: 8, fontSize: 13.5, color: '#374151', outline: 'none' }} />
                </div>

                {/* Role filter pills */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {FILTER_OPTIONS.map(opt => (
                    <button key={opt} onClick={() => setFilter(opt)}
                      style={{ height: 34, padding: '0 14px', borderRadius: 7, fontSize: 13, fontWeight: filter === opt ? 700 : 500, background: filter === opt ? '#2563eb' : '#f3f4f6', color: filter === opt ? '#fff' : '#374151', border: 'none', cursor: 'pointer' }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <p style={{ fontSize: 12.5, color: '#9ca3af', marginBottom: 10 }}>{filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['User', 'Email', 'Role', 'Specialty', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.4px', padding: '9px 14px', borderBottom: '1px solid #f0f1f3', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(u => {
                      const isSelf    = u.id === currentUser?.id
                      const isInactive = u.status === 'inactive'
                      return (
                        <tr key={u.id}
                          style={{ borderBottom: '1px solid #f8f9fa', opacity: isInactive ? 0.6 : 1, transition: 'opacity 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                          {/* Avatar + name */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                                background: avatarColor(u.role), color: '#fff',
                                fontSize: 12, fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                {initials(u.name)}
                              </div>
                              <div>
                                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {u.name}
                                  {isSelf && <span style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '1px 6px', borderRadius: 10 }}>You</span>}
                                </div>
                                {u.phone && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>{u.phone}</div>}
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '12px 14px', fontSize: 13, color: '#6b7280' }}>{u.email}</td>
                          <td style={{ padding: '12px 14px' }}><RoleBadge role={u.role} /></td>
                          <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>{u.specialty || '—'}</td>
                          <td style={{ padding: '12px 14px' }}><StatusBadge status={u.status ?? 'active'} /></td>

                          {/* Actions */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <button onClick={() => setEditTarget(u)}
                                style={{ height: 30, padding: '0 12px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>
                                Edit
                              </button>
                              <button onClick={() => toggleStatus(u.id)}
                                style={{ height: 30, padding: '0 12px', background: isInactive ? '#f0fdf4' : '#fff7ed', color: isInactive ? '#16a34a' : '#d97706', border: `1px solid ${isInactive ? '#bbf7d0' : '#fed7aa'}`, borderRadius: 6, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                {isInactive ? 'Activate' : 'Deactivate'}
                              </button>
                              {!isSelf && (
                                <button onClick={() => deleteUser(u.id)}
                                  style={{ height: 30, padding: '0 10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {!filtered.length && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: '#9ca3af', fontSize: 14 }}>
                        No users match your search.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Create Account tab ──────────────────────────────────────── */}
          {tab === 'create' && (
            <div>
              <div style={{ marginBottom: 22 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1d23', margin: '0 0 4px' }}>Create New Account</h2>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Add a new admin, staff member, or technician to FieldFlow.</p>
              </div>
              <CreateForm onCreated={handleCreated} />
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editTarget && (
        <EditModal
          user={editTarget}
          currentUserId={currentUser?.id}
          onSave={handleSaved}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  )
}
