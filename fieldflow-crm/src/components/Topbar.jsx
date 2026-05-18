import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useIsMobile } from '../utils/useIsMobile'
import { useDarkMode } from '../hooks/useDarkMode'
import NotificationsCenter from './NotificationsCenter'
import { getUnreadCount } from '../data/store'

const pageTitles = {
  '/dashboard':          'Dashboard',
  '/clients':            'Clients',
  '/jobs':               'Jobs',
  '/invoices':           'Invoices',
  '/quotes':             'Quotes',
  '/requests':           'Requests',
  '/scheduler':          'Scheduler',
  '/service-calls':      'Service Call Master',
  '/settings':           'Settings',
  '/user-management':    'User Management',
  '/permissions':        'Permissions',
  '/reports':            'Reports & Analytics',
  '/activity-log':       'Activity Log',
  '/profile':            'My Profile',
  '/aging':              'Aging Report',
  '/parts-status':       'Parts Status',
  '/warranty':           'Warranty Claims',
  '/warranty-claims':    'Warranty Claims',
  '/maintenance-calls':  'Maintenance Calls',
  '/equipment':          'Equipment & Assets',
  '/leads':              'Lead Management',
  '/ai-receptionist':   'AI Receptionist',
}

// Blue secondary nav links
const BLUE_NAV = [
  { to: '/clients',         label: 'Customer'        },
  { to: '/service-calls',   label: 'Service Calls'   },
  { to: '/equipment',       label: 'Equipment'       },
  { to: '/leads',           label: 'Leads'           },
  { to: '/inventory',       label: 'Inventory'       },
  { to: '/purchase-orders', label: 'Purchase Orders' },
  { to: '/warranty-claims', label: 'Warranty'        },
  { to: '/reports',         label: 'Reports'         },
  { to: '/ai-receptionist', label: '🤖 AI Receptionist' },
]

// Quick access shortcuts
const QUICK_LINKS = [
  { to: '/aging',             label: 'Aging'     },
  { to: '/parts-status',      label: 'Parts'     },
  { to: '/inventory',         label: 'Inventory' },
  { to: '/warranty',          label: 'Warranty'  },
  { to: '/maintenance-calls', label: 'Maint.'    },
]

