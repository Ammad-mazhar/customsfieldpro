import { useState, useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { getInvoices, getJobs, getClients, getQuotes, getRequests } from '../data/store'
import { exportInvoicesToQuickBooks, exportClientsToQuickBooks, exportPaymentsToQuickBooks } from '../utils/quickbooksExport'

// ─── Colour palette ───────────────────────────────────────────────────────────
const BLUE   = '#2563eb'
const GREEN  = '#16a34a'
const ORANGE = '#f59e0b'
const RED    = '#dc2626'
const PURPLE = '#7c3aed'
const TEAL   = '#0891b2'

const PIE_COLORS = [BLUE, GREEN, ORANGE, RED, PURPLE, TEAL, '#db2777', '#65a30d']

// ─── Synthetic historical baselines (fill months with no real data) ───────────
// Keyed by 'YYYY-MM'. Values represent totals for that month.
const REVENUE_BASELINE = {
  '2025-04': { invoiced: 4200, collected: 3800 },
  '2025-05': { invoiced: 5100, collected: 4600 },
  '2025-06': { invoiced: 6300, collected: 5800 },
  '2025-07': { invoiced: 5800, collected: 5300 },
  '2025-08': { invoiced: 7200, collected: 6500 },
  '2025-09': { invoiced: 6800, collected: 6100 },
  '2025-10': { invoiced: 8100, collected: 7400 },
  '2025-11': { invoiced: 9400, collected: 8800 },
  '2025-12': { invoiced: 11200, collected: 10100 },
  '2026-01': { invoiced: 7600, collected: 6800 },
  '2026-02': { invoiced: 8300, collected: 7500 },
  '2026-03': { invoiced: 9800, collected: 7200 },
}

const WEEKLY_JOBS_BASELINE = {
  // ISO week strings 'YYYY-Www'
  '2026-W04': 12,
  '2026-W05': 15,
  '2026-W06': 11,
  '2026-W07': 18,
  '2026-W08': 14,
  '2026-W09': 16,
  '2026-W10': 19,
  '2026-W11': 21,
  '2026-W12': 17,
  '2026-W13': 13,
}

const CLIENT_BASELINE = {
  '2025-04': 2,
  '2025-05': 1,
  '2025-06': 3,
  '2025-07': 2,
  '2025-08': 4,
  '2025-09': 2,
  '2025-10': 3,
  '2025-11': 5,
  '2025-12': 2,
  '2026-01': 3,
  '2026-02': 2,
  '2026-03': 4,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n) {
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'k'
  return '$' + n.toLocaleString()
}

function fmtFull$(n) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function pctChange(curr, prev) {
  if (!prev) return null
  return Math.round(((curr - prev) / prev) * 100)
}

function isoWeek(dateStr) {
  const d = new Date(dateStr)
  const jan1 = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil((((d - jan1) / 86400000) + jan1.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function monthKey(dateStr) {
  return dateStr ? dateStr.slice(0, 7) : null
}

function parseSince(since) {
  // "Mar 2023" → '2023-03'
  if (!since) return null
  const months = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06',
                   Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' }
  const parts = since.split(' ')
  if (parts.length < 2) return null
  return `${parts[1]}-${months[parts[0]] || '01'}`
}

function parseDurationMins(dur) {
  if (!dur) return 0
  if (dur.toLowerCase().includes('full')) return 480
  const m = dur.match(/(\d+(?:\.\d+)?)\s*hr/)
  return m ? parseFloat(m[1]) * 60 : 60
}

function getDateRangeBounds(range, customFrom, customTo) {
  const now = new Date('2026-04-02')
  let from, to
  to = now
  if (range === 'week')   { from = new Date(now); from.setDate(now.getDate() - 7) }
  else if (range === 'month')  { from = new Date(now); from.setMonth(now.getMonth() - 1) }
  else if (range === '3m')     { from = new Date(now); from.setMonth(now.getMonth() - 3) }
  else if (range === '6m')     { from = new Date(now); from.setMonth(now.getMonth() - 6) }
  else if (range === 'year')   { from = new Date(now); from.setFullYear(now.getFullYear() - 1) }
  else {
    from = customFrom ? new Date(customFrom) : new Date(now.getFullYear(), 0, 1)
    to   = customTo   ? new Date(customTo)   : now
  }
  return { from, to }
}

function inRange(dateStr, from, to) {
  const d = new Date(dateStr)
  return d >= from && d <= to
}

function toCSV(rows, headers) {
  const head = headers.join(',')
  const body = rows.map(r => headers.map(h => {
    const v = String(r[h] ?? '').replace(/"/g, '""')
    return v.includes(',') ? `"${v}"` : v
  }).join(',')).join('\n')
  return head + '\n' + body
}

function downloadFile(content, filename, mime = 'text/csv') {
  const blob = new Blob([content], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function estimateSize(data) {
  const bytes = new Blob([JSON.stringify(data)]).size
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

// ─── Small summary card ───────────────────────────────────────────────────────
function StatCard({ label, value, sub, pct, color = BLUE }) {
  const positive = pct != null && pct >= 0
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, padding: '18px 20px', flex: 1, minWidth: 140 }}>
      <p style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 8px' }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 800, color: '#1a1d23', margin: 0, letterSpacing: '-0.5px' }}>{value}</p>
      {(sub || pct != null) && (
        <p style={{ fontSize: 12, color: pct == null ? '#9ca3af' : (positive ? GREEN : RED), margin: '6px 0 0', fontWeight: 500 }}>
          {pct != null && <span>{positive ? '▲' : '▼'} {Math.abs(pct)}% vs prev period  </span>}
          {sub && <span style={{ color: '#9ca3af' }}>{sub}</span>}
        </p>
      )}
    </div>
  )
}

// ─── Custom recharts tooltip ──────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 8, padding: '10px 14px', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#1a1d23' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '3px 0', color: p.color }}>{p.name}: <strong>{p.name?.includes('$') || p.name?.toLowerCase().includes('revenue') || p.name?.toLowerCase().includes('invoiced') || p.name?.toLowerCase().includes('collected') ? fmtFull$(p.value) : p.value}</strong></p>
      ))}
    </div>
  )
}

