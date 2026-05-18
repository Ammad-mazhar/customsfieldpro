import { useState, useMemo } from 'react'
import { getJobs, getSettings, getClients, clientDisplayName } from '../../data/store'
import { getReviewRequests, getReviewStats, triggerReviewRequest, checkRecentReviewRequest } from '../../utils/reviewRequests'

// ── Helpers ───────────────────────────────────────────────────────────────────
function avg(arr) {
  if (!arr.length) return 0
  return arr.reduce((s, n) => s + n, 0) / arr.length
}

function fmt(n) { return n ? n.toFixed(1) : '—' }

function StarDisplay({ value, size = 14, color = '#f59e0b' }) {
  const full = Math.round(value || 0)
  return (
    <span style={{ display: 'inline-flex', gap: 1, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} style={{ fontSize: size, color: n <= full ? color : '#e5e7eb', lineHeight: 1 }}>★</span>
      ))}
    </span>
  )
}

function Bdg({ n }) {
  const map = {
    1: '#fef2f2', 2: '#fff7ed', 3: '#fffbeb', 4: '#f0fdf4', 5: '#eff6ff',
  }
  const cmap = {
    1: '#dc2626', 2: '#ea580c', 3: '#ca8a04', 4: '#16a34a', 5: '#2563eb',
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 9px', borderRadius: 20, background: map[n] || '#f3f4f6', color: cmap[n] || '#6b7280', fontSize: 12, fontWeight: 700 }}>
      {n}★
    </span>
  )
}

function RankBadge({ rank }) {
  if (rank === 1) return <span style={{ fontSize: 18 }} title="Gold">🥇</span>
  if (rank === 2) return <span style={{ fontSize: 18 }} title="Silver">🥈</span>
  if (rank === 3) return <span style={{ fontSize: 18 }} title="Bronze">🥉</span>
  return <span style={{ fontSize: 13, fontWeight: 700, color: '#9ca3af', width: 24, display: 'inline-block', textAlign: 'center' }}>#{rank}</span>
}

function RelDate({ ts }) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Status badge for review requests ─────────────────────────────────────────
const STATUS_COLORS = {
  sent:                   { bg: '#eff6ff', color: '#2563eb' },
  clicked:                { bg: '#f0fdf4', color: '#16a34a' },
  skipped_low_rating:     { bg: '#fef2f2', color: '#dc2626' },
  skipped_neutral_rating: { bg: '#fff7ed', color: '#d97706' },
  skipped_recent_request: { bg: '#f3f4f6', color: '#6b7280' },
  skipped_opted_out:      { bg: '#f3f4f6', color: '#6b7280' },
  skipped_bad_status:     { bg: '#f3f4f6', color: '#6b7280' },
  failed:                 { bg: '#fef2f2', color: '#dc2626' },
}
const STATUS_LABELS = {
  sent:                   'Sent',
  clicked:                'Clicked',
  skipped_low_rating:     'Skipped – Low Rating',
  skipped_neutral_rating: 'Skipped – Neutral',
  skipped_recent_request: 'Skipped – Recent',
  skipped_opted_out:      'Skipped – Opted Out',
  skipped_bad_status:     'Skipped – Bad Status',
  failed:                 'Failed',
}

