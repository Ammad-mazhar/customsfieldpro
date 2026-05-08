import { useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getAllTimeEntries, getSettings } from '../../data/store'

// Fix leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfWeek(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function endOfWeek(date = new Date()) {
  const d = startOfWeek(date)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

function fmtTs(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtHrs(h) {
  if (h === null || h === undefined) return '—'
  return h.toFixed(2) + ' hrs'
}

function fmtMoney(n) {
  if (n === null || n === undefined) return '—'
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getEntryStatus(entry) {
  if (!entry.clockOut)                                    return 'missing'
  if (entry.distanceFromSite === null || entry.distanceFromSite === undefined) return 'on-site'
  if (entry.distanceFromSite <= 0.1)                      return 'on-site'
  if (entry.distanceFromSite <= 0.5)                      return 'remote'
  return 'remote'
}

function StatusBadge({ entry }) {
  const s = getEntryStatus(entry)
  const cfg = {
    'on-site': { bg: '#f0fdf4', color: '#16a34a', label: 'On-site' },
    'remote':  { bg: '#fffbeb', color: '#d97706', label: 'Remote'  },
    'missing': { bg: '#fef2f2', color: '#dc2626', label: 'Missing' },
  }[s]
  return <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
}

function GpsVerify({ dist }) {
  if (dist === null || dist === undefined) return <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>
  const onSite  = dist <= 0.1
  const nearby  = dist <= 0.5
  const color   = onSite ? '#16a34a' : nearby ? '#d97706' : '#dc2626'
  const icon    = onSite ? '✓' : nearby ? '⚠' : '✕'
  const label   = dist < 0.1
    ? `${Math.round(dist * 5280)} ft`
    : `${dist.toFixed(2)} mi`
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color }}>
      <span style={{ fontSize: 13 }}>{icon}</span> {label}
    </span>
  )
}

