import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTechColor } from '../utils/techColors'
import { getJobs, getInvoices, getQuotes, getRequests, getClients, getParts, getLowStockCount } from '../data/store'
import { getReviewStats } from '../utils/reviewRequests'
import { getAIStats, loadSettings as loadAISettings } from '../utils/aiReceptionist'
import { normalizeStatus } from '../data/jobStatuses'
import { useAuth } from '../auth/AuthContext'
import { useIsMobile } from '../utils/useIsMobile'
import { getActivityLog } from '../utils/activityLog'
import { getNotifications, markAsRead } from '../utils/notifications'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from 'recharts'

const statusColors = {
  'In Progress': { bg: '#eff6ff', color: '#2563eb' },
  'Scheduled':   { bg: '#ecfeff', color: '#0891b2' },
  'Completed':   { bg: '#f0fdf4', color: '#16a34a' },
  'Cancelled':   { bg: '#fef2f2', color: '#dc2626' },
}

// ── AI Receptionist Dashboard Widget ─────────────────────────────────────────
function AIReceptionistWidget() {
  const navigate = useNavigate()
  const aiStats   = getAIStats()
  const aiSettings = loadAISettings()
  const lastConv   = aiStats.recent[0]
  function timeAgo(iso) {
    if (!iso) return 'No activity yet'
    const d = Math.floor((Date.now() - new Date(iso)) / 60000)
    if (d < 1) return 'Just now'
    if (d < 60) return `${d}m ago`
    const h = Math.floor(d / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }
  return (
    <button onClick={() => navigate('/ai-receptionist')}
      style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', textAlign: 'left', cursor: 'pointer', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 9, background: 'linear-gradient(135deg,#eff6ff,#f5f3ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="8" width="18" height="12" rx="3"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>
            <circle cx="9.5" cy="13.5" r="1.2" fill="#2563eb" stroke="none"/><circle cx="14.5" cy="13.5" r="1.2" fill="#2563eb" stroke="none"/>
            <path d="M9 17c.5.5 1.5.8 3 .8s2.5-.3 3-.8"/>
          </svg>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
          background: aiSettings.active ? '#f0fdf4' : '#f3f4f6',
          color: aiSettings.active ? '#16a34a' : '#6b7280' }}>
          {aiSettings.active ? '● Active' : '○ Paused'}
        </span>
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1d23', margin: '0 0 8px' }}>AI Receptionist</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <div style={{ background: '#f8f9fa', borderRadius: 7, padding: '6px 10px' }}>
          <p style={{ fontSize: 10.5, fontWeight: 600, color: '#9ca3af', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Texts Today</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#2563eb', margin: 0 }}>{aiStats.todayTexts}</p>
        </div>
        <div style={{ background: '#f8f9fa', borderRadius: 7, padding: '6px 10px' }}>
          <p style={{ fontSize: 10.5, fontWeight: 600, color: '#9ca3af', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Requests</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#7c3aed', margin: 0 }}>{aiStats.todayRequests}</p>
        </div>
      </div>
      <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '8px 0 0' }}>
        Last activity: {timeAgo(lastConv?.lastActivity)}
      </p>
    </button>
  )
}

// ── Action badge colour for activity log ──────────────────────────────────────
function actionBadgeStyle(action = '') {
  const DELETED  = ['CLIENT_DELETED','JOB_DELETED','INVOICE_DELETED','USER_DELETED']
  const CREATED  = ['CLIENT_CREATED','JOB_CREATED','INVOICE_CREATED','QUOTE_CREATED','REQUEST_CREATED','USER_CREATED']
  const AMBER    = ['REQUEST_CONVERTED','QUOTE_CONVERTED','INVOICE_PAID','QUOTE_APPROVED','JOB_STATUS_UPDATED']
  if (DELETED.includes(action))  return { bg:'#fef2f2', color:'#dc2626' }
  if (CREATED.includes(action))  return { bg:'#f0fdf4', color:'#16a34a' }
  if (AMBER.includes(action))    return { bg:'#fffbeb', color:'#d97706' }
  if (['USER_LOGIN','USER_LOGOUT'].includes(action)) return { bg:'#f3f4f6', color:'#6b7280' }
  return { bg:'#eff6ff', color:'#2563eb' }
}

function timeAgo(ts) {
  const diff  = Date.now() - ts
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  if (mins  <  1) return 'Just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Dashboard() {
  const navigate  = useNavigate()
  const { user, isAdmin } = useAuth()
  const isMobile = useIsMobile()
  const allJobs    = useState(() => getJobs())[0]
  const [clients]  = useState(() => getClients())
  const [invoices] = useState(() => getInvoices())
  const [quotes]   = useState(() => getQuotes())
  const [requests] = useState(() => getRequests())

  // Staff sees only their own jobs
  const jobs = isAdmin
    ? allJobs
    : allJobs.filter(j => j.technicianId === user?.technicianId)

  const today = new Date().toISOString().split('T')[0]

  // Live stats
  const activeJobs   = jobs.filter(j => j.status === 'In Progress' || j.status === 'Scheduled')
  const inProgress   = activeJobs.filter(j => j.status === 'In Progress').length
  const openInvoices = invoices.filter(i => i.status !== 'Paid')
  const outstanding  = openInvoices.reduce((s, i) => s + (i.total || 0), 0)
  const sentQuotes   = quotes.filter(q => q.status === 'Sent')
  const approvedQ    = quotes.filter(q => q.status === 'Approved').length
  const openRequests = requests.filter(r => r.status === 'Open')
  const urgentReqs   = openRequests.filter(r => r.priority === 'Urgent').length

  const completedThisWeek = jobs.filter(j => j.status === 'Completed').length

  // ── Review request stats ──────────────────────────────────────────────────
  const reviewStats = getReviewStats()

  const adminStats = [
    {
      label: 'Clients', value: String(clients.length), change: `${clients.filter(c=>c.type==='Commercial').length} commercial`,
      positive: null, color: '#7c3aed', bg: '#f5f3ff',
      icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round"/><path d="M21 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round"/></svg>,
      link: '/clients',
    },
    {
      label: 'Open Requests', value: String(openRequests.length), change: urgentReqs > 0 ? `${urgentReqs} urgent` : 'None urgent',
      positive: openRequests.length > 0, color: '#16a34a', bg: '#f0fdf4',
      icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.08 6.08l.91-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
      link: '/requests',
    },
    {
      label: 'Pending Quotes', value: String(sentQuotes.length), change: `${approvedQ} approved`,
      positive: null, color: '#0891b2', bg: '#ecfeff',
      icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" strokeLinecap="round" strokeLinejoin="round"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12" strokeLinecap="round"/><line x1="9" y1="16" x2="13" y2="16" strokeLinecap="round"/></svg>,
      link: '/quotes',
    },
    {
      label: 'Active Jobs', value: String(activeJobs.length), change: `${inProgress} in progress`,
      positive: true, color: '#2563eb', bg: '#eff6ff',
      icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
      link: '/jobs',
    },
    {
      label: 'Open Invoices', value: String(openInvoices.length), change: `$${outstanding.toLocaleString()} outstanding`,
      positive: null, color: '#d97706', bg: '#fffbeb',
      icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round"/><line x1="8" y1="13" x2="16" y2="13" strokeLinecap="round"/><line x1="8" y1="17" x2="12" y2="17" strokeLinecap="round"/></svg>,
      link: '/invoices',
    },
    {
      label: 'Reviews This Month', value: String(reviewStats.sentThisMonth), change: `Est. ${reviewStats.estimatedNewReviews} new Google reviews`,
      positive: reviewStats.sentThisMonth > 0, color: '#f59e0b', bg: '#fffbeb',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
      link: '/ratings',
    },
  ]

  const staffStats = [
    {
      label: 'My Active Jobs', value: String(activeJobs.length), change: `${inProgress} in progress`,
      positive: true, color: '#2563eb', bg: '#eff6ff',
      icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
      label: 'Scheduled Today', value: String(jobs.filter(j => j.date === today && j.status === 'Scheduled').length), change: 'on the calendar',
      positive: null, color: '#0891b2', bg: '#ecfeff',
      icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round"/></svg>,
    },
    {
      label: 'Completed', value: String(completedThisWeek), change: 'total completed',
      positive: true, color: '#16a34a', bg: '#f0fdf4',
      icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
      label: 'Total Jobs', value: String(jobs.length), change: 'assigned to me',
      positive: null, color: '#7c3aed', bg: '#f5f3ff',
      icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round"/><path d="M21 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round"/></svg>,
    },
  ]

  const stats = isAdmin ? adminStats : staffStats

  // ── Chart data ────────────────────────────────────────────────────────────────
  // Revenue: last 6 calendar months from paid invoices
  const revenueData = (() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleString('default', { month: 'short' })
      const revenue = invoices
        .filter(inv => inv.status === 'Paid' && (inv.issued || inv.due || '').startsWith(key))
        .reduce((s, inv) => s + (inv.total || 0), 0)
      months.push({ month: label, revenue })
    }
    return months
  })()

  // Jobs by type
  const jobTypeMap = {}
  jobs.forEach(j => { jobTypeMap[j.type] = (jobTypeMap[j.type] || 0) + 1 })
  const jobTypeData = Object.entries(jobTypeMap).map(([name, value]) => ({ name, value }))
  const PIE_COLORS = ['#2563eb', '#0891b2', '#16a34a', '#d97706', '#7c3aed', '#dc2626']

  // Invoice status counts
  const invStatusMap = {}
  invoices.forEach(inv => { invStatusMap[inv.status] = (invStatusMap[inv.status] || 0) + 1 })
  const invStatusData = ['Paid', 'Sent', 'Overdue', 'Draft']
    .map(s => ({ status: s, count: invStatusMap[s] || 0 }))
  const BAR_COLORS = { Paid: '#16a34a', Sent: '#2563eb', Overdue: '#dc2626', Draft: '#9ca3af' }

  // Recent jobs: first 5 (already sorted newest-first in store)
  const recentJobs = jobs.slice(0, 5)

  // ── New sections data ─────────────────────────────────────────────────────
  // Recent Activity (last 10 log entries)
  const recentActivity = getActivityLog({}).slice(0, 10)

  // Unread notifications for current user (last 5)
  const userNotifs = user ? getNotifications(user.id).filter(n => !n.isRead).slice(0, 5) : []

  // Overdue alerts (admin only)
  const overdueInvoices = invoices.filter(i => i.status === 'Overdue')
  const overdueInvTotal = overdueInvoices.reduce((s, i) => s + (i.total || 0), 0)
  const pastDueJobs     = jobs.filter(j => j.date < today && j.status !== 'Completed' && j.status !== 'Cancelled')
  const expiringQuotes  = quotes.filter(q => {
    if (q.status !== 'Sent') return false
    const daysLeft = (new Date(q.expires) - new Date(today)) / 86400000
    return daysLeft >= 0 && daysLeft <= 3
  })

  // ── Inventory data (admin) ────────────────────────────────────────────────
  const parts        = isAdmin ? getParts() : []
  const lowStockCnt  = isAdmin ? getLowStockCount() : 0
  const totalParts   = parts.length

  // ── Ratings data ──────────────────────────────────────────────────────────
  const allJobsForRatings = isAdmin ? allJobs : allJobs.filter(j => j.technicianId === user?.technicianId)
  const ratedJobs    = allJobsForRatings.filter(j => j.rating?.overall)
  const avgRating    = ratedJobs.length > 0
    ? ratedJobs.reduce((s, j) => s + j.rating.overall, 0) / ratedJobs.length
    : 0

  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const ratingsThisMonth = ratedJobs.filter(j =>
    (j.rating.submittedAt ? new Date(j.rating.submittedAt).toISOString().slice(0, 7) : '') === thisMonthKey
  ).length

  // Staff: personal avg rating
  const myRatedJobs = isAdmin ? [] : ratedJobs
  const myAvgRating = myRatedJobs.length > 0
    ? myRatedJobs.reduce((s, j) => s + j.rating.overall, 0) / myRatedJobs.length
    : 0

  // ── Revenue this month vs last month ─────────────────────────────────────
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthKey  = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`
  const revenueThisMonth = invoices
    .filter(i => i.status === 'Paid' && (i.issued || i.due || '').startsWith(thisMonthKey))
    .reduce((s, i) => s + (i.total || 0), 0)
  const revenueLastMonth = invoices
    .filter(i => i.status === 'Paid' && (i.issued || i.due || '').startsWith(lastMonthKey))
    .reduce((s, i) => s + (i.total || 0), 0)
  const revPct = revenueLastMonth > 0
    ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
    : null

  // Today's schedule: jobs on today's date that are active
  const todayJobs = jobs
    .filter(j => j.date === today && (j.status === 'Scheduled' || j.status === 'in_progress' || j.status === 'In Progress' || j.status === 'scheduled'))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))

  // ── Pipeline action widget data ───────────────────────────────────────────
  const readyToScheduleJobs   = jobs.filter(j => normalizeStatus(j.status) === 'ready_to_schedule' || normalizeStatus(j.status) === 'parts_received')
  const waitingOnPartsJobs    = jobs.filter(j => normalizeStatus(j.status) === 'waiting_on_parts')
  const diagnosisRequiredJobs = jobs.filter(j => normalizeStatus(j.status) === 'diagnosis_required')
  const hasActionItems = readyToScheduleJobs.length + waitingOnPartsJobs.length + diagnosisRequiredJobs.length > 0

  function fmtTime(t) {
    if (!t) return '—'
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`
  }

  return (
    <div style={styles.page}>
      {/* Stat Cards */}
      <div style={{ ...styles.statsGrid, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isAdmin ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)' }}>
        {stats.map((s) => (
          <div
            key={s.label}
            style={{ ...styles.card, ...(s.link ? { cursor: 'pointer' } : {}) }}
            onClick={s.link ? () => navigate(s.link) : undefined}
          >
            <div style={styles.cardTop}>
              <div style={{ ...styles.iconBox, background: s.bg, color: s.color }}>
                {s.icon}
              </div>
              <span style={styles.statValue}>{s.value}</span>
            </div>
            <p style={styles.statLabel}>{s.label}</p>
            <p style={{ ...styles.statChange, color: s.positive ? '#16a34a' : '#6b7280' }}>
              {s.change}
            </p>
          </div>
        ))}
      </div>

      {/* ── Action Required Widget (admin only, when items exist) ── */}
      {isAdmin && hasActionItems && (
        <div style={{ background: '#fff', border: '2px solid #fbbf24', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ background: '#fffbeb', padding: '12px 20px', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <p style={{ fontSize: 13.5, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              Action Required
            </p>
          </div>

          {/* Ready to Schedule */}
          {readyToScheduleJobs.length > 0 && (
            <div style={{ borderBottom: waitingOnPartsJobs.length + diagnosisRequiredJobs.length > 0 ? '1px solid #f0f1f3' : 'none' }}>
              <div style={{ padding: '10px 20px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>🗓️</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#2563eb' }}>Ready to Schedule ({readyToScheduleJobs.length})</span>
              </div>
              {readyToScheduleJobs.map(j => (
                <div key={j.id} onClick={() => navigate('/jobs')}
                  style={{ padding: '8px 20px 8px 42px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 10 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11.5, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 4, padding: '1px 5px', marginRight: 6 }}>{j.id}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23' }}>{j.clientName}</span>
                    {j.date && <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>Parts received {j.date}</span>}
                  </div>
                  <button onClick={e => { e.stopPropagation(); navigate('/scheduler') }}
                    style={{ height: 28, padding: '0 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                    Schedule
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Waiting on Parts */}
          {waitingOnPartsJobs.length > 0 && (
            <div style={{ borderBottom: diagnosisRequiredJobs.length > 0 ? '1px solid #f0f1f3' : 'none' }}>
              <div style={{ padding: '10px 20px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>🔩</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#d97706' }}>Waiting on Parts ({waitingOnPartsJobs.length})</span>
              </div>
              {waitingOnPartsJobs.map(j => {
                const nextPart = (j.partsRequired || []).find(p => p.status !== 'received')
                const eta = nextPart?.expectedDate ? (nextPart.expectedDate + (nextPart.expectedTime ? ` ${nextPart.expectedTime}` : '')) : null
                return (
                  <div key={j.id} onClick={() => navigate('/jobs')}
                    style={{ padding: '8px 20px 8px 42px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 10 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fffdf0'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div>
                      <span style={{ fontFamily: 'monospace', fontSize: 11.5, background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: 4, padding: '1px 5px', marginRight: 6 }}>{j.id}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23' }}>{j.clientName}</span>
                      {nextPart && <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>{nextPart.partName} ETA: {eta || 'TBD'}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Diagnosis Required */}
          {diagnosisRequiredJobs.length > 0 && (
            <div>
              <div style={{ padding: '10px 20px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>🔍</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#7c3aed' }}>Diagnosis Required ({diagnosisRequiredJobs.length})</span>
              </div>
              {diagnosisRequiredJobs.map(j => (
                <div key={j.id} onClick={() => navigate('/jobs')}
                  style={{ padding: '8px 20px 8px 42px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 10 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#faf8ff'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div>
                    <span style={{ fontFamily: 'monospace', fontSize: 11.5, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', borderRadius: 4, padding: '1px 5px', marginRight: 6 }}>{j.id}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23' }}>{j.clientName}</span>
                    {j.techName && <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>Assigned to {j.techName}</span>}
                  </div>
                  <button onClick={e => { e.stopPropagation(); navigate('/jobs') }}
                    style={{ height: 28, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                    Diagnose
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Charts (admin only) ── */}
      {isAdmin && <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Revenue (Last 6 Months)</h2>
          <span style={{fontSize:12,color:'#9ca3af'}}>Paid invoices only</span>
        </div>
        <div style={{padding:'16px 8px 8px'}}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={revenueData} margin={{top:4,right:24,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f3" />
              <XAxis dataKey="month" tick={{fontSize:12,fill:'#9ca3af'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize:12,fill:'#9ca3af'}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v.toLocaleString()}`} width={72} />
              <Tooltip formatter={v=>[`$${v.toLocaleString()}`,'Revenue']} contentStyle={{fontSize:12,borderRadius:8,border:'1px solid #e8e9ec'}} />
              <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} dot={{r:4,fill:'#2563eb',strokeWidth:0}} activeDot={{r:6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      }

      {isAdmin && <div style={{ ...styles.chartsRow, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
        {/* Jobs by Type */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Jobs by Type</h2>
          </div>
          <div style={{padding:'16px 8px 8px'}}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={jobTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {jobTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{fontSize:12,borderRadius:8,border:'1px solid #e8e9ec'}} />
                <Legend wrapperStyle={{fontSize:12}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invoice Status */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Invoice Status</h2>
          </div>
          <div style={{padding:'16px 8px 8px'}}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={invStatusData} margin={{top:4,right:16,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f3" />
                <XAxis dataKey="status" tick={{fontSize:12,fill:'#9ca3af'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:12,fill:'#9ca3af'}} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{fontSize:12,borderRadius:8,border:'1px solid #e8e9ec'}} />
                <Bar dataKey="count" radius={[4,4,0,0]}>
                  {invStatusData.map((entry, i) => <Cell key={i} fill={BAR_COLORS[entry.status]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>}

      <div style={{ ...styles.twoCol, gridTemplateColumns: isMobile ? '1fr' : '1fr 340px' }}>
        {/* Recent Jobs */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Recent Jobs</h2>
            <span style={{fontSize:12,color:'#9ca3af'}}>{jobs.length} total</span>
          </div>
          <div style={{ ...styles.tableWrap, overflowX: 'auto' }}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  {['Job ID', 'Client', 'Type', 'Assigned To', 'Status', 'Date'].map((h) => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job) => {
                  const sc = statusColors[job.status] ?? { bg: '#f3f4f6', color: '#6b7280' }
                  return (
                    <tr key={job.id} style={styles.tr}>
                      <td style={styles.td}><span style={styles.jobId}>{job.id}</span></td>
                      <td style={styles.td}>{job.clientName}</td>
                      <td style={styles.td}>{job.type}</td>
                      <td style={styles.td}>
                        {job.techName ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: getTechColor(job.technicianId).hex, flexShrink: 0, display: 'inline-block' }} />
                            {job.techName}
                          </span>
                        ) : <span style={{ color: '#9ca3af' }}>—</span>}
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, background: sc.bg, color: sc.color }}>
                          {job.status}
                        </span>
                      </td>
                      <td style={{ ...styles.td, color: '#9ca3af' }}>{job.date}</td>
                    </tr>
                  )
                })}
                {recentJobs.length===0&&(
                  <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'#9ca3af',fontSize:13}}>No jobs yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Today's Schedule */}
        <div style={{ ...styles.section, minWidth: 0 }}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Today's Schedule</h2>
            <span style={{fontSize:12,color:'#9ca3af'}}>{today}</span>
          </div>
          {todayJobs.length === 0 ? (
            <div style={{padding:'32px 20px',textAlign:'center'}}>
              <p style={{color:'#9ca3af',fontSize:13,margin:0}}>No jobs scheduled for today.</p>
            </div>
          ) : (
            <div style={styles.scheduleList}>
              {todayJobs.map((job) => (
                <div key={job.id} style={styles.scheduleItem}>
                  <div style={styles.scheduleTime}>{fmtTime(job.time)}</div>
                  <div style={styles.scheduleDot} />
                  <div style={styles.scheduleBody}>
                    <p style={styles.scheduleClient}>{job.clientName}</p>
                    <p style={styles.scheduleMeta}>
                    {job.type}
                    {job.techName && (
                      <span> · <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: getTechColor(job.technicianId).hex, display: 'inline-block' }} />
                        {job.techName}
                      </span></span>
                    )}
                  </p>
                    <p style={styles.scheduleAddr}>{job.clientAddress||'—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions (admin only) ── */}
      {isAdmin && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Quick Actions</h2>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '16px 20px' }}>
            {[
              { label: '+ New Job',     path: '/jobs',     color: '#2563eb', bg: '#eff6ff' },
              { label: '+ New Client',  path: '/clients',  color: '#16a34a', bg: '#f0fdf4' },
              { label: '+ New Invoice', path: '/invoices', color: '#d97706', bg: '#fffbeb' },
              { label: '+ New Quote',   path: '/quotes',   color: '#7c3aed', bg: '#f5f3ff' },
            ].map(({ label, path, color, bg }) => (
              <button key={label} onClick={() => navigate(path)}
                style={{ padding: '11px 22px', borderRadius: 9, border: `1.5px solid ${color}20`, background: bg, color, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Admin widgets: Inventory + Ratings + Revenue ── */}
      {isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>

          {/* Inventory widget */}
          <button onClick={() => navigate('/inventory')}
            style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '18px 20px', textAlign: 'left', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'box-shadow 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 9, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              {lowStockCnt > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: '#fef2f2', color: '#dc2626' }}>
                  {lowStockCnt} low stock
                </span>
              )}
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#1a1d23', margin: '0 0 4px', lineHeight: 1 }}>{totalParts}</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1d23', margin: '0 0 4px' }}>Parts in Catalog</p>
            <p style={{ fontSize: 12, color: lowStockCnt > 0 ? '#dc2626' : '#9ca3af', margin: 0, fontWeight: lowStockCnt > 0 ? 600 : 400 }}>
              {lowStockCnt > 0 ? `${lowStockCnt} part${lowStockCnt !== 1 ? 's' : ''} need reordering →` : 'All stock levels OK'}
            </p>
          </button>

          {/* Ratings widget */}
          <button onClick={() => navigate('/ratings')}
            style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '18px 20px', textAlign: 'left', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'box-shadow 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 9, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#d97706" stroke="#d97706" strokeWidth="1">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
              {ratedJobs.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: '#fffbeb', color: '#d97706' }}>
                  {ratingsThisMonth} this month
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#1a1d23', margin: 0, lineHeight: 1 }}>
                {ratedJobs.length > 0 ? avgRating.toFixed(1) : '—'}
              </p>
              {ratedJobs.length > 0 && <span style={{ fontSize: 13, color: '#9ca3af' }}>/ 5.0</span>}
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1d23', margin: '0 0 4px' }}>Avg Customer Rating</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
              {ratedJobs.length > 0 ? `${ratedJobs.length} review${ratedJobs.length !== 1 ? 's' : ''} total →` : 'No reviews yet'}
            </p>
            {reviewStats.sentThisMonth > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f0f1f3' }}>
                <p style={{ fontSize: 11.5, color: '#6b7280', margin: '0 0 3px' }}>
                  📨 {reviewStats.sentThisMonth} review request{reviewStats.sentThisMonth !== 1 ? 's' : ''} sent
                </p>
                <p style={{ fontSize: 11.5, color: '#6b7280', margin: 0 }}>
                  ⭐ Est. {reviewStats.estimatedNewReviews} new Google review{reviewStats.estimatedNewReviews !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </button>

          {/* AI Receptionist widget */}
          <AIReceptionistWidget />

          {/* Revenue this month widget */}
          <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 9, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              {revPct !== null && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: revPct >= 0 ? '#f0fdf4' : '#fef2f2', color: revPct >= 0 ? '#16a34a' : '#dc2626' }}>
                  {revPct >= 0 ? '↑' : '↓'} {Math.abs(revPct)}% vs last month
                </span>
              )}
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#1a1d23', margin: '0 0 4px', lineHeight: 1 }}>
              ${revenueThisMonth.toLocaleString()}
            </p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1d23', margin: '0 0 4px' }}>Revenue This Month</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
              Last month: ${revenueLastMonth.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* ── Staff: My Rating card ── */}
      {!isAdmin && myRatedJobs.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 9, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#d97706" stroke="#d97706" strokeWidth="1">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1d23', margin: '0 0 2px' }}>My Customer Rating</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} width="14" height="14" viewBox="0 0 24 24"
                      fill={s <= Math.round(myAvgRating) ? '#f59e0b' : '#e5e7eb'}
                      stroke={s <= Math.round(myAvgRating) ? '#f59e0b' : '#e5e7eb'} strokeWidth="1">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  ))}
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#d97706' }}>{myAvgRating.toFixed(1)}</span>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>from {myRatedJobs.length} review{myRatedJobs.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Overdue Alerts (admin only) ── */}
      {isAdmin && (overdueInvoices.length > 0 || pastDueJobs.length > 0 || expiringQuotes.length > 0) && (
        <div style={{ background: '#fff', border: '1.5px solid #fecaca', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ ...styles.sectionHeader, borderBottom: '1px solid #fecaca', background: '#fef2f2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round"/>
              </svg>
              <h2 style={{ ...styles.sectionTitle, color: '#dc2626' }}>Overdue Alerts</h2>
            </div>
            <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>Action required</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
            {overdueInvoices.length > 0 && (
              <button onClick={() => navigate('/invoices')}
                style={{ flex: 1, minWidth: 200, padding: '16px 20px', background: 'none', border: 'none', borderRight: '1px solid #fecaca', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#dc2626', margin: '0 0 4px' }}>{overdueInvoices.length}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 2px' }}>Overdue Invoice{overdueInvoices.length !== 1 ? 's' : ''}</p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>${overdueInvTotal.toLocaleString()} total outstanding</p>
              </button>
            )}
            {pastDueJobs.length > 0 && (
              <button onClick={() => navigate('/jobs')}
                style={{ flex: 1, minWidth: 200, padding: '16px 20px', background: 'none', border: 'none', borderRight: '1px solid #fecaca', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#d97706', margin: '0 0 4px' }}>{pastDueJobs.length}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 2px' }}>Past-Due Job{pastDueJobs.length !== 1 ? 's' : ''}</p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Scheduled but not completed</p>
              </button>
            )}
            {expiringQuotes.length > 0 && (
              <button onClick={() => navigate('/quotes')}
                style={{ flex: 1, minWidth: 200, padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed', margin: '0 0 4px' }}>{expiringQuotes.length}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 2px' }}>Quote{expiringQuotes.length !== 1 ? 's' : ''} Expiring Soon</p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Within the next 3 days</p>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Bottom row: Recent Activity + Notifications preview ── */}
      {isAdmin && (
        <div style={{ ...styles.twoCol, gridTemplateColumns: isMobile ? '1fr' : '1fr 320px' }}>

          {/* Recent Activity */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Recent Activity</h2>
              <button onClick={() => navigate('/activity-log')}
                style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                View full log →
              </button>
            </div>
            {recentActivity.length === 0 ? (
              <p style={{ padding: '24px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13, margin: 0 }}>No activity yet.</p>
            ) : (
              <div>
                {recentActivity.map((entry, i) => {
                  const bs = actionBadgeStyle(entry.action)
                  return (
                    <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: i < recentActivity.length - 1 ? '1px solid #f8f9fa' : 'none' }}>
                      <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', width: 52, flexShrink: 0, fontWeight: 500 }}>{timeAgo(entry.timestamp)}</span>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#2563eb', color: '#fff', fontSize: 9.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {(entry.userName || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 12, background: bs.bg, color: bs.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {(entry.action || '').replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: 12.5, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {entry.recordLabel || entry.details}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Notifications preview */}
          <div style={{ ...styles.section, minWidth: 0 }}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Notifications</h2>
              <span style={{ fontSize: 11, background: '#fef2f2', color: '#dc2626', fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                {userNotifs.length} unread
              </span>
            </div>
            {userNotifs.length === 0 ? (
              <div style={{ padding: '28px 20px', textAlign: 'center', color: '#9ca3af' }}>
                <p style={{ fontSize: 13, margin: 0 }}>All caught up! 🎉</p>
              </div>
            ) : (
              <div>
                {userNotifs.map((n, i) => {
                  const NOTIF_COLORS = { NEW_REQUEST:'#0891b2', JOB_ASSIGNED:'#2563eb', JOB_COMPLETED:'#16a34a', INVOICE_OVERDUE:'#dc2626', QUOTE_APPROVED:'#7c3aed', USER_CREATED:'#d97706' }
                  const col = NOTIF_COLORS[n.type] || '#6b7280'
                  return (
                    <button key={n.id}
                      onClick={() => { markAsRead(n.id); navigate(n.relatedModule === 'Jobs' ? '/jobs' : n.relatedModule === 'Invoices' ? '/invoices' : n.relatedModule === 'Requests' ? '/requests' : '/dashboard') }}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', padding: '11px 16px', background: 'none', border: 'none', borderBottom: i < userNotifs.length - 1 ? '1px solid #f8f9fa' : 'none', cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0, marginTop: 5 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1d23', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</p>
                        <p style={{ fontSize: 11.5, color: '#6b7280', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.description}</p>
                      </div>
                      <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(n.createdAt)}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', gap: 24 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 },
  card: { background: '#ffffff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  iconBox: { width: 40, height: 40, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 32, fontWeight: 700, color: '#1a1d23', lineHeight: 1 },
  statLabel: { fontSize: 14, fontWeight: 600, color: '#1a1d23', margin: 0 },
  statChange: { fontSize: 12, margin: 0 },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' },
  section: { background: '#ffffff', border: '1px solid #e8e9ec', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f0f1f3' },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: 0 },
  tableWrap: { overflowX: 'auto' },
  th: { textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.4px', padding: '10px 16px', borderBottom: '1px solid #f0f1f3', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #f8f9fa' },
  td: { padding: '12px 16px', fontSize: 13.5, color: '#374151', whiteSpace: 'nowrap' },
  jobId: { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12.5, color: '#6b7280', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 },
  badge: { display: 'inline-block', fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 20 },
  scheduleList: { display: 'flex', flexDirection: 'column', padding: '8px 0' },
  scheduleItem: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 20px', borderBottom: '1px solid #f8f9fa' },
  scheduleTime: { fontSize: 12, fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap', width: 68, paddingTop: 2, flexShrink: 0 },
  scheduleDot: { width: 8, height: 8, borderRadius: '50%', background: '#2563eb', marginTop: 6, flexShrink: 0 },
  scheduleBody: { flex: 1, minWidth: 0 },
  scheduleClient: { fontSize: 13.5, fontWeight: 600, color: '#1a1d23', margin: 0 },
  scheduleMeta: { fontSize: 12.5, color: '#6b7280', margin: '2px 0 0' },
  scheduleAddr: { fontSize: 12, color: '#9ca3af', margin: '2px 0 0' },
}
