import { useState, useEffect, useRef, useCallback } from 'react'
import { saveTimeEntry } from '../data/store'
import { getCurrentLocation, geocodeAddress, calculateDistance, formatDistance } from '../utils/gpsTracking'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
}

function fmtElapsed(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function GpsIndicator({ dist }) {
  if (dist === null || dist === undefined) return null
  const onSite  = dist <= 0.1
  const nearby  = dist <= 0.5
  const color   = onSite ? '#16a34a' : nearby ? '#d97706' : '#dc2626'
  const bg      = onSite ? '#f0fdf4' : nearby ? '#fffbeb' : '#fef2f2'
  const label   = onSite ? 'On-site' : nearby ? 'Nearby' : 'Remote'
  const icon    = onSite
    ? <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
    : nearby
      ? <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      : <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: bg, color }}>
      {icon} {label} · {formatDistance(dist)} from site
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TimeTracker({ job, technicianId, technicianName, laborRate = 75, onEntryAdded }) {
  // Derive the active (open) entry for this technician from the job record
  const getOpenEntry = useCallback(() =>
    (job.timeEntries || []).find(e => e.technicianId === technicianId && !e.clockOut) || null,
    [job, technicianId]
  )

  const [activeEntry, setActiveEntry] = useState(getOpenEntry)
  const [phase, setPhase]             = useState(activeEntry ? 'clocked-in' : 'idle')
                                        // idle | locating | confirm-remote | clocked-in | clocking-out
  const [elapsed, setElapsed]         = useState(0)
  const [error, setError]             = useState('')
  const [remoteData, setRemoteData]   = useState(null) // { loc, dist, jobLoc } for confirm modal
  const [liveDistMi, setLiveDistMi]   = useState(null)
  const [jobLoc, setJobLoc]           = useState(null)  // cached geocoded job location
  const timerRef                      = useRef(null)
  const distRef                       = useRef(null)

  // ── Timer while clocked in ────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'clocked-in' || !activeEntry) return
    const base = activeEntry.clockIn
    function tick() { setElapsed(Math.floor((Date.now() - base) / 1000)) }
    tick()
    timerRef.current = setInterval(tick, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, activeEntry])

  // ── Live distance poll while clocked in ──────────────────────────────────
  useEffect(() => {
    if (phase !== 'clocked-in') return
    async function updateDist() {
      try {
        const loc    = await getCurrentLocation()
        let   jl     = jobLoc
        if (!jl && job.clientAddress) {
          try { jl = await geocodeAddress(job.clientAddress); setJobLoc(jl) } catch { /* ignore */ }
        }
        if (jl) setLiveDistMi(calculateDistance(loc.lat, loc.lng, jl.lat, jl.lng))
      } catch { /* silent */ }
    }
    updateDist()
    distRef.current = setInterval(updateDist, 60000) // update every 60s
    return () => clearInterval(distRef.current)
  }, [phase, job.clientAddress, jobLoc])

  // ── Clock In ─────────────────────────────────────────────────────────────
  async function handleClockIn() {
    setError('')
    setPhase('locating')
    try {
      const loc = await getCurrentLocation()
      let   jl  = jobLoc
      let   dist = null
      if (job.clientAddress) {
        try {
          if (!jl) { jl = await geocodeAddress(job.clientAddress); setJobLoc(jl) }
          dist = calculateDistance(loc.lat, loc.lng, jl.lat, jl.lng)
        } catch { /* geocode failed — clock in without distance check */ }
      }
      if (dist !== null && dist > 0.1) {
        // Outside 0.1-mile radius — ask to confirm
        setRemoteData({ loc, dist, jobLoc: jl })
        setPhase('confirm-remote')
      } else {
        confirmClockIn(loc, dist)
      }
    } catch (err) {
      setError(err.message)
      setPhase('idle')
    }
  }

  function confirmClockIn(loc, dist) {
    const entry = {
      id:               `entry-${Date.now()}`,
      technicianId,
      technicianName,
      clockIn:          Date.now(),
      clockOut:         null,
      totalHours:       null,
      clockInLat:       loc?.lat ?? null,
      clockInLng:       loc?.lng ?? null,
      clockOutLat:      null,
      clockOutLng:      null,
      distanceFromSite: dist ?? null,
      laborCost:        null,
      notes:            '',
    }
    saveTimeEntry(job.id, entry)
    setActiveEntry(entry)
    setPhase('clocked-in')
    setRemoteData(null)
    if (onEntryAdded) onEntryAdded(entry)
  }

  // ── Clock Out ────────────────────────────────────────────────────────────
  async function handleClockOut() {
    if (!activeEntry) return
    setPhase('clocking-out')
    setError('')
    let outLoc = null
    try { outLoc = await getCurrentLocation() } catch { /* clock out even without GPS */ }

    const totalMs   = Date.now() - activeEntry.clockIn
    const totalHrs  = Math.round((totalMs / 3600000) * 100) / 100
    const laborCost = Math.round(totalHrs * laborRate * 100) / 100

    const updated = {
      ...activeEntry,
      clockOut:    Date.now(),
      totalHours:  totalHrs,
      clockOutLat: outLoc?.lat ?? null,
      clockOutLng: outLoc?.lng ?? null,
      laborCost,
    }
    saveTimeEntry(job.id, updated)
    setActiveEntry(null)
    setPhase('idle')
    setElapsed(0)
    setLiveDistMi(null)
    if (onEntryAdded) onEntryAdded(updated)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === 'idle' || phase === 'locating') {
    const loading = phase === 'locating'
    const prevEntries = (job.timeEntries || []).filter(e => e.technicianId === technicianId && e.clockOut)
    const totalHrs = prevEntries.reduce((s, e) => s + (e.totalHours || 0), 0)

    return (
      <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 14, padding: '16px 18px', marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: '#166534', margin: 0 }}>Time Tracker</p>
            {totalHrs > 0 && <p style={{ fontSize: 11.5, color: '#15803d', margin: 0 }}>{totalHrs.toFixed(2)} hrs logged on this job</p>}
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 10, padding: '9px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12.5, color: '#dc2626' }}>
            {error}
          </div>
        )}

        <button onClick={handleClockIn} disabled={loading}
          style={{ width: '100%', height: 52, background: loading ? '#86efac' : '#16a34a', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s' }}>
          {loading ? (
            <>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
              Getting GPS location…
            </>
          ) : (
            <>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Clock In
            </>
          )}
        </button>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    )
  }

  if (phase === 'confirm-remote') {
    const { dist } = remoteData
    return (
      <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 14, padding: '16px 18px', marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#d97706" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round"/>
          </svg>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#92400e', margin: 0 }}>Away from Job Site</p>
        </div>
        <p style={{ fontSize: 13, color: '#78350f', margin: '0 0 14px', lineHeight: 1.5 }}>
          You are <strong>{formatDistance(dist)}</strong> from the job site. This clock-in will be flagged as <em>Remote</em> in timesheets.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setPhase('idle'); setRemoteData(null) }}
            style={{ flex: 1, height: 42, background: '#fff', border: '1.5px solid #fde68a', borderRadius: 10, fontSize: 13.5, fontWeight: 600, color: '#78350f', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={() => confirmClockIn(remoteData.loc, remoteData.dist)}
            style={{ flex: 1, height: 42, background: '#d97706', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
            Clock In Anyway
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'clocked-in' || phase === 'clocking-out') {
    const loading = phase === 'clocking-out'
    const dist    = activeEntry?.distanceFromSite ?? null

    return (
      <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 14, padding: '16px 18px', marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', boxShadow: '0 0 0 3px #bfdbfe', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <p style={{ fontSize: 13.5, fontWeight: 700, color: '#1e40af', margin: 0 }}>Clocked In</p>
          </div>
          <span style={{ fontSize: 11.5, color: '#6b7280' }}>since {fmtTime(activeEntry?.clockIn)}</span>
        </div>

        {/* Big timer */}
        <div style={{ textAlign: 'center', padding: '10px 0 14px' }}>
          <p style={{ fontSize: 38, fontWeight: 800, color: '#1e40af', margin: 0, fontFamily: 'ui-monospace, Consolas, monospace', letterSpacing: 2 }}>
            {fmtElapsed(elapsed)}
          </p>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>elapsed</p>
        </div>

        {/* GPS indicators */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {dist !== null && (
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              Clock-in: <GpsIndicator dist={dist} />
            </span>
          )}
          {liveDistMi !== null && (
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              Now: <GpsIndicator dist={liveDistMi} />
            </span>
          )}
        </div>

        <button onClick={handleClockOut} disabled={loading}
          style={{ width: '100%', height: 52, background: loading ? '#fca5a5' : '#dc2626', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s' }}>
          {loading ? (
            <>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
              Recording…
            </>
          ) : (
            <>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><square x="3" y="3" width="18" height="18" rx="2"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              Clock Out
            </>
          )}
        </button>

        <style>{`
          @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          @keyframes pulse { 0%,100%{box-shadow:0 0 0 3px #bfdbfe} 50%{box-shadow:0 0 0 6px #bfdbfe80} }
        `}</style>
      </div>
    )
  }

  return null
}
