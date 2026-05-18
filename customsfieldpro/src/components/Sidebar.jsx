import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { clearAllData, getLowStockCount, getUnreadCount } from '../data/store'

// ─── Icon helpers (keep JSX out of arrays for clarity) ────────────────────────

const ICONS = {
  dashboard:  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  clients:    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round"/><path d="M21 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round"/></svg>,
  jobs:       <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  invoices:   <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round"/><line x1="8" y1="13" x2="16" y2="13" strokeLinecap="round"/><line x1="8" y1="17" x2="12" y2="17" strokeLinecap="round"/></svg>,
  quotes:     <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" strokeLinecap="round" strokeLinejoin="round"/><rect x="9" y="3" width="6" height="4" rx="1" strokeLinecap="round"/><line x1="9" y1="12" x2="15" y2="12" strokeLinecap="round"/><line x1="9" y1="16" x2="13" y2="16" strokeLinecap="round"/></svg>,
  requests:   <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.08 6.08l.91-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  scheduler:  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round"/></svg>,
  settings:   <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  users:      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  permissions:<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  reports:    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round"/><line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round"/><line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round"/></svg>,
  activitylog:<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/><polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  maintenance:<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 8v4l3 3" strokeLinecap="round" strokeLinejoin="round"/><path d="M16.5 3.5c.5 1 .5 2.5-.5 3.5s-2.5 1-3.5.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7.5 3.5c-.5 1-.5 2.5.5 3.5s2.5 1 3.5.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  myjobs:     <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="12" x2="12" y2="16" strokeLinecap="round"/><line x1="10" y1="14" x2="14" y2="14" strokeLinecap="round"/></svg>,
  ratings:    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  inventory:  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" strokeLinecap="round" strokeLinejoin="round"/><polyline points="3.27 6.96 12 12.01 20.73 6.96" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="22.08" x2="12" y2="12" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  timesheets: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/><polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round"/><line x1="2" y1="12" x2="4" y2="12" strokeLinecap="round"/><line x1="20" y1="12" x2="22" y2="12" strokeLinecap="round"/></svg>,
  notes:      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" strokeLinecap="round" strokeLinejoin="round"/><rect x="9" y="3" width="6" height="4" rx="1" strokeLinecap="round"/><line x1="9" y1="12" x2="15" y2="12" strokeLinecap="round"/><line x1="9" y1="16" x2="13" y2="16" strokeLinecap="round"/></svg>,
  purchaseorders: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round"/><line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 10a4 4 0 0 1-8 0" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  route:      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M3 12h3l3-9 6 18 3-9h3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  servicecalls:<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.08 6.08l.91-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  equipment:  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  warranty:   <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  leads:      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  inbox:      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" strokeLinecap="round" strokeLinejoin="round"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  billing:    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="1" y1="10" x2="23" y2="10" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  aireceptionist: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="12" rx="3"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><circle cx="9.5" cy="13.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="14.5" cy="13.5" r="1.2" fill="currentColor" stroke="none"/><path d="M9 17c.5.5 1.5.8 3 .8s2.5-.3 3-.8"/></svg>,
}

