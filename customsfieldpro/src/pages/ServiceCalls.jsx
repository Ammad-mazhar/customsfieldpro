import { useState, useMemo, useEffect } from 'react'
import { getServiceCalls, saveServiceCall, saveServiceCalls } from '../data/store'
import { apiGet, apiPost, apiPut } from '../utils/apiClient'
import { getTechColor } from '../utils/techColors'
import { getNextNumber } from '../utils/numberGenerator'
import { useAuth } from '../auth/AuthContext'
import { WALKABOUT_STATUSES, getStatusByCode } from '../data/walkaboutStatuses'
import { triggerReviewRequest } from '../utils/reviewRequests'
import QuickNote from '../components/QuickNote'

// ── Equipment abbreviations ───────────────────────────────────────────────────
const EQUIPMENT_ABBREV = {
  'Washer':           'WSH',
  'Dryer':            'DR',
  'Refrigerator':     'REF',
  'Dishwasher':       'DW',
  'Microwave':        'MW',
  'Oven':             'OVN',
  'Stove':            'STV',
  'HVAC':             'HVAC',
  'Furnace':          'FURN',
  'Water Heater':     'WH',
  'Garbage Disposal': 'GD',
  'Freezer':          'FRZ',
  'AC Unit':          'AC',
  'Boiler':           'BLR',
}
const EQUIPMENT_TYPES = Object.keys(EQUIPMENT_ABBREV)
const PRIORITIES = ['Normal', 'Urgent', 'Emergency']

function equipDisplay(brand, type) {
  const abbrev = EQUIPMENT_ABBREV[type] || (type ? type.slice(0, 4).toUpperCase() : '—')
  const b = (brand && brand !== 'Unknown' ? brand : 'Unknown').toUpperCase()
  return `${b} ${abbrev}`
}

function fmtTs(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
}

function daysOpen(createdAt) {
  if (!createdAt) return 0
  return Math.floor((Date.now() - createdAt) / 86400000)
}

// ── Walkabout Status Badge ────────────────────────────────────────────────────
function WalkaboutBadge({ code, onClick }) {
  const s = getStatusByCode(code)
  return (
    <span
      onClick={onClick}
      title={onClick ? 'Click to change status' : undefined}
      style={{
        display: 'inline-block', fontSize: 11, fontWeight: 700,
        padding: '2px 7px', borderRadius: 3,
        background: s.bgColor, color: s.color,
        border: `1px solid ${s.color}50`,
        cursor: onClick ? 'pointer' : 'default', whiteSpace: 'nowrap',
        letterSpacing: '0.1px',
      }}
    >
      {s.label}
    </span>
  )
}

