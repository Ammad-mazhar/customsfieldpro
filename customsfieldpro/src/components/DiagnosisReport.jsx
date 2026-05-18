// CustomsFieldPro — Diagnosis Report Modal
// 4-step wizard: Findings → Recommended Action → Parts (conditional) → Summary & Sign

import { useState, useRef } from 'react'
import { getJobs, saveJobs } from '../data/store'
import { logActivity, ACTIONS } from '../utils/activityLog'
import { notifyAdmins, createNotification, NOTIF_TYPES } from '../utils/notifications'
import { useAuth } from '../auth/AuthContext'
import { getFieldRules } from '../utils/techValidation'

// ── Blocking photo modal (non-dismissable) ────────────────────────────────────
function PhotoRequiredModal({ onTakePhoto, onChooseGallery }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3500, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a1d23', margin: '0 0 10px' }}>PHOTO REQUIRED</h2>
        <p style={{ fontSize: 14, color: '#374151', margin: '0 0 8px', lineHeight: 1.6 }}>
          You must take a photo of the problem before submitting your diagnosis.
        </p>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px', lineHeight: 1.5 }}>
          This is required by company policy to document all service calls.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <button onClick={onTakePhoto}
            style={{ height: 46, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            📷 Take Photo Now
          </button>
          <button onClick={onChooseGallery}
            style={{ height: 46, background: '#f3f4f6', color: '#374151', border: '1px solid #e8e9ec', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            🖼️ Upload from Phone
          </button>
        </div>
        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>You cannot proceed without a photo</p>
      </div>
    </div>
  )
}

const ROOT_CAUSE_OPTIONS = [
  { value: 'worn_parts',          label: 'Worn / Damaged Parts' },
  { value: 'installation_issue',  label: 'Installation Issue' },
  { value: 'user_error',          label: 'User Error' },
  { value: 'age_wear',            label: 'Age / Wear and Tear' },
  { value: 'manufacturing_defect',label: 'Manufacturing Defect' },
  { value: 'external_damage',     label: 'External Damage' },
  { value: 'other',               label: 'Other' },
]

const CONDITION_OPTIONS = [
  { value: 'good',         label: 'Good',     sub: 'Minor fix needed',                color: '#16a34a' },
  { value: 'fair',         label: 'Fair',     sub: 'Repair recommended',              color: '#d97706' },
  { value: 'poor',         label: 'Poor',     sub: 'Major repair needed',             color: '#ea580c' },
  { value: 'critical',     label: 'Critical', sub: 'Immediate action required',       color: '#dc2626' },
  { value: 'unrepairable', label: 'Unrepairable', sub: 'Replacement recommended',     color: '#6b7280' },
]

const REPAIR_TIME_OPTIONS = [
  'Less than 1 hour', '1–2 hours', '2–4 hours', 'Full day', 'Multiple days',
]

const BLANK_PART = () => ({
  id: `pt-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,
  partName: '', partNumber: '', quantity: 1,
  supplier: '', source: 'order',
  expectedDate: '', expectedTime: '', location: '',
  estimatedCost: '', notes: '',
  status: 'needed',
})

// ── Overlay / Modal shell ─────────────────────────────────────────────────────
function Overlay({ children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: 640,
        maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
      }}>
        {children}
      </div>
    </div>
  )
}

function StepHeader({ step, total, title, sub }) {
  return (
    <div style={{ padding: '22px 24px 0' }}>
      {/* progress dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            height: 4, flex: 1, borderRadius: 4,
            background: i < step ? '#2563eb' : i === step ? '#93c5fd' : '#e8e9ec',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>
        Step {step + 1} of {total}
      </p>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a1d23', margin: '0 0 4px' }}>{title}</h2>
      {sub && <p style={{ fontSize: 13.5, color: '#6b7280', margin: 0 }}>{sub}</p>}
    </div>
  )
}

function FieldLabel({ children, required }) {
  return (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
      {children}{required && <span style={{ color: '#dc2626', marginLeft: 3 }}>*</span>}
    </label>
  )
}

const INP = {
  width: '100%', boxSizing: 'border-box', border: '1px solid #e8e9ec', borderRadius: 8,
  padding: '9px 12px', fontSize: 13.5, color: '#374151', outline: 'none',
}

const SEL = {
  ...INP, appearance: 'none', background: '#fff',
  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'%3E%3Cpath d=\'M1 1l5 5 5-5\' stroke=\'%236b7280\' stroke-width=\'1.5\' fill=\'none\'/%3E%3C/svg%3E")',
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 32,
}

// ── Signature canvas ──────────────────────────────────────────────────────────
function SignatureCanvas({ onSign }) {
  const canvasRef = useRef(null)
  const drawing   = useRef(false)
  const [signed, setSigned] = useState(false)

  function getPos(e, canvas) {
    const r = canvas.getBoundingClientRect()
    const src = e.touches ? e.touches[0] : e
    return { x: src.clientX - r.left, y: src.clientY - r.top }
  }

  function start(e) {
    e.preventDefault()
    drawing.current = true
    const { x, y } = getPos(e, canvasRef.current)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath(); ctx.moveTo(x, y)
  }

  function move(e) {
    e.preventDefault()
    if (!drawing.current) return
    const { x, y } = getPos(e, canvasRef.current)
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#1a1d23'; ctx.lineCap = 'round'
    ctx.lineTo(x, y); ctx.stroke()
    setSigned(true)
  }

  function stop() {
    drawing.current = false
    if (signed && canvasRef.current) onSign(canvasRef.current.toDataURL())
  }

  function clear() {
    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    setSigned(false); onSign(null)
  }

  return (
    <div>
      <div style={{ border: '1.5px solid #e8e9ec', borderRadius: 8, overflow: 'hidden', background: '#f9fafb', position: 'relative' }}>
        <canvas
          ref={canvasRef} width={560} height={120}
          style={{ display: 'block', width: '100%', height: 120, cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={start} onTouchMove={move} onTouchEnd={stop}
        />
        {!signed && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <span style={{ fontSize: 13, color: '#c4c9d4' }}>Sign here</span>
          </div>
        )}
      </div>
      <button onClick={clear} style={{ marginTop: 6, fontSize: 12.5, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Clear signature</button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DiagnosisReport({ job, onClose, onComplete }) {
  const { user } = useAuth()
  const totalSteps = 4
  const [step, setStep]   = useState(0)
  const [errs, setErrs]   = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const cameraInputRef  = useRef(null)
  const galleryInputRef = useRef(null)

  // Step 1 — Findings
  const [problemFound,  setProblemFound]  = useState('')
  const [rootCause,     setRootCause]     = useState('')
  const [rootCauseText, setRootCauseText] = useState('')
  const [condition,     setCondition]     = useState('')
  const [repairTime,    setRepairTime]    = useState('')
  const [photos,        setPhotos]        = useState([])   // array of base64 strings

  // Step 2 — Recommended action
  const [action, setAction] = useState('') // 'ready_for_repair' | 'material_required' | 'further_diagnosis'

  // Step 3 — Parts
  const [parts, setParts] = useState([BLANK_PART()])

  // Step 4 — Signature
  const [signature, setSignature] = useState(null)

  // ── Photo upload ──────────────────────────────────────────────────────────
  function handlePhotos(files) {
    Array.from(files).forEach(f => {
      const r = new FileReader()
      r.onload = e => setPhotos(p => [...p, e.target.result])
      r.readAsDataURL(f)
    })
  }

  // ── Validation ────────────────────────────────────────────────────────────
  function validateStep() {
    const e = {}
    if (step === 0) {
      if (problemFound.trim().length < 20) e.problemFound = 'Describe the problem in at least 20 characters'
      if (!rootCause) e.rootCause = 'Select a root cause'
      if (!condition) e.condition = 'Select equipment condition'
      if (!repairTime) e.repairTime = 'Select estimated repair time'
      if (photos.length === 0) e.photos = 'At least one photo is required'
    }
    if (step === 1) {
      if (!action) e.action = 'Select a recommended action'
    }
    if (step === 2 && action === 'material_required') {
      parts.forEach((p, i) => {
        if (!p.partName.trim()) e[`part_${i}_name`] = 'Part name required'
        if (!p.quantity || p.quantity < 1) e[`part_${i}_qty`] = 'Quantity required'
      })
    }
    if (step === 3) {
      if (!signature) e.signature = 'Technician signature required'
    }
    setErrs(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (!validateStep()) {
      // Show blocking modal when photo is the only missing item on step 0
      if (step === 0) {
        const rules = getFieldRules()
        const e = {}
        if (problemFound.trim().length < 20) e.problemFound = true
        if (!rootCause) e.rootCause = true
        if (!condition) e.condition = true
        if (!repairTime) e.repairTime = true
        const onlyMissingPhoto = Object.keys(e).length === 0 && photos.length === 0 && rules.requirePhotosForDiagnosis
        if (onlyMissingPhoto) { setShowPhotoModal(true); return }
      }
      return
    }
    // Skip step 2 (parts) if action is not material_required
    if (step === 1 && action !== 'material_required') {
      setStep(3)
    } else {
      setStep(s => s + 1)
    }
  }

  function back() {
    if (step === 3 && action !== 'material_required') {
      setStep(1)
    } else {
      setStep(s => s - 1)
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  function submit() {
    if (!validateStep()) return
    setSubmitting(true)

    const newStatus =
      action === 'ready_for_repair'   ? 'ready_for_repair' :
      action === 'material_required'  ? 'material_required' :
      'diagnosis_required'

    const report = {
      id:               `diag-${Date.now()}`,
      submittedBy:      user?.id || 'unknown',
      submittedByName:  user?.name || 'Technician',
      submittedAt:      Date.now(),
      problemFound,
      rootCause:        rootCause === 'other' ? rootCauseText : rootCause,
      equipmentCondition: condition,
      estimatedRepairTime: repairTime,
      recommendedAction: action,
      photos,
      partsRequired: action === 'material_required' ? parts : [],
      technicianSignature: signature,
      notes: '',
    }

    const statusEntry = {
      status: newStatus,
      changedBy: user?.name || 'Technician',
      changedAt: Date.now(),
      note: `Diagnosis submitted — ${problemFound.slice(0, 60)}${problemFound.length > 60 ? '…' : ''}`,
    }

    // Persist to job record
    const allJobs = getJobs()
    const updated = allJobs.map(j => {
      if (j.id !== job.id) return j
      return {
        ...j,
        status: newStatus,
        diagnosisReports: [...(j.diagnosisReports || []), report],
        statusHistory: [...(j.statusHistory || []), statusEntry],
        partsRequired: action === 'material_required' ? parts : (j.partsRequired || []),
      }
    })
    saveJobs(updated)

    // Notifications
    const labels = { ready_for_repair: 'Ready for Repair', material_required: 'Material Required', diagnosis_required: 'Diagnosis Required' }
    logActivity(
      ACTIONS.JOB_STATUS_UPDATED, 'Jobs', job.id,
      `${job.id} – ${job.clientName}`,
      `Diagnosis submitted by ${user?.name || 'Tech'}. Job moved to "${labels[newStatus]}".`
    )
    notifyAdmins(
      NOTIF_TYPES.JOB_DIAGNOSIS_SUBMITTED,
      `Diagnosis: ${job.clientName}`,
      `${user?.name || 'Tech'} submitted diagnosis for ${job.id} — "${problemFound.slice(0, 60)}". Job → ${labels[newStatus]}.`,
      'Jobs', job.id
    )

    setSubmitting(false)
    onComplete({ newStatus, report, updatedJob: updated.find(j => j.id === job.id) })
  }

  // ── Parts helpers ─────────────────────────────────────────────────────────
  function updatePart(idx, field, value) {
    setParts(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }

  function addPart() { setParts(p => [...p, BLANK_PART()]) }
  function removePart(idx) { setParts(p => p.filter((_, i) => i !== idx)) }

  // ── Render steps ──────────────────────────────────────────────────────────
  const headerMap = [
    { title: 'Diagnosis Findings', sub: `${job.id} — ${job.clientName}` },
    { title: 'Recommended Action', sub: 'What does this job need next?' },
    { title: 'Parts Required',     sub: 'List all parts needed before repair' },
    { title: 'Summary & Sign',     sub: 'Review and submit your diagnosis' },
  ]
  // Visible step index (0,1,2,3 but step 2 may be skipped)
  const displayStep = step === 3 && action !== 'material_required' ? 2 : step

  return (
    <>
    {/* Blocking photo modal */}
    {showPhotoModal && (
      <PhotoRequiredModal
        onTakePhoto={() => {
          setShowPhotoModal(false)
          cameraInputRef.current?.click()
        }}
        onChooseGallery={() => {
          setShowPhotoModal(false)
          galleryInputRef.current?.click()
        }}
      />
    )}
    {/* Hidden file inputs for modal buttons */}
    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple style={{ display: 'none' }} onChange={e => handlePhotos(e.target.files)} />
    <input ref={galleryInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handlePhotos(e.target.files)} />

    <Overlay>
      {/* Header */}
      <StepHeader step={displayStep} total={action !== 'material_required' ? 3 : 4} title={headerMap[step].title} sub={headerMap[step].sub} />

      {/* Body */}
      <div style={{ padding: '20px 24px' }}>

        {/* ── STEP 0: Findings ─────────────────────────────────────────── */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Problem found */}
            <div>
              <FieldLabel required>Problem Found</FieldLabel>
              <textarea
                value={problemFound}
                onChange={e => { setProblemFound(e.target.value); setErrs(v => ({...v, problemFound: null})) }}
                rows={4} placeholder="Describe exactly what you found…"
                style={{ ...INP, resize: 'vertical', fontFamily: 'inherit',
                  borderColor: errs.problemFound ? '#dc2626' : '#e8e9ec' }}
              />
              {errs.problemFound && <p style={{ fontSize: 11.5, color: '#dc2626', margin: '4px 0 0' }}>{errs.problemFound}</p>}
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>{problemFound.length} chars {problemFound.length < 20 ? `(${20 - problemFound.length} more needed)` : '✓'}</p>
            </div>

            {/* Root cause */}
            <div>
              <FieldLabel required>Root Cause</FieldLabel>
              <select value={rootCause} onChange={e => { setRootCause(e.target.value); setErrs(v => ({...v, rootCause: null})) }} style={{ ...SEL, borderColor: errs.rootCause ? '#dc2626' : '#e8e9ec' }}>
                <option value="">— Select root cause —</option>
                {ROOT_CAUSE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {errs.rootCause && <p style={{ fontSize: 11.5, color: '#dc2626', margin: '4px 0 0' }}>{errs.rootCause}</p>}
              {rootCause === 'other' && (
                <input value={rootCauseText} onChange={e => setRootCauseText(e.target.value)}
                  placeholder="Describe the root cause…" style={{ ...INP, marginTop: 8 }} />
              )}
            </div>

            {/* Equipment condition */}
            <div>
              <FieldLabel required>Equipment Condition</FieldLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {CONDITION_OPTIONS.map(o => (
                  <label key={o.value} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    border: `1.5px solid ${condition === o.value ? o.color : '#e8e9ec'}`,
                    borderRadius: 8, cursor: 'pointer',
                    background: condition === o.value ? o.color + '12' : '#fff',
                  }}>
                    <input type="radio" name="condition" value={o.value}
                      checked={condition === o.value}
                      onChange={() => { setCondition(o.value); setErrs(v => ({...v, condition: null})) }}
                      style={{ accentColor: o.color }} />
                    <div>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: o.color }}>{o.label}</span>
                      <span style={{ fontSize: 12.5, color: '#6b7280', marginLeft: 8 }}>{o.sub}</span>
                    </div>
                  </label>
                ))}
              </div>
              {errs.condition && <p style={{ fontSize: 11.5, color: '#dc2626', margin: '4px 0 0' }}>{errs.condition}</p>}
            </div>

            {/* Estimated repair time */}
            <div>
              <FieldLabel required>Estimated Repair Time</FieldLabel>
              <select value={repairTime} onChange={e => { setRepairTime(e.target.value); setErrs(v => ({...v, repairTime: null})) }} style={{ ...SEL, borderColor: errs.repairTime ? '#dc2626' : '#e8e9ec' }}>
                <option value="">— Select time —</option>
                {REPAIR_TIME_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
              {errs.repairTime && <p style={{ fontSize: 11.5, color: '#dc2626', margin: '4px 0 0' }}>{errs.repairTime}</p>}
            </div>

            {/* Photos — required */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                  Photos <span style={{ color: '#dc2626' }}>*</span>
                  {photos.length > 0 && <span style={{ color: '#16a34a', marginLeft: 6 }}>✅</span>}
                </span>
                <span style={{ fontSize: 11, color: '#6b7280' }}>Required — minimum 1 photo</span>
              </div>
              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '20px 16px',
                border: `2px dashed ${errs.photos ? '#dc2626' : photos.length > 0 ? '#16a34a' : '#e8e9ec'}`,
                borderRadius: 10, cursor: 'pointer',
                background: errs.photos ? '#fef2f2' : photos.length > 0 ? '#f0fdf4' : '#f9fafb',
                transition: 'all 0.15s',
              }}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke={errs.photos ? '#dc2626' : photos.length > 0 ? '#16a34a' : '#9ca3af'} strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <span style={{ fontSize: 13, color: errs.photos ? '#dc2626' : photos.length > 0 ? '#16a34a' : '#6b7280', fontWeight: 500 }}>
                  {photos.length > 0 ? `${photos.length} photo${photos.length !== 1 ? 's' : ''} added ✓` : 'Tap to take photo or upload'}
                </span>
                <input type="file" accept="image/*" multiple capture="environment"
                  style={{ display: 'none' }}
                  onChange={e => handlePhotos(e.target.files)} />
              </label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}>
                <p style={{ fontSize: 11.5, margin: 0, color: photos.length >= 1 ? '#16a34a' : errs.photos ? '#dc2626' : '#9ca3af', fontWeight: photos.length >= 1 ? 600 : 400 }}>
                  {photos.length >= 1 ? '1/1 ✓' : `0/1 required`}
                </p>
              </div>
              {errs.photos && <p style={{ fontSize: 11.5, color: '#dc2626', margin: '4px 0 0' }}>{errs.photos}</p>}
              {photos.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  {photos.map((src, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={src} alt={`Photo ${i+1}`} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1.5px solid #bbf7d0' }} />
                      <button onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                        style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 1: Recommended action ───────────────────────────────── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              {
                value: 'ready_for_repair',
                icon: '🔧',
                title: 'Ready for Repair',
                desc: 'All parts available on truck — can repair now or schedule',
                borderColor: '#059669', bgColor: '#ecfdf5',
              },
              {
                value: 'material_required',
                icon: '🔩',
                title: 'Material Required',
                desc: 'Need to order parts before repair can happen',
                borderColor: '#d97706', bgColor: '#fffbeb',
              },
              {
                value: 'further_diagnosis',
                icon: '🔍',
                title: 'Further Diagnosis Needed',
                desc: 'Need more time or a specialist to diagnose',
                borderColor: '#7c3aed', bgColor: '#f5f3ff',
              },
            ].map(opt => (
              <label key={opt.value} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 18px',
                border: `2px solid ${action === opt.value ? opt.borderColor : '#e8e9ec'}`,
                borderRadius: 12, cursor: 'pointer',
                background: action === opt.value ? opt.bgColor : '#fff',
                transition: 'all 0.15s',
              }}>
                <input type="radio" name="action" value={opt.value} checked={action === opt.value}
                  onChange={() => { setAction(opt.value); setErrs(v => ({...v, action: null})) }}
                  style={{ marginTop: 3, accentColor: opt.borderColor }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{opt.icon}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23' }}>{opt.title}</span>
                  </div>
                  <p style={{ fontSize: 13.5, color: '#6b7280', margin: '4px 0 0' }}>{opt.desc}</p>
                </div>
              </label>
            ))}
            {errs.action && <p style={{ fontSize: 11.5, color: '#dc2626', margin: 0 }}>{errs.action}</p>}
          </div>
        )}

        {/* ── STEP 2: Parts ────────────────────────────────────────────── */}
        {step === 2 && action === 'material_required' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {parts.map((p, idx) => (
              <div key={p.id} style={{ border: '1.5px solid #e8e9ec', borderRadius: 10, padding: 16, position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', margin: 0 }}>Part {idx + 1}</p>
                  {parts.length > 1 && (
                    <button onClick={() => removePart(idx)} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12.5, cursor: 'pointer', padding: 0 }}>Remove</button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <FieldLabel required>Part Name</FieldLabel>
                    <input value={p.partName} onChange={e => updatePart(idx, 'partName', e.target.value)}
                      placeholder="e.g. Dual Run Capacitor 45+5 MFD"
                      style={{ ...INP, borderColor: errs[`part_${idx}_name`] ? '#dc2626' : '#e8e9ec' }} />
                    {errs[`part_${idx}_name`] && <p style={{ fontSize: 11.5, color: '#dc2626', margin: '4px 0 0' }}>{errs[`part_${idx}_name`]}</p>}
                  </div>
                  <div>
                    <FieldLabel>Part # / SKU</FieldLabel>
                    <input value={p.partNumber} onChange={e => updatePart(idx, 'partNumber', e.target.value)} placeholder="e.g. CAP-45-5-370" style={INP} />
                  </div>
                  <div>
                    <FieldLabel required>Quantity</FieldLabel>
                    <input type="number" min="1" value={p.quantity} onChange={e => updatePart(idx, 'quantity', e.target.value)}
                      style={{ ...INP, borderColor: errs[`part_${idx}_qty`] ? '#dc2626' : '#e8e9ec' }} />
                  </div>
                  <div>
                    <FieldLabel>Supplier</FieldLabel>
                    <input value={p.supplier} onChange={e => updatePart(idx, 'supplier', e.target.value)} placeholder="e.g. HVAC Supply Co" style={INP} />
                  </div>
                  <div>
                    <FieldLabel>Source</FieldLabel>
                    <select value={p.source} onChange={e => updatePart(idx, 'source', e.target.value)} style={SEL}>
                      <option value="order">Order from supplier</option>
                      <option value="pickup">Pick up from store</option>
                      <option value="truck">Tech has it on truck</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Expected Date</FieldLabel>
                    <input type="date" value={p.expectedDate} onChange={e => updatePart(idx, 'expectedDate', e.target.value)} style={INP} />
                  </div>
                  <div>
                    <FieldLabel>Expected Time</FieldLabel>
                    <input type="time" value={p.expectedTime} onChange={e => updatePart(idx, 'expectedTime', e.target.value)} style={INP} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <FieldLabel>Delivery / Pickup Location</FieldLabel>
                    <input value={p.location} onChange={e => updatePart(idx, 'location', e.target.value)} placeholder="e.g. Delivered to office" style={INP} />
                  </div>
                  <div>
                    <FieldLabel>Estimated Cost ($)</FieldLabel>
                    <input type="number" min="0" step="0.01" value={p.estimatedCost} onChange={e => updatePart(idx, 'estimatedCost', e.target.value)} placeholder="0.00" style={INP} />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addPart} style={{ height: 40, background: '#f3f4f6', border: '1.5px dashed #d1d5db', borderRadius: 8, fontSize: 13.5, color: '#6b7280', cursor: 'pointer', fontWeight: 600 }}>
              + Add Another Part
            </button>
          </div>
        )}

        {/* ── STEP 3: Summary & Sign ───────────────────────────────────── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Summary card */}
            <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Problem Found', problemFound],
                ['Root Cause', ROOT_CAUSE_OPTIONS.find(o => o.value === rootCause)?.label || rootCauseText],
                ['Equipment Condition', CONDITION_OPTIONS.find(o => o.value === condition)?.label],
                ['Estimated Repair Time', repairTime],
                ['Recommended Action', action === 'ready_for_repair' ? '🔧 Ready for Repair' : action === 'material_required' ? '🔩 Material Required' : '🔍 Further Diagnosis'],
                ['Photos Uploaded', `${photos.length} photo${photos.length !== 1 ? 's' : ''}`],
                action === 'material_required' && ['Parts Required', `${parts.length} part${parts.length !== 1 ? 's' : ''}: ${parts.map(p => p.partName || 'Unnamed').join(', ')}`],
              ].filter(Boolean).map(([label, value]) => (
                <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', width: 160, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.3px', marginTop: 2 }}>{label}</span>
                  <span style={{ fontSize: 13.5, color: '#374151' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Signature */}
            <div>
              <FieldLabel required>Technician Signature</FieldLabel>
              <SignatureCanvas onSign={setSignature} />
              {errs.signature && <p style={{ fontSize: 11.5, color: '#dc2626', margin: '4px 0 0' }}>{errs.signature}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f1f3', display: 'flex', gap: 10, justifyContent: 'space-between', background: '#fafbfc', borderRadius: '0 0 14px 14px' }}>
        <button onClick={step === 0 ? onClose : back}
          style={{ height: 40, padding: '0 20px', background: '#f3f4f6', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
          {step === 0 ? 'Cancel' : '← Back'}
        </button>

        {step < 3 ? (
          <button onClick={next}
            style={{ height: 40, padding: '0 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
            Continue →
          </button>
        ) : (
          <button onClick={submit} disabled={submitting}
            style={{ height: 40, padding: '0 24px', background: submitting ? '#93c5fd' : '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? 'Submitting…' : '✓ Submit Diagnosis Report'}
          </button>
        )}
      </div>
    </Overlay>
    </>
  )
}
