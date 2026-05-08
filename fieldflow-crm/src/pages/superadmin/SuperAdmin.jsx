import { useState, useEffect, useRef } from 'react'
import { STATUS_COLORS } from './saData'
import SADashboard from './SADashboard'
import SATenants from './SATenants'
import SATrials from './SATrials'
import SARevenue from './SARevenue'
import SASupport from './SASupport'
import SAAnnouncements from './SAAnnouncements'
import SAFeatureFlags from './SAFeatureFlags'
import SAChurnRisk from './SAChurnRisk'
import SASystemHealth from './SASystemHealth'
import SASettings from './SASettings'

// ── Shared components (exported for section pages) ────────────────────────────

export function Badge({ status, size = 'sm' }) {
  const s = STATUS_COLORS[status] || { bg: '#f3f4f6', color: '#6b7280' }
  return (
    <span style={{
      background: s.bg, color: s.color,
      borderRadius: 99, padding: size === 'sm' ? '2px 9px' : '4px 12px',
      fontSize: size === 'sm' ? 11 : 12, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  )
}

export function PlanBadge({ plan }) {
  const c = {
    starter:      { bg: '#f3f4f6', color: '#374151' },
    professional: { bg: '#dbeafe', color: '#1d4ed8' },
    business:     { bg: '#ede9fe', color: '#6d28d9' },
    enterprise:   { bg: '#111827', color: '#f9fafb' },
    trial:        { bg: '#fef3c7', color: '#d97706' },
  }[plan?.toLowerCase()] || { bg: '#f3f4f6', color: '#374151' }
  return (
    <span style={{
      background: c.bg, color: c.color, borderRadius: 6,
      padding: '2px 8px', fontSize: 11, fontWeight: 700,
      textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      {plan}
    </span>
  )
}

export function MetricCard({ label, value, sub, color, trend, small }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
      padding: small ? '14px 18px' : '20px 24px', flex: '1 1 140px', minWidth: 0,
    }}>
      <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{label}</p>
      <p style={{ margin: '0 0 4px', fontSize: small ? 22 : 28, fontWeight: 800, color: color || '#111827' }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{sub}</p>}
      {trend && (
        <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 600, color: trend.startsWith('+') ? '#16a34a' : '#dc2626' }}>
          {trend} vs last month
        </p>
      )}
    </div>
  )
}

export function Card({ children, style }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

export function CardHeader({ title, sub, action }) {
  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>{title}</h3>
        {sub && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function Btn({ children, onClick, variant = 'primary', size = 'sm', disabled, style }) {
  const variants = {
    primary:  { background: '#2563eb', color: '#fff', border: 'none' },
    danger:   { background: '#dc2626', color: '#fff', border: 'none' },
    outline:  { background: '#fff', color: '#374151', border: '1.5px solid #d1d5db' },
    ghost:    { background: 'transparent', color: '#6b7280', border: 'none' },
    success:  { background: '#16a34a', color: '#fff', border: 'none' },
    amber:    { background: '#d97706', color: '#fff', border: 'none' },
  }
  const sizes = {
    xs: { padding: '3px 9px', fontSize: 11 },
    sm: { padding: '5px 12px', fontSize: 12 },
    md: { padding: '8px 16px', fontSize: 13 },
    lg: { padding: '10px 22px', fontSize: 14 },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        borderRadius: 7, cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 600,
        opacity: disabled ? 0.5 : 1, transition: 'opacity 0.15s',
        fontFamily: 'inherit', whiteSpace: 'nowrap',
        ...variants[variant], ...sizes[size], ...style,
      }}
    >
      {children}
    </button>
  )
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 20, gap: 0 }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: '10px 18px', border: 'none', borderBottom: active === t.id ? '2px solid #2563eb' : '2px solid transparent',
            background: 'none', color: active === t.id ? '#2563eb' : '#6b7280',
            fontWeight: active === t.id ? 700 : 500, fontSize: 13, cursor: 'pointer',
            marginBottom: -1, fontFamily: 'inherit',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 99, cursor: 'pointer',
        background: value ? '#16a34a' : '#d1d5db',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3, left: value ? 22 : 3, transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  )
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SA_KEY = 'fieldflow_sa_session_v2'
const SA_EMAIL    = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPER_ADMIN_EMAIL)    || 'superadmin@fieldflow.com'
const SA_PASSWORD = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPER_ADMIN_PASSWORD) || 'super123'
const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000 // 2 hours

