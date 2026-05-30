import { useState, useEffect, useRef } from 'react'
import { api } from '../../services/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const MODULES = [
  { value: '',         label: 'All Modules' },
  { value: 'clients',  label: 'Clients'     },
  { value: 'jobs',     label: 'Jobs'        },
  { value: 'requests', label: 'Requests'    },
  { value: 'quotes',   label: 'Quotes'      },
  { value: 'invoices', label: 'Invoices'    },
]

const ACTIONS = [
  { value: '',              label: 'All Actions'    },
  { value: 'create',        label: 'Created'        },
  { value: 'edit',          label: 'Edited'         },
  { value: 'delete',        label: 'Deleted'        },
  { value: 'status_change', label: 'Status Changed' },
  { value: 'convert',       label: 'Converted'      },
  { value: 'send',          label: 'Sent'           },
  { value: 'complete',      label: 'Completed'      },
  { value: 'payment',       label: 'Payment'        },
]

const DATE_RANGES = [
  { v: 'today',  l: 'Today'       },
  { v: '7days',  l: 'Last 7 Days' },
  { v: '30days', l: 'Last 30 Days'},
  { v: 'custom', l: 'Custom'      },
  { v: 'all',    l: 'All Time'    },
]

const PAGE_SIZE = 50

// ─── Helpers ──────────────────────────────────────────────────────────────────