function formatDate(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export default function Topbar({ onMenuToggle }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, isAdmin, logout } = useAuth()
  const isMobile = useIsMobile()
  const { isDark, toggle: toggleDark } = useDarkMode()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const title       = pageTitles[pathname] ?? 'CustomsFieldPro'
  const today       = formatDate(new Date())
  const initials    = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const inboxUnread = isAdmin ? (() => { try { return getUnreadCount() } catch { return 0 } })() : 0
  const roleLabel   = isAdmin ? 'Admin' : user?.role === 'technician' ? 'Technician' : 'Staff'

  useEffect(() => {
    function onOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    function onEscape(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [])

  function signOut() {
    logout()
    navigate('/login', { replace: true })
  }

  // ── Jobber-style profile dropdown ───────────────────────────────────────────
  const profileDropdown = (
    <div style={styles.dropdown}>
      {/* Section 1: User info */}
      <div style={styles.dropHeader}>
        <div style={styles.dropAvatar}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={styles.dropName}>{user?.name}</p>
          <p style={styles.dropEmail}>{user?.email}</p>
          <span style={{
            display: 'inline-block', fontSize: 10.5, fontWeight: 700, padding: '2px 8px',
            borderRadius: 20, marginTop: 4,
            background: isAdmin ? 'var(--color-accent-light)' : 'var(--color-success-light)',
            color: isAdmin ? 'var(--color-accent)' : 'var(--color-success)',
          }}>{roleLabel}</span>
        </div>
      </div>

      {/* Section 2: Menu items */}
      <div style={{ borderBottom: '1px solid var(--color-border-primary)', padding: '4px 0' }}>
        <button className="tbDropItem" onClick={() => { setOpen(false); navigate('/profile') }} style={styles.dropItem}>
          <span style={styles.dropIcon}>👤</span>
          <span style={styles.dropLabel}>My Profile</span>
        </button>

        {/* Dark mode toggle — stays open after click */}
        <div className="tbDropItem" style={{ ...styles.dropItem, cursor: 'pointer' }}
          onClick={e => { e.stopPropagation(); toggleDark() }}>
          <span style={styles.dropIcon}>{isDark ? '☀️' : '🌙'}</span>
          <span style={{ ...styles.dropLabel, flex: 1 }}>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          {/* Toggle switch */}
          <div style={{
            width: 34, height: 18, borderRadius: 9,
            background: isDark ? 'var(--color-accent)' : '#d1d5db',
            position: 'relative', flexShrink: 0,
            transition: 'background 0.2s',
          }}>
            <div style={{
              position: 'absolute', top: 2,
              left: isDark ? 16 : 2,
              width: 14, height: 14, borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
              transition: 'left 0.2s',
            }} />
          </div>
        </div>

        {isAdmin && (
          <button className="tbDropItem" onClick={() => { setOpen(false); navigate('/settings') }} style={styles.dropItem}>
            <span style={styles.dropIcon}>⚙️</span>
            <span style={styles.dropLabel}>Settings</span>
          </button>
        )}
      </div>

      {/* Section 3: Sign out */}
      <div style={{ padding: '4px 0' }}>
        <button className="tbDropItem" onClick={signOut} style={{ ...styles.dropItem, color: 'var(--color-danger)' }}>
          <span style={styles.dropIcon}>🚪</span>
          <span style={{ ...styles.dropLabel, color: 'var(--color-danger)' }}>Sign Out</span>
        </button>
      </div>
    </div>
  )

  // ── Blue secondary nav bar ─────────────────────────────────────────────────
  const blueNavBar = (
    <nav style={styles.blueBar}>
      <div style={styles.blueLinks}>
        {BLUE_NAV.map(({ to, label }) => (
          <NavLink key={to} to={to}
            style={({ isActive }) => ({ ...styles.blueLink, ...(isActive ? styles.blueLinkActive : {}) })}>
            {label}
          </NavLink>
        ))}
      </div>

      <div style={styles.quickRow}>
        <button onClick={() => navigate('/service-calls')} title="New Service Call" style={styles.greenBtn}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.19 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button onClick={() => navigate('/scheduler')} title="Scheduler" style={styles.greenBtn}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
            <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round"/>
            <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round"/>
            <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round"/>
            <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round"/>
          </svg>
        </button>
        <button onClick={() => navigate('/scheduler')} title="Dispatch Board" style={styles.greenBtn}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
            <rect x="3" y="3" width="7" height="7" rx="1" strokeLinecap="round"/>
            <rect x="14" y="3" width="7" height="7" rx="1" strokeLinecap="round"/>
            <rect x="3" y="14" width="7" height="7" rx="1" strokeLinecap="round"/>
            <rect x="14" y="14" width="7" height="7" rx="1" strokeLinecap="round"/>
          </svg>
        </button>

        <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.25)', margin: '0 4px' }} />

        {QUICK_LINKS.map(({ to, label }) => (
          <NavLink key={to} to={to}
            style={({ isActive }) => ({ ...styles.quickLink, ...(isActive ? { color: '#fff', fontWeight: 700 } : {}) })}>
            {label}
          </NavLink>
        ))}
      </div>

      <button onClick={signOut} style={styles.logoutBtn}>Logout</button>
    </nav>
  )

  // ── Mobile layout ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <header style={{ ...styles.bar, padding: '0 16px', justifyContent: 'space-between' }}>
          <button onClick={onMenuToggle} style={styles.hamburger} aria-label="Open menu">
            <span style={styles.hLine} />
            <span style={styles.hLine} />
            <span style={styles.hLine} />
          </button>
          <h1 style={{ ...styles.title, fontSize: 16, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            {title}
          </h1>
          <div ref={ref} style={{ position: 'relative' }}>
            <button onClick={() => setOpen(o => !o)} style={styles.avatarBtn} title={user?.name}>
              <div style={{ ...styles.avatarCircle, width: 30, height: 30, fontSize: 11 }}>{initials}</div>
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"
                style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {open && profileDropdown}
          </div>
        </header>
        <nav style={{ ...styles.blueBar, padding: '0 12px', overflowX: 'auto' }}>
          <div style={{ ...styles.blueLinks, gap: 0 }}>
            {BLUE_NAV.map(({ to, label }) => (
              <NavLink key={to} to={to}
                style={({ isActive }) => ({ ...styles.blueLink, fontSize: 11, padding: '0 8px', ...(isActive ? styles.blueLinkActive : {}) })}>
                {label}
              </NavLink>
            ))}
          </div>
          <button onClick={signOut} style={{ ...styles.logoutBtn, fontSize: 11, padding: '0 8px' }}>Logout</button>
        </nav>
      </>
    )
  }

  // ── Desktop layout ─────────────────────────────────────────────────────────
  return (
    <>
      <header style={styles.bar}>
        <div>
          <h1 style={styles.title}>{title}</h1>
        </div>
        <div style={styles.right}>
          <span style={styles.date}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"
              style={{ marginRight: 6, flexShrink: 0 }}>
              <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round"/>
              <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round"/>
              <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round"/>
            </svg>
            {today}
          </span>

          {isAdmin && (
            <button onClick={() => navigate('/inbox')} title="Inbox"
              style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: 'var(--color-text-secondary)' }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {inboxUnread > 0 && (
                <span style={{ position: 'absolute', top: -2, right: -2, background: '#2563eb', color: '#fff', fontSize: 9, fontWeight: 800, padding: '1px 4px', borderRadius: 8, lineHeight: 1.4 }}>
                  {inboxUnread}
                </span>
              )}
            </button>
          )}

          <NotificationsCenter />

          <div ref={ref} style={{ position: 'relative' }}>
            <button onClick={() => setOpen(o => !o)} style={styles.avatarBtn} title={user?.name}>
              <div style={styles.avatarCircle}>{initials}</div>
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"
                style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {open && profileDropdown}
          </div>
        </div>
      </header>

      {blueNavBar}
    </>
  )
}

