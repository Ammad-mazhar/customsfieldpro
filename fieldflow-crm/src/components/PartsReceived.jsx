// FieldFlow CRM — Parts Receipt Confirmation Modal
// Triggered when tech clicks "Confirm Parts Received" on a part or all parts.

import { useState } from 'react'
import { getJobs, saveJobs } from '../data/store'
import { logActivity, ACTIONS } from '../utils/activityLog'
import { notifyAdmins, createNotification, NOTIF_TYPES } from '../utils/notifications'
import { useAuth } from '../auth/AuthContext'

const CONDITION_OPTS = [
  { value: 'good',       label: 'Good',         color: '#16a34a' },
  { value: 'damaged',    label: 'Damaged',      color: '#dc2626' },
  { value: 'wrong_item', label: 'Wrong Item',   color: '#ea580c' },
]

const INP = {
  width: '100%', boxSizing: 'border-box', border: '1px solid #e8e9ec', borderRadius: 7,
  padding: '8px 11px', fontSize: 13.5, color: '#374151', outline: 'none',
}

/**
 * PartReceiptForm — handles a single part's receipt confirmation.
 */
function PartReceiptForm({ part, onConfirm }) {
  const [photo,            setPhoto]          = useState(null)
  const [partNumEntered,   setPartNumEntered]  = useState('')
  const [partNumWarning,   setPartNumWarning]  = useState(false)
  const [qtyReceived,      setQtyReceived]     = useState(part.quantity || 1)
  const [condition,        setCondition]       = useState('good')
  const [issueDesc,        setIssueDesc]       = useState('')
  const [createReturn,     setCreateReturn]    = useState(false)
  const [notes,            setNotes]           = useState('')
  const [errs,             setErrs]            = useState({})

  function handlePhoto(files) {
    const f = files[0]
    if (!f) return
    const r = new FileReader()
    r.onload = e => setPhoto(e.target.result)
    r.readAsDataURL(f)
  }

  function checkPartNum(val) {
    setPartNumEntered(val)
    if (part.partNumber && val && val.trim() !== part.partNumber.trim()) {
      setPartNumWarning(true)
    } else {
      setPartNumWarning(false)
    }
  }

  function confirm() {
    const e = {}
    if (!photo) e.photo = 'At least one photo is required'
    if (!condition) e.condition = 'Select condition'
    setErrs(e)
    if (Object.keys(e).length) return

    onConfirm({
      partId: part.id,
      photo,
      partNumberEntered: partNumEntered,
      qtyReceived: Number(qtyReceived),
      condition,
      issueDesc: condition !== 'good' ? issueDesc : '',
      createReturn: condition !== 'good' ? createReturn : false,
      notes,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Part name */}
      <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '12px 16px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '0 0 4px' }}>Confirming Receipt</p>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1d23', margin: '0 0 4px' }}>{part.partName}</p>
        {part.partNumber && <p style={{ fontSize: 12.5, color: '#9ca3af', fontFamily: 'monospace', margin: 0 }}>Expected SKU: {part.partNumber}</p>}
        <p style={{ fontSize: 12.5, color: '#6b7280', margin: '4px 0 0' }}>Ordered qty: {part.quantity} · {part.supplier || 'No supplier'}</p>
      </div>

      {/* Photo upload */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
          Photo of Received Part <span style={{ color: '#dc2626' }}>*</span>
        </label>
        {photo ? (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={photo} alt="Part photo" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, border: '1.5px solid #e8e9ec' }} />
            <button onClick={() => setPhoto(null)}
              style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>×</button>
          </div>
        ) : (
          <label style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            padding: '18px 12px', border: `2px dashed ${errs.photo ? '#dc2626' : '#e8e9ec'}`,
            borderRadius: 10, cursor: 'pointer', background: '#f9fafb',
          }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <span style={{ fontSize: 13, color: '#6b7280' }}>Take photo or upload</span>
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handlePhoto(e.target.files)} />
          </label>
        )}
        {errs.photo && <p style={{ fontSize: 11.5, color: '#dc2626', margin: '4px 0 0' }}>{errs.photo}</p>}
      </div>

      {/* Part number verification */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Enter Part Number from Package</label>
        <input value={partNumEntered} onChange={e => checkPartNum(e.target.value)} placeholder={part.partNumber || 'Enter part number from label'} style={{ ...INP, borderColor: partNumWarning ? '#f59e0b' : '#e8e9ec' }} />
        {partNumWarning && (
          <div style={{ marginTop: 6, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6 }}>
            <p style={{ fontSize: 12.5, color: '#d97706', margin: 0 }}>⚠️ Part number doesn't match — are you sure this is the correct part?</p>
          </div>
        )}
      </div>

      {/* Quantity received */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Quantity Received</label>
        <input type="number" min="0" value={qtyReceived} onChange={e => setQtyReceived(e.target.value)} style={INP} />
      </div>

      {/* Condition */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
          Condition <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {CONDITION_OPTS.map(o => (
            <button key={o.value} onClick={() => { setCondition(o.value); setErrs(p => ({...p, condition: null})) }}
              style={{
                flex: 1, height: 38, border: `1.5px solid ${condition === o.value ? o.color : '#e8e9ec'}`,
                borderRadius: 8, fontSize: 13, fontWeight: condition === o.value ? 700 : 500,
                color: condition === o.value ? o.color : '#6b7280',
                background: condition === o.value ? o.color + '14' : '#fff',
                cursor: 'pointer',
              }}>
              {o.label}
            </button>
          ))}
        </div>
        {errs.condition && <p style={{ fontSize: 11.5, color: '#dc2626', margin: '4px 0 0' }}>{errs.condition}</p>}
      </div>

      {/* Issue fields (if damaged/wrong) */}
      {condition !== 'good' && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>Describe the Issue</label>
            <textarea value={issueDesc} onChange={e => setIssueDesc(e.target.value)} rows={2} placeholder="What's wrong with this part?" style={{ ...INP, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: '#dc2626', cursor: 'pointer' }}>
            <input type="checkbox" checked={createReturn} onChange={e => setCreateReturn(e.target.checked)} style={{ width: 16, height: 16 }} />
            Create return for this part
          </label>
        </div>
      )}

      {/* Notes */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Notes (optional)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...INP, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Any additional notes…" />
      </div>

      {/* Confirm button */}
      <button onClick={confirm}
        style={{ height: 44, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
        ✓ Confirm Part Received
      </button>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function PartsReceived({ job, onClose, onComplete }) {
  const { user } = useAuth()
  // Parts that still need confirmation (not yet received)
  const pendingParts = (job.partsRequired || []).filter(p => p.status !== 'received')
  const [currentIdx,  setCurrentIdx]  = useState(0)
  const [confirmed,   setConfirmed]   = useState([])

  const currentPart = pendingParts[currentIdx]

  function handleConfirm(receipt) {
    const newConfirmed = [...confirmed, receipt]
    setConfirmed(newConfirmed)

    // If more parts to confirm, advance
    if (currentIdx < pendingParts.length - 1) {
      setCurrentIdx(i => i + 1)
      return
    }

    // All done — persist
    const allJobs   = getJobs()
    const allParts  = job.partsRequired || []
    const confirmedIds = new Set(newConfirmed.map(r => r.partId))

    const updatedParts = allParts.map(p =>
      confirmedIds.has(p.id) ? { ...p, status: 'received', receipt: newConfirmed.find(r => r.partId === p.id) } : p
    )
    const allReceived = updatedParts.every(p => p.status === 'received')
    const newStatus   = allReceived ? 'parts_received' : job.status

    const statusEntry = allReceived ? {
      status: 'parts_received',
      changedBy: user?.name || 'System',
      changedAt: Date.now(),
      note: `All ${updatedParts.length} part(s) received`,
    } : null

    const updatedJobs = allJobs.map(j => {
      if (j.id !== job.id) return j
      return {
        ...j,
        partsRequired: updatedParts,
        status: newStatus,
        statusHistory: statusEntry
          ? [...(j.statusHistory || []), statusEntry]
          : (j.statusHistory || []),
      }
    })
    saveJobs(updatedJobs)

    logActivity(ACTIONS.PARTS_RECEIVED, 'Jobs', job.id, `${job.id} – ${job.clientName}`,
      `${newConfirmed.length} part(s) confirmed received by ${user?.name || 'Tech'}.`)

    if (allReceived) {
      notifyAdmins(
        NOTIF_TYPES.PARTS_RECEIVED,
        `📦 Parts Received — ${job.id} Ready to Schedule`,
        `All parts for ${job.clientName} received. Job ready to schedule.`,
        'Jobs', job.id
      )
    } else {
      const remaining = updatedParts.filter(p => p.status !== 'received').length
      notifyAdmins(
        NOTIF_TYPES.PARTS_RECEIVED,
        `Partial Receipt — ${job.id}`,
        `${newConfirmed.length} of ${allParts.length} parts received. ${remaining} still pending.`,
        'Jobs', job.id
      )
    }

    onComplete(updatedJobs.find(j => j.id === job.id))
  }

  if (!currentPart) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 32, textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#16a34a', margin: '0 0 8px' }}>All Parts Confirmed!</h2>
          <p style={{ fontSize: 13.5, color: '#6b7280', margin: '0 0 20px' }}>All required parts have been received. The job is ready to schedule.</p>
          <button onClick={onClose} style={{ height: 40, padding: '0 24px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Done</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div style={{ padding: '20px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '0 0 4px' }}>
              Part {currentIdx + 1} of {pendingParts.length}
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a1d23', margin: 0 }}>Confirm Parts Received</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, color: '#9ca3af', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 4, padding: '14px 22px 0' }}>
          {pendingParts.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i < currentIdx ? '#16a34a' : i === currentIdx ? '#93c5fd' : '#e8e9ec' }} />
          ))}
        </div>

        <div style={{ padding: '18px 22px 22px' }}>
          <PartReceiptForm part={currentPart} onConfirm={handleConfirm} />
        </div>
      </div>
    </div>
  )
}