const ADMIN_NAV = [
  { to: '/dashboard',       label: 'Dashboard',       icon: ICONS.dashboard  },
  { to: '/clients',         label: 'Clients',         icon: ICONS.clients    },
  { to: '/requests',        label: 'Requests',        icon: ICONS.requests     },
  { to: '/service-calls',   label: 'Service Calls',   icon: ICONS.servicecalls },
  { to: '/equipment',       label: 'Equipment',       icon: ICONS.equipment    },
  { to: '/leads',           label: 'Leads',           icon: ICONS.leads        },
  { to: '/quotes',          label: 'Quotes',          icon: ICONS.quotes       },
  { to: '/jobs',            label: 'Jobs',            icon: ICONS.jobs         },
  { to: '/invoices',        label: 'Invoices',        icon: ICONS.invoices     },
  { to: '/scheduler',       label: 'Scheduler',       icon: ICONS.scheduler    },
  { to: '/notes',           label: 'Notes',           icon: ICONS.notes        },
  { to: '/route-optimizer', label: 'Route Optimizer', icon: ICONS.route        },
  { to: '/settings',        label: 'Settings',        icon: ICONS.settings   },
  { to: '/user-management', label: 'User Management', icon: ICONS.users      },
  { to: '/permissions',     label: 'Permissions',     icon: ICONS.permissions},
  { to: '/reports',         label: 'Reports',         icon: ICONS.reports    },
  { to: '/ratings',         label: 'Ratings',         icon: ICONS.ratings    },
  { to: '/inventory',        label: 'Inventory',        icon: ICONS.inventory      },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: ICONS.purchaseorders },
  { to: '/time-sheets',     label: 'Time Sheets',     icon: ICONS.timesheets     },
  { to: '/activity-log',    label: 'Activity Log',    icon: ICONS.activitylog},
  { to: '/maintenance',     label: 'Maintenance',     icon: ICONS.maintenance},
  { to: '/warranty-claims', label: 'Warranty Claims', icon: ICONS.warranty   },
  { to: '/inbox',              label: 'Inbox',           icon: ICONS.inbox          },
  { to: '/billing',            label: 'Billing',         icon: ICONS.billing        },
  { to: '/ai-receptionist',    label: 'AI Receptionist', icon: ICONS.aireceptionist },
]

// Build dynamic nav for non-admin users based on permissions
function buildStaffNav(hasPermission) {
  const items = [
    { to: '/dashboard', label: 'Dashboard',      icon: ICONS.dashboard },
    { to: '/my-jobs',   label: 'My Jobs (Mobile)', icon: ICONS.myjobs  },
    { to: '/jobs',      label: 'Jobs',            icon: ICONS.jobs      },
  ]
  if (hasPermission('view_clients'))     items.push({ to: '/clients',   label: 'Clients',   icon: ICONS.clients   })
  if (hasPermission('view_requests'))   items.push({ to: '/requests',  label: 'Requests',  icon: ICONS.requests  })
  if (hasPermission('view_quotes'))     items.push({ to: '/quotes',    label: 'Quotes',    icon: ICONS.quotes    })
  if (hasPermission('view_invoices'))   items.push({ to: '/invoices',  label: 'Invoices',  icon: ICONS.invoices  })
  if (hasPermission('access_scheduler')) items.push({ to: '/scheduler', label: 'Scheduler', icon: ICONS.scheduler })
  return items
}