function downloadCSV(rows, filename) {
  const headers = ['Technician','Job #','Client','Date','Clock In','Clock Out','Total Hours','Distance from Site','Labor Cost','Status']
  const lines = [
    headers.join(','),
    ...rows.map(r => [
      r.technicianName, r.jobNumber, r.clientName,
      r.clockIn ? new Date(r.clockIn).toLocaleDateString() : '',
      r.clockIn ? new Date(r.clockIn).toLocaleTimeString() : '',
      r.clockOut ? new Date(r.clockOut).toLocaleTimeString() : '',
      r.totalHours?.toFixed(2) ?? '',
      r.distanceFromSite?.toFixed(3) ?? '',
      r.laborCost?.toFixed(2) ?? '',
      getEntryStatus(r),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Per-tech map (Leaflet) ───────────────────────────────────────────────────

function TechMap({ entries }) {
  const pins = entries.filter(e => e.clockInLat && e.clockInLng)
  if (!pins.length) {
    return (
      <div style={{ height: 140, background: '#f3f4f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>
        No GPS data
      </div>
    )
  }
  const center = [pins[0].clockInLat, pins[0].clockInLng]
  return (
    <div style={{ height: 140, borderRadius: 8, overflow: 'hidden', border: '1px solid #e8e9ec' }}>
      <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false} scrollWheelZoom={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {pins.map(e => (
          <Marker key={e.id} position={[e.clockInLat, e.clockInLng]}>
            <Popup>
              <div style={{ fontSize: 11 }}>
                <strong>{e.jobNumber}</strong><br />
                {e.clientName}<br />
                {fmtTs(e.clockIn)}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, color = '#2563eb', bg = '#eff6ff', icon }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      </div>
      <p style={{ fontSize: 24, fontWeight: 800, color: '#1a1d23', margin: '0 0 4px', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1d23', margin: '0 0 2px' }}>{label}</p>
      {sub && <p style={{ fontSize: 11.5, color: '#9ca3af', margin: 0 }}>{sub}</p>}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const RANGE_OPTS = ['This Week', 'Last Week', 'This Month', 'Custom']

export default function TimeSheets() {
  const now        = new Date()
  const [range, setRange]       = useState('This Week')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]     = useState('')
  const [filterTech, setFilterTech] = useState('All')
  const [filterJob,  setFilterJob]  = useState('All')

  const settings  = getSettings()
  const allTechs  = settings.technicians || []

  // Date window
  const { from, to } = useMemo(() => {
    if (range === 'This Week')  return { from: startOfWeek(now),                                 to: endOfWeek(now) }
    if (range === 'Last Week')  {
      const lw = new Date(now); lw.setDate(lw.getDate() - 7)
      return { from: startOfWeek(lw), to: endOfWeek(lw) }
    }
    if (range === 'This Month') {
      const f = new Date(now.getFullYear(), now.getMonth(), 1)
      const t = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      return { from: f, to: t }
    }
    if (range === 'Custom' && customFrom && customTo) {
      return { from: new Date(customFrom), to: new Date(customTo + 'T23:59:59') }
    }
    return { from: startOfWeek(now), to: endOfWeek(now) }
  }, [range, customFrom, customTo, now.toDateString()])

  // All entries in window
  const allEntries = useMemo(() => {
    return getAllTimeEntries().filter(e => {
      const ts = e.clockIn
      return ts >= from.getTime() && ts <= to.getTime()
    })
  }, [from, to])

  // Unique techs and jobs in current window
  const techsInWindow = useMemo(() => {
    const names = [...new Set(allEntries.map(e => e.technicianName).filter(Boolean))]
    return names.sort()
  }, [allEntries])

  const jobsInWindow = useMemo(() => {
    const ids = [...new Set(allEntries.map(e => e.jobNumber).filter(Boolean))]
    return ids.sort()
  }, [allEntries])

  // Apply filters
  const filtered = useMemo(() => {
    return allEntries
      .filter(e => filterTech === 'All' || e.technicianName === filterTech)
      .filter(e => filterJob  === 'All' || e.jobNumber      === filterJob)
      .sort((a, b) => b.clockIn - a.clockIn)
  }, [allEntries, filterTech, filterJob])

  // Summary stats
  const totalHrs      = filtered.filter(e => e.totalHours).reduce((s, e) => s + e.totalHours, 0)
  const totalCost     = filtered.filter(e => e.laborCost).reduce((s, e) => s + e.laborCost, 0)
  const jobsWorked    = new Set(filtered.map(e => e.jobNumber)).size
  const avgHrsPerJob  = jobsWorked > 0 ? totalHrs / jobsWorked : 0
  const onTimeCnt     = filtered.filter(e => {
    const d = e.distanceFromSite
    return d !== null && d !== undefined && d <= 0.1
  }).length
  const hasGps        = filtered.filter(e => e.distanceFromSite !== null && e.distanceFromSite !== undefined).length
  const onTimeRate    = hasGps > 0 ? Math.round((onTimeCnt / hasGps) * 100) : null

  // Per-tech summary
  const perTech = useMemo(() => {
    const map = {}
    allEntries.forEach(e => {
      const id = e.technicianId || e.technicianName || 'unknown'
      if (!map[id]) map[id] = { id, name: e.technicianName, entries: [] }
      map[id].entries.push(e)
    })
    return Object.values(map)
  }, [allEntries])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>

      {/* ── Filters ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          {/* Date range */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', margin: '0 0 5px' }}>Date Range</p>
            <div style={{ display: 'flex', gap: 4 }}>
              {RANGE_OPTS.map(r => (
                <button key={r} onClick={() => setRange(r)}
                  style={{ height: 34, padding: '0 12px', borderRadius: 7, border: `1px solid ${range === r ? '#2563eb' : '#e8e9ec'}`, background: range === r ? '#eff6ff' : '#fff', color: range === r ? '#2563eb' : '#374151', fontSize: 12.5, fontWeight: range === r ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Custom date inputs */}
          {range === 'Custom' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', margin: '0 0 5px' }}>From</p>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  style={{ height: 34, padding: '0 10px', border: '1px solid #e8e9ec', borderRadius: 7, fontSize: 13, color: '#374151', outline: 'none' }} />
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', margin: '0 0 5px' }}>To</p>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  style={{ height: 34, padding: '0 10px', border: '1px solid #e8e9ec', borderRadius: 7, fontSize: 13, color: '#374151', outline: 'none' }} />
              </div>
            </div>
          )}

          {/* Technician filter */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', margin: '0 0 5px' }}>Technician</p>
            <select value={filterTech} onChange={e => setFilterTech(e.target.value)}
              style={{ height: 34, padding: '0 28px 0 10px', border: '1px solid #e8e9ec', borderRadius: 7, fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer', outline: 'none' }}>
              <option value="All">All Technicians</option>
              {techsInWindow.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {/* Job filter */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', margin: '0 0 5px' }}>Job</p>
            <select value={filterJob} onChange={e => setFilterJob(e.target.value)}
              style={{ height: 34, padding: '0 28px 0 10px', border: '1px solid #e8e9ec', borderRadius: 7, fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer', outline: 'none' }}>
              <option value="All">All Jobs</option>
              {jobsInWindow.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>

          {/* Export */}
          <div style={{ marginLeft: 'auto' }}>
            <button onClick={() => downloadCSV(filtered, `timesheets-${range.toLowerCase().replace(/ /g,'-')}.csv`)}
              style={{ height: 34, padding: '0 16px', borderRadius: 7, border: '1px solid #e8e9ec', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round"/><polyline points="7 10 12 15 17 10" strokeLinecap="round"/><line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/></svg>
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <SummaryCard
          label="Total Hours"
          value={totalHrs.toFixed(1)}
          sub={`${filtered.filter(e => e.totalHours).length} completed entries`}
          color="#2563eb" bg="#eff6ff"
          icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
        <SummaryCard
          label="Total Labor Cost"
          value={fmtMoney(totalCost)}
          sub={`at avg $${filtered.length > 0 ? (totalCost / Math.max(totalHrs, 0.01)).toFixed(0) : 0}/hr`}
          color="#16a34a" bg="#f0fdf4"
          icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
        />
        <SummaryCard
          label="Avg Hours / Job"
          value={avgHrsPerJob.toFixed(1)}
          sub={`across ${jobsWorked} job${jobsWorked !== 1 ? 's' : ''}`}
          color="#d97706" bg="#fffbeb"
          icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>}
        />
        <SummaryCard
          label="On-Time Clock-In"
          value={onTimeRate !== null ? `${onTimeRate}%` : '—'}
          sub={hasGps > 0 ? `${onTimeCnt} of ${hasGps} with GPS` : 'No GPS data'}
          color="#7c3aed" bg="#f5f3ff"
          icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>}
        />
      </div>

      {/* ── Timesheet table ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f0f1f3' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Time Entries</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>{filtered.length} entries in selected period</p>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth="1.3" style={{ marginBottom: 12 }}>
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14" strokeLinecap="round"/>
            </svg>
            <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>No time entries for this period.</p>
            <p style={{ fontSize: 12, color: '#d1d5db', margin: '4px 0 0' }}>Staff can clock in/out from the My Jobs page.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Technician','Job #','Client','Date','Clock In','Clock Out','Total Hrs','Distance','Labor Cost','Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: '#9ca3af', padding: '9px 14px', borderBottom: '1px solid #f0f1f3', whiteSpace: 'nowrap', letterSpacing: '0.3px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, i) => (
                  <tr key={entry.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f8f9fa' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '11px 14px', fontSize: 13.5, color: '#1a1d23', fontWeight: 600, whiteSpace: 'nowrap' }}>{entry.technicianName || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'monospace', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, color: '#6b7280' }}>{entry.jobNumber}</span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>{entry.clientName}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12.5, color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDate(entry.clockIn)}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12.5, color: '#374151', whiteSpace: 'nowrap' }}>{fmtTs(entry.clockIn)}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12.5, color: entry.clockOut ? '#374151' : '#dc2626', whiteSpace: 'nowrap' }}>
                      {entry.clockOut ? fmtTs(entry.clockOut) : 'Active'}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: '#1a1d23', whiteSpace: 'nowrap' }}>{fmtHrs(entry.totalHours)}</td>
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}><GpsVerify dist={entry.distanceFromSite} /></td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>{fmtMoney(entry.laborCost)}</td>
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}><StatusBadge entry={entry} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Per-technician weekly summary ── */}
      {perTech.length > 0 && (
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 14px' }}>Technician Summaries</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {perTech.map(({ id, name, entries }) => {
              const hrs  = entries.filter(e => e.totalHours).reduce((s, e) => s + e.totalHours, 0)
              const cost = entries.filter(e => e.laborCost).reduce((s, e) => s + e.laborCost, 0)
              const jobs = new Set(entries.map(e => e.jobNumber)).size
              const onSiteCnt = entries.filter(e => e.distanceFromSite !== null && e.distanceFromSite !== undefined && e.distanceFromSite <= 0.1).length
              const gpsCnt    = entries.filter(e => e.distanceFromSite !== null && e.distanceFromSite !== undefined).length
              const missing   = entries.filter(e => !e.clockOut).length

              // GPS indicator summary
              const remoteCnt = entries.filter(e => {
                const d = e.distanceFromSite
                return d !== null && d !== undefined && d > 0.1 && d <= 0.5
              }).length
              const farCnt    = entries.filter(e => {
                const d = e.distanceFromSite
                return d !== null && d !== undefined && d > 0.5
              }).length

              return (
                <div key={id} style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  {/* Header */}
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f1f3', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>
                        {(name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1d23', margin: 0 }}>{name}</p>
                      <p style={{ fontSize: 11.5, color: '#9ca3af', margin: 0 }}>{entries.length} entries · {jobs} jobs</p>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: '1px solid #f0f1f3' }}>
                    {[
                      { label: 'Total Hours', value: hrs.toFixed(1) + ' hrs' },
                      { label: 'Labor Cost',  value: fmtMoney(cost) },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ padding: '10px 14px', borderRight: '1px solid #f0f1f3' }}>
                        <p style={{ fontSize: 16, fontWeight: 800, color: '#1a1d23', margin: 0, lineHeight: 1.1 }}>{value}</p>
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* GPS verification row */}
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f1f3', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {onSiteCnt > 0 && <span style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 600 }}>✓ {onSiteCnt} on-site</span>}
                    {remoteCnt > 0 && <span style={{ fontSize: 11.5, color: '#d97706', fontWeight: 600 }}>⚠ {remoteCnt} nearby</span>}
                    {farCnt    > 0 && <span style={{ fontSize: 11.5, color: '#dc2626', fontWeight: 600 }}>✕ {farCnt} remote</span>}
                    {missing   > 0 && <span style={{ fontSize: 11.5, color: '#dc2626', fontWeight: 600 }}>⊗ {missing} missing clock-out</span>}
                    {gpsCnt === 0  && <span style={{ fontSize: 11.5, color: '#9ca3af' }}>No GPS data</span>}
                  </div>

                  {/* Map */}
                  <div style={{ padding: '12px 14px' }}>
                    <TechMap entries={entries} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* GPS legend */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, padding: '14px 20px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1d23', margin: '0 0 10px' }}>GPS Verification Legend</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#374151' }}>
            <span style={{ fontSize: 14, color: '#16a34a', fontWeight: 700 }}>✓</span> Within 0.1 miles — <strong style={{ color: '#16a34a' }}>On-site</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#374151' }}>
            <span style={{ fontSize: 14, color: '#d97706', fontWeight: 700 }}>⚠</span> 0.1–0.5 miles — <strong style={{ color: '#d97706' }}>Nearby</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#374151' }}>
            <span style={{ fontSize: 14, color: '#dc2626', fontWeight: 700 }}>✕</span> Over 0.5 miles — <strong style={{ color: '#dc2626' }}>Remote</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#374151' }}>
            <span style={{ fontSize: 14, color: '#dc2626', fontWeight: 700 }}>⊗</span> No clock-out recorded — <strong style={{ color: '#dc2626' }}>Missing</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