const styles = {
  bar: {
    height: 60,
    background: 'var(--topbar-bg)',
    borderBottom: '1px solid var(--color-border-primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 32px', flexShrink: 0, position: 'relative',
  },
  title: { fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.2px' },
  right: { display: 'flex', alignItems: 'center', gap: 14 },
  date:  { display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 },

  // Avatar button — clean initials + caret
  avatarBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'none', border: '1px solid var(--color-border-primary)',
    borderRadius: 8, padding: '5px 8px 5px 5px', cursor: 'pointer',
  },
  avatarCircle: {
    width: 30, height: 30, borderRadius: '50%',
    background: '#2563eb', color: '#fff',
    fontSize: 11.5, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  // Dropdown
  dropdown: {
    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
    minWidth: 248, background: 'var(--card-bg)',
    border: '1px solid var(--color-border-primary)',
    borderRadius: 10, boxShadow: 'var(--shadow)',
    zIndex: 1000, overflow: 'hidden',
    animation: 'fadeInDrop 0.15s ease',
  },
  dropHeader: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '14px 14px 12px',
    borderBottom: '1px solid var(--color-border-primary)',
  },
  dropAvatar: {
    width: 38, height: 38, borderRadius: '50%',
    background: '#2563eb', color: '#fff',
    fontSize: 13, fontWeight: 700, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  dropName:  { fontSize: 13.5, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 2px' },
  dropEmail: { fontSize: 12, color: 'var(--color-text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 },
  dropItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '9px 14px',
    background: 'none', border: 'none',
    fontSize: 13.5, color: 'var(--color-text-primary)',
    cursor: 'pointer', textAlign: 'left',
  },
  dropIcon:  { fontSize: 15, width: 18, textAlign: 'center', flexShrink: 0 },
  dropLabel: { fontSize: 13.5, color: 'var(--color-text-primary)' },

  hamburger: { display: 'flex', flexDirection: 'column', gap: 5, background: 'none', border: 'none', padding: 8, cursor: 'pointer', borderRadius: 6 },
  hLine:     { display: 'block', width: 22, height: 2, background: 'var(--color-text-primary)', borderRadius: 2 },

  // Blue secondary nav bar
  blueBar: {
    height: 38, background: '#1565C0',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 20px', flexShrink: 0, borderBottom: '1px solid #1255A0',
  },
  blueLinks: { display: 'flex', alignItems: 'center', gap: 0 },
  blueLink: {
    color: 'rgba(255,255,255,0.82)', fontSize: 12.5, fontWeight: 600,
    padding: '0 12px', height: 38, display: 'flex', alignItems: 'center',
    textDecoration: 'none', borderBottom: '2px solid transparent',
    transition: 'color 0.12s, border-color 0.12s', whiteSpace: 'nowrap',
  },
  blueLinkActive: { color: '#fff', borderBottom: '2px solid #fff' },
  quickRow: { display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' },
  greenBtn: {
    width: 24, height: 24, borderRadius: 4, background: '#2E7D32', color: '#fff',
    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  quickLink: {
    color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 500,
    padding: '0 8px', height: 38, display: 'flex', alignItems: 'center',
    textDecoration: 'none', whiteSpace: 'nowrap', transition: 'color 0.1s',
  },
  logoutBtn: {
    color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600,
    background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 4, padding: '3px 10px', cursor: 'pointer', whiteSpace: 'nowrap',
  },
}
