import { useMemo } from 'react'
import { getServiceCalls } from '../data/store'
import { getStatusByCode } from '../data/walkaboutStatuses'

const CLOSED = new Set(['05', '05A', '05B', '05C'])

function ageColor(days) {
  if (days <= 7) return { bg: '#f0fdf4', color: '#16a34a', label: '0–7 days' }
  if (days <= 14) return { bg: '#fffbeb', color: '#d97706', label: '8–14 days' }
  return { bg: '#fef2f2', color: '#dc2626', label: '15+ days' }
}

export default function Aging() {
  const calls = useMemo(() => {
    return getServiceCalls()
      .filter(c => !CLOSED.has(c.status))
      .map(c => ({
        ...c,
        days: c.createdAt ? Math.floor((Date.now() - c.createdAt) / 86400000) : 0,
      }))
      .sort((a, b) => b.days - a.days)
  }, [])

  const avgDays  = calls.length ? Math.round(calls.reduce((s, c) => s + c.days, 0) / calls.length) : 0
  const oldest   = calls[0]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Aging Report</h1>
        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#6b7280' }}>
          <span><strong style={{ color: '#1a1d23' }}>{calls.length}</strong> open calls</span>
          <span>Avg age: <strong style={{ color: '#1a1d23' }}>{avgDays} days</strong></span>
          {oldest && <span>Oldest: <strong style={{ color: '#dc2626' }}>{oldest.days} days</strong></span>}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        {[{ bg: '#f0fdf4', color: '#16a34a', label: '0–7 days' }, { bg: '#fffbeb', color: '#d97706', label: '8–14 days' }, { bg: '#fef2f2', color: '#dc2626', label: '15+ days' }].map(item => (
          <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: item.bg, border: `1px solid ${item.color}40`, display: 'inline-block' }} />
            <span style={{ color: item.color, fontWeight: 600 }}>{item.label}</span>
          </span>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e8e9ec' }}>
              {['Call ID', 'Customer', 'Status', 'Days Open', 'Technician', 'Amount', 'Created'].map(h => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calls.map((c, i) => {
              const { bg, color } = ageColor(c.days)
              return (
                <tr key={c.callId || c.id} style={{ background: i % 2 === 0 ? bg : `${bg}cc`, borderBottom: '1px solid #f0f1f3' }}>
                  <td style={{ padding: '8px 14px', fontWeight: 700, color: '#2563eb' }}>{c.callId || c.id}</td>
                  <td style={{ padding: '8px 14px', fontWeight: 600, textTransform: 'uppercase', maxWidth: 200 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.customer || c.clientName}>
                      {c.customer || c.clientName || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 14px' }}>
                    {(() => {
                      const s = getStatusByCode(c.status)
                      return <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 3, background: s.bgColor, color: s.color, border: `1px solid ${s.color}40`, whiteSpace: 'nowrap' }}>{s.label}</span>
                    })()}
                  </td>
                  <td style={{ padding: '8px 14px', fontWeight: 700, color }}>
                    {c.days} {c.days === 1 ? 'day' : 'days'}
                  </td>
                  <td style={{ padding: '8px 14px', color: '#374151' }}>
                    {c.techId ? `${c.techId} ${c.techName}` : (c.techName || '—')}
                  </td>
                  <td style={{ padding: '8px 14px', color: '#374151' }}>
                    {c.total ? `$${c.total.toLocaleString()}` : '—'}
                  </td>
                  <td style={{ padding: '8px 14px', color: '#6b7280' }}>{c.createdDate || '—'}</td>
                </tr>
              )
            })}
            {calls.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No open service calls.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
