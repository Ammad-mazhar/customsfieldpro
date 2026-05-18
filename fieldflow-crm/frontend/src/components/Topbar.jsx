import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useIsMobile } from '../utils/useIsMobile'
import NotificationsCenter from './NotificationsCenter'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/clients':   'Clients',
  '/jobs':      'Jobs',
  '/invoices':  'Invoices',
  '/quotes':    'Quotes',
  '/requests':  'Requests',
  '/scheduler': 'Scheduler',
  '/settings':         'Settings',
  '/user-management':  'User Management',
  '/permissions':      'Permissions',
  '/reports':          'Reports & Analytics',
  '/activity-log':     'Activity Log',
  '/profile':          'My Profile',
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export default function Topbar({ onMenuToggle }) {
  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const { user, isAdmin, logout } = useAuth()
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const title    = pageTitles[pathname] ?? 'CustomsFieldPro'
  const today    = formatDate(new Date())
  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function signOut() {
    logout()
    navigate('/login', { replace: true })
  }

  if (isMobile) {
    return (
      <header style={{ ...styles.bar, padding: '0 16px', justifyContent: 'space-between' }}>
        {/* Hamburger */}
        <button onClick={onMenuToggle} style={styles.hamburger} aria-label="Open menu">
          <span style={styles.hLine} />
          <span style={styles.hLine} />
          <span style={styles.hLine} />
        </button>

        {/* Centered title */}
        <h1 style={{ ...styles.title, fontSize: 16, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          {title}
        </h1>

        {/* Avatar only */}
        <div ref={ref} style={{ position: 'relative' }}>
          <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            <div style={{ ...styles.avatarCircle, width: 34, height: 34, fontSize: 12 }}>{initials}</div>
          </button>

          {open && (
            <div style={{ ...styles.dropdown, right: 0, width: 190 }}>
              <div style={styles.dropdownHeader}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1d23', margin: 0 }}>{user?.name}</p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>{user?.email}</p>
              </div>
              <button onClick={() => { setOpen(false); navigate('/profile') }} style={styles.dropItem}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                My Profile
              </button>
              <div style={styles.dropDivider} />
              <button onClick={signOut} style={{ ...styles.dropItem, color: '#dc2626' }}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>
    )
  }

  return (
    <header style={styles.bar}>
      <div>
        <h1 style={styles.title}>{title}</h1>
      </div>
      <div style={styles.right}>
        <span style={styles.date}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" style={{ marginRight: 6, flexShrink: 0 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round"/>
            <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round"/>
            <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round"/>
          </svg>
          {today}
        </span>

        <NotificationsCenter />

        {/* User avatar + dropdown */}
        <div ref={ref} style={{ position: 'relative' }}>
          <button onClick={() => setOpen(o => !o)} style={styles.avatarBtn} title={user?.name}>
            <div style={styles.avatarCircle}>{initials}</div>
            <div style={styles.avatarInfo}>
              <span style={styles.avatarName}>{user?.name}</span>
              <span style={{ ...styles.roleBadge, background: isAdmin ? '#eff6ff' : '#f0fdf4', color: isAdmin ? '#2563eb' : '#16a34a' }}>
                {isAdmin ? 'Admin' : 'Staff'}
              </span>
            </div>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ color: '#9ca3af', flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {open && (
            <div style={styles.dropdown}>
              <div style={styles.dropdownHeader}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1d23', margin: 0 }}>{user?.name}</p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>{user?.email}</p>
              </div>
              <button onClick={() => { setOpen(false); navigate('/profile') }} style={styles.dropItem}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                My Profile
              </button>
              <div style={styles.dropDivider} />
              <button onClick={signOut} style={{ ...styles.dropItem, color: '#dc2626' }}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

const styles = {
  bar: { height: 60, background: '#ffffff', borderBottom: '1px solid #e8e9ec', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', flexShrink: 0, position: 'relative' },
  title: { fontSize: 18, fontWeight: 700, color: '#1a1d23', margin: 0, letterSpacing: '-0.2px' },
  right: { display: 'flex', alignItems: 'center', gap: 14 },
  date: { display: 'flex', alignItems: 'center', fontSize: 13, color: '#6b7280', fontWeight: 500 },
  notifBtn: { position: 'relative', width: 36, height: 36, borderRadius: 8, border: '1px solid #e8e9ec', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', cursor: 'pointer' },
  notifDot: { position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: '50%', background: '#2563eb', border: '1.5px solid #fff' },
  avatarBtn: { display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: '1px solid #e8e9ec', borderRadius: 9, padding: '5px 10px 5px 6px', cursor: 'pointer', transition: 'background 0.12s' },
  avatarCircle: { width: 30, height: 30, borderRadius: '50%', background: '#2563eb', color: '#fff', fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarInfo: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 },
  avatarName: { fontSize: 13, fontWeight: 600, color: '#1a1d23', lineHeight: 1, whiteSpace: 'nowrap' },
  roleBadge: { fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, lineHeight: 1.4 },
  dropdown: { position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 210, background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.10)', zIndex: 1000, overflow: 'hidden' },
  dropdownHeader: { padding: '12px 14px 10px', borderBottom: '1px solid #f0f1f3' },
  dropItem: { display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '10px 14px', background: 'none', border: 'none', fontSize: 13.5, color: '#374151', cursor: 'pointer', textAlign: 'left' },
  dropDivider: { height: 1, background: '#f0f1f3', margin: '2px 0' },
  // Mobile hamburger
  hamburger: { display: 'flex', flexDirection: 'column', gap: 5, background: 'none', border: 'none', padding: 8, cursor: 'pointer', borderRadius: 6 },
  hLine: { display: 'block', width: 22, height: 2, background: '#374151', borderRadius: 2 },
}