// ── Status Change Modal ───────────────────────────────────────────────────────
function StatusChangeModal({ call, onClose, onSave }) {
  const [newStatus, setNewStatus] = useState(call.status || '01')
  const [reason, setReason] = useState('')
  const history = (call.communicationLog || []).filter(e => e.type === 'status_change').slice().reverse()

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modalBoxStyle, width: 500, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Change Status</h3>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <p style={{ fontSize: 12.5, color: '#6b7280', margin: '0 0 12px' }}>
          Call #{call.callId || call.id} — <strong>{call.customer || call.clientName}</strong>
        </p>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Current Status</label>
          <div style={{ marginTop: 4 }}><WalkaboutBadge code={call.status} /></div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>New Status</label>
          <select
            value={newStatus}
            onChange={e => setNewStatus(e.target.value)}
            style={{ ...inputStyle, marginTop: 4 }}
          >
            {WALKABOUT_STATUSES.map(s => (
              <option key={s.code} value={s.code}>{s.label}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Notes (optional)</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Add a note about this status change..."
            rows={2}
            style={{ ...inputStyle, marginTop: 4, resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: history.length ? 20 : 0 }}>
          <button
            onClick={() => onSave(newStatus, reason)}
            style={{ ...btnPrimaryStyle, flex: 1 }}
          >
            Update Status
          </button>
          <button onClick={onClose} style={btnSecondaryStyle}>Cancel</button>
        </div>

        {history.length > 0 && (
          <div style={{ borderTop: '1px solid #f0f1f3', paddingTop: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.6px', margin: '0 0 8px', textTransform: 'uppercase' }}>Status History</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {history.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12, color: '#374151' }}>
                  <span style={{ color: '#9ca3af', whiteSpace: 'nowrap', flexShrink: 0 }}>{fmtTs(e.timestamp)}</span>
                  <span style={{ flex: 1 }}>{e.message}</span>
                  <span style={{ color: '#9ca3af', whiteSpace: 'nowrap' }}>{e.author}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Call Detail Modal ─────────────────────────────────────────────────────────
function CallDetailModal({ call, onClose, onStatusChange }) {
  const [noteText, setNoteText] = useState('')
  const log = [...(call.communicationLog || [])].reverse()

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modalBoxStyle, width: 760, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1d23', margin: 0 }}>
                Call #{call.callId || call.id}
              </h2>
              <WalkaboutBadge code={call.status} onClick={onStatusChange} />
              {call.priority && call.priority !== 'Normal' && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 3, background: call.priority === 'Emergency' ? '#fef2f2' : '#fff7ed', color: call.priority === 'Emergency' ? '#dc2626' : '#ea580c' }}>
                  {call.priority}
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', margin: '4px 0 0', textTransform: 'uppercase' }}>
              {call.customer || call.clientName}
            </p>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 20, overflow: 'hidden', flex: 1, minHeight: 0 }}>
          {/* Left — Call info */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={cardStyle}>
              <p style={cardTitleStyle}>Call Information</p>
              <div style={infoGrid}>
                <InfoRow label="Dispatch #" value={call.dispatchNumber || '—'} />
                <InfoRow label="CSR" value={call.csr || '—'} />
                <InfoRow label="Technician" value={call.techId ? `${call.techId} ${call.techName}` : (call.techName || '—')} />
                <InfoRow label="Created" value={call.createdDate || fmtTs(call.createdAt)} />
                <InfoRow label="Scheduled" value={call.scheduledDate || '—'} />
              </div>
            </div>

            <div style={cardStyle}>
              <p style={cardTitleStyle}>Customer & Location</p>
              <div style={infoGrid}>
                <InfoRow label="Phone" value={call.clientPhone || '—'} />
                <InfoRow label="Email" value={call.clientEmail || '—'} />
                <InfoRow label="Address" value={call.propertyAddress || '—'} />
              </div>
            </div>

            <div style={cardStyle}>
              <p style={cardTitleStyle}>Equipment</p>
              <div style={infoGrid}>
                <InfoRow label="Brand" value={call.equipmentBrand || '—'} />
                <InfoRow label="Type" value={call.equipmentType || '—'} />
                <InfoRow label="Model" value={call.equipModel || '—'} />
                <InfoRow label="Serial" value={call.equipSerial || '—'} />
                <InfoRow label="Warranty" value={call.warrantyStatus || '—'} />
              </div>
            </div>

            {call.description && (
              <div style={cardStyle}>
                <p style={cardTitleStyle}>Problem Description</p>
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.55, margin: 0 }}>{call.description}</p>
              </div>
            )}

            {call.lineItems && call.lineItems.length > 0 && (
              <div style={cardStyle}>
                <p style={cardTitleStyle}>Charges</p>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f0f1f3' }}>
                      <th style={{ textAlign: 'left', padding: '4px 0', color: '#6b7280', fontWeight: 600 }}>Description</th>
                      <th style={{ textAlign: 'right', padding: '4px 0', color: '#6b7280', fontWeight: 600 }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: '4px 0', color: '#6b7280', fontWeight: 600 }}>Unit</th>
                      <th style={{ textAlign: 'right', padding: '4px 0', color: '#6b7280', fontWeight: 600 }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {call.lineItems.map((li, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                        <td style={{ padding: '5px 0', color: '#374151' }}>{li.description}</td>
                        <td style={{ padding: '5px 0', textAlign: 'right', color: '#374151' }}>{li.qty}</td>
                        <td style={{ padding: '5px 0', textAlign: 'right', color: '#374151' }}>${li.unit}</td>
                        <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 600, color: '#1a1d23' }}>${li.total}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #e8e9ec' }}>
                      <td colSpan={3} style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, fontSize: 13 }}>Total</td>
                      <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#2563eb' }}>${call.total || call.subtotal || 0}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Right — Communication log */}
          <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto' }}>
            <div style={{ ...cardStyle, flex: 1 }}>
              <p style={cardTitleStyle}>Activity Log</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {log.length === 0 && <p style={{ fontSize: 12, color: '#9ca3af' }}>No activity yet.</p>}
                {log.map((entry, i) => (
                  <div key={i} style={{ fontSize: 12, padding: '7px 9px', background: entry.type === 'status_change' ? '#f0f7ff' : '#f9fafb', borderRadius: 6, border: `1px solid ${entry.type === 'status_change' ? '#bfdbfe' : '#f0f1f3'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, color: '#374151' }}>{entry.author}</span>
                      <span style={{ color: '#9ca3af', fontSize: 11 }}>{entry.type === 'status_change' ? '🔄' : entry.type === 'sms' ? '💬' : entry.type === 'email' ? '📧' : '📝'}</span>
                    </div>
                    <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.4 }}>{entry.message}</p>
                    <p style={{ margin: '3px 0 0', color: '#9ca3af', fontSize: 11 }}>{fmtTs(entry.timestamp)}</p>
                  </div>
                ))}
              </div>

              <div>
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Add a note..."
                  rows={2}
                  style={{ ...inputStyle, fontSize: 12, resize: 'none' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 12.5 }}>
      <span style={{ color: '#9ca3af', fontWeight: 600, minWidth: 80, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#374151', flex: 1 }}>{value}</span>
    </div>
  )
}

// ── Expanded inline row ───────────────────────────────────────────────────────
function ExpandedRow({ call, onViewFull, onStatusChange }) {
  const latestNote = [...(call.communicationLog || [])]
    .reverse()
    .find(e => e.type === 'note')

  return (
    <div style={{
      background: '#f0f7ff', padding: '12px 20px 14px 40px',
      borderLeft: '4px solid #1565C0', borderBottom: '1px solid #dbeafe',
    }}>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 10 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Problem</span>
          <p style={{ fontSize: 12.5, color: '#1a1d23', margin: '2px 0 0', maxWidth: 340 }}>
            {call.description || '—'}
          </p>
        </div>
        <div>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Equipment</span>
          <p style={{ fontSize: 12.5, color: '#1a1d23', margin: '2px 0 0' }}>
            {call.equipmentBrand ? `${call.equipmentBrand} ${call.equipmentType}` : '—'}
            {call.equipModel ? ` · ${call.equipModel}` : ''}
          </p>
        </div>
        <div>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Address</span>
          <p style={{ fontSize: 12.5, color: '#1a1d23', margin: '2px 0 0' }}>{call.propertyAddress || '—'}</p>
        </div>
        {latestNote && (
          <div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Latest Note</span>
            <p style={{ fontSize: 12.5, color: '#4b5563', margin: '2px 0 0', maxWidth: 260, fontStyle: 'italic' }}>
              "{latestNote.message}"
            </p>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onViewFull} style={btnSmallPrimaryStyle}>View Full Call</button>
        <button onClick={onStatusChange} style={btnSmallSecondaryStyle}>Change Status</button>
      </div>
    </div>
  )
}

// ── Create Service Call Modal ─────────────────────────────────────────────────
function CreateCallModal({ onClose, onSave, currentUser }) {
  const [form, setForm] = useState({
    customer: '',
    clientPhone: '',
    clientEmail: '',
    propertyAddress: '',
    equipmentBrand: 'Unknown',
    equipmentType: 'Washer',
    equipModel: '',
    equipSerial: '',
    warrantyStatus: 'Unknown',
    techId: '',
    techName: '',
    scheduledDate: '',
    description: '',
    dispatchNumber: '',
    priority: 'Normal',
    csr: currentUser?.name || 'Admin',
    csrId: currentUser?.id || 'user-1',
  })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.customer.trim()) return alert('Customer name is required.')
    const n    = getNextNumber('service_calls')
    const callId = String(100000 + n)
    const now  = Date.now()
    const record = {
      ...form,
      callId, id: callId,
      clientName: form.customer,
      status: '01',
      createdDate: new Date(now).toLocaleDateString('en-US'),
      createdAt: now,
      communicationLog: [{
        id: `cl-${callId}-1`,
        type: 'status_change',
        message: `01 New Call — created by ${form.csr}`,
        author: form.csr,
        timestamp: now,
      }],
      lineItems: [], subtotal: 0, taxRate: 0, total: 0,
      completedAt: null, paidAt: null,
    }
    onSave(record)
  }

  const W = ({ children, col = 1 }) => (
    <div style={{ gridColumn: `span ${col}` }}>{children}</div>
  )

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modalBoxStyle, width: 640, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: 0 }}>New Service Call</h3>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <W col={2}>
              <label style={labelStyle}>Customer Name *</label>
              <input value={form.customer} onChange={e => set('customer', e.target.value)} placeholder="COMPANY NAME, LOCATION" style={{ ...inputStyle, marginTop: 4, textTransform: 'uppercase' }} />
            </W>
            <W>
              <label style={labelStyle}>Phone</label>
              <input value={form.clientPhone} onChange={e => set('clientPhone', e.target.value)} placeholder="(555) 000-0000" style={{ ...inputStyle, marginTop: 4 }} />
            </W>
            <W>
              <label style={labelStyle}>Email</label>
              <input value={form.clientEmail} onChange={e => set('clientEmail', e.target.value)} placeholder="contact@example.com" style={{ ...inputStyle, marginTop: 4 }} />
            </W>
            <W col={2}>
              <label style={labelStyle}>Property Address</label>
              <input value={form.propertyAddress} onChange={e => set('propertyAddress', e.target.value)} placeholder="123 Main St, City, State ZIP" style={{ ...inputStyle, marginTop: 4 }} />
            </W>
            <W>
              <label style={labelStyle}>Equipment Brand</label>
              <input value={form.equipmentBrand} onChange={e => set('equipmentBrand', e.target.value)} placeholder="Unknown" style={{ ...inputStyle, marginTop: 4 }} />
            </W>
            <W>
              <label style={labelStyle}>Equipment Type</label>
              <select value={form.equipmentType} onChange={e => set('equipmentType', e.target.value)} style={{ ...inputStyle, marginTop: 4 }}>
                {EQUIPMENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </W>
            <W>
              <label style={labelStyle}>Model</label>
              <input value={form.equipModel} onChange={e => set('equipModel', e.target.value)} placeholder="Model number" style={{ ...inputStyle, marginTop: 4 }} />
            </W>
            <W>
              <label style={labelStyle}>Serial #</label>
              <input value={form.equipSerial} onChange={e => set('equipSerial', e.target.value)} placeholder="Serial number" style={{ ...inputStyle, marginTop: 4 }} />
            </W>
            <W>
              <label style={labelStyle}>Warranty Status</label>
              <select value={form.warrantyStatus} onChange={e => set('warrantyStatus', e.target.value)} style={{ ...inputStyle, marginTop: 4 }}>
                {['Unknown', 'Under Warranty', 'Expired', 'Out of Warranty'].map(s => <option key={s}>{s}</option>)}
              </select>
            </W>
            <W>
              <label style={labelStyle}>Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} style={{ ...inputStyle, marginTop: 4 }}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </W>
            <W>
              <label style={labelStyle}>Tech ID</label>
              <input type="number" value={form.techId} onChange={e => set('techId', e.target.value ? Number(e.target.value) : '')} placeholder="1, 2, 3..." style={{ ...inputStyle, marginTop: 4 }} />
            </W>
            <W>
              <label style={labelStyle}>Technician Name</label>
              <input value={form.techName} onChange={e => set('techName', e.target.value)} placeholder="First name" style={{ ...inputStyle, marginTop: 4 }} />
            </W>
            <W>
              <label style={labelStyle}>Scheduled Date</label>
              <input type="date" value={form.scheduledDate} onChange={e => set('scheduledDate', e.target.value ? new Date(e.target.value + 'T12:00:00').toLocaleDateString('en-US') : '')} style={{ ...inputStyle, marginTop: 4 }} />
            </W>
            <W>
              <label style={labelStyle}>Dispatch #</label>
              <input value={form.dispatchNumber} onChange={e => set('dispatchNumber', e.target.value)} placeholder="e.g. 402115 or TEST CALL" style={{ ...inputStyle, marginTop: 4 }} />
            </W>
            <W>
              <label style={labelStyle}>CSR</label>
              <input value={form.csr} onChange={e => set('csr', e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
            </W>
            <W col={2}>
              <label style={labelStyle}>Problem Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Describe the issue..." style={{ ...inputStyle, marginTop: 4, resize: 'vertical' }} />
            </W>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={{ ...btnPrimaryStyle, flex: 1 }}>Create Service Call</button>
            <button type="button" onClick={onClose} style={btnSecondaryStyle}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Filter Select ─────────────────────────────────────────────────────────────
function FilterSelect({ value, options, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={filterSelectStyle}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ServiceCallMaster() {
  const { user } = useAuth()
  const [calls, setCalls]       = useState(() => getServiceCalls())
  const [filters, setFilters]   = useState({
    callId: '', customer: '', equipment: 'All', technician: 'All',
    createdDate: '', scheduledDate: '', status: 'All', csr: 'All', dispatch: '',
  })
  const [expandedId, setExpandedId] = useState(null)
  const [statusModal, setStatusModal] = useState(null)   // call object
  const [detailCall, setDetailCall]   = useState(null)   // call object
  const [showCreate, setShowCreate]   = useState(false)
  const [toast, setToast]             = useState(null)

  useEffect(() => {
    apiGet('/api/service-calls').then(data => {
      if (Array.isArray(data)) { setCalls(data); saveServiceCalls(data) }
    }).catch(() => {})
  }, [])

  function reload() { setCalls(getServiceCalls()) }
  function flash(msg) { setToast(msg); setTimeout(() => setToast(null), 2500) }
  function callKey(c) { return c.callId || c.id }

  // Unique dropdown options
  const equipOptions  = useMemo(() => ['All', ...new Set(calls.map(c => c.equipmentType).filter(Boolean).sort())], [calls])
  const techOptions   = useMemo(() => {
    const set = new Set(calls.map(c => c.techId ? `${c.techId} ${c.techName}` : c.techName).filter(Boolean))
    return ['All', ...set]
  }, [calls])
  const csrOptions    = useMemo(() => ['All', ...new Set(calls.map(c => c.csr).filter(Boolean).sort())], [calls])
  const statusOptions = useMemo(() => {
    const codes = new Set(calls.map(c => c.status).filter(Boolean))
    return ['All', ...[...codes].sort()]
  }, [calls])

  const filtered = useMemo(() => {
    return calls.filter(c => {
      const id = callKey(c)
      if (filters.callId && !String(id).includes(filters.callId)) return false
      const cust = (c.customer || c.clientName || '').toLowerCase()
      if (filters.customer && !cust.includes(filters.customer.toLowerCase())) return false
      if (filters.equipment !== 'All' && c.equipmentType !== filters.equipment) return false
      const tech = c.techId ? `${c.techId} ${c.techName}` : (c.techName || '')
      if (filters.technician !== 'All' && tech !== filters.technician) return false
      if (filters.createdDate && c.createdDate !== filters.createdDate) return false
      if (filters.scheduledDate && c.scheduledDate !== filters.scheduledDate) return false
      if (filters.status !== 'All' && c.status !== filters.status) return false
      if (filters.csr !== 'All' && (c.csr || '') !== filters.csr) return false
      if (filters.dispatch && !String(c.dispatchNumber || '').toLowerCase().includes(filters.dispatch.toLowerCase())) return false
      return true
    })
  }, [calls, filters])

  function setFilter(k, v) { setFilters(f => ({ ...f, [k]: v })) }

  function handleStatusSave(call, newStatus, reason) {
    const entry = {
      id: `cl-${callKey(call)}-${Date.now()}`,
      type: 'status_change',
      message: `Status changed to ${getStatusByCode(newStatus).label}${reason ? ' — ' + reason : ''}`,
      author: user?.name || 'Admin',
      timestamp: Date.now(),
    }
    const updated = {
      ...call,
      status: newStatus,
      communicationLog: [...(call.communicationLog || []), entry],
    }
    saveServiceCall(updated)
    apiPut(`/api/service-calls/${callKey(call)}`, updated).catch(() => {})
    reload()
    setStatusModal(null)
    if (detailCall && callKey(detailCall) === callKey(call)) setDetailCall(updated)
    flash(`Status updated to ${getStatusByCode(newStatus).label}`)
    // Trigger review request on completion statuses
    if (newStatus === '04' || newStatus === '04A') {
      const jobLike = {
        id: callKey(call), callId: callKey(call),
        clientId: call.clientId, clientName: call.customer || call.clientName,
        clientPhone: call.phone || call.clientPhone, clientEmail: call.email || call.clientEmail,
        type: call.equipmentType || call.serviceType || 'service', status: newStatus,
      }
      triggerReviewRequest(jobLike, null, null)
    }
  }

  function handleCreate(record) {
    saveServiceCall(record)
    apiPost('/api/service-calls', record).catch(() => {})
    reload()
    setShowCreate(false)
    flash(`Call #${record.callId} created.`)
  }

  function exportCSV() {
    const rows = [
      ['Call ID', 'Customer', 'Equipment', 'Technician', 'Created', 'Scheduled', 'Status', 'CSR', 'Dispatch #'],
      ...filtered.map(c => [
        callKey(c),
        c.customer || c.clientName,
        equipDisplay(c.equipmentBrand, c.equipmentType),
        c.techId ? `${c.techId} ${c.techName}` : c.techName,
        c.createdDate,
        c.scheduledDate,
        getStatusByCode(c.status).label,
        c.csr,
        c.dispatchNumber,
      ]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `service-calls-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'inherit', minHeight: '100%' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#1e293b', color: '#fff', padding: '10px 20px', borderRadius: 8, zIndex: 3000, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
          {toast}
        </div>
      )}

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button onClick={exportCSV} title="Export to CSV" style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#374151', flexShrink: 0 }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round"/>
            <polyline points="7 10 12 15 17 10" strokeLinecap="round"/>
            <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/>
          </svg>
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1a1d23', margin: 0, letterSpacing: '-0.2px' }}>
          Service Call Master
        </h1>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#6b7280' }}>
          {filtered.length} of {calls.length} calls
        </span>
        <button
          onClick={() => setShowCreate(true)}
          style={{ ...btnPrimaryStyle, padding: '7px 14px', fontSize: 12.5 }}
        >
          + New Call
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5 }}>
            <thead>
              {/* Column headers */}
              <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e8e9ec' }}>
                <th style={{ ...thStyle, width: 28, padding: '8px 6px' }}></th>
                <th style={thStyle}>Call ID</th>
                <th style={{ ...thStyle, minWidth: 200 }}>Customer</th>
                <th style={thStyle}>Equipment</th>
                <th style={thStyle}>Technician</th>
                <th style={thStyle}>Created Date</th>
                <th style={thStyle}>Scheduled Date</th>
                <th style={{ ...thStyle, minWidth: 140 }}>Status</th>
                <th style={thStyle}>CSR</th>
                <th style={thStyle}>Dispatch #</th>
              </tr>

              {/* Filter row */}
              <tr style={{ background: '#fafafa', borderBottom: '1px solid #e8e9ec' }}>
                <td style={{ padding: '4px 6px' }}></td>
                <td style={filterTdStyle}>
                  <input value={filters.callId} onChange={e => setFilter('callId', e.target.value)} style={filterInputStyle} placeholder="Filter…" />
                </td>
                <td style={filterTdStyle}>
                  <input value={filters.customer} onChange={e => setFilter('customer', e.target.value)} style={filterInputStyle} placeholder="Filter…" />
                </td>
                <td style={filterTdStyle}>
                  <FilterSelect value={filters.equipment} options={equipOptions} onChange={v => setFilter('equipment', v)} />
                </td>
                <td style={filterTdStyle}>
                  <FilterSelect value={filters.technician} options={techOptions} onChange={v => setFilter('technician', v)} />
                </td>
                <td style={filterTdStyle}>
                  <input value={filters.createdDate} onChange={e => setFilter('createdDate', e.target.value)} style={filterInputStyle} placeholder="MM/DD/YYYY" />
                </td>
                <td style={filterTdStyle}>
                  <input value={filters.scheduledDate} onChange={e => setFilter('scheduledDate', e.target.value)} style={filterInputStyle} placeholder="MM/DD/YYYY" />
                </td>
                <td style={filterTdStyle}>
                  <FilterSelect value={filters.status} options={statusOptions} onChange={v => setFilter('status', v)} />
                </td>
                <td style={filterTdStyle}>
                  <FilterSelect value={filters.csr} options={csrOptions} onChange={v => setFilter('csr', v)} />
                </td>
                <td style={filterTdStyle}>
                  <input value={filters.dispatch} onChange={e => setFilter('dispatch', e.target.value)} style={filterInputStyle} placeholder="Filter…" />
                </td>
              </tr>
            </thead>

            <tbody>
              {filtered.map((call, idx) => {
                const id        = callKey(call)
                const isExpanded = expandedId === id
                const techStr   = call.techId ? `${call.techId} ${call.techName}` : (call.techName || '—')
                const custStr   = call.customer || call.clientName || '—'

                return (
                  <>
                    <tr
                      key={id}
                      style={{
                        background: isExpanded ? '#eff6ff' : idx % 2 === 0 ? '#fff' : '#fafafa',
                        borderBottom: '1px solid #f0f1f3',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                      }}
                      onClick={() => setExpandedId(prev => prev === id ? null : id)}
                    >
                      {/* Expand chevron */}
                      <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          transform: isExpanded ? 'rotate(90deg)' : 'none',
                          transition: 'transform 0.2s',
                          fontSize: 10, color: '#9ca3af',
                        }}>▶</span>
                      </td>

                      {/* Call ID */}
                      <td style={{ ...tdStyle, fontWeight: 700 }}>
                        <span
                          onClick={e => { e.stopPropagation(); setDetailCall(call) }}
                          style={{ color: '#2563eb', cursor: 'pointer', textDecoration: 'none' }}
                          onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                        >
                          {id}
                        </span>
                      </td>

                      {/* Customer */}
                      <td style={{ ...tdStyle, fontWeight: 600, color: '#2563eb', textTransform: 'uppercase', maxWidth: 200 }}>
                        <span
                          style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={custStr}
                        >
                          {custStr}
                        </span>
                      </td>

                      {/* Equipment */}
                      <td style={tdStyle}>
                        {equipDisplay(call.equipmentBrand, call.equipmentType)}
                      </td>

                      {/* Technician */}
                      <td style={tdStyle}>
                        {call.techName ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: getTechColor(call.techId).hex, flexShrink: 0, display: 'inline-block' }} />
                            {techStr}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Created Date */}
                      <td style={tdStyle}>{call.createdDate || '—'}</td>

                      {/* Scheduled Date */}
                      <td style={tdStyle}>{call.scheduledDate || '—'}</td>

                      {/* Status — click stops row expand, opens status modal */}
                      <td style={{ ...tdStyle }} onClick={e => { e.stopPropagation(); setStatusModal(call) }}>
                        <WalkaboutBadge code={call.status} onClick={() => {}} />
                      </td>

                      {/* CSR */}
                      <td style={tdStyle}>{call.csr || '—'}</td>

                      {/* Dispatch # */}
                      <td style={{ ...tdStyle, color: '#6b7280' }}>{call.dispatchNumber || '—'}</td>
                    </tr>

                    {/* Expanded row */}
                    {isExpanded && (
                      <tr key={`${id}-exp`}>
                        <td colSpan={10} style={{ padding: 0 }}>
                          <ExpandedRow
                            call={call}
                            onViewFull={() => { setDetailCall(call); setExpandedId(null) }}
                            onStatusChange={() => { setStatusModal(call); setExpandedId(null) }}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: '40px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                    {calls.length === 0 ? 'No service calls found.' : 'No calls match the current filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {['01', '02', '03', '04', '05'].map(prefix => {
          const count = calls.filter(c => String(c.status || '').startsWith(prefix)).length
          if (count === 0) return null
          const def = getStatusByCode(prefix)
          return (
            <span key={prefix} style={{ fontSize: 11.5, color: def.color, fontWeight: 600 }}>
              {def.label}: {count}
            </span>
          )
        })}
        <span style={{ fontSize: 11.5, color: '#9ca3af', marginLeft: 'auto' }}>
          Total calls: {calls.length}
        </span>
      </div>

      {/* Modals */}
      {statusModal && (
        <StatusChangeModal
          call={statusModal}
          onClose={() => setStatusModal(null)}
          onSave={(newStatus, reason) => handleStatusSave(statusModal, newStatus, reason)}
        />
      )}

      {detailCall && (
        <CallDetailModal
          call={detailCall}
          onClose={() => setDetailCall(null)}
          onStatusChange={() => { setStatusModal(detailCall); setDetailCall(null) }}
        />
      )}

      {showCreate && (
        <CreateCallModal
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
          currentUser={user}
        />
      )}

      {/* Quick Note floating button */}
      <QuickNote context="" contextLabel="Service Calls" />
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const overlayStyle = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 2000, padding: 20,
}
const modalBoxStyle = {
  background: '#fff', borderRadius: 10,
  padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
}
const inputStyle = {
  width: '100%', padding: '7px 10px',
  border: '1px solid #d1d5db', borderRadius: 6,
  fontSize: 13, background: '#fff', color: '#1a1d23',
  outline: 'none', boxSizing: 'border-box',
}
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px' }
const btnPrimaryStyle = {
  padding: '8px 16px', background: '#1565C0', color: '#fff',
  border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const btnSecondaryStyle = {
  padding: '8px 14px', background: '#f3f4f6', color: '#374151',
  border: '1px solid #e8e9ec', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer',
}
const btnSmallPrimaryStyle = {
  padding: '5px 12px', background: '#1565C0', color: '#fff',
  border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer',
}
const btnSmallSecondaryStyle = {
  padding: '5px 12px', background: '#fff', color: '#374151',
  border: '1px solid #d1d5db', borderRadius: 5, fontSize: 12, fontWeight: 500, cursor: 'pointer',
}
const closeBtnStyle = {
  width: 28, height: 28, borderRadius: 6, border: '1px solid #e8e9ec',
  background: '#f9fafb', cursor: 'pointer', fontSize: 13, color: '#6b7280',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const thStyle = {
  padding: '8px 12px', textAlign: 'left',
  fontSize: 11.5, fontWeight: 700, color: '#374151',
  textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap',
}
const tdStyle = {
  padding: '8px 12px', fontSize: 12.5, color: '#1a1d23',
  whiteSpace: 'nowrap',
}
const filterTdStyle = { padding: '4px 4px 4px 4px' }
const filterInputStyle = {
  width: '100%', padding: '4px 7px',
  border: '1px solid #d1d5db', borderRadius: 4,
  fontSize: 12, background: '#fff', color: '#1a1d23',
  outline: 'none', boxSizing: 'border-box',
}
const filterSelectStyle = {
  width: '100%', padding: '4px 6px',
  border: '1px solid #d1d5db', borderRadius: 4,
  fontSize: 12, background: '#fff', color: '#1a1d23',
  outline: 'none', boxSizing: 'border-box',
}
const cardStyle = {
  background: '#f9fafb', border: '1px solid #f0f1f3',
  borderRadius: 7, padding: '10px 12px',
}
const cardTitleStyle = {
  fontSize: 11, fontWeight: 700, color: '#9ca3af',
  textTransform: 'uppercase', letterSpacing: '0.5px',
  margin: '0 0 8px',
}
const infoGrid = { display: 'flex', flexDirection: 'column', gap: 5 }
