import { useMemo } from 'react'
import { getServiceCalls } from '../data/store'
import { getStatusByCode } from '../data/walkaboutStatuses'

export default function WarrantyClaims() {
  const calls = useMemo(() => {
    return getServiceCalls().filter(c =>
      c.warrantyStatus === 'Under Warranty' ||
      (c.communicationLog || []).some(e => e.message && e.message.toLowerCase().includes('warrant'))
    )
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Warranty Claims</h1>
        <span style={{ fontSize: 13, color: '#6b7280' }}>
          <strong style={{ color: '#1a1d23' }}>{calls.length}</strong> warranty calls
        </span>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e8e9ec' }}>
              {['Call ID', 'Customer', 'Equipment', 'Model / Serial', 'Warranty Status', 'Status', 'Dispatch #', 'Created', 'Amount'].map(h => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calls.map((c, i) => {
              const s = getStatusByCode(c.status)
              const equip = [c.equipmentBrand, c.equipmentType].filter(Boolean).join(' ') || '—'
              const modelSerial = [c.equipModel, c.equipSerial].filter(Boolean).join(' / ') || '—'
              return (
                <tr key={c.callId || c.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f1f3' }}>
                  <td style={{ padding: '8px 14px', fontWeight: 700, color: '#2563eb' }}>{c.callId || c.id}</td>
                  <td style={{ padding: '8px 14px', fontWeight: 600, textTransform: 'uppercase', maxWidth: 180 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.customer || c.clientName}>
                      {c.customer || c.clientName || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 14px', color: '#374151' }}>{equip}</td>
                  <td style={{ padding: '8px 14px', color: '#6b7280', fontSize: 12 }}>{modelSerial}</td>
                  <td style={{ padding: '8px 14px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 3, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d040' }}>
                      {c.warrantyStatus || 'Unknown'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 14px' }}>
                    <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 3, background: s.bgColor, color: s.color, border: `1px solid ${s.color}40`, whiteSpace: 'nowrap' }}>{s.label}</span>
                  </td>
                  <td style={{ padding: '8px 14px', color: '#6b7280' }}>{c.dispatchNumber || '—'}</td>
                  <td style={{ padding: '8px 14px', color: '#6b7280' }}>{c.createdDate || '—'}</td>
                  <td style={{ padding: '8px 14px', color: '#374151' }}>
                    {c.total ? `$${c.total.toLocaleString()}` : '—'}
                  </td>
                </tr>
              )
            })}
            {calls.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No warranty claims found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