function badgeStyle(action) {
  const map = {
    create:        { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
    edit:          { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    delete:        { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    status_change: { bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff' },
    convert:       { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
    send:          { bg: '#ecfeff', color: '#0891b2', border: '#a5f3fc' },
    complete:      { bg: '#f0fdf4', color: '#059669', border: '#6ee7b7' },
    payment:       { bg: '#f0fdf4', color: '#047857', border: '#6ee7b7' },
  }
  return map[action] || { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' }
}

function fmtTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function avatarColor(name) {
  const COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#db2777']
  let h = 0
  for (const ch of (name || '')) h = (h * 31 + ch.charCodeAt(0)) & 0xffff
  return COLORS[h % COLORS.length]
}

function getDateParams(range, customFrom, customTo) {
  const today = new Date()
  const fmt   = d => d.toISOString().split('T')[0]
  if (range === 'today')  return { start_date: fmt(today), end_date: fmt(today) }
  if (range === '7days')  { const d = new Date(today); d.setDate(d.getDate() - 6);  return { start_date: fmt(d), end_date: fmt(today) } }
  if (range === '30days') { const d = new Date(today); d.setDate(d.getDate() - 29); return { start_date: fmt(d), end_date: fmt(today) } }
  if (range === 'custom') return {
    ...(customFrom && { start_date: customFrom }),
    ...(customTo   && { end_date:   customTo   }),
  }
  return {}
}

function toCSV(rows) {
  const headers = ['Time', 'User', 'Action', 'Module', 'Record', 'Field', 'Old Value', 'New Value']
  const escape  = v => { const s = String(v ?? '').replace(/"/g, '""'); return s.includes(',') ? `"${s}"` : s }
  const body    = rows.map(r => [
    fmtTime(r.created_at), r.user_name, r.action_type, r.module,
    r.record_name, r.field_changed, r.old_value, r.new_value,
  ].map(escape).join(','))
  return [headers.join(','), ...body].join('\n')
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActivityLog() {
  const [logs,       setLogs]       = useState([])
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [page,       setPage]       = useState(1)

  // Filters
  const [dateRange,    setDateRange]    = useState('7days')
  const [customFrom,   setCustomFrom]   = useState('')
  const [customTo,     setCustomTo]     = useState('')
  const [filterModule, setFilterModule] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterUser,   setFilterUser]   = useState('')
  const [searchInput,  setSearchInput]  = useState('')
  const [search,       setSearch]       = useState('')

  const searchTimer = useRef(null)

  // Debounce search input
  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setSearch(searchInput), 380)
    return () => clearTimeout(searchTimer.current)
  }, [searchInput])

  // Fetch when any filter or page changes
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const dateParams = getDateParams(dateRange, customFrom, customTo)
        const params = {
          ...dateParams,
          ...(filterModule && { module:      filterModule }),
          ...(filterAction && { action_type: filterAction }),
          ...(filterUser   && { user_name:   filterUser   }),
          ...(search       && { search                    }),
          limit:  PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        }
        const res = await api.getActivityLogs(params)
        if (!cancelled) {
          setLogs(res?.data || [])
          setTotal(res?.total || 0)
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load activity log')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [page, dateRange, customFrom, customTo, filterModule, filterAction, filterUser, search])

  // Reset page when any filter (not page) changes
  function setFilter(setter) {
    return value => { setter(value); setPage(1) }
  }

  function handleExport() {
    const csv  = toCSV(logs)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function clearFilters() {
    setDateRange('7days')
    setCustomFrom('')
    setCustomTo('')
    setFilterModule('')
    setFilterAction('')
    setFilterUser('')
    setSearchInput('')
    setSearch('')
    setPage(1)
  }

  const totalPages   = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const filtersActive = filterModule || filterAction || filterUser || search

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>

      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Entries',   value: loading ? '…' : total.toLocaleString()                },
          { label: 'This Page',       value: loading ? '…' : `${logs.length}`                      },
          { label: 'Page',            value: loading ? '…' : `${page} / ${totalPages}`             },
          { label: 'Filter Active',   value: filtersActive ? 'Yes' : 'No', accent: !!filtersActive },
        ].map(({ label, value, accent }) => (
          <div key={label} style={{ background: '#fff', border: `1px solid ${accent ? '#bfdbfe' : '#e8e9ec'}`, borderRadius: 12, padding: '16px 20px', flex: 1, minWidth: 140 }}>
            <p style={{ fontSize: 11.5, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 6px' }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: accent ? '#2563eb' : '#1a1d23', margin: 0, letterSpacing: '-0.3px' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Row 1: Date range pills + actions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 8, padding: 3 }}>
            {DATE_RANGES.map(r => (
              <button key={r.v} onClick={() => { setFilter(setDateRange)(r.v) }}
                style={{ padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: dateRange === r.v ? '#fff' : 'transparent', color: dateRange === r.v ? '#1a1d23' : '#6b7280', boxShadow: dateRange === r.v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.1s' }}>
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
            {filtersActive && (
              <button onClick={clearFilters}
                style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #e8e9ec', background: '#fff', fontSize: 12, fontWeight: 500, color: '#6b7280', cursor: 'pointer' }}>
                Clear Filters
              </button>
            )}
            <button onClick={handleExport}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 7, border: 'none', background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/>
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Row 2: Dropdowns + search */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <select value={filterModule} onChange={e => setFilter(setFilterModule)(e.target.value)} style={SEL}>
            {MODULES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>

          <select value={filterAction} onChange={e => setFilter(setFilterAction)(e.target.value)} style={SEL}>
            {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>

          <input type="text" placeholder="Filter by user…" value={filterUser}
            onChange={e => setFilter(setFilterUser)(e.target.value)}
            style={{ ...SEL, minWidth: 150 }} />

          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round"/>
            </svg>
            <input type="text" placeholder="Search by record or user…" value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{ ...SEL, paddingLeft: 32, width: '100%', boxSizing: 'border-box' }} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, overflow: 'hidden' }}>

        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f1f3', display: 'flex', alignItems: 'center', gap: 10 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Activity Feed</p>
          <span style={{ fontSize: 12, background: '#f3f4f6', color: '#6b7280', fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
            {total.toLocaleString()} {total === 1 ? 'entry' : 'entries'}
          </span>
          {loading && (
            <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>Loading…</span>
          )}
        </div>

        {error ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/>
              </svg>
            </div>
            <p style={{ fontSize: 14, color: '#dc2626', margin: '0 0 8px', fontWeight: 600 }}>Failed to load activity log</p>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>{error}</p>
          </div>

        ) : !loading && logs.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#9ca3af' }}>
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block' }}>
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="9" y="3" width="6" height="4" rx="1" strokeLinecap="round"/>
              <line x1="9" y1="12" x2="15" y2="12" strokeLinecap="round"/>
              <line x1="9" y1="16" x2="13" y2="16" strokeLinecap="round"/>
            </svg>
            <p style={{ fontSize: 14, margin: '0 0 6px', fontWeight: 500, color: '#6b7280' }}>No activity found</p>
            <p style={{ fontSize: 13, margin: 0 }}>Try adjusting your filters or date range.</p>
          </div>

        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Time', 'User', 'Action', 'Module', 'Record', 'Change', ''].map(h => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: 11.5, fontWeight: 600, color: '#6b7280', textAlign: 'left', borderBottom: '1px solid #f0f1f3', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((entry, i) => {
                    const bs         = badgeStyle(entry.action_type)
                    const col        = avatarColor(entry.user_name)
                    const isExpanded = expandedId === entry.id
                    const isLast     = i === logs.length - 1
                    const hasChange  = entry.field_changed || entry.old_value || entry.new_value

                    return [
                      <tr key={entry.id}
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        style={{ borderBottom: !isLast || isExpanded ? '1px solid #f0f1f3' : 'none', cursor: 'pointer', background: isExpanded ? '#fafbff' : 'transparent', transition: 'background 0.1s' }}>

                        {/* Time */}
                        <td style={{ padding: '11px 16px', fontSize: 12.5, color: '#6b7280', whiteSpace: 'nowrap' }}>
                          {fmtTime(entry.created_at)}
                        </td>

                        {/* User */}
                        <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: col, color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {initials(entry.user_name)}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1d23' }}>{entry.user_name || '—'}</span>
                          </div>
                        </td>

                        {/* Action badge */}
                        <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: bs.bg, color: bs.color, border: `1px solid ${bs.border}`, textTransform: 'capitalize', letterSpacing: '0.2px' }}>
                            {(entry.action_type || '—').replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Module */}
                        <td style={{ padding: '11px 16px', fontSize: 13, color: '#374151', fontWeight: 500, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                          {entry.module || '—'}
                        </td>

                        {/* Record */}
                        <td style={{ padding: '11px 16px', fontSize: 13, color: '#374151', maxWidth: 160 }}>
                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.record_name}>
                            {entry.record_name || '—'}
                          </span>
                        </td>

                        {/* Change summary */}
                        <td style={{ padding: '11px 16px', fontSize: 12, color: '#6b7280', maxWidth: 220 }}>
                          {hasChange ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                              {entry.field_changed && (
                                <span style={{ fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>
                                  {entry.field_changed.replace(/_/g, ' ')}:
                                </span>
                              )}
                              {entry.old_value && (
                                <span style={{ color: '#dc2626', textDecoration: 'line-through', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                  title={entry.old_value}>
                                  {entry.old_value}
                                </span>
                              )}
                              {entry.old_value && entry.new_value && (
                                <span style={{ color: '#9ca3af' }}>→</span>
                              )}
                              {entry.new_value && (
                                <span style={{ color: '#16a34a', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                  title={entry.new_value}>
                                  {entry.new_value}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#d1d5db' }}>—</span>
                          )}
                        </td>

                        {/* Expand toggle */}
                        <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2"
                            style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', display: 'block' }}>
                            <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </td>
                      </tr>,

                      isExpanded && (
                        <tr key={`${entry.id}-exp`} style={{ background: '#f8f9ff', borderBottom: '1px solid #e8e9ec' }}>
                          <td colSpan={7} style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px 28px', fontSize: 13 }}>
                              <DetailRow label="Log ID"    value={entry.id}         mono />
                              <DetailRow label="Timestamp" value={entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'} />
                              <DetailRow label="Record ID" value={entry.record_id}  mono />
                              <DetailRow label="IP Address" value={entry.ip_address || '—'} />
                              {entry.field_changed && <DetailRow label="Field"     value={entry.field_changed} />}
                              {entry.old_value     && <DetailRow label="Old Value" value={entry.old_value}     accent="#dc2626" />}
                              {entry.new_value     && <DetailRow label="New Value" value={entry.new_value}     accent="#16a34a" />}
                              {entry.user_agent    && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                  <span style={{ color: '#9ca3af', fontWeight: 600 }}>User Agent: </span>
                                  <span style={{ color: '#9ca3af', fontSize: 11.5 }}>{entry.user_agent}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ),
                    ]
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #f0f1f3' }}>
                <span style={{ fontSize: 13, color: '#9ca3af' }}>
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}
                    style={{ ...BTN, opacity: (page === 1 || loading) ? 0.4 : 1 }}>← Prev</button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                    const p     = start + i
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        style={{ ...BTN, background: p === page ? '#2563eb' : '#fff', color: p === page ? '#fff' : '#374151', borderColor: p === page ? '#2563eb' : '#e8e9ec' }}>
                        {p}
                      </button>
                    )
                  })}

                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}
                    style={{ ...BTN, opacity: (page === totalPages || loading) ? 0.4 : 1 }}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({ label, value, mono, accent }) {
  return (
    <div>
      <span style={{ color: '#9ca3af', fontWeight: 600 }}>{label}: </span>
      <span style={{
        color:      accent || '#374151',
        fontFamily: mono ? 'monospace' : undefined,
        fontSize:   mono ? 11 : 13,
      }}>
        {value || '—'}
      </span>
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const SEL = {
  height: 34, padding: '0 10px', borderRadius: 7,
  border: '1px solid #e8e9ec', fontSize: 13, color: '#374151',
  background: '#fff', minWidth: 130,
}

const BTN = {
  padding: '5px 11px', borderRadius: 6, border: '1px solid #e8e9ec',
  background: '#fff', fontSize: 13, color: '#374151',
  cursor: 'pointer', fontWeight: 500,
}
