import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getUnreadCount } from '../utils/notifications'

// ─── Icons ────────────────────────────────────────────────────────────────────

const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

const JobsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
  </svg>
)

const CalendarIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

const ClientsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const BellIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)

const UserIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

// ─── Nav items by role ────────────────────────────────────────────────────────

const ADMIN_TABS = [
  { to: '/dashboard',  label: 'Home',      Icon: HomeIcon },
  { to: '/jobs',       label: 'Jobs',       Icon: JobsIcon },
  { to: '/scheduler',  label: 'Schedule',   Icon: CalendarIcon },
  { to: '/clients',    label: 'Clients',    Icon: ClientsIcon },
  { to: '/profile',    label: 'Profile',    Icon: UserIcon },
]

const STAFF_TABS = [
  { to: '/dashboard',  label: 'Home',      Icon: HomeIcon },
  { to: '/my-jobs',    label: 'My Jobs',    Icon: JobsIcon },
  { to: '/scheduler',  label: 'Schedule',   Icon: CalendarIcon },
  { to: '/profile',    label: 'Profile',    Icon: UserIcon },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function MobileBottomNav() {
  const { user, isAdmin } = useAuth()
  const tabs = isAdmin ? ADMIN_TABS : STAFF_TABS
  const unread = user ? getUnreadCount(user.id) : 0

  const s = {
    nav: {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 300,
      display: 'flex',
      background: '#ffffff',
      borderTop: '1px solid #e8e9ec',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    },
    tab: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      padding: '8px 4px',
      color: '#9ca3af',
      textDecoration: 'none',
      fontSize: 10,
      fontWeight: 500,
      minHeight: 56,
      position: 'relative',
      WebkitTapHighlightColor: 'transparent',
    },
    activeTab: {
      color: '#2563eb',
    },
    badge: {
      position: 'absolute',
      top: 6,
      right: 'calc(50% - 18px)',
      background: '#ef4444',
      color: '#fff',
      borderRadius: 10,
      fontSize: 9,
      fontWeight: 700,
      minWidth: 16,
      height: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 4px',
      lineHeight: 1,
    },
  }

  return (
    <nav className="bottom-nav" style={s.nav}>
      {tabs.map(({ to, label, Icon }) => {
        const showBadge = to === '/profile' && unread > 0
        return (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({ ...s.tab, ...(isActive ? s.activeTab : {}) })}
          >
            <div style={{ position: 'relative' }}>
              <Icon />
              {showBadge && (
                <span style={s.badge}>{unread > 9 ? '9+' : unread}</span>
              )}
            </div>
            {label}
          </NavLink>
        )
      })}
    </nav>
  )
}
