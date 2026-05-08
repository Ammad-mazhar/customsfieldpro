import { useState, useMemo } from 'react'
import { getActivityLog, clearOldLogs } from '../../utils/activityLog'

// ─── Constants ────────────────────────────────────────────────────────────────
const MODULES = ['All', 'Auth', 'Clients', 'Jobs', 'Invoices', 'Quotes', 'Requests', 'Users', 'Settings']

const ACTION_GROUPS = {
  created:         ['CLIENT_CREATED','JOB_CREATED','INVOICE_CREATED','QUOTE_CREATED','REQUEST_CREATED','USER_CREATED'],
  updated:         ['CLIENT_UPDATED','JOB_UPDATED','JOB_STATUS_UPDATED','INVOICE_SENT','QUOTE_SENT','USER_UPDATED','SETTINGS_UPDATED','PERMISSION_CHANGED'],
  converted:       ['REQUEST_CONVERTED','QUOTE_CONVERTED','INVOICE_PAID','QUOTE_APPROVED'],
  deleted:         ['CLIENT_DELETED','JOB_DELETED','INVOICE_DELETED','USER_DELETED'],
  auth:            ['USER_LOGIN','USER_LOGOUT'],
}

function badgeStyle(action) {
  const a = action || ''
  if (ACTION_GROUPS.deleted.includes(a))
    return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' }
  if (ACTION_GROUPS.created.includes(a))
    return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' }
  if (ACTION_GROUPS.converted.includes(a))
    return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' }
  if (ACTION_GROUPS.updated.includes(a))
    return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' }
  if (ACTION_GROUPS.auth.includes(a))
    return { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' }
  return { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' }
}

function fmtAction(action) {
  return (action || '').replace(/_/g, ' ')
}

function fmtTime(ts) {
  const d = new Date(ts)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function avatarColor(name) {
  const COLORS = ['#2563eb','#16a34a','#d97706','#7c3aed','#dc2626','#0891b2','#db2777']
  let h = 0
  for (const ch of (name || '')) h = (h * 31 + ch.charCodeAt(0)) & 0xffff
  return COLORS[h % COLORS.length]
}

function toCSV(rows) {
  const headers = ['Time','User','Role','Action','Module','Record','Details']
  const body = rows.map(r => [
    fmtTime(r.timestamp), r.userName, r.userRole, r.action, r.module, r.recordLabel, r.details,
  ].map(v => { const s = String(v ?? '').replace(/"/g, '""'); return s.includes(',') ? `"${s}"` : s }).join(','))
  return [headers.join(','), ...body].join('\n')
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const PAGE_SIZE = 25

// ─── Seed demo entries so the log isn't empty on first load ───────────────────
function seedDemoLog() {
  const KEY = 'ff_activity_log'
  if (localStorage.getItem(KEY)) return          // already has entries
  const now = Date.now()
  const demo = [
    { id:'log-d1', timestamp: now - 2*60*1000,        userId:'user-1', userName:'Admin User',  userRole:'admin',  action:'USER_LOGIN',         module:'Auth',     recordId:'user-1',    recordLabel:'Admin User',             details:'Logged in successfully.',                 ipAddress:'N/A' },
    { id:'log-d2', timestamp: now - 5*60*1000,        userId:'user-2', userName:'D. Moore',    userRole:'staff',  action:'JOB_STATUS_UPDATED', module:'Jobs',     recordId:'JOB-1042',  recordLabel:'JOB-1042 – Martha Reynolds', details:'Status changed from Scheduled to In Progress.', ipAddress:'N/A' },
    { id:'log-d3', timestamp: now - 12*60*1000,       userId:'user-1', userName:'Admin User',  userRole:'admin',  action:'INVOICE_SENT',       module:'Invoices', recordId:'INV-2048',  recordLabel:'INV-2048 – Martha Reynolds', details:'Invoice marked as Sent.',               ipAddress:'N/A' },
    { id:'log-d4', timestamp: now - 30*60*1000,       userId:'user-3', userName:'A. Torres',   userRole:'staff',  action:'JOB_CREATED',        module:'Jobs',     recordId:'JOB-1041',  recordLabel:'JOB-1041 – Sunrise Apartments', details:'Job created: Sink Fixture Install.',   ipAddress:'N/A' },
    { id:'log-d5', timestamp: now - 1*60*60*1000,     userId:'user-1', userName:'Admin User',  userRole:'admin',  action:'CLIENT_CREATED',     module:'Clients',  recordId:'8',         recordLabel:'Rosa Delgado',             details:'New client added.',                       ipAddress:'N/A' },
    { id:'log-d6', timestamp: now - 2*60*60*1000,     userId:'user-4', userName:'R. Singh',    userRole:'staff',  action:'JOB_STATUS_UPDATED', module:'Jobs',     recordId:'JOB-1040',  recordLabel:'JOB-1040 – Green Valley School', details:'Status changed from In Progress to Completed.', ipAddress:'N/A' },
    { id:'log-d7', timestamp: now - 3*60*60*1000,     userId:'user-1', userName:'Admin User',  userRole:'admin',  action:'QUOTE_APPROVED',     module:'Quotes',   recordId:'QUO-508',   recordLabel:'QUO-508 – Sunrise Apartments', details:'Quote approved by client.',            ipAddress:'N/A' },
    { id:'log-d8', timestamp: now - 4*60*60*1000,     userId:'user-1', userName:'Admin User',  userRole:'admin',  action:'INVOICE_PAID',       module:'Invoices', recordId:'INV-2046',  recordLabel:'INV-2046 – Green Valley School', details:'Invoice marked as Paid.',             ipAddress:'N/A' },
    { id:'log-d9', timestamp: now - 5*60*60*1000,     userId:'user-2', userName:'D. Moore',    userRole:'staff',  action:'USER_LOGIN',         module:'Auth',     recordId:'user-2',    recordLabel:'D. Moore',                 details:'Logged in successfully.',                 ipAddress:'N/A' },
    { id:'log-d10',timestamp: now - 6*60*60*1000,     userId:'user-1', userName:'Admin User',  userRole:'admin',  action:'PERMISSION_CHANGED', module:'Settings', recordId:'staff',     recordLabel:'Staff Role',               details:'Enabled permission: create_jobs.',        ipAddress:'N/A' },
    { id:'log-d11',timestamp: now - 7*60*60*1000,     userId:'user-1', userName:'Admin User',  userRole:'admin',  action:'USER_CREATED',       module:'Users',    recordId:'user-5',    recordLabel:'K. Patel',                 details:'New user account created.',               ipAddress:'N/A' },
    { id:'log-d12',timestamp: now - 8*60*60*1000,     userId:'user-3', userName:'A. Torres',   userRole:'staff',  action:'JOB_UPDATED',        module:'Jobs',     recordId:'JOB-1041',  recordLabel:'JOB-1041 – Sunrise Apartments', details:'Job notes updated.',                  ipAddress:'N/A' },
    { id:'log-d13',timestamp: now - 9*60*60*1000,     userId:'user-1', userName:'Admin User',  userRole:'admin',  action:'SETTINGS_UPDATED',   module:'Settings', recordId:'company',   recordLabel:'Company Settings',         details:'Company settings saved.',                 ipAddress:'N/A' },
    { id:'log-d14',timestamp: now - 24*60*60*1000,    userId:'user-4', userName:'R. Singh',    userRole:'staff',  action:'JOB_STATUS_UPDATED', module:'Jobs',     recordId:'JOB-1035',  recordLabel:'JOB-1035 – City Hall Complex', details:'Status changed from New to In Progress.', ipAddress:'N/A' },
    { id:'log-d15',timestamp: now - 25*60*60*1000,    userId:'user-1', userName:'Admin User',  userRole:'admin',  action:'QUOTE_CREATED',      module:'Quotes',   recordId:'QUO-509',   recordLabel:'QUO-509 – Harbor Clinic',  details:'Quote created: HVAC System Replace.',     ipAddress:'N/A' },
    { id:'log-d16',timestamp: now - 26*60*60*1000,    userId:'user-2', userName:'D. Moore',    userRole:'staff',  action:'USER_LOGOUT',        module:'Auth',     recordId:'user-2',    recordLabel:'D. Moore',                 details:'Logged out.',                             ipAddress:'N/A' },
    { id:'log-d17',timestamp: now - 28*60*60*1000,    userId:'user-1', userName:'Admin User',  userRole:'admin',  action:'INVOICE_CREATED',    module:'Invoices', recordId:'INV-2048',  recordLabel:'INV-2048 – Martha Reynolds', details:'Invoice created from JOB-1042.',         ipAddress:'N/A' },
    { id:'log-d18',timestamp: now - 30*60*60*1000,    userId:'user-1', userName:'Admin User',  userRole:'admin',  action:'CLIENT_UPDATED',     module:'Clients',  recordId:'5',         recordLabel:'Harbor Clinic',            details:'Client notes updated.',                   ipAddress:'N/A' },
    { id:'log-d19',timestamp: now - 48*60*60*1000,    userId:'user-3', userName:'A. Torres',   userRole:'staff',  action:'REQUEST_CONVERTED',  module:'Requests', recordId:'REQ-085',   recordLabel:'REQ-085 – Sunrise Apartments', details:'Request converted to JOB-1041.',        ipAddress:'N/A' },
    { id:'log-d20',timestamp: now - 50*60*60*1000,    userId:'user-4', userName:'R. Singh',    userRole:'staff',  action:'JOB_CREATED',        module:'Jobs',     recordId:'JOB-1037',  recordLabel:'JOB-1037 – Tom Nguyen',    details:'Job created: Water Heater Replacement.',  ipAddress:'N/A' },
    { id:'log-d21',timestamp: now - 72*60*60*1000,    userId:'user-1', userName:'Admin User',  userRole:'admin',  action:'QUOTE_CONVERTED',    module:'Quotes',   recordId:'QUO-505',   recordLabel:'QUO-505 – Green Valley School', details:'Quote converted to job.',              ipAddress:'N/A' },
    { id:'log-d22',timestamp: now - 96*60*60*1000,    userId:'user-1', userName:'Admin User',  userRole:'admin',  action:'USER_UPDATED',       module:'Users',    recordId:'user-3',    recordLabel:'A. Torres',                details:'User role changed from technician to staff.', ipAddress:'N/A' },
    { id:'log-d23',timestamp: now - 5*24*60*60*1000,  userId:'user-2', userName:'D. Moore',    userRole:'staff',  action:'JOB_STATUS_UPDATED', module:'Jobs',     recordId:'JOB-1039',  recordLabel:'JOB-1039 – Frank Holloway', details:'Status changed from In Progress to Completed.', ipAddress:'N/A' },
    { id:'log-d24',timestamp: now - 6*24*60*60*1000,  userId:'user-1', userName:'Admin User',  userRole:'admin',  action:'CLIENT_DELETED',     module:'Clients',  recordId:'99',        recordLabel:'Old Test Client',          details:'Client record deleted.',                  ipAddress:'N/A' },
    { id:'log-d25',timestamp: now - 7*24*60*60*1000,  userId:'user-1', userName:'Admin User',  userRole:'admin',  action:'INVOICE_SENT',       module:'Invoices', recordId:'INV-2045',  recordLabel:'INV-2045 – Frank Holloway', details:'Invoice marked as Sent.',               ipAddress:'N/A' },
    { id:'log-d26',timestamp: now - 8*24*60*60*1000,  userId:'user-4', userName:'R. Singh',    userRole:'staff',  action:'USER_LOGIN',         module:'Auth',     recordId:'user-4',    recordLabel:'R. Singh',                 details:'Logged in successfully.',                 ipAddress:'N/A' },
    { id:'log-d27',timestamp: now - 10*24*60*60*1000, userId:'user-1', userName:'Admin User',  userRole:'admin',  action:'SETTINGS_UPDATED',   module:'Settings', recordId:'technicians','recordLabel':'Technicians',           details:'Technician list updated.',                ipAddress:'N/A' },
    { id:'log-d28',timestamp: now - 12*24*60*60*1000, userId:'user-1', userName:'Admin User',  userRole:'admin',  action:'REQUEST_CREATED',    module:'Requests', recordId:'REQ-088',   recordLabel:'REQ-088 – Harbor Clinic',  details:'New service request submitted.',          ipAddress:'N/A' },
  ]
  localStorage.setItem(KEY, JSON.stringify(demo))
}
seedDemoLog()

// ─── Main component ───────────────────────────────────────────────────────────
export default function ActivityLog() {
  const [dateRange,   setDateRange]   = useState('7days')
  const [customFrom,  setCustomFrom]  = useState('')
  const [customTo,    setCustomTo]    = useState('')
  const [filterUser,  setFilterUser]  = useState('all')
  const [filterModule,setFilterModule]= useState('All')
  const [filterAction,setFilterAction]= useState('All')
  const [search,      setSearch]      = useState('')
  const [page,        setPage]        = useState(1)
  const [expandedId,  setExpandedId]  = useState(null)
  const [pruned,      setPruned]      = useState(null)

  // Build filters object
  const filters = useMemo(() => ({
    dateRange, customFrom, customTo,
    userId:   filterUser,
    module:   filterModule,
    action:   filterAction,
    search,
  }), [dateRange, customFrom, customTo, filterUser, filterModule, filterAction, search])

  // Get all entries (unfiltered) for user list + today stats
  const allEntries = useMemo(() => getActivityLog({}), [])

  // Get filtered entries
  const filtered = useMemo(() => {
    setPage(1)
    return getActivityLog(filters)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, customFrom, customTo, filterUser, filterModule, filterAction, search])

  // Stats for summary row
  const todayEntries = useMemo(() => getActivityLog({ dateRange: 'today' }), [allEntries.length])

  const mostActiveUser = useMemo(() => {
    const m = {}
    todayEntries.forEach(e => { m[e.userName] = (m[e.userName] || 0) + 1 })
    const top = Object.entries(m).sort((a, b) => b[1] - a[1])[0]
    return top ? `${top[0]} (${top[1]})` : '—'
  }, [todayEntries])

  const mostModifiedModule = useMemo(() => {
    const m = {}
    todayEntries.forEach(e => { if (e.module !== 'Auth') m[e.module] = (m[e.module] || 0) + 1 })
    const top = Object.entries(m).sort((a, b) => b[1] - a[1])[0]
    return top ? top[0] : '—'
  }, [todayEntries])

  // Unique users for filter dropdown
  const userOptions = useMemo(() => {
    const seen = new Map()
    allEntries.forEach(e => { if (!seen.has(e.userId)) seen.set(e.userId, e.userName) })
    return [['all', 'All Users'], ...Array.from(seen.entries())]
  }, [allEntries.length])

  // All action types for filter
  const actionOptions = useMemo(() => {
    const s = new Set(['All'])
    allEntries.forEach(e => s.add(e.action))
    return Array.from(s)
  }, [allEntries.length])

  // Pagination
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageEntries = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleExport() {
    downloadCSV(toCSV(filtered), `activity-log-${new Date().toISOString().split('T')[0]}.csv`)
  }

  function handlePrune() {
    const removed = clearOldLogs()
    setPruned(removed)
    setTimeout(() => setPruned(null), 3000)
  }

  const DATE_RANGES = [
    { v: 'today',  l: 'Today' },
    { v: '7days',  l: 'Last 7 Days' },
    { v: '30days', l: 'Last 30 Days' },
    { v: 'custom', l: 'Custom' },
    { v: 'all',    l: 'All Time' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Actions Today', value: todayEntries.length },
          { label: 'Most Active User',    value: mostActiveUser },
          { label: 'Most Active Module',  value: mostModifiedModule },
          { label: 'Total Log Entries',   value: allEntries.length },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, padding: '16px 20px', flex: 1, minWidth: 140 }}>
            <p style={{ fontSize: 11.5, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 6px' }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#1a1d23', margin: 0, letterSpacing: '-0.3px' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Row 1: Date range pills + Export */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 8, padding: 3 }}>
            {DATE_RANGES.map(r => (
              <button key={r.v} onClick={() => { setDateRange(r.v); setPage(1) }}
                style={{ padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: dateRange === r.v ? '#fff' : 'transparent', color: dateRange === r.v ? '#1a1d23' : '#6b7280', boxShadow: dateRange === r.v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                {r.l}
              </button>
            ))}
          </div>

          {dateRange === 'custom' && (
            <>
              <input type="date" value={customFrom} onChange={e => { setCustomFrom(e.target.value); setPage(1) }}
                style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #e8e9ec', fontSize: 13, color: '#374151' }} />
              <span style={{ color: '#9ca3af', fontSize: 13 }}>to</span>
              <input type="date" value={customTo} onChange={e => { setCustomTo(e.target.value); setPage(1) }}
                style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #e8e9ec', fontSize: 13, color: '#374151' }} />
            </>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={handlePrune}
              style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #e8e9ec', background: '#fff', fontSize: 12, fontWeight: 500, color: '#9ca3af', cursor: 'pointer' }}
              title="Remove logs older than 90 days">
              Prune Old Logs
            </button>
            <button onClick={handleExport}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 7, border: 'none', background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/>
              </svg>
              Export Log
            </button>
          </div>
        </div>

        {/* Row 2: Dropdowns + search */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <select value={filterUser} onChange={e => { setFilterUser(e.target.value); setPage(1) }}
            style={selStyle}>
            {userOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>

          <select value={filterModule} onChange={e => { setFilterModule(e.target.value); setPage(1) }}
            style={selStyle}>
            {MODULES.map(m => <option key={m}>{m}</option>)}
          </select>

          <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1) }}
            style={selStyle}>
            {actionOptions.map(a => (
              <option key={a} value={a}>{a === 'All' ? 'All Actions' : fmtAction(a)}</option>
            ))}
          </select>

          <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round"/>
            </svg>
            <input type="text" placeholder="Search details, user, or record…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              style={{ ...selStyle, paddingLeft: 30, width: '100%', boxSizing: 'border-box' }} />
          </div>
        </div>

        {pruned != null && (
          <p style={{ margin: 0, fontSize: 13, color: '#16a34a', fontWeight: 500 }}>
            ✓ Removed {pruned} log entries older than 90 days.
          </p>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f1f3', display: 'flex', alignItems: 'center', gap: 10 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Activity Feed</p>
          <span style={{ fontSize: 12, background: '#f3f4f6', color: '#6b7280', fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
            <p style={{ fontSize: 14, margin: 0 }}>No activity found for the selected filters.</p>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Time', 'User', 'Action', 'Module', 'Record', 'Details'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textAlign: 'left', borderBottom: '1px solid #f0f1f3', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageEntries.map((entry, i) => {
                  const bs  = badgeStyle(entry.action)
                  const col = avatarColor(entry.userName)
                  const isExpanded = expandedId === entry.id
                  const isLast = i === pageEntries.length - 1

                  return [
                    <tr key={entry.id}
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      style={{ borderBottom: (isExpanded || !isLast) ? '1px solid #f0f1f3' : 'none', cursor: 'pointer', background: isExpanded ? '#fafbff' : 'transparent', transition: 'background 0.1s' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>
                        <span title={fmtDate(entry.timestamp)} style={{ display: 'block', fontWeight: 500 }}>{fmtTime(entry.timestamp)}</span>
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: col, color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {initials(entry.userName)}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1a1d23' }}>{entry.userName}</p>
                            <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', textTransform: 'capitalize' }}>{entry.userRole}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: bs.bg, color: bs.color, border: `1px solid ${bs.border}`, letterSpacing: '0.2px' }}>
                          {fmtAction(entry.action)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151', fontWeight: 500, whiteSpace: 'nowrap' }}>{entry.module}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151', maxWidth: 160 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.recordLabel}>
                          {entry.recordLabel || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280', maxWidth: 220 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.details || '—'}
                        </span>
                      </td>
                    </tr>,
                    isExpanded && (
                      <tr key={`${entry.id}-exp`} style={{ background: '#f8f9ff', borderBottom: '1px solid #f0f1f3' }}>
                        <td colSpan={6} style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px 24px', fontSize: 13 }}>
                            <div><span style={{ color: '#9ca3af', fontWeight: 600 }}>Log ID: </span><span style={{ color: '#374151', fontFamily: 'monospace', fontSize: 12 }}>{entry.id}</span></div>
                            <div><span style={{ color: '#9ca3af', fontWeight: 600 }}>Timestamp: </span><span style={{ color: '#374151' }}>{new Date(entry.timestamp).toLocaleString()}</span></div>
                            <div><span style={{ color: '#9ca3af', fontWeight: 600 }}>User ID: </span><span style={{ color: '#374151', fontFamily: 'monospace', fontSize: 12 }}>{entry.userId}</span></div>
                            <div><span style={{ color: '#9ca3af', fontWeight: 600 }}>Record ID: </span><span style={{ color: '#374151', fontFamily: 'monospace', fontSize: 12 }}>{entry.recordId || '—'}</span></div>
                            <div><span style={{ color: '#9ca3af', fontWeight: 600 }}>IP Address: </span><span style={{ color: '#374151' }}>{entry.ipAddress}</span></div>
                            <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#9ca3af', fontWeight: 600 }}>Full Details: </span><span style={{ color: '#1a1d23' }}>{entry.details || '—'}</span></div>
                          </div>
                        </td>
                      </tr>
                    ),
                  ]
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #f0f1f3' }}>
                <span style={{ fontSize: 13, color: '#9ca3af' }}>
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ ...pageBtnStyle, opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                    const p = start + i
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        style={{ ...pageBtnStyle, background: p === page ? '#2563eb' : '#fff', color: p === page ? '#fff' : '#374151', borderColor: p === page ? '#2563eb' : '#e8e9ec' }}>
                        {p}
                      </button>
                    )
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{ ...pageBtnStyle, opacity: page === totalPages ? 0.4 : 1 }}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Shared micro-styles ──────────────────────────────────────────────────────
const selStyle = {
  height: 34, padding: '0 10px', borderRadius: 7, border: '1px solid #e8e9ec',
  fontSize: 13, color: '#374151', background: '#fff', minWidth: 130,
}

const pageBtnStyle = {
  padding: '5px 11px', borderRadius: 6, border: '1px solid #e8e9ec', background: '#fff',
  fontSize: 13, color: '#374151', cursor: 'pointer', fontWeight: 500,
}