// ─── Tab: Revenue Report ─────────────────────────────────────────────────────
function RevenueTab() {
  const [range, setRange]         = useState('year')
  const [customFrom, setFrom]     = useState('')
  const [customTo, setTo]         = useState('')
  const [serviceFilter, setSvc]   = useState('All')

  const invoices = getInvoices()
  const jobs     = getJobs()

  // Build job lookup: jobRef → type
  const jobTypeMap = useMemo(() => {
    const m = {}
    jobs.forEach(j => { m[j.id] = j.type || 'Other' })
    return m
  }, [])

  const { from, to } = getDateRangeBounds(range, customFrom, customTo)

  // Prev period (same length, one period back)
  const periodMs = to - from
  const prevFrom = new Date(from - periodMs)
  const prevTo   = new Date(to   - periodMs)

  const SERVICE_TYPES = ['All', ...Array.from(new Set(invoices.map(inv => jobTypeMap[inv.jobRef] || 'Other')))]

  // Filter invoices in range + service
  const filtered = useMemo(() => invoices.filter(inv => {
    if (!inv.issued) return false
    if (!inRange(inv.issued, from, to)) return false
    if (serviceFilter !== 'All' && (jobTypeMap[inv.jobRef] || 'Other') !== serviceFilter) return false
    return true
  }), [invoices, from, to, serviceFilter])

  const prevFiltered = useMemo(() => invoices.filter(inv => {
    if (!inv.issued) return false
    if (!inRange(inv.issued, prevFrom, prevTo)) return false
    if (serviceFilter !== 'All' && (jobTypeMap[inv.jobRef] || 'Other') !== serviceFilter) return false
    return true
  }), [invoices, prevFrom, prevTo, serviceFilter])

  // Totals
  const totalInvoiced  = filtered.reduce((s, i) => s + (i.total || 0), 0)
  const totalCollected = filtered.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.total || 0), 0)
  const totalOutstanding = filtered.filter(i => ['Sent','Overdue'].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0)
  const countInvoices  = filtered.length

  const prevInvoiced  = prevFiltered.reduce((s, i) => s + (i.total || 0), 0)
  const prevCollected = prevFiltered.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.total || 0), 0)

  // Monthly line chart data (real data + baseline fill)
  const monthlyData = useMemo(() => {
    // collect months in range
    const months = []
    const cur = new Date(from.getFullYear(), from.getMonth(), 1)
    const end = new Date(to.getFullYear(), to.getMonth(), 1)
    while (cur <= end) {
      months.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`)
      cur.setMonth(cur.getMonth() + 1)
    }

    const realMap = {}
    filtered.forEach(inv => {
      const mk = monthKey(inv.issued)
      if (!mk) return
      if (!realMap[mk]) realMap[mk] = { invoiced: 0, collected: 0 }
      realMap[mk].invoiced  += inv.total || 0
      if (inv.status === 'Paid') realMap[mk].collected += inv.total || 0
    })

    return months.map(mk => {
      const real     = realMap[mk]
      const baseline = REVENUE_BASELINE[mk]
      const invoiced  = real ? real.invoiced  : (baseline?.invoiced  || 0)
      const collected = real ? real.collected : (baseline?.collected || 0)
      const label = new Date(mk + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      return { month: label, Invoiced: invoiced, Collected: collected }
    })
  }, [filtered, from, to])

  // Bar chart by service type
  const byService = useMemo(() => {
    const m = {}
    filtered.forEach(inv => {
      const svc = jobTypeMap[inv.jobRef] || 'Other'
      if (!m[svc]) m[svc] = { invoiced: 0, collected: 0 }
      m[svc].invoiced  += inv.total || 0
      if (inv.status === 'Paid') m[svc].collected += inv.total || 0
    })
    // fill with baseline if empty
    if (!filtered.length) {
      const sampleSvcs = { HVAC: { invoiced: 4800, collected: 3900 }, Plumbing: { invoiced: 2300, collected: 2100 }, Electrical: { invoiced: 3200, collected: 2800 }, Other: { invoiced: 800, collected: 700 } }
      Object.assign(m, sampleSvcs)
    }
    return Object.entries(m).map(([service, v]) => ({ service, Invoiced: v.invoiced, Collected: v.collected }))
  }, [filtered])

  function exportCSV() {
    const rows = filtered.map(inv => ({
      id: inv.id,
      client: inv.clientName,
      issued: inv.issued,
      due: inv.due,
      status: inv.status,
      service: jobTypeMap[inv.jobRef] || 'Other',
      total: inv.total,
    }))
    downloadFile(toCSV(rows, ['id','client','issued','due','status','service','total']), 'revenue-report.csv')
  }

  const RANGES = [
    { v: 'week', l: 'This Week' },
    { v: 'month', l: 'This Month' },
    { v: '3m', l: '3 Months' },
    { v: '6m', l: '6 Months' },
    { v: 'year', l: 'This Year' },
    { v: 'custom', l: 'Custom' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Filters row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 8, padding: 4 }}>
          {RANGES.map(r => (
            <button key={r.v} onClick={() => setRange(r.v)}
              style={{ padding: '6px 13px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: range === r.v ? '#fff' : 'transparent', color: range === r.v ? '#1a1d23' : '#6b7280', boxShadow: range === r.v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
              {r.l}
            </button>
          ))}
        </div>

        {range === 'custom' && (
          <>
            <input type="date" value={customFrom} onChange={e => setFrom(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #e8e9ec', fontSize: 13, color: '#374151' }} />
            <span style={{ color: '#9ca3af', fontSize: 13 }}>to</span>
            <input type="date" value={customTo} onChange={e => setTo(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #e8e9ec', fontSize: 13, color: '#374151' }} />
          </>
        )}

        <select value={serviceFilter} onChange={e => setSvc(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid #e8e9ec', fontSize: 13, color: '#374151', background: '#fff', marginLeft: 'auto' }}>
          {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
        </select>

        <button onClick={exportCSV}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, border: '1px solid #e8e9ec', background: '#fff', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/>
          </svg>
          Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <StatCard label="Total Invoiced"   value={fmt$(totalInvoiced)}  pct={pctChange(totalInvoiced, prevInvoiced)} color={BLUE} />
        <StatCard label="Total Collected"  value={fmt$(totalCollected)} pct={pctChange(totalCollected, prevCollected)} color={GREEN} />
        <StatCard label="Outstanding"      value={fmt$(totalOutstanding)} sub="unpaid + overdue" color={ORANGE} />
        <StatCard label="Invoices Issued"  value={countInvoices} sub="in period" color={PURPLE} />
      </div>

      {/* Line chart */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, padding: '20px 20px 10px' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 16px' }}>Revenue Over Time</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={monthlyData} margin={{ top: 4, right: 20, bottom: 0, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f3" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} />
            <YAxis tickFormatter={v => fmt$(v)} tick={{ fontSize: 12, fill: '#9ca3af' }} width={60} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Line type="monotone" dataKey="Invoiced"  stroke={BLUE}  strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="Collected" stroke={GREEN} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bar by service */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, padding: '20px 20px 10px' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 16px' }}>Revenue by Service Type</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={byService} margin={{ top: 4, right: 20, bottom: 0, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f3" />
            <XAxis dataKey="service" tick={{ fontSize: 12, fill: '#9ca3af' }} />
            <YAxis tickFormatter={v => fmt$(v)} tick={{ fontSize: 12, fill: '#9ca3af' }} width={60} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Bar dataKey="Invoiced"  fill={BLUE}  radius={[4,4,0,0]} />
            <Bar dataKey="Collected" fill={GREEN} radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Tab: Jobs Report ─────────────────────────────────────────────────────────
function JobsTab() {
  const [sortKey, setSortKey]   = useState('completed')
  const [sortDir, setSortDir]   = useState('desc')

  const jobs = getJobs()

  // Weekly bar chart (last 12 weeks from baseline + real data)
  const weeklyData = useMemo(() => {
    const realMap = {}
    jobs.forEach(j => {
      if (!j.date) return
      const wk = isoWeek(j.date)
      realMap[wk] = (realMap[wk] || 0) + 1
    })

    const baselineWeeks = Object.keys(WEEKLY_JOBS_BASELINE).sort()
    const allWeeks = Array.from(new Set([...baselineWeeks, ...Object.keys(realMap)])).sort().slice(-12)

    return allWeeks.map(wk => {
      const count = realMap[wk] != null ? realMap[wk] : (WEEKLY_JOBS_BASELINE[wk] || 0)
      const label = wk.replace('W', 'Wk ')
      return { week: label, Jobs: count }
    })
  }, [jobs])

  // Pie: status distribution
  const statusData = useMemo(() => {
    const m = {}
    jobs.forEach(j => { m[j.status] = (m[j.status] || 0) + 1 })
    if (!jobs.length) {
      return [
        { name: 'Completed', value: 28 },
        { name: 'In Progress', value: 8 },
        { name: 'Scheduled', value: 12 },
        { name: 'Cancelled', value: 4 },
      ]
    }
    return Object.entries(m).map(([name, value]) => ({ name, value }))
  }, [jobs])

  // Pie: type distribution
  const typeData = useMemo(() => {
    const m = {}
    jobs.forEach(j => { m[j.type] = (m[j.type] || 0) + 1 })
    if (!jobs.length) {
      return [
        { name: 'HVAC', value: 22 },
        { name: 'Plumbing', value: 14 },
        { name: 'Electrical', value: 10 },
        { name: 'Other', value: 6 },
      ]
    }
    return Object.entries(m).map(([name, value]) => ({ name, value }))
  }, [jobs])

  // Technician table
  const techRows = useMemo(() => {
    const m = {}
    jobs.forEach(j => {
      const key = j.techName || 'Unassigned'
      if (!m[key]) m[key] = { name: key, total: 0, completed: 0, durationMins: 0, revenue: 0 }
      m[key].total++
      if (j.status === 'Completed') {
        m[key].completed++
        m[key].durationMins += parseDurationMins(j.duration)
        m[key].revenue += j.total || 0
      }
    })
    return Object.values(m).map(r => ({
      ...r,
      avgDuration: r.completed ? Math.round(r.durationMins / r.completed) : 0,
    }))
  }, [jobs])

  const sortedTechs = [...techRows].sort((a, b) => {
    const av = a[sortKey] ?? 0, bv = b[sortKey] ?? 0
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
  })

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ col }) => (
    <span style={{ marginLeft: 4, opacity: sortKey === col ? 1 : 0.3, fontSize: 10 }}>
      {sortKey === col ? (sortDir === 'asc' ? '▲' : '▼') : '▼'}
    </span>
  )

  // Stats
  const completed = jobs.filter(j => j.status === 'Completed').length
  const avgDur    = (() => {
    const cj = jobs.filter(j => j.status === 'Completed')
    if (!cj.length) return 0
    return Math.round(cj.reduce((s, j) => s + parseDurationMins(j.duration), 0) / cj.length)
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <StatCard label="Total Jobs"       value={jobs.length}    color={BLUE}   />
        <StatCard label="Completed"        value={completed}      sub={`${jobs.length ? Math.round(completed/jobs.length*100) : 0}% completion rate`} color={GREEN}  />
        <StatCard label="Avg Duration"     value={`${avgDur}m`}   sub="completed jobs" color={ORANGE} />
        <StatCard label="Techs Active"     value={new Set(jobs.map(j => j.technicianId).filter(Boolean)).size} color={PURPLE} />
      </div>

      {/* Weekly jobs bar chart */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, padding: '20px 20px 10px' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 16px' }}>Jobs per Week (last 12 weeks)</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={weeklyData} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f3" />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="Jobs" fill={BLUE} radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Two pie charts side by side */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, padding: '20px 20px 10px', flex: 1, minWidth: 260 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 4px' }}>Jobs by Status</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={12}>
                {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, padding: '20px 20px 10px', flex: 1, minWidth: 260 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 4px' }}>Jobs by Service Type</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={12}>
                {typeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Technician table */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f1f3' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Technician Performance</p>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {[['name','Technician'],['total','Total Jobs'],['completed','Completed'],['avgDuration','Avg Duration'],['revenue','Revenue']].map(([key, label]) => (
                <th key={key} onClick={() => toggleSort(key)}
                  style={{ padding: '11px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textAlign: key === 'name' ? 'left' : 'right', cursor: 'pointer', userSelect: 'none', borderBottom: '1px solid #f0f1f3', whiteSpace: 'nowrap' }}>
                  {label}<SortIcon col={key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedTechs.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No technician data</td></tr>
            )}
            {sortedTechs.map((row, i) => (
              <tr key={row.name} style={{ borderBottom: i < sortedTechs.length - 1 ? '1px solid #f0f1f3' : 'none' }}>
                <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#1a1d23' }}>{row.name}</td>
                <td style={{ padding: '12px 16px', fontSize: 14, color: '#374151', textAlign: 'right' }}>{row.total}</td>
                <td style={{ padding: '12px 16px', fontSize: 14, color: '#374151', textAlign: 'right' }}>
                  {row.completed}
                  <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>({row.total ? Math.round(row.completed/row.total*100) : 0}%)</span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 14, color: '#374151', textAlign: 'right' }}>{row.avgDuration ? `${row.avgDuration}m` : '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#1a1d23', textAlign: 'right' }}>{fmtFull$(row.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab: Client Report ───────────────────────────────────────────────────────
function ClientsTab() {
  const clients  = getClients()
  const invoices = getInvoices()
  const jobs     = getJobs()

  // New clients per month chart (real + baseline)
  const clientMonthData = useMemo(() => {
    const realMap = {}
    clients.forEach(c => {
      const mk = parseSince(c.since)
      if (mk) realMap[mk] = (realMap[mk] || 0) + 1
    })

    const baselineMonths = Object.keys(CLIENT_BASELINE).sort()
    const allMonths = Array.from(new Set([...baselineMonths, ...Object.keys(realMap)])).sort().slice(-12)

    return allMonths.map(mk => {
      const count = realMap[mk] != null ? realMap[mk] : (CLIENT_BASELINE[mk] || 0)
      const label = new Date(mk + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      return { month: label, 'New Clients': count }
    })
  }, [clients])

  // Top clients by revenue
  const topClients = useMemo(() => {
    const m = {}
    invoices.forEach(inv => {
      const id = inv.clientId
      if (!m[id]) m[id] = { name: inv.clientName, invoiced: 0, collected: 0, jobs: 0 }
      m[id].invoiced  += inv.total || 0
      if (inv.status === 'Paid') m[id].collected += inv.total || 0
    })
    jobs.forEach(j => {
      if (m[j.clientId]) m[j.clientId].jobs++
    })
    return Object.values(m).sort((a, b) => b.invoiced - a.invoiced).slice(0, 10)
  }, [invoices, jobs])

  const typeBreakdown = useMemo(() => {
    const m = {}
    clients.forEach(c => { m[c.type || 'Other'] = (m[c.type || 'Other'] || 0) + 1 })
    return Object.entries(m).map(([type, count]) => ({ type, count }))
  }, [clients])

  const newThisMonth = clients.filter(c => parseSince(c.since) === '2026-04').length
  const returning    = clients.filter(c => {
    const mk = parseSince(c.since)
    return mk && mk < '2026-01'
  }).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <StatCard label="Total Clients"    value={clients.length}  color={BLUE}   />
        <StatCard label="New This Month"   value={newThisMonth}    sub="Apr 2026"  color={GREEN}  />
        <StatCard label="Long-Term (1yr+)" value={returning}       sub="before Jan 2026" color={ORANGE} />
        <StatCard label="Client Types"     value={typeBreakdown.length} sub={typeBreakdown.map(t => t.type).join(', ')} color={PURPLE} />
      </div>

      {/* New clients bar chart */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, padding: '20px 20px 10px' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 16px' }}>New Clients per Month</p>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={clientMonthData} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f3" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="New Clients" fill={TEAL} radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top 10 clients table */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f1f3' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Top Clients by Revenue</p>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={thStyle('left')}>#</th>
              <th style={thStyle('left')}>Client</th>
              <th style={thStyle('right')}>Total Jobs</th>
              <th style={thStyle('right')}>Total Invoiced</th>
              <th style={thStyle('right')}>Collected</th>
              <th style={thStyle('right')}>Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {topClients.map((c, i) => (
              <tr key={c.name} style={{ borderBottom: i < topClients.length - 1 ? '1px solid #f0f1f3' : 'none' }}>
                <td style={{ ...tdStyle(), color: '#9ca3af', fontWeight: 700 }}>{i + 1}</td>
                <td style={{ ...tdStyle(), fontWeight: 600, color: '#1a1d23' }}>{c.name}</td>
                <td style={{ ...tdStyle('right') }}>{c.jobs}</td>
                <td style={{ ...tdStyle('right'), fontWeight: 600 }}>{fmtFull$(c.invoiced)}</td>
                <td style={{ ...tdStyle('right'), color: GREEN, fontWeight: 500 }}>{fmtFull$(c.collected)}</td>
                <td style={{ ...tdStyle('right'), color: c.invoiced - c.collected > 0 ? ORANGE : '#9ca3af' }}>{fmtFull$(c.invoiced - c.collected)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function thStyle(align = 'left') {
  return { padding: '11px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textAlign: align, borderBottom: '1px solid #f0f1f3', whiteSpace: 'nowrap' }
}
function tdStyle(align = 'left') {
  return { padding: '12px 16px', fontSize: 14, color: '#374151', textAlign: align }
}

// ─── Tab: Export Center ───────────────────────────────────────────────────────
function ExportTab() {
  const [importText, setImportText] = useState('')
  const [importMsg,  setImportMsg]  = useState(null)
  const [lastExports, setLastExports] = useState({})

  function markExport(key) {
    setLastExports(p => ({ ...p, [key]: new Date().toLocaleTimeString() }))
  }

  function exportClients() {
    const data = getClients()
    downloadFile(
      toCSV(data.map(c => ({ id: c.id, name: c.name, phone: c.phone, email: c.email, type: c.type, since: c.since, balance: c.balance, city: c.city, state: c.state })),
        ['id','name','phone','email','type','since','balance','city','state']),
      'clients-export.csv'
    )
    markExport('clients')
  }

  function exportJobs() {
    const data = getJobs()
    downloadFile(
      toCSV(data.map(j => ({ id: j.id, clientName: j.clientName, type: j.type, status: j.status, date: j.date, techName: j.techName, duration: j.duration, total: j.total })),
        ['id','clientName','type','status','date','techName','duration','total']),
      'jobs-export.csv'
    )
    markExport('jobs')
  }

  function exportInvoices() {
    const data = getInvoices()
    downloadFile(
      toCSV(data.map(i => ({ id: i.id, clientName: i.clientName, issued: i.issued, due: i.due, status: i.status, total: i.total })),
        ['id','clientName','issued','due','status','total']),
      'invoices-export.csv'
    )
    markExport('invoices')
  }

  function exportQuotes() {
    const data = getQuotes()
    downloadFile(
      toCSV(data.map(q => ({ id: q.id, clientName: q.clientName, type: q.type, status: q.status, created: q.created, expires: q.expires, total: q.total })),
        ['id','clientName','type','status','created','expires','total']),
      'quotes-export.csv'
    )
    markExport('quotes')
  }

  function exportFullBackup() {
    const backup = {
      exported: new Date().toISOString(),
      version: '1.0',
      clients:  getClients(),
      jobs:     getJobs(),
      invoices: getInvoices(),
      quotes:   getQuotes(),
      requests: getRequests(),
    }
    downloadFile(JSON.stringify(backup, null, 2), 'customsfieldpro-backup.json', 'application/json')
    markExport('backup')
  }

  function handleImport(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result)
        if (!data.clients && !data.jobs && !data.invoices) {
          setImportMsg({ ok: false, text: 'Invalid backup file — missing expected data keys.' })
          return
        }
        if (!window.confirm('This will overwrite ALL current data with the backup. Continue?')) return
        if (data.clients)  localStorage.setItem('ff_clients',  JSON.stringify(data.clients))
        if (data.jobs)     localStorage.setItem('ff_jobs',     JSON.stringify(data.jobs))
        if (data.invoices) localStorage.setItem('ff_invoices', JSON.stringify(data.invoices))
        if (data.quotes)   localStorage.setItem('ff_quotes',   JSON.stringify(data.quotes))
        if (data.requests) localStorage.setItem('ff_requests', JSON.stringify(data.requests))
        setImportMsg({ ok: true, text: `Backup restored successfully. ${Object.keys(data).filter(k => Array.isArray(data[k])).length} collections imported. Refresh to see changes.` })
      } catch {
        setImportMsg({ ok: false, text: 'Failed to parse file. Make sure it is a valid CustomsFieldPro JSON backup.' })
      }
    }
    reader.readAsText(file)
  }

  const EXPORTS = [
    { key: 'clients',  label: 'Clients',  desc: 'All client records',         icon: '👤', fn: exportClients,  data: getClients()  },
    { key: 'jobs',     label: 'Jobs',     desc: 'All job records',             icon: '🔧', fn: exportJobs,     data: getJobs()     },
    { key: 'invoices', label: 'Invoices', desc: 'All invoices with status',    icon: '📄', fn: exportInvoices, data: getInvoices() },
    { key: 'quotes',   label: 'Quotes',   desc: 'All quotes with status',      icon: '📋', fn: exportQuotes,   data: getQuotes()   },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* CSV Exports */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f1f3' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 2px' }}>CSV Exports</p>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Download individual data tables as spreadsheet-compatible CSV files</p>
        </div>
        <div style={{ padding: '4px 0' }}>
          {EXPORTS.map(({ key, label, desc, icon, fn, data }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid #f9fafb' }}>
              <span style={{ fontSize: 22 }}>{icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1d23', margin: '0 0 2px' }}>{label}</p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{desc} · {data.length} records · ~{estimateSize(data)}</p>
              </div>
              {lastExports[key] && <span style={{ fontSize: 11, color: '#9ca3af' }}>Last: {lastExports[key]}</span>}
              <button onClick={fn}
                style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid #e8e9ec', background: '#fff', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/>
                </svg>
                Download CSV
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Full JSON Backup */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 4px' }}>Full JSON Backup</p>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 4px' }}>Export all CustomsFieldPro data (clients, jobs, invoices, quotes, requests) as a single JSON file.</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
              Estimated size: ~{estimateSize({ clients: getClients(), jobs: getJobs(), invoices: getInvoices(), quotes: getQuotes(), requests: getRequests() })}
              {lastExports.backup && <span style={{ marginLeft: 10 }}>Last exported: {lastExports.backup}</span>}
            </p>
          </div>
          <button onClick={exportFullBackup}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: BLUE, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/>
            </svg>
            Export JSON Backup
          </button>
        </div>
      </div>

      {/* QuickBooks Export */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f1f3', background: '#f9fafb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Export for QuickBooks (IIF)</p>
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 0 24px' }}>
            Import these files in QuickBooks: <strong>File → Utilities → Import → IIF Files</strong>
          </p>
        </div>
        <div style={{ padding: '4px 0' }}>
          {[
            { key: 'qb-invoices', label: 'Invoices', desc: 'All invoices as QuickBooks invoice transactions', fn: exportInvoicesToQuickBooks, data: getInvoices() },
            { key: 'qb-clients',  label: 'Clients',  desc: 'All clients as QuickBooks customer list',         fn: exportClientsToQuickBooks,  data: getClients()  },
            { key: 'qb-payments', label: 'Payments', desc: 'Paid invoices as QuickBooks payment records',     fn: exportPaymentsToQuickBooks, data: getInvoices().filter(i => i.status === 'Paid') },
          ].map(({ key, label, desc, fn, data }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid #f9fafb' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1d23', margin: '0 0 2px' }}>{label}</p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{desc} · {data.length} records</p>
              </div>
              <button onClick={fn}
                style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid #bbf7d0', background: '#f0fdf4', fontSize: 13, fontWeight: 600, color: '#16a34a', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/>
                </svg>
                Export .iif
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* JSON Import */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, padding: '20px' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 4px' }}>Restore from Backup</p>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
          Upload a previously exported CustomsFieldPro JSON backup to restore all data.{' '}
          <strong style={{ color: RED }}>This will overwrite all current data.</strong>
        </p>

        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, border: '2px dashed #e8e9ec', borderRadius: 10, padding: '28px 20px', cursor: 'pointer', color: '#6b7280', transition: 'border-color 0.15s' }}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = BLUE }}
          onDragLeave={e => { e.currentTarget.style.borderColor = '#e8e9ec' }}
          onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#e8e9ec'; handleImport(e.dataTransfer.files[0]) }}>
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Drop JSON backup here or click to browse</span>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Accepts .json files exported from CustomsFieldPro</span>
          <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => handleImport(e.target.files[0])} />
        </label>

        {importMsg && (
          <div style={{ marginTop: 12, padding: '12px 16px', borderRadius: 8, background: importMsg.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${importMsg.ok ? '#bbf7d0' : '#fecaca'}`, fontSize: 13, color: importMsg.ok ? '#166534' : '#991b1b', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span>{importMsg.ok ? '✅' : '⚠️'}</span>
            <span>{importMsg.text}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Reports page ────────────────────────────────────────────────────────
const TABS = [
  { id: 'revenue', label: 'Revenue Report',  icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 'jobs',    label: 'Jobs Report',     icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 'clients', label: 'Client Report',   icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 'export',  label: 'Export Center',   icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/><polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/></svg> },
]

export default function Reports() {
  const [tab, setTab] = useState('revenue')

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e8e9ec', marginBottom: 28, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '12px 18px', background: 'none', border: 'none', borderBottom: tab === t.id ? `2px solid ${BLUE}` : '2px solid transparent', fontSize: 14, fontWeight: tab === t.id ? 600 : 500, color: tab === t.id ? BLUE : '#6b7280', cursor: 'pointer', marginBottom: -1, whiteSpace: 'nowrap' }}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'revenue' && <RevenueTab />}
      {tab === 'jobs'    && <JobsTab />}
      {tab === 'clients' && <ClientsTab />}
      {tab === 'export'  && <ExportTab />}
    </div>
  )
}
