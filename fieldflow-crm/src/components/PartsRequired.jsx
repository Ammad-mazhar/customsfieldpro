// CustomsFieldPro — Parts Required Management Card
// Shows on Job Detail when status is material_required or waiting_on_parts.

import { useState } from 'react'
import { getJobs, saveJobs } from '../data/store'
import { logActivity, ACTIONS } from '../utils/activityLog'
import { notifyAdmins, NOTIF_TYPES } from '../utils/notifications'
import { useAuth } from '../auth/AuthContext'

const PART_STATUS_STYLES = {
  needed:    { bg: '#f3f4f6', color: '#6b7280', label: 'Needed' },
  ordered:   { bg: '#fffbeb', color: '#d97706', label: 'Ordered' },
  available: { bg: '#eff6ff', color: '#2563eb', label: 'Available' },
  received:  { bg: '#f0fdf4', color: '#16a34a', label: 'Received' },
}

const INP = {
  width: '100%', boxSizing: 'border-box', border: '1px solid #e8e9ec', borderRadius: 7,
  padding: '8px 11px', fontSize: 13.5, color: '#374151', outline: 'none',
}
const SEL = {
  ...INP, appearance: 'none', background: '#fff',
  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'%3E%3Cpath d=\'M1 1l5 5 5-5\' stroke=\'%236b7280\' stroke-width=\'1.5\' fill=\'none\'/%3E%3C/svg%3E")',
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 30,
}
const LB = { display: 'block', fontSize: 11.5, fontWeight: 700, color: '#6b7280', marginBottom: 4 }

function StatusBadge({ status }) {
  const s = PART_STATUS_STYLES[status] || PART_STATUS_STYLES.needed
  return (
    <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: s.bg, color: s.color }}>
      ● {s.label}
    </span>
  )
}