function getUnreadNotesCount(userId) {
  try {
    const all  = JSON.parse(localStorage.getItem('customsfieldpro_job_notes') || '{}')
    const readKey = `customsfieldpro_notes_read_${userId}`
    const readSet = new Set(JSON.parse(localStorage.getItem(readKey) || '[]'))
    let count = 0
    Object.values(all).forEach(notes => notes.forEach(n => { if (!readSet.has(n.id)) count++ }))
    return count
  } catch { return 0 }
}

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { user, isAdmin, logout, hasPermission } = useAuth()
  const lowStockCount   = isAdmin ? (() => { try { return getLowStockCount() } catch { return 0 } })() : 0
  const inboxUnread     = isAdmin ? (() => { try { return getUnreadCount() } catch { return 0 } })() : 0
  const notesUnread     = (() => { try { return getUnreadNotesCount(user?.id || '') } catch { return 0 } })()

  const nav = isAdmin ? ADMIN_NAV : buildStaffNav(hasPermission)
  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  function handleReset() {
    if (window.confirm('Reset all data to sample data? All changes will be lost.')) {
      clearAllData()
      window.location.reload()
    }
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar-mobile${isOpen ? ' open' : ''}`} style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={styles.brandName}>CustomsFieldPro</span>
        </div>

        {/* Global search shortcut button */}
        <button onClick={() => window.dispatchEvent(new CustomEvent('customsfieldpro:search'))}
          style={{ margin: '6px 12px 2px', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 11px', background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-primary)', borderRadius: 8, cursor: 'pointer', width: 'calc(100% - 24px)', color: 'var(--color-text-muted)', fontSize: 12.5 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <span style={{ flex: 1, textAlign: 'left' }}>Search…</span>
          <kbd style={{ background: '#e8e9ec', border: 'none', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontFamily: 'monospace', color: '#6b7280' }}>⌘K</kbd>
        </button>

        <nav style={styles.nav}>
          <p style={styles.navLabel}>MAIN MENU</p>
          {nav.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} onClick={onClose}
              style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}>
              <span style={styles.icon}>{icon}</span>
              {label}
              {to === '/inventory' && lowStockCount > 0 && (
                <span style={{ marginLeft:'auto', background:'#dc2626', color:'#fff', fontSize:10.5, fontWeight:700, padding:'1px 6px', borderRadius:10, flexShrink:0 }}>{lowStockCount}</span>
              )}
              {to === '/inbox' && inboxUnread > 0 && (
                <span style={{ marginLeft:'auto', background:'#2563eb', color:'#fff', fontSize:10.5, fontWeight:700, padding:'1px 6px', borderRadius:10, flexShrink:0 }}>{inboxUnread}</span>
              )}
              {to === '/notes' && notesUnread > 0 && (
                <span style={{ marginLeft:'auto', background:'#f59e0b', color:'#fff', fontSize:10.5, fontWeight:700, padding:'1px 6px', borderRadius:10, flexShrink:0 }}>{notesUnread}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={styles.footer}>
          <div style={styles.avatarRow}>
            <div style={styles.avatar}>{initials}</div>
            <div>
              <p style={styles.avatarName}>{user?.name || '—'}</p>
              <p style={styles.avatarRole}>{isAdmin ? 'Admin' : (user?.role === 'technician' ? 'Technician' : 'Staff')}</p>
            </div>
          </div>
          {isAdmin && (
            <button onClick={handleReset} style={styles.resetBtn} title="Wipe localStorage and reload sample data">
              ↺ Reset Sample Data
            </button>
          )}
        </div>
      </aside>
    </>
  )
}

const styles = {
  sidebar:    { width: 228, minWidth: 228, background: 'var(--sidebar-bg)', borderRight: '1px solid var(--color-border-primary)', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' },
  brand:      { display: 'flex', alignItems: 'center', gap: 10, padding: '20px 20px 16px', borderBottom: '1px solid var(--color-border-primary)' },
  brandIcon:  { width: 34, height: 34, borderRadius: 8, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  brandName:  { fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.3px' },
  nav:        { flex: 1, padding: '12px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 },
  navLabel:   { fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.8px', padding: '8px 10px 6px', margin: 0 },
  link:       { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', minHeight: 48, borderRadius: 7, fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)', textDecoration: 'none', transition: 'background 0.12s, color 0.12s' },
  linkActive: { background: 'var(--color-accent-light)', color: 'var(--color-accent)' },
  icon:       { display: 'flex', alignItems: 'center', flexShrink: 0, opacity: 0.9 },
  footer:     { padding: '14px 16px', borderTop: '1px solid var(--color-border-primary)', display: 'flex', flexDirection: 'column', gap: 10 },
  avatarRow:  { display: 'flex', alignItems: 'center', gap: 10 },
  avatar:     { width: 34, height: 34, borderRadius: '50%', background: '#2563eb', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarName: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 },
  avatarRole: { fontSize: 12, color: 'var(--color-text-muted)', margin: 0 },
  resetBtn:   { width: '100%', padding: '7px 0', background: 'none', border: '1px solid var(--color-border-primary)', borderRadius: 7, fontSize: 12, color: 'var(--color-text-muted)', cursor: 'pointer', fontWeight: 500, letterSpacing: '0.1px' },
}