function StatusBadge({ status }) {
  const sc = STATUS_COLORS[status] || { bg: '#f3f4f6', color: '#6b7280' }
  const label = STATUS_LABELS[status] || status
  return (
    <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Ratings() {
  const allJobs   = getJobs()
  const settings  = getSettings()
  const techs     = settings.technicians || []
  const allClients = getClients()

  // All jobs that have a rating
  const rated = useMemo(() => allJobs.filter(j => j.rating?.overall), [])

  // Flagged reviews stored in localStorage
  const [flagged, setFlagged] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ff_flagged_reviews') || '[]') } catch { return [] }
  })

  function toggleFlag(jobId) {
    const next = flagged.includes(jobId) ? flagged.filter(x => x !== jobId) : [...flagged, jobId]
    setFlagged(next)
    localStorage.setItem('ff_flagged_reviews', JSON.stringify(next))
  }

  // ── Summary metrics ────────────────────────────────────────────────────────
  const overallScores = rated.map(j => j.rating.overall)
  const techScores    = rated.filter(j => j.rating.technician).map(j => j.rating.technician)
  const avgOverall    = avg(overallScores)
  const avgTech       = avg(techScores)
  const total         = rated.length
  const fiveStarPct   = total ? Math.round(rated.filter(j => j.rating.overall === 5).length / total * 100) : 0

  // ── Distribution ──────────────────────────────────────────────────────────
  const dist = [5, 4, 3, 2, 1].map(star => {
    const count = rated.filter(j => j.rating.overall === star).length
    const pct   = total ? Math.round(count / total * 100) : 0
    return { star, count, pct }
  })

  // ── Technician leaderboard ─────────────────────────────────────────────────
  const leaderboard = useMemo(() => {
    const map = {}
    rated.forEach(j => {
      const name = j.techName || 'Unassigned'
      if (!map[name]) map[name] = { name, scores: [], techScores: [], recentDates: [] }
      map[name].scores.push(j.rating.overall)
      if (j.rating.technician) map[name].techScores.push(j.rating.technician)
      if (j.rating.submittedAt) map[name].recentDates.push(j.rating.submittedAt)
    })
    return Object.values(map)
      .map(t => ({
        ...t,
        avgScore:   avg(t.scores),
        total:      t.scores.length,
        fiveStarPct: Math.round(t.scores.filter(s => s === 5).length / t.scores.length * 100),
        // trend: compare last 3 vs previous 3
        trend: (() => {
          const s = t.scores
          if (s.length < 4) return null
          const recent = avg(s.slice(-3))
          const prev   = avg(s.slice(-6, -3))
          return recent > prev ? 'up' : recent < prev ? 'down' : 'flat'
        })(),
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
  }, [rated])

  // ── Review requests ───────────────────────────────────────────────────────
  const [rrRefresh,     setRrRefresh]     = useState(0)
  const reviewRequests  = useMemo(() => getReviewRequests().sort((a, b) => b.sentAt - a.sentAt), [rrRefresh])
  const reviewStats     = useMemo(() => getReviewStats(), [rrRefresh])
  const [rrFilter,      setRrFilter]      = useState('all')
  const [sendModal,     setSendModal]     = useState(false)
  const [sendClient,    setSendClient]    = useState('')
  const [sendJob,       setSendJob]       = useState('')
  const [sendSent,      setSendSent]      = useState(false)

  const filteredRR = useMemo(() => {
    if (rrFilter === 'all') return reviewRequests
    return reviewRequests.filter(r => r.status === rrFilter)
  }, [reviewRequests, rrFilter])

  function handleManualSend() {
    if (!sendClient) return
    const client = allClients.find(c => c.id === sendClient)
    const job    = allJobs.find(j => j.id === sendJob) || null
    triggerReviewRequest(
      job || { id: sendJob || 'manual', clientId: sendClient, clientName: client?.name, clientPhone: client?.phone, clientEmail: client?.email },
      client,
      null
    )
    setSendSent(true)
    setRrRefresh(n => n + 1)
    setTimeout(() => { setSendModal(false); setSendClient(''); setSendJob(''); setSendSent(false) }, 2000)
  }

  // ── Filters ────────────────────────────────────────────────────────────────
  const [filterTech,   setFilterTech]   = useState('All')
  const [filterStar,   setFilterStar]   = useState(0)
  const [filterFrom,   setFilterFrom]   = useState('')
  const [filterTo,     setFilterTo]     = useState('')

  const reviews = useMemo(() => {
    return rated
      .filter(j => {
        if (filterTech !== 'All' && j.techName !== filterTech) return false
        if (filterStar && j.rating.overall !== filterStar) return false
        if (filterFrom && j.rating.submittedAt < new Date(filterFrom).getTime()) return false
        if (filterTo   && j.rating.submittedAt > new Date(filterTo).getTime() + 86400000) return false
        return true
      })
      .sort((a, b) => (b.rating.submittedAt || 0) - (a.rating.submittedAt || 0))
  }, [rated, filterTech, filterStar, filterFrom, filterTo])

  const techNames = ['All', ...new Set(rated.map(j => j.techName || 'Unassigned').filter(Boolean))]

  if (!rated.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '52vh', gap: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 52 }}>⭐</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1d23', margin: 0 }}>No Ratings Yet</h2>
        <p style={{ fontSize: 13.5, color: '#9ca3af', margin: 0, maxWidth: 340 }}>
          Customer satisfaction ratings will appear here after jobs are completed and clients submit feedback.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Summary Cards ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          {
            label: 'Average Overall Rating',
            value: <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#1a1d23' }}>{fmt(avgOverall)}</span>
              <span style={{ fontSize: 13, color: '#9ca3af' }}>/ 5.0</span>
            </span>,
            sub: <StarDisplay value={avgOverall} size={16} />,
            border: '#f59e0b',
          },
          {
            label: 'Average Technician Rating',
            value: <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#1a1d23' }}>{fmt(avgTech)}</span>
              <span style={{ fontSize: 13, color: '#9ca3af' }}>/ 5.0</span>
            </span>,
            sub: <StarDisplay value={avgTech} size={16} color="#7c3aed" />,
            border: '#7c3aed',
          },
          {
            label: 'Total Reviews',
            value: <span style={{ fontSize: 28, fontWeight: 800, color: '#1a1d23' }}>{total}</span>,
            sub: <span style={{ fontSize: 12.5, color: '#9ca3af' }}>from {allJobs.length} completed jobs</span>,
            border: '#2563eb',
          },
          {
            label: '5-Star Reviews',
            value: <span style={{ fontSize: 28, fontWeight: 800, color: '#1a1d23' }}>{fiveStarPct}%</span>,
            sub: <span style={{ fontSize: 12.5, color: '#9ca3af' }}>{rated.filter(j => j.rating.overall === 5).length} five-star ratings</span>,
            border: '#16a34a',
          },
        ].map(card => (
          <div key={card.label} style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '16px 20px', borderLeft: `3px solid ${card.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ fontSize: 11.5, color: '#9ca3af', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{card.label}</p>
            {card.value}
            <div>{card.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>

        {/* ── Star Distribution ──────────────────────────────────────────────── */}
        <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p style={SH}>Rating Distribution</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dist.map(({ star, count, pct }) => (
              <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', width: 20, flexShrink: 0, textAlign: 'right' }}>{star}</span>
                <span style={{ fontSize: 14, color: '#f59e0b', flexShrink: 0 }}>★</span>
                <div style={{ flex: 1, height: 10, background: '#f3f4f6', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: star >= 4 ? '#22c55e' : star === 3 ? '#f59e0b' : '#ef4444', borderRadius: 5, transition: 'width 0.4s ease' }} />
                </div>
                <span style={{ fontSize: 12, color: '#9ca3af', width: 30, flexShrink: 0 }}>{count}</span>
                <span style={{ fontSize: 12, color: '#9ca3af', width: 34, flexShrink: 0, textAlign: 'right' }}>{pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Technician Leaderboard ─────────────────────────────────────────── */}
        <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f1f3' }}>
            <p style={SH}>Technician Leaderboard</p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Rank', 'Technician', 'Avg Rating', 'Reviews', '5★ %', 'Trend'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', fontSize: 11.5, fontWeight: 600, color: '#9ca3af', textAlign: 'left', borderBottom: '1px solid #e8e9ec', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((tech, i) => (
                <tr key={tech.name} style={{ borderBottom: '1px solid #f0f1f3' }}>
                  <td style={{ padding: '12px 14px' }}><RankBadge rank={i + 1} /></td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1a1d23', fontSize: 13.5 }}>{tech.name}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#1a1d23' }}>{fmt(tech.avgScore)}</span>
                      <StarDisplay value={tech.avgScore} size={13} />
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13.5, color: '#374151' }}>{tech.total}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: tech.fiveStarPct >= 60 ? '#16a34a' : tech.fiveStarPct >= 40 ? '#d97706' : '#6b7280' }}>
                      {tech.fiveStarPct}%
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {tech.trend === 'up'   && <span style={{ color: '#16a34a', fontSize: 16 }} title="Improving">↑</span>}
                    {tech.trend === 'down' && <span style={{ color: '#dc2626', fontSize: 16 }} title="Declining">↓</span>}
                    {tech.trend === 'flat' && <span style={{ color: '#9ca3af', fontSize: 16 }} title="Stable">→</span>}
                    {!tech.trend           && <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Recent Reviews Feed ─────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f1f3', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={SH}>Recent Reviews</p>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={filterTech} onChange={e => setFilterTech(e.target.value)} style={SEL}>
              {techNames.map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={filterStar} onChange={e => setFilterStar(Number(e.target.value))} style={SEL}>
              <option value={0}>All stars</option>
              {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} star</option>)}
            </select>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={{ ...SEL, width: 130 }} placeholder="From date" />
            <input type="date" value={filterTo}   onChange={e => setFilterTo(e.target.value)}   style={{ ...SEL, width: 130 }} placeholder="To date" />
            {(filterTech !== 'All' || filterStar || filterFrom || filterTo) && (
              <button onClick={() => { setFilterTech('All'); setFilterStar(0); setFilterFrom(''); setFilterTo('') }}
                style={{ height: 32, padding: '0 10px', background: '#f3f4f6', border: 'none', borderRadius: 7, fontSize: 12.5, color: '#6b7280', cursor: 'pointer' }}>
                Clear
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reviews.length === 0 && (
            <p style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 13.5 }}>No reviews match your filters.</p>
          )}
          {reviews.map(job => {
            const isFlagged = flagged.includes(job.id)
            return (
              <div key={job.id} style={{
                border: `1px solid ${isFlagged ? '#fecaca' : '#e8e9ec'}`,
                borderRadius: 10, padding: '16px 18px',
                background: isFlagged ? '#fff5f5' : '#fff',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                {/* Top row: stars + meta */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', align: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <StarDisplay value={job.rating.overall} size={17} />
                    <Bdg n={job.rating.overall} />
                    {job.rating.technician && (
                      <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                        Tech: <StarDisplay value={job.rating.technician} size={13} color="#7c3aed" />
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    {isFlagged && (
                      <span style={{ fontSize: 11.5, color: '#dc2626', fontWeight: 600, background: '#fef2f2', padding: '2px 8px', borderRadius: 20 }}>⚑ Flagged</span>
                    )}
                    <button
                      onClick={() => toggleFlag(job.id)}
                      title={isFlagged ? 'Remove flag' : 'Flag as inappropriate'}
                      style={{ height: 28, padding: '0 10px', background: isFlagged ? '#fef2f2' : '#f3f4f6', border: 'none', borderRadius: 7, fontSize: 12, color: isFlagged ? '#dc2626' : '#9ca3af', cursor: 'pointer', fontWeight: 500 }}>
                      {isFlagged ? '⚑ Flagged' : '⚐ Flag'}
                    </button>
                  </div>
                </div>

                {/* Feedback text */}
                {job.rating.feedback && (
                  <p style={{ fontSize: 13.5, color: '#374151', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>
                    "{job.rating.feedback}"
                  </p>
                )}

                {/* Bottom row: meta */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {[
                    ['Client',      job.clientName],
                    ['Job',         job.id],
                    ['Technician',  job.techName || '—'],
                    ['Date',        job.rating.submittedAt ? new Date(job.rating.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'],
                  ].map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <span style={{ fontSize: 11.5, color: '#9ca3af', fontWeight: 600 }}>{l}:</span>
                      <span style={{ fontSize: 12.5, color: '#374151', fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Google Reviews Tracker ──────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 3px' }}>Google Reviews Tracker</p>
            <p style={{ fontSize: 12.5, color: '#9ca3af', margin: 0 }}>Automated review request performance this month</p>
          </div>
          <button onClick={() => setSendModal(true)} style={{ height: 34, padding: '0 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Send Review Request
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { label: 'Requests This Month', value: reviewStats.sentThisMonth, icon: '📨', color: '#2563eb' },
            { label: 'Total Requests Sent',  value: reviewStats.totalSent,     icon: '📊', color: '#7c3aed' },
            { label: 'Clicked This Month',   value: reviewStats.clickedThisMonth, icon: '👆', color: '#16a34a' },
            { label: 'Est. New Reviews',     value: reviewStats.estimatedNewReviews, icon: '⭐', color: '#f59e0b' },
          ].map(card => (
            <div key={card.label} style={{ background: '#fafafa', border: '1px solid #e8e9ec', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{card.icon}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{card.label}</span>
              </div>
              <p style={{ fontSize: 26, fontWeight: 800, color: card.color, margin: 0 }}>{card.value}</p>
              {card.label === 'Clicked This Month' && reviewStats.sentThisMonth > 0 && (
                <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '3px 0 0' }}>{reviewStats.conversionPct}% conversion</p>
              )}
              {card.label === 'Est. New Reviews' && (
                <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '3px 0 0' }}>~35% of clicks convert</p>
              )}
            </div>
          ))}
        </div>

        {/* Google Business mock stats */}
        <div style={{ marginTop: 16, padding: '14px 16px', background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#1a1d23' }}>4.8</span>
            <div>
              <div style={{ display: 'flex', gap: 2 }}>
                {[1,2,3,4,5].map(n => <span key={n} style={{ color: '#f59e0b', fontSize: 16 }}>★</span>)}
              </div>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Google Business Rating</p>
            </div>
          </div>
          <div style={{ width: 1, height: 36, background: '#e8e9ec' }} />
          <div style={{ fontSize: 13.5, color: '#374151' }}>
            <span style={{ fontWeight: 700 }}>127</span> total reviews ·{' '}
            <span style={{ color: '#16a34a', fontWeight: 600 }}>+12 this month</span>
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, marginLeft: 'auto' }}>
            Mock data — connect Google Business API for live stats
          </p>
        </div>
      </div>

      {/* ── Review Requests Log ─────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Review Requests Log</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={rrFilter} onChange={e => setRrFilter(e.target.value)} style={SEL}>
              <option value="all">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="clicked">Clicked</option>
            </select>
          </div>
        </div>

        {filteredRR.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0', color: '#9ca3af', fontSize: 13.5 }}>
            No review requests yet. Configure Google Review automation in Settings → Reviews.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f0f1f3' }}>
                  {['Date', 'Client', 'Job #', 'Channel', 'Status'].map(h => (
                    <th key={h} style={{ ...SH, padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRR.map(r => {
                  const client = allClients.find(c => c.id === r.clientId)
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                      <td style={{ padding: '10px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {new Date(r.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1a1d23' }}>
                        {client?.name || r.clientId}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#6b7280', fontFamily: 'monospace', fontSize: 12 }}>
                        {r.jobId || '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11.5, fontWeight: 600,
                          background: r.channel === 'sms' ? '#eff6ff' : '#faf5ff',
                          color: r.channel === 'sms' ? '#2563eb' : '#7c3aed',
                        }}>
                          {r.channel === 'sms' ? '📱 SMS' : '✉️ Email'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <StatusBadge status={r.status} />
                        {r.clickedAt && (
                          <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>
                            {new Date(r.clickedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Manual Send Modal ───────────────────────────────────────────────── */}
      {sendModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '28px 28px 24px', width: 440, maxWidth: '92vw', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1d23', margin: '0 0 4px' }}>Send Review Request</p>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 20px' }}>Manually send a Google review request to a client.</p>

            {sendSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#16a34a', fontSize: 15, fontWeight: 600 }}>
                ✓ Review request queued!
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Client *</label>
                  <select value={sendClient} onChange={e => { setSendClient(e.target.value); setSendJob('') }}
                    style={{ width: '100%', height: 38, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 10px', fontSize: 13.5, background: '#fff' }}>
                    <option value="">Select client…</option>
                    {allClients.map(c => <option key={c.id} value={c.id}>{clientDisplayName(c)}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Linked Job (optional)</label>
                  <select value={sendJob} onChange={e => setSendJob(e.target.value)}
                    style={{ width: '100%', height: 38, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 10px', fontSize: 13.5, background: '#fff' }}>
                    <option value="">No specific job</option>
                    {allJobs.filter(j => !sendClient || j.clientId === sendClient).map(j => (
                      <option key={j.id} value={j.id}>{j.id} — {j.title || j.type}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setSendModal(false); setSendClient(''); setSendJob('') }}
                    style={{ height: 36, padding: '0 16px', background: '#f3f4f6', border: 'none', borderRadius: 8, fontSize: 13.5, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={handleManualSend} disabled={!sendClient}
                    style={{ height: 36, padding: '0 18px', background: sendClient ? '#2563eb' : '#9ca3af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: sendClient ? 'pointer' : 'default' }}>
                    Send Request
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const SH  = { fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }
const SEL = { height: 32, padding: '0 8px', border: '1px solid #e8e9ec', borderRadius: 7, fontSize: 12.5, color: '#374151', background: '#fff', cursor: 'pointer', outline: 'none' }