function formatExpected(date, time) {
  if (!date) return null
  const d = new Date(date + 'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  let dayLabel = ''
  if (d.getTime() === today.getTime()) dayLabel = 'Today'
  else if (d.getTime() === tomorrow.getTime()) dayLabel = 'Tomorrow'
  else dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (time) {
    const [h, m] = time.split(':').map(Number)
    const ampm = h >= 12 ? 'pm' : 'am'
    const hr = h % 12 || 12
    dayLabel += `, ${hr}:${String(m).padStart(2,'0')}${ampm}`
  }
  return dayLabel
}

function AddPartModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    partName: '', partNumber: '', quantity: 1,
    supplier: '', source: 'order',
    expectedDate: '', expectedTime: '', location: '',
    estimatedCost: '', notes: '',
    createPO: false,
  })
  const [errs, setErrs] = useState({})

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); setErrs(p => ({ ...p, [k]: null })) }

  function save() {
    const e = {}
    if (!form.partName.trim()) e.partName = 'Required'
    if (!form.quantity || form.quantity < 1) e.quantity = 'Required'
    setErrs(e)
    if (Object.keys(e).length) return
    onSave({
      id: `pt-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,
      ...form,
      quantity: Number(form.quantity),
      estimatedCost: parseFloat(form.estimatedCost) || 0,
      status: 'needed',
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '20px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Add Required Part</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={LB}>Part Name <span style={{ color: '#dc2626' }}>*</span></label>
            <input value={form.partName} onChange={e => set('partName', e.target.value)} placeholder="e.g. Dual Run Capacitor 45+5 MFD" style={{ ...INP, borderColor: errs.partName ? '#dc2626' : '#e8e9ec' }} />
            {errs.partName && <p style={{ fontSize: 11.5, color: '#dc2626', margin: '3px 0 0' }}>Required</p>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LB}>Part # / SKU</label>
              <input value={form.partNumber} onChange={e => set('partNumber', e.target.value)} placeholder="CAP-45-5-370" style={INP} />
            </div>
            <div>
              <label style={LB}>Quantity <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} style={{ ...INP, borderColor: errs.quantity ? '#dc2626' : '#e8e9ec' }} />
            </div>
            <div>
              <label style={LB}>Supplier</label>
              <input value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="HVAC Supply Co" style={INP} />
            </div>
            <div>
              <label style={LB}>Source</label>
              <select value={form.source} onChange={e => set('source', e.target.value)} style={SEL}>
                <option value="order">Order from supplier</option>
                <option value="pickup">Pick up from store</option>
                <option value="truck">Already on truck</option>
              </select>
            </div>
            <div>
              <label style={LB}>Expected Date</label>
              <input type="date" value={form.expectedDate} onChange={e => set('expectedDate', e.target.value)} style={INP} />
            </div>
            <div>
              <label style={LB}>Expected Time</label>
              <input type="time" value={form.expectedTime} onChange={e => set('expectedTime', e.target.value)} style={INP} />
            </div>
          </div>
          <div>
            <label style={LB}>Delivery / Pickup Location</label>
            <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Delivered to office" style={INP} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LB}>Estimated Cost ($)</label>
              <input type="number" min="0" step="0.01" value={form.estimatedCost} onChange={e => set('estimatedCost', e.target.value)} placeholder="0.00" style={INP} />
            </div>
          </div>
          <div>
            <label style={LB}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} style={{ ...INP, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#374151', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.createPO} onChange={e => set('createPO', e.target.checked)} style={{ width: 16, height: 16 }} />
            Create PO for this part when saved
          </label>
        </div>
        <div style={{ padding: '14px 22px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #f0f1f3' }}>
          <button onClick={onClose} style={{ height: 38, padding: '0 18px', background: '#f3f4f6', border: 'none', borderRadius: 7, fontSize: 13.5, color: '#374151', cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} style={{ height: 38, padding: '0 22px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Add Part</button>
        </div>
      </div>
    </div>
  )
}

export default function PartsRequired({ job, onJobUpdate }) {
  const { user } = useAuth()
  const [showAdd, setShowAdd] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  const parts = job.partsRequired || []

  function flash(msg) { setToastMsg(msg); setTimeout(() => setToastMsg(''), 4000) }

  function updatePartStatus(partId, newStatus) {
    const allJobs = getJobs()
    const updatedParts = parts.map(p => p.id === partId ? { ...p, status: newStatus } : p)
    const allReceived  = updatedParts.every(p => p.status === 'received')

    let newJobStatus = job.status
    if (allReceived) {
      newJobStatus = 'parts_received'
    }

    const statusEntry = allReceived ? {
      status: 'parts_received',
      changedBy: user?.name || 'System',
      changedAt: Date.now(),
      note: 'All parts received — job moved to Parts Received',
    } : null

    const updatedJobs = allJobs.map(j => {
      if (j.id !== job.id) return j
      return {
        ...j,
        partsRequired: updatedParts,
        status: newJobStatus,
        statusHistory: statusEntry
          ? [...(j.statusHistory || []), statusEntry]
          : (j.statusHistory || []),
      }
    })
    saveJobs(updatedJobs)

    if (allReceived) {
      notifyAdmins(
        NOTIF_TYPES.PARTS_RECEIVED,
        `📦 Parts Received — ${job.id} Ready to Schedule`,
        `All parts for ${job.clientName} received by ${user?.name || 'Tech'}. Job is ready to schedule.`,
        'Jobs', job.id
      )
      logActivity(ACTIONS.JOB_STATUS_UPDATED, 'Jobs', job.id, `${job.id} – ${job.clientName}`,
        'All parts received — job moved to Parts Received.')
      flash('All parts received! Job moved to Ready to Schedule.')
    } else {
      flash(`Part marked as ${PART_STATUS_STYLES[newStatus]?.label || newStatus}.`)
    }

    onJobUpdate(updatedJobs.find(j => j.id === job.id))
  }

  function addPart(part) {
    const allJobs = getJobs()
    const updatedJobs = allJobs.map(j => {
      if (j.id !== job.id) return j
      const newParts = [...(j.partsRequired || []), part]
      return {
        ...j,
        partsRequired: newParts,
        status: j.status === 'ready_for_repair' || j.status === 'new' ? 'material_required' : j.status,
      }
    })
    saveJobs(updatedJobs)
    flash(`Part "${part.partName}" added.`)
    setShowAdd(false)
    onJobUpdate(updatedJobs.find(j => j.id === job.id))
  }

  function createPOsForAllParts() {
    const grouped = {}
    parts.filter(p => p.status === 'needed' || p.status === 'ordered').forEach(p => {
      const sup = p.supplier || 'Unknown Supplier'
      if (!grouped[sup]) grouped[sup] = []
      grouped[sup].push(p)
    })
    const poNames = Object.keys(grouped).map((sup, i) => `PO-${new Date().getFullYear()}-${String(i + 10).padStart(3,'0')} (${sup})`)
    flash(`${Object.keys(grouped).length} PO${Object.keys(grouped).length > 1 ? 's' : ''} created — ${poNames.join(', ')}`)
  }

  if (parts.length === 0 && job.status !== 'material_required' && job.status !== 'waiting_on_parts') return null

  return (
    <>
      {toastMsg && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 4000, background: '#1a1d23', color: '#fff', borderRadius: 10, padding: '12px 18px', fontSize: 13.5, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', maxWidth: 360 }}>
          {toastMsg}
        </div>
      )}

      <div style={{ background: '#fff', border: '1.5px solid #fde68a', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🔩</span>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.4px', margin: 0 }}>
              Parts Required ({parts.length})
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {parts.length > 1 && (
              <button onClick={createPOsForAllParts}
                style={{ height: 30, padding: '0 12px', background: '#fff', border: '1px solid #fde68a', color: '#92400e', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Create POs for All
              </button>
            )}
            <button onClick={() => setShowAdd(true)}
              style={{ height: 30, padding: '0 12px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              + Add Part
            </button>
          </div>
        </div>

        {/* Parts list */}
        {parts.length === 0 ? (
          <div style={{ padding: '24px 18px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            No parts added yet. Click "+ Add Part" to list required parts.
          </div>
        ) : (
          parts.map((p, idx) => {
            const exp = formatExpected(p.expectedDate, p.expectedTime)
            return (
              <div key={p.id || idx} style={{
                padding: '14px 18px',
                borderBottom: idx < parts.length - 1 ? '1px solid #f0f1f3' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 16 }}>🔩</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1d23' }}>{p.partName || 'Unnamed Part'}</span>
                    </div>
                    <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: '2px 16px' }}>
                      {p.partNumber && <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>SKU: {p.partNumber}</span>}
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>Qty: {p.quantity}</span>
                      {p.supplier && <span style={{ fontSize: 12, color: '#9ca3af' }}>Supplier: {p.supplier}</span>}
                    </div>
                    {exp && (
                      <p style={{ fontSize: 12.5, color: '#374151', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>📅</span> Expected: <strong>{exp}</strong>
                        {p.location && <span> · {p.location}</span>}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <StatusBadge status={p.status} />
                    {p.status === 'needed' && (
                      <button onClick={() => updatePartStatus(p.id, 'ordered')}
                        style={{ height: 28, padding: '0 12px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Mark Ordered
                      </button>
                    )}
                    {p.status === 'ordered' && (
                      <button onClick={() => updatePartStatus(p.id, 'available')}
                        style={{ height: 28, padding: '0 12px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Mark Available
                      </button>
                    )}
                    {(p.status === 'available') && (
                      <button onClick={() => updatePartStatus(p.id, 'received')}
                        style={{ height: 28, padding: '0 12px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Confirm Received
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}

        {/* Parts-received progress bar */}
        {parts.length > 0 && (
          <div style={{ padding: '10px 18px', borderTop: '1px solid #f0f1f3', background: '#f9fafb' }}>
            {(() => {
              const received = parts.filter(p => p.status === 'received').length
              const pct = Math.round((received / parts.length) * 100)
              return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                    <span>{received} of {parts.length} parts received</span>
                    <span>{pct}%</span>
                  </div>
                  <div style={{ height: 6, background: '#e8e9ec', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#16a34a' : '#d97706', borderRadius: 3, transition: 'width 0.4s' }} />
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {showAdd && <AddPartModal onSave={addPart} onClose={() => setShowAdd(false)} />}
    </>
  )
}
