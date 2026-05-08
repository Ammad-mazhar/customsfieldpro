import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import {
  getNotifications, markAsRead, markAllAsRead, getUnreadCount,
} from '../utils/notifications'

// ── Time-ago helper ───────────────────────────────────────────────────────────
function timeAgo(ts) {
  const diff = Date.now() - ts
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  <  1) return 'Just now'
  if (mins  < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  if (hours <  2) return '1 hour ago'
  if (hours < 24) return `${hours} hours ago`
  if (days  === 1) return 'Yesterday'
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Type → visual config ──────────────────────────────────────────────────────
function typeConfig(type) {
  switch (type) {
    case 'NEW_REQUEST':
      return { color: '#0891b2', bg: '#ecfeff', icon:
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.08 6.08l.91-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>,
      }
    case 'JOB_ASSIGNED':
      return { color: '#2563eb', bg: '#eff6ff', icon:
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>,
      }
    case 'JOB_COMPLETED':
      return { color: '#16a34a', bg: '#f0fdf4', icon:
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>,
      }
    case 'INVOICE_OVERDUE':
      return { color: '#dc2626', bg: '#fef2f2', icon:
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/>
        </svg>,
      }
    case 'QUOTE_APPROVED':
      return { color: '#7c3aed', bg: '#f5f3ff', icon:
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" strokeLinecap="round" strokeLinejoin="round"/><rect x="9" y="3" width="6" height="4" rx="1"/>
          <polyline points="9 12 11 14 15 10" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>,
      }
    case 'USER_CREATED':
      return { color: '#d97706', bg: '#fffbeb', icon:
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="8.5" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="20" y1="8" x2="20" y2="14" strokeLinecap="round"/><line x1="23" y1="11" x2="17" y2="11" strokeLinecap="round"/>
        </svg>,
      }
    default:
      return { color: '#6b7280', bg: '#f3f4f6', icon:
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/>
        </svg>,
      }
  }
}

// ── Module → navigation path ──────────────────────────────────────────────────
function navPath(module) {
  const map = { Jobs: '/jobs', Clients: '/clients', Invoices: '/invoices', Quotes: '/quotes', Requests: '/requests', Users: '/user-management' }
  return map[module] || '/dashboard'
}

const TABS = ['All', 'Unread', 'Jobs', 'Invoices']

// ── Main component ────────────────────────────────────────────────────────────
export default function NotificationsCenter() {
  const navigate = useNavigate()
  const { user }  = useAuth()
  const panelRef  = useRef(null)

  const [open,        setOpen]        = useState(false)
  const [tab,         setTab]         = useState('All')
  const [notifications, setNotifications] = useState([])
  const [unread,      setUnread]      = useState(0)

  // Load from localStorage
  const refresh = useCallback(() => {
    if (!user) return
    const all = getNotifications(user.id)
    setNotifications(all)
    setUnread(all.filter(n => !n.isRead).length)
  }, [user?.id])

  // Initial load + polling every 60 s
  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 60000)
    return () => clearInterval(id)
  }, [refresh])

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleMarkAllRead() {
    if (!user) return
    markAllAsRead(user.id)
    refresh()
  }

  function handleClickNotif(notif) {
    markAsRead(notif.id)
    refresh()
    setOpen(false)
    navigate(navPath(notif.relatedModule))
  }

  // Filtered list
  const filtered = notifications.filter(n => {
    if (tab === 'Unread')   return !n.isRead
    if (tab === 'Jobs')     return n.relatedModule === 'Jobs'
    if (tab === 'Invoices') return n.relatedModule === 'Invoices'
    return true
  })

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        style={{
          position: 'relative', width: 36, height: 36, borderRadius: 8,
          border: `1px solid ${open ? '#2563eb' : '#e8e9ec'}`,
          background: open ? '#eff6ff' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: open ? '#2563eb' : '#6b7280', cursor: 'pointer',
          transition: 'all 0.12s',
        }}>
        <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round"/>
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 17, height: 17, borderRadius: 9,
            background: '#dc2626', color: '#fff',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff', padding: '0 3px', lineHeight: 1,
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: 360, maxHeight: 480,
          background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12,
          boxShadow: '0 12px 36px rgba(0,0,0,0.12)', zIndex: 1100,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', borderBottom: '1px solid #f0f1f3', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23' }}>Notifications</span>
              {unread > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, background: '#dc2626', color: '#fff', padding: '1px 7px', borderRadius: 10 }}>
                  {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={handleMarkAllRead}
                style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>
                Mark all read
              </button>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #f0f1f3', flexShrink: 0 }}>
            {TABS.map(t => {
              const cnt = t === 'Unread' ? unread
                : t === 'All' ? notifications.length
                : notifications.filter(n => n.relatedModule === t).length
              return (
                <button key={t} onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: '9px 4px', background: 'none', border: 'none',
                    borderBottom: `2px solid ${tab === t ? '#2563eb' : 'transparent'}`,
                    fontSize: 12.5, fontWeight: tab === t ? 600 : 500,
                    color: tab === t ? '#2563eb' : '#6b7280', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}>
                  {t}
                  {cnt > 0 && (
                    <span style={{ fontSize: 10, background: tab === t ? '#dbeafe' : '#f3f4f6', color: tab === t ? '#2563eb' : '#9ca3af', padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>
                      {cnt}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Notification list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                <p style={{ fontSize: 13, margin: 0 }}>
                  {tab === 'Unread' ? 'All caught up!' : 'No notifications here yet.'}
                </p>
              </div>
            ) : (
              filtered.map((notif, i) => {
                const cfg = typeConfig(notif.type)
                return (
                  <button key={notif.id} onClick={() => handleClickNotif(notif)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 11,
                      width: '100%', padding: '12px 14px',
                      background: notif.isRead ? '#f9fafb' : '#fff',
                      border: 'none', borderBottom: i < filtered.length - 1 ? '1px solid #f0f1f3' : 'none',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f3f6ff'}
                    onMouseLeave={e => e.currentTarget.style.background = notif.isRead ? '#f9fafb' : '#fff'}>
                    {/* Icon */}
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0, marginTop: 1,
                      background: cfg.bg, color: cfg.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                        <p style={{ fontSize: 13, fontWeight: notif.isRead ? 500 : 700, color: '#1a1d23', margin: 0, lineHeight: 1.3 }}>
                          {notif.title}
                        </p>
                        {!notif.isRead && (
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2563eb', flexShrink: 0, marginTop: 4 }} />
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: '3px 0 0', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {notif.description}
                      </p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0', fontWeight: 500 }}>
                        {timeAgo(notif.createdAt)}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid #f0f1f3', padding: '10px 16px', flexShrink: 0 }}>
            <button
              onClick={() => { setOpen(false); navigate('/activity-log') }}
              style={{ width: '100%', padding: '7px', borderRadius: 7, border: '1px solid #e8e9ec', background: '#f9fafb', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer', textAlign: 'center' }}>
              View Activity Log →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