// ── Sidebar nav structure ─────────────────────────────────────────────────────

const NAV = [
  { section: 'Overview', items: [
    { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  ]},
  { section: 'Customers', items: [
    { id: 'tenants',    label: 'Tenants',    icon: '⊞' },
    { id: 'trials',     label: 'Trials',     icon: '⏳' },
    { id: 'churn',      label: 'Churn Risk', icon: '📉' },
  ]},
  { section: 'Finance', items: [
    { id: 'revenue',    label: 'Revenue',    icon: '💰' },
  ]},
  { section: 'Support', items: [
    { id: 'tickets',      label: 'Tickets',       icon: '🎫' },
    { id: 'announcements',label: 'Announcements', icon: '📢' },
    { id: 'features',     label: 'Feature Flags', icon: '⚑' },
  ]},
  { section: 'Security', items: [
    { id: 'security',   label: 'Security Events', icon: '🔐' },
  ]},
  { section: 'System', items: [
    { id: 'health',     label: 'System Health', icon: '💚' },
    { id: 'settings',   label: 'Settings',      icon: '⚙' },
  ]},
]

const PAGE_TITLES = {
  dashboard:     'Dashboard',
  tenants:       'Tenants',
  trials:        'Trials',
  churn:         'Churn Risk',
  revenue:       'Revenue & Finance',
  tickets:       'Support Tickets',
  announcements: 'Announcements',
  features:      'Feature Flags',
  security:      'Security Events',
  health:        'System Health',
  settings:      'Settings',
}

// ── Login attempt tracking ────────────────────────────────────────────────────

function getAttempts() {
  try { return JSON.parse(sessionStorage.getItem('sa_login_attempts') || '[]') } catch { return [] }
}
function recordAttempt() {
  const attempts = getAttempts().filter(t => Date.now() - t < 60 * 60 * 1000)
  attempts.push(Date.now())
  sessionStorage.setItem('sa_login_attempts', JSON.stringify(attempts))
  return attempts.length
}
function clearAttempts() {
  sessionStorage.removeItem('sa_login_attempts')
}
function isRateLimited() {
  const attempts = getAttempts().filter(t => Date.now() - t < 60 * 60 * 1000)
  return attempts.length >= 5
}

// ── Login Page ────────────────────────────────────────────────────────────────

function SALoginPage({ onLogin }) {
  const [form, setForm]     = useState({ email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (isRateLimited()) {
      setError('Too many failed attempts. Try again in 1 hour.')
      return
    }
    setLoading(true)
    await new Promise(r => setTimeout(r, 600))
    setLoading(false)

    if (form.email === SA_EMAIL && form.password === SA_PASSWORD) {
      clearAttempts()
      onLogin(form.email)
    } else {
      const count = recordAttempt()
      setError(`Invalid credentials. ${5 - count} attempt${5 - count !== 1 ? 's' : ''} remaining.`)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Warning bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        background: '#7f1d1d', padding: '10px 24px', textAlign: 'center',
        fontSize: 12, fontWeight: 600, color: '#fca5a5', letterSpacing: '0.04em',
      }}>
        ⚠ RESTRICTED SYSTEM — Unauthorized access is prohibited and will be prosecuted
      </div>

      <div style={{ width: '100%', maxWidth: 380, marginTop: 40 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 42, height: 42, background: '#dc2626', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, color: '#fff', fontWeight: 900,
            }}>F</div>
            <span style={{ color: '#f8fafc', fontSize: 22, fontWeight: 800 }}>FieldFlow</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span style={{ background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 99, letterSpacing: '0.12em' }}>
              SUPER ADMIN
            </span>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#1e293b', borderRadius: 16, padding: 32,
          border: '1px solid #334155', boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#f8fafc' }}>Sign In</h2>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: '#64748b' }}>Administrative access only</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Email</label>
              <input
                type="email" required autoComplete="username"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #334155',
                  background: '#0f172a', color: '#f8fafc', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 40px 10px 14px', borderRadius: 8, border: '1px solid #334155',
                    background: '#0f172a', color: '#f8fafc', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button" onClick={() => setShowPw(p => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 14 }}
                >
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: '#7f1d1d', border: '1px solid #991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5' }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading || isRateLimited()}
              style={{
                marginTop: 4, background: loading ? '#7f1d1d' : '#dc2626', color: '#fff', border: 'none',
                borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                opacity: (loading || isRateLimited()) ? 0.6 : 1,
              }}
            >
              {loading ? 'Verifying...' : 'Sign In to Super Admin'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#334155' }}>
          All access attempts are logged and monitored
        </p>
      </div>
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({ active, onChange, onSignOut, email }) {
  return (
    <div style={{
      width: 240, background: '#111827', display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0, flexShrink: 0,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1f2937' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 32, height: 32, background: '#dc2626', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#fff', fontWeight: 900, flexShrink: 0,
          }}>F</div>
          <span style={{ color: '#f9fafb', fontSize: 16, fontWeight: 800 }}>FieldFlow</span>
        </div>
        <span style={{
          background: '#dc2626', color: '#fff', fontSize: 9, fontWeight: 800,
          padding: '2px 9px', borderRadius: 99, letterSpacing: '0.12em',
        }}>SUPER ADMIN</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {NAV.map(section => (
          <div key={section.section} style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 4px 8px', fontSize: 10, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {section.section}
            </p>
            {section.items.map(item => {
              const isActive = active === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onChange(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: isActive ? '#1f2937' : 'transparent',
                    color: isActive ? '#f9fafb' : '#9ca3af',
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    textAlign: 'left', marginBottom: 1, fontFamily: 'inherit',
                    borderLeft: isActive ? '2px solid #dc2626' : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 14, opacity: 0.8 }}>{item.icon}</span>
                  {item.label}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #1f2937', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 32, height: 32, background: '#374151', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: '#9ca3af', fontWeight: 700, flexShrink: 0,
          }}>
            {email?.[0]?.toUpperCase() || 'S'}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#f9fafb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Super Admin</p>
            <p style={{ margin: 0, fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '8px 12px', borderRadius: 7, border: '1px solid #374151',
            background: 'transparent', color: '#9ca3af', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          ← Exit Super Admin
        </button>
      </div>
    </div>
  )
}

// ── Top bar ───────────────────────────────────────────────────────────────────

function Topbar({ page, search, onSearch, impersonating, onExitImpersonation }) {
  const [notifOpen, setNotifOpen] = useState(false)
  const [sysOnline] = useState(true)

  const NOTIFICATIONS = [
    { id: 1, type: 'error',   text: 'FastFix Appliance payment failed ($49)', ts: '8m ago' },
    { id: 2, type: 'success', text: 'Valley Electric LLC signed up (Trial)', ts: '42m ago' },
    { id: 3, type: 'warning', text: 'Coastal Cooling trial expires in 4 days', ts: '2h ago' },
    { id: 4, type: 'info',    text: 'New support ticket: TKT-005', ts: '3h ago' },
  ]

  const unread = NOTIFICATIONS.length

  return (
    <>
      <div style={{
        height: 56, background: '#fff', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', paddingLeft: 24, paddingRight: 20, gap: 16,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827', flex: '0 0 auto' }}>
          {PAGE_TITLES[page]}
        </h1>

        {/* Global search */}
        <div style={{ flex: 1, maxWidth: 360, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }}>🔍</span>
          <input
            value={search} onChange={e => onSearch(e.target.value)}
            placeholder="Search tenants by name, email, plan..."
            style={{
              width: '100%', padding: '7px 14px 7px 34px', borderRadius: 8, border: '1.5px solid #e5e7eb',
              fontSize: 13, outline: 'none', background: '#f9fafb', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          {/* System status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: sysOnline ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: sysOnline ? '#16a34a' : '#dc2626', animation: sysOnline ? 'none' : 'pulse 1s infinite' }} />
            {sysOnline ? 'Systems Online' : 'Incident Active'}
          </div>

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setNotifOpen(o => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, position: 'relative', fontSize: 18 }}
            >
              🔔
              {unread > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2, background: '#dc2626', color: '#fff',
                  borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {unread}
                </span>
              )}
            </button>
            {notifOpen && (
              <div style={{
                position: 'absolute', right: 0, top: 40, width: 320, background: '#fff',
                border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                zIndex: 50, overflow: 'hidden',
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 13, fontWeight: 700, color: '#111827' }}>
                  Notifications
                </div>
                {NOTIFICATIONS.map(n => (
                  <div key={n.id} style={{
                    padding: '10px 16px', borderBottom: '1px solid #f3f4f6',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}>
                    <span style={{ fontSize: 16, marginTop: 1 }}>
                      {n.type === 'error' ? '🔴' : n.type === 'success' ? '🟢' : n.type === 'warning' ? '🟡' : '🔵'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>{n.text}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>{n.ts}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Impersonation banner */}
      {impersonating && (
        <div style={{
          background: '#d97706', padding: '10px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>
            ⚠️ Impersonating {impersonating.name} — you are viewing their account
          </span>
          <button
            onClick={onExitImpersonation}
            style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 7, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            Exit Impersonation
          </button>
        </div>
      )}
    </>
  )
}

// ── Security page (inline — already built in prior session) ───────────────────

const MOCK_SEC_EVENTS = [
  { id: 'e1', type: 'LOGIN_FAILED',       ip: '45.89.12.34',  user: 'unknown@evil.com',         endpoint: 'POST /api/auth/login',          ts: '2026-05-07 08:14:22', severity: 'warn' },
  { id: 'e2', type: 'RATE_LIMIT_HIT',     ip: '45.89.12.34',  user: null,                       endpoint: 'POST /api/auth/login',          ts: '2026-05-07 08:13:55', severity: 'warn' },
  { id: 'e3', type: 'LOGIN_SUCCESS',      ip: '72.21.45.100', user: 'john@blueridgehvac.com',   endpoint: 'POST /api/auth/login',          ts: '2026-05-07 07:58:01', severity: 'info' },
  { id: 'e4', type: 'ACCOUNT_LOCKED',     ip: '45.89.12.34',  user: 'jane@apex.com',            endpoint: 'POST /api/auth/login',          ts: '2026-05-07 07:45:10', severity: 'warn' },
  { id: 'e5', type: 'BOT_DETECTED',       ip: '198.11.44.77', user: null,                       endpoint: 'POST /api/auth/login',          ts: '2026-05-07 06:40:01', severity: 'warn' },
  { id: 'e6', type: 'PERMISSION_DENIED',  ip: '72.21.45.100', user: 'tech@sunrise.com',         endpoint: 'DELETE /api/users/abc',         ts: '2026-05-07 07:22:03', severity: 'warn' },
  { id: 'e7', type: 'TENANT_VIOLATION',   ip: '91.21.34.56',  user: 'bad@actor.com',            endpoint: 'GET /api/clients',              ts: '2026-05-07 04:10:15', severity: 'warn' },
  { id: 'e8', type: 'TOKEN_REFRESH',      ip: '72.21.45.100', user: 'admin@prodrain.com',       endpoint: 'POST /api/auth/refresh',        ts: '2026-05-07 03:44:02', severity: 'info' },
]
const MOCK_BLOCKED = [
  { ip: '45.89.12.34',  reason: 'Brute force login (24 fails)',    since: '2026-05-07 08:14' },
  { ip: '198.11.44.77', reason: 'Bot detected (no user-agent)',     since: '2026-05-07 06:40' },
  { ip: '91.21.34.56',  reason: 'Tenant isolation violation',       since: '2026-05-07 04:10' },
]
const MOCK_SESSIONS = [
  { user: 'john@blueridgehvac.com', tenant: 'Blue Ridge HVAC',  ip: '72.21.45.100', ua: 'Chrome 124 / macOS',  since: '07:58', active: true },
  { user: 'admin@coastal.com',      tenant: 'Coastal Cooling',   ip: '203.45.67.89', ua: 'Safari 17 / iOS',     since: '06:55', active: true },
  { user: 'admin@prodrain.com',     tenant: 'ProDrain Plumbing', ip: '72.21.45.100', ua: 'Firefox 125 / Win',   since: '03:44', active: true },
  { user: 'mike@metro.com',         tenant: 'Metro Plumbing Co', ip: '192.168.1.5',  ua: 'Chrome 124 / Win',    since: '05:30', active: false },
]
const ET_LABELS = {
  LOGIN_FAILED: 'Login Failed', LOGIN_SUCCESS: 'Login Success',
  RATE_LIMIT_HIT: 'Rate Limit Hit', ACCOUNT_LOCKED: 'Account Locked',
  BOT_DETECTED: 'Bot Detected', PERMISSION_DENIED: 'Permission Denied',
  TENANT_VIOLATION: 'Tenant Violation', TOKEN_REFRESH: 'Token Refreshed',
}

function SecurityPage() {
  const [evFilter, setEvFilter] = useState('all')
  const [blocked, setBlocked]   = useState(MOCK_BLOCKED)
  const filtered = evFilter === 'all' ? MOCK_SEC_EVENTS : MOCK_SEC_EVENTS.filter(e => e.severity === evFilter)
  const warnCount = MOCK_SEC_EVENTS.filter(e => e.severity === 'warn').length

  const row = { borderBottom: '1px solid #f3f4f6' }
  const td  = { padding: '10px 12px', fontSize: 13 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {[
          { label: 'Events (24h)', value: MOCK_SEC_EVENTS.length, color: '#2563eb' },
          { label: 'Warnings', value: warnCount, color: '#ca8a04' },
          { label: 'Blocked IPs', value: blocked.length, color: '#dc2626' },
          { label: 'Active Sessions', value: MOCK_SESSIONS.filter(s => s.active).length, color: '#16a34a' },
        ].map(m => <MetricCard key={m.label} label={m.label} value={m.value} color={m.color} />)}
      </div>

      <Card>
        <CardHeader
          title="Security Events"
          action={
            <div style={{ display: 'flex', gap: 6 }}>
              {['all', 'warn', 'info'].map(f => (
                <Btn key={f} variant={evFilter === f ? 'primary' : 'outline'} size="xs" onClick={() => setEvFilter(f)}>
                  {f === 'all' ? 'All' : f === 'warn' ? `⚠ Warn (${warnCount})` : 'Info'}
                </Btn>
              ))}
            </div>
          }
        />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>
                {['Sev', 'Event', 'IP', 'User', 'Endpoint', 'Time'].map(h => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(ev => (
                <tr key={ev.id} style={row}>
                  <td style={td}>
                    <span style={{
                      background: ev.severity === 'warn' ? '#fef9c3' : '#f0fdf4',
                      color:      ev.severity === 'warn' ? '#854d0e' : '#166534',
                      borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                    }}>{ev.severity.toUpperCase()}</span>
                  </td>
                  <td style={{ ...td, fontWeight: 600, color: '#374151' }}>{ET_LABELS[ev.type] || ev.type}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 11 }}>{ev.ip}</td>
                  <td style={{ ...td, color: '#6b7280', fontSize: 12 }}>{ev.user || '—'}</td>
                  <td style={{ ...td, fontFamily: 'monospace', color: '#6b7280', fontSize: 11 }}>{ev.endpoint}</td>
                  <td style={{ ...td, color: '#9ca3af', fontSize: 11 }}>{ev.ts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Blocked IPs" sub="Automatically blocked by rate limiter and bot detector" />
        {blocked.length === 0
          ? <div style={{ padding: 28, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No blocked IPs</div>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#fef2f2', fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>
                {['IP Address', 'Reason', 'Blocked Since', 'Action'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {blocked.map(b => (
                  <tr key={b.ip} style={row}>
                    <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700, color: '#dc2626' }}>{b.ip}</td>
                    <td style={td}>{b.reason}</td>
                    <td style={{ ...td, color: '#9ca3af' }}>{b.since}</td>
                    <td style={td}><Btn variant="outline" size="xs" onClick={() => setBlocked(p => p.filter(x => x.ip !== b.ip))}>Unblock</Btn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </Card>

      <Card>
        <CardHeader title="Active Sessions" />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f9fafb', fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>
            {['User', 'Tenant', 'IP', 'Device', 'Start', 'Status'].map(h => (
              <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {MOCK_SESSIONS.map((s, i) => (
              <tr key={i} style={row}>
                <td style={td}>{s.user}</td>
                <td style={td}>{s.tenant}</td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 11 }}>{s.ip}</td>
                <td style={{ ...td, fontSize: 12, color: '#6b7280' }}>{s.ua}</td>
                <td style={{ ...td, color: '#9ca3af' }}>{s.since}</td>
                <td style={td}>
                  <span style={{
                    background: s.active ? '#dcfce7' : '#f3f4f6',
                    color: s.active ? '#16a34a' : '#9ca3af',
                    borderRadius: 99, padding: '2px 9px', fontSize: 11, fontWeight: 700,
                  }}>{s.active ? 'Active' : 'Expired'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ── Main SuperAdmin component ──────────────────────────────────────────────────

export default function SuperAdmin() {
  const [session, setSession] = useState(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem(SA_KEY))
      if (!s) return null
      // Session timeout check
      if (Date.now() - s.loggedInAt > SESSION_TIMEOUT_MS) {
        sessionStorage.removeItem(SA_KEY)
        return null
      }
      return s
    } catch { return null }
  })

  const [page, setPage]               = useState('dashboard')
  const [impersonating, setImpersonating] = useState(null)
  const [globalSearch, setGlobalSearch]   = useState('')

  // Activity timeout — reset on any user interaction
  useEffect(() => {
    if (!session) return
    const refresh = () => {
      const s = JSON.parse(sessionStorage.getItem(SA_KEY) || 'null')
      if (s) sessionStorage.setItem(SA_KEY, JSON.stringify({ ...s, loggedInAt: Date.now() }))
    }
    window.addEventListener('mousemove', refresh)
    window.addEventListener('keydown', refresh)
    const check = setInterval(() => {
      const s = JSON.parse(sessionStorage.getItem(SA_KEY) || 'null')
      if (!s || Date.now() - s.loggedInAt > SESSION_TIMEOUT_MS) handleSignOut()
    }, 60000)
    return () => {
      window.removeEventListener('mousemove', refresh)
      window.removeEventListener('keydown', refresh)
      clearInterval(check)
    }
  }, [session])

  function handleLogin(email) {
    const s = { email, loggedInAt: Date.now() }
    sessionStorage.setItem(SA_KEY, JSON.stringify(s))
    setSession(s)
  }

  function handleSignOut() {
    sessionStorage.removeItem(SA_KEY)
    setSession(null)
    setPage('dashboard')
    setImpersonating(null)
  }

  if (!session) return <SALoginPage onLogin={handleLogin} />

  const sharedProps = {
    impersonating,
    setImpersonating,
    globalSearch,
    onNavigate: setPage,
  }

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: '#f3f4f6',
    }}>
      <Sidebar
        active={page}
        onChange={setPage}
        onSignOut={handleSignOut}
        email={session.email}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar
          page={page}
          search={globalSearch}
          onSearch={setGlobalSearch}
          impersonating={impersonating}
          onExitImpersonation={() => setImpersonating(null)}
        />

        <main style={{ flex: 1, padding: '24px 28px', overflow: 'auto' }}>
          {page === 'dashboard'     && <SADashboard {...sharedProps} />}
          {page === 'tenants'       && <SATenants {...sharedProps} />}
          {page === 'trials'        && <SATrials {...sharedProps} />}
          {page === 'churn'         && <SAChurnRisk {...sharedProps} />}
          {page === 'revenue'       && <SARevenue {...sharedProps} />}
          {page === 'tickets'       && <SASupport {...sharedProps} />}
          {page === 'announcements' && <SAAnnouncements {...sharedProps} />}
          {page === 'features'      && <SAFeatureFlags {...sharedProps} />}
          {page === 'security'      && <SecurityPage />}
          {page === 'health'        && <SASystemHealth {...sharedProps} />}
          {page === 'settings'      && <SASettings {...sharedProps} />}
        </main>
      </div>
    </div>
  )
}
