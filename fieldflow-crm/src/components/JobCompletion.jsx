import { useState, useRef, useEffect, useCallback } from 'react'
import { generateCompletionReport } from '../utils/generateCompletionReport'
import SatisfactionRating from './SatisfactionRating'
import { getFieldRules } from '../utils/techValidation'
import SignatureCapture from './SignatureCapture'

// ── Checklists by service type ────────────────────────────────────────────────
const CHECKLISTS = {
  HVAC: [
    'Check refrigerant levels',
    'Test heating / cooling operation',
    'Replace filter',
    'Clean coils',
    'Test thermostat',
    'Check ductwork for leaks or damage',
  ],
  Plumbing: [
    'Test all connections under pressure',
    'Check for leaks at every joint',
    'Run full water flow test',
    'Check water pressure (PSI within range)',
    'Test all shutoff valves',
  ],
  Electrical: [
    'Test all circuits with multimeter',
    'Inspect breaker panel — no tripped breakers',
    'Test all GFCI outlets',
    'Verify proper grounding throughout',
    'Safety inspection complete — panel labelled',
  ],
  'Appliance Repair': [
    'Test appliance full operation cycle',
    'Verify all functions and settings',
    'Clean work area around appliance',
    'Test all safety features / interlocks',
  ],
  Furnace: [
    'Check heat exchanger for cracks',
    'Test ignition and flame sensor',
    'Replace filter',
    'Test blower motor and belt',
    'Verify flue pipe connections',
    'Test thermostat and cycling',
  ],
  Drain: [
    'Clear blockage completely',
    'Run water flow test for 5+ minutes',
    'Check for slow drainage downstream',
    'Inspect visible pipe sections',
    'Clean work area',
  ],
  Generator: [
    'Test automatic transfer switch',
    'Check fuel level and connections',
    'Run generator under load',
    'Test battery and charging system',
    'Log maintenance in service record',
  ],
}

function getChecklist(jobType = '') {
  const exact = CHECKLISTS[jobType]
  if (exact) return exact
  const key = Object.keys(CHECKLISTS).find(k => jobType.toLowerCase().includes(k.toLowerCase()))
  if (key) return CHECKLISTS[key]
  return [
    'Inspect all work completed',
    'Clean work area',
    'Remove all tools and materials',
    'Verify client requirements were met',
    'Document any follow-up items',
  ]
}

// ── Step indicator ────────────────────────────────────────────────────────────
const STEP_LABELS = ['Checklist', 'Photos', 'Client Sig', 'Tech Sig', 'Summary']

function StepIndicator({ step, total }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
      {Array.from({ length: total }, (_, i) => {
        const n      = i + 1
        const done   = n < step
        const active = n === step
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', flex: n < total ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#16a34a' : active ? '#2563eb' : '#f3f4f6',
                color: done || active ? '#fff' : '#9ca3af',
                fontSize: done ? 14 : 13, fontWeight: 700,
                border: active ? '2px solid #bfdbfe' : 'none',
                transition: 'all 0.2s',
              }}>
                {done ? '✓' : n}
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, color: active ? '#2563eb' : done ? '#16a34a' : '#9ca3af', whiteSpace: 'nowrap' }}>
                {STEP_LABELS[i]}
              </span>
            </div>
            {n < total && (
              <div style={{ flex: 1, height: 2, background: done ? '#86efac' : '#e8e9ec', marginBottom: 18, transition: 'background 0.3s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Photo drop zone ───────────────────────────────────────────────────────────
function PhotoZone({ label, photos, onAdd, onRemove }) {
  const inputRef  = useRef(null)
  const [drag, setDrag] = useState(false)

  function readFiles(files) {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = e => onAdd(e.target.result)
      reader.readAsDataURL(file)
    })
  }

  function onDrop(e) {
    e.preventDefault()
    setDrag(false)
    readFiles(e.dataTransfer.files)
  }

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{label}</span>
        <span style={{
          fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
          background: photos.length > 0 ? '#f0fdf4' : '#f3f4f6',
          color: photos.length > 0 ? '#16a34a' : '#9ca3af',
        }}>{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${drag ? '#2563eb' : '#d1d5db'}`,
          borderRadius: 10, padding: '18px 12px', textAlign: 'center',
          background: drag ? '#eff6ff' : '#fafafa', cursor: 'pointer',
          transition: 'all 0.15s', marginBottom: 10,
        }}
      >
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke={drag ? '#2563eb' : '#9ca3af'} strokeWidth="1.5" style={{ marginBottom: 6 }}>
          <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21,15 16,10 5,21"/>
        </svg>
        <p style={{ fontSize: 12.5, color: drag ? '#2563eb' : '#9ca3af', margin: 0, fontWeight: drag ? 600 : 400 }}>
          {drag ? 'Drop to upload' : 'Click or drag & drop photos'}
        </p>
        <input ref={inputRef} type="file" accept="image/*" multiple onChange={e => readFiles(e.target.files)} style={{ display: 'none' }} />
      </div>

      {/* Upload button */}
      <button
        onClick={() => inputRef.current?.click()}
        style={{ width: '100%', padding: '8px 0', border: '1px solid #e8e9ec', borderRadius: 7, background: '#fff', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer', marginBottom: photos.length > 0 ? 10 : 0 }}
      >
        + Add Photos
      </button>

      {/* Thumbnails */}
      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {photos.map((src, i) => (
            <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 7, overflow: 'hidden', border: '1px solid #e8e9ec' }}>
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                onClick={() => onRemove(i)}
                style={{
                  position: 'absolute', top: 3, right: 3, width: 20, height: 20,
                  background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%',
                  color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, lineHeight: 1,
                }}
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Step 1: Completion Checklist ──────────────────────────────────────────────
function Step1({ job, data, onChange, onNext, onCancel, attempted }) {
  const checklist  = getChecklist(job.type)
  const allChecked = data.checked.length === checklist.length
  const notesOk    = (data.notes || '').trim().length >= 20
  const allPartsOk = (job.lineItems || []).filter(li => li.description?.trim()).every(li => data.partsConfirmed[li.id])
  const canProceed = allChecked && notesOk && allPartsOk

  function toggleCheck(item) {
    const next = data.checked.includes(item)
      ? data.checked.filter(x => x !== item)
      : [...data.checked, item]
    onChange({ ...data, checked: next })
  }

  function togglePart(id) {
    onChange({ ...data, partsConfirmed: { ...data.partsConfirmed, [id]: !data.partsConfirmed[id] } })
  }

  const parts = (job.lineItems || []).filter(li => li.description?.trim())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Checklist */}
      <div style={{ background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 10, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1d23', margin: 0 }}>
            Job Completion Checklist
            <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', marginLeft: 8 }}>{job.type}</span>
          </p>
          <span style={{
            fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            background: allChecked ? '#f0fdf4' : '#fff7ed', color: allChecked ? '#16a34a' : '#d97706',
          }}>
            {data.checked.length}/{checklist.length} checked
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {checklist.map((item, i) => {
            const checked = data.checked.includes(item)
            return (
              <label key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                padding: '10px 12px', borderRadius: 8,
                background: checked ? '#f0fdf4' : '#fff',
                border: `1px solid ${checked ? '#bbf7d0' : '#e8e9ec'}`,
                transition: 'all 0.15s',
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 5, border: `2px solid ${checked ? '#16a34a' : '#d1d5db'}`,
                  background: checked ? '#16a34a' : '#fff', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                }}>
                  {checked && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <input type="checkbox" checked={checked} onChange={() => toggleCheck(item)} style={{ display: 'none' }} />
                <span style={{ fontSize: 13.5, color: checked ? '#15803d' : '#374151', fontWeight: checked ? 500 : 400 }}>{item}</span>
              </label>
            )
          })}
        </div>
        {attempted && !allChecked && (
          <div style={{ marginTop: 12, padding: '9px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, fontSize: 12.5, color: '#dc2626', fontWeight: 500 }}>
            ⚠ Cannot proceed until all checklist items are checked.
          </div>
        )}
      </div>

      {/* Parts Used */}
      {parts.length > 0 && (
        <div style={{ border: '1px solid #e8e9ec', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e8e9ec' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1d23', margin: 0 }}>
              Parts & Services Used
              <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 400, marginLeft: 8 }}>Confirm each item</span>
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {parts.map((li, i) => {
              const confirmed = !!data.partsConfirmed[li.id]
              return (
                <label key={li.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', cursor: 'pointer',
                  background: confirmed ? '#f0fdf4' : '#fff',
                  borderBottom: i < parts.length - 1 ? '1px solid #f0f1f3' : 'none',
                  transition: 'background 0.12s',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, border: `2px solid ${confirmed ? '#16a34a' : '#d1d5db'}`,
                    background: confirmed ? '#16a34a' : '#fff', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {confirmed && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <input type="checkbox" checked={confirmed} onChange={() => togglePart(li.id)} style={{ display: 'none' }} />
                  <span style={{ flex: 1, fontSize: 13.5, color: '#374151' }}>{li.description}</span>
                  <span style={{ fontSize: 12.5, color: '#6b7280' }}>×{li.qty}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1d23', minWidth: 60, textAlign: 'right' }}>${(li.total || 0).toLocaleString()}</span>
                </label>
              )
            })}
          </div>
          {attempted && !allPartsOk && (
            <div style={{ padding: '9px 16px', background: '#fef2f2', borderTop: '1px solid #fecaca', fontSize: 12.5, color: '#dc2626', fontWeight: 500 }}>
              ⚠ Please confirm all parts and services were used.
            </div>
          )}
        </div>
      )}

      {/* Completion Notes */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
          Completion Notes <span style={{ color: '#dc2626' }}>*</span>
          <span style={{ fontSize: 11.5, color: '#9ca3af', fontWeight: 400, marginLeft: 6 }}>min. 20 characters</span>
        </label>
        <textarea
          value={data.notes}
          onChange={e => onChange({ ...data, notes: e.target.value })}
          placeholder="Describe the work completed, any findings, follow-up recommendations…"
          rows={4}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '10px 12px',
            border: `1px solid ${attempted && !notesOk ? '#dc2626' : '#e8e9ec'}`,
            borderRadius: 8, fontSize: 13.5, color: '#374151', lineHeight: 1.6, resize: 'vertical',
            outline: 'none', fontFamily: 'inherit',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {attempted && !notesOk && <span style={{ fontSize: 12, color: '#dc2626' }}>Minimum 20 characters required.</span>}
          <span style={{ fontSize: 11.5, color: (data.notes || '').length >= 20 ? '#16a34a' : '#9ca3af', marginLeft: 'auto' }}>
            {(data.notes || '').length} chars
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button onClick={onCancel} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e8e9ec', background: '#fff', fontSize: 13.5, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={onNext} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
          Next: Photos →
        </button>
      </div>
    </div>
  )
}

// ── Step 2: Before & After Photos ─────────────────────────────────────────────
function RequiredPhotoZone({ label, photos, onAdd, onRemove, required, attempted }) {
  const cameraRef  = useRef(null)
  const galleryRef = useRef(null)
  const [drag, setDrag] = useState(false)

  function readFiles(files) {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = e => onAdd(e.target.result)
      reader.readAsDataURL(file)
    })
  }

  const satisfied = photos.length >= 1
  const showErr   = required && attempted && !satisfied
  const border    = showErr ? '2px dashed #dc2626' : drag ? '2px dashed #2563eb' : satisfied ? '2px solid #16a34a' : '2px dashed #d1d5db'
  const bg        = showErr ? '#fef2f2' : drag ? '#eff6ff' : satisfied ? '#f0fdf4' : '#fafafa'

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: showErr ? '#dc2626' : '#374151' }}>
          {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
          {satisfied && <span style={{ color: '#16a34a', marginLeft: 4 }}>✅</span>}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: satisfied ? '#f0fdf4' : showErr ? '#fef2f2' : '#f3f4f6', color: satisfied ? '#16a34a' : showErr ? '#dc2626' : '#9ca3af' }}>
          {satisfied ? `${photos.length} added` : showErr ? '0 — 1 required' : `0 / 1 required`}
        </span>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); readFiles(e.dataTransfer.files) }}
        onClick={() => cameraRef.current?.click()}
        style={{ border, borderRadius: 10, padding: '16px 10px', textAlign: 'center', background: bg, cursor: 'pointer', transition: 'all 0.15s', marginBottom: 8 }}>
        <div style={{ fontSize: showErr ? 18 : 14, marginBottom: 4 }}>{showErr ? '⚠️' : '📷'}</div>
        <p style={{ fontSize: 12, color: showErr ? '#dc2626' : '#9ca3af', margin: 0, fontWeight: showErr ? 600 : 400 }}>
          {showErr ? 'Required — tap to add' : 'Tap to add'}
        </p>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple style={{ display: 'none' }} onChange={e => readFiles(e.target.files)} />
        <input ref={galleryRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => readFiles(e.target.files)} />
      </div>

      <button onClick={e => { e.stopPropagation(); galleryRef.current?.click() }}
        style={{ width: '100%', padding: '7px 0', border: '1px solid #e8e9ec', borderRadius: 7, background: '#fff', fontSize: 12.5, fontWeight: 600, color: '#374151', cursor: 'pointer', marginBottom: photos.length > 0 ? 8 : 0 }}>
        + Add Photos
      </button>

      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
          {photos.map((src, i) => (
            <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 6, overflow: 'hidden', border: '1px solid #e8e9ec' }}>
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => onRemove(i)}
                style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Step2({ data, onChange, onNext, onBack, attempted }) {
  const rules     = getFieldRules()
  const hasBefore = data.beforePhotos.length > 0
  const hasAfter  = data.afterPhotos.length > 0
  const canNext   = (!rules.requireBeforePhotos || hasBefore) && (!rules.requireAfterPhotos || hasAfter)

  function addBefore(src) { onChange({ ...data, beforePhotos: [...data.beforePhotos, src] }) }
  function addAfter(src)  { onChange({ ...data, afterPhotos: [...data.afterPhotos, src] }) }
  function removeBefore(i){ onChange({ ...data, beforePhotos: data.beforePhotos.filter((_, idx) => idx !== i) }) }
  function removeAfter(i) { onChange({ ...data, afterPhotos: data.afterPhotos.filter((_, idx) => idx !== i) }) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 4px' }}>Before & After Photos</p>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Before and after photos are required to document the completed work.</p>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <RequiredPhotoZone
          label="Before Photos"
          photos={data.beforePhotos}
          onAdd={addBefore}
          onRemove={removeBefore}
          required={rules.requireBeforePhotos}
          attempted={attempted}
        />
        <RequiredPhotoZone
          label="After Photos"
          photos={data.afterPhotos}
          onAdd={addAfter}
          onRemove={removeAfter}
          required={rules.requireAfterPhotos}
          attempted={attempted}
        />
      </div>

      {attempted && !canNext && (
        <div style={{ padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', margin: '0 0 6px' }}>📸 PHOTOS MISSING</p>
          <p style={{ fontSize: 12.5, color: '#dc2626', margin: '0 0 6px' }}>Cannot complete job without photos:</p>
          {rules.requireBeforePhotos && !hasBefore && <p style={{ fontSize: 12.5, color: '#dc2626', margin: '2px 0' }}>❌ Before photos: 0 uploaded (need 1)</p>}
          {rules.requireAfterPhotos && !hasAfter && <p style={{ fontSize: 12.5, color: '#dc2626', margin: '2px 0' }}>❌ After photos: 0 uploaded (need 1)</p>}
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '8px 0 0' }}>Photos prove the work was done and protect you and the company.</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', paddingTop: 4 }}>
        <button onClick={onBack} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e8e9ec', background: '#fff', fontSize: 13.5, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
          ← Back
        </button>
        <button
          onClick={canNext ? onNext : undefined}
          disabled={!canNext}
          title={!canNext ? 'Upload before and after photos to continue' : ''}
          style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: canNext ? '#2563eb' : '#d1d5db', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: canNext ? 'pointer' : 'not-allowed', opacity: 1, transition: 'background 0.2s' }}>
          Next: Signature →
        </button>
      </div>
    </div>
  )
}

// ── Step 3: Client Signature ──────────────────────────────────────────────────
function Step3({ job, data, onChange, onNext, onBack, attempted }) {
  const nameOk     = (data.clientPrintedName || '').trim().length > 0
  const checkboxOk = !!data.clientConfirmed
  const sigOk      = !!data.signatureDataUrl
  const canProceed = sigOk && nameOk && checkboxOk

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 4px' }}>Client Signature</p>
        <p style={{ fontSize: 13.5, color: '#6b7280', margin: 0 }}>
          Please have the client sign below to confirm job completion.
        </p>
      </div>

      <SignatureCapture
        title="Client Signature"
        subtitle="Have the client sign here"
        required
        attempted={attempted}
        existingSignature={data.signatureDataUrl}
        onSign={url => onChange({ ...data, signatureDataUrl: url || '' })}
        onClear={() => onChange({ ...data, signatureDataUrl: '' })}
      />

      {/* Printed name */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
          Client Printed Name <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <input
          type="text"
          value={data.clientPrintedName || ''}
          onChange={e => onChange({ ...data, clientPrintedName: e.target.value })}
          placeholder="Full name"
          style={{
            width: '100%', boxSizing: 'border-box', height: 40, padding: '0 12px',
            border: `1px solid ${attempted && !nameOk ? '#dc2626' : '#e8e9ec'}`,
            borderRadius: 8, fontSize: 13.5, color: '#374151', outline: 'none',
          }}
        />
        {attempted && !nameOk && <p style={{ fontSize: 12, color: '#dc2626', margin: '4px 0 0' }}>Printed name is required.</p>}
      </div>

      {/* Confirmation checkbox */}
      <label style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
        padding: '12px 14px', borderRadius: 8,
        background: checkboxOk ? '#f0fdf4' : '#f9fafb',
        border: `1px solid ${attempted && !checkboxOk ? '#dc2626' : checkboxOk ? '#bbf7d0' : '#e8e9ec'}`,
        transition: 'all 0.15s',
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: 5, border: `2px solid ${checkboxOk ? '#16a34a' : '#d1d5db'}`,
          background: checkboxOk ? '#16a34a' : '#fff', flexShrink: 0, marginTop: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
        }}>
          {checkboxOk && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        <input type="checkbox" checked={!!checkboxOk} onChange={e => onChange({ ...data, clientConfirmed: e.target.checked })} style={{ display: 'none' }} />
        <span style={{ fontSize: 13.5, color: checkboxOk ? '#15803d' : '#374151', lineHeight: 1.5 }}>
          I confirm the work has been completed to my satisfaction.
        </span>
      </label>
      {attempted && !checkboxOk && <p style={{ fontSize: 12, color: '#dc2626', margin: '-12px 0 0' }}>Client must check the confirmation box.</p>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', paddingTop: 4 }}>
        <button onClick={onBack} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e8e9ec', background: '#fff', fontSize: 13.5, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
          ← Back
        </button>
        <button
          onClick={() => { if (!canProceed) { return } onNext() }}
          style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: canProceed ? '#2563eb' : '#d1d5db', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: canProceed ? 'pointer' : 'not-allowed' }}>
          Next: Tech Signature →
        </button>
      </div>
    </div>
  )
}

// ── Step 4: Technician Signature ──────────────────────────────────────────────
function Step4Tech({ job, data, onChange, onNext, onBack, attempted }) {
  const sigOk  = !!data.techSignatureDataUrl
  const nameOk = (data.techPrintedName || '').trim().length > 0
  const canProceed = sigOk && nameOk

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 4px' }}>Technician Signature</p>
        <p style={{ fontSize: 13.5, color: '#6b7280', margin: 0 }}>
          Sign below to certify that all work was completed per company standards.
        </p>
      </div>

      <SignatureCapture
        title="Technician Signature"
        subtitle="Sign to certify work performed"
        required
        attempted={attempted}
        existingSignature={data.techSignatureDataUrl}
        onSign={url => onChange({ ...data, techSignatureDataUrl: url || '' })}
        onClear={() => onChange({ ...data, techSignatureDataUrl: '' })}
      />

      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
          Technician Printed Name <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <input
          type="text"
          value={data.techPrintedName || ''}
          onChange={e => onChange({ ...data, techPrintedName: e.target.value })}
          placeholder={job.techName || 'Technician full name'}
          style={{
            width: '100%', boxSizing: 'border-box', height: 40, padding: '0 12px',
            border: `1px solid ${attempted && !nameOk ? '#dc2626' : '#e8e9ec'}`,
            borderRadius: 8, fontSize: 13.5, color: '#374151', outline: 'none',
          }}
        />
        {attempted && !nameOk && <p style={{ fontSize: 12, color: '#dc2626', margin: '4px 0 0' }}>Printed name is required.</p>}
      </div>

      <div style={{ padding: '12px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12.5, color: '#1d4ed8', lineHeight: 1.6 }}>
        By signing, I certify that the work described was completed in full, all safety checks were performed, and the job site was left in a clean and safe condition.
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', paddingTop: 4 }}>
        <button onClick={onBack} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e8e9ec', background: '#fff', fontSize: 13.5, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
          ← Back
        </button>
        <button
          onClick={() => { if (!canProceed) { return } onNext() }}
          style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: canProceed ? '#2563eb' : '#d1d5db', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: canProceed ? 'pointer' : 'not-allowed' }}>
          Review Summary →
        </button>
      </div>
    </div>
  )
}

// ── Completion requirements checklist ────────────────────────────────────────
function CompletionRequirementsPanel({ job, data }) {
  const checklist    = getChecklist(job.type)
  const rules        = getFieldRules()
  const allChecked   = data.checked.length === checklist.length
  const notesOk      = (data.notes || '').trim().length >= 20
  const beforeOk     = !rules.requireBeforePhotos || data.beforePhotos.length >= 1
  const afterOk      = !rules.requireAfterPhotos  || data.afterPhotos.length  >= 1
  const sigOk        = !!data.signatureDataUrl
  const nameOk       = (data.clientPrintedName || '').trim().length > 0
  const techSigOk    = !!data.techSignatureDataUrl
  const techNameOk   = (data.techPrintedName || '').trim().length > 0

  const requirements = [
    { label: 'Service checklist complete',      met: allChecked,  detail: `${data.checked.length}/${checklist.length} items` },
    { label: 'Before photo uploaded',           met: beforeOk,    detail: `${data.beforePhotos.length} photo${data.beforePhotos.length !== 1 ? 's' : ''}` },
    { label: 'After photo uploaded',            met: afterOk,     detail: `${data.afterPhotos.length} photo${data.afterPhotos.length !== 1 ? 's' : ''}` },
    { label: 'Completion notes added',          met: notesOk,     detail: `${(data.notes || '').length} chars` },
    { label: 'Client signature captured',       met: sigOk,       detail: sigOk ? 'Signed' : 'Required' },
    { label: 'Client name filled in',           met: nameOk,      detail: data.clientPrintedName || 'Required' },
    { label: 'Technician signature captured',   met: techSigOk,   detail: techSigOk ? 'Signed' : 'Required' },
    { label: 'Technician name filled in',       met: techNameOk,  detail: data.techPrintedName || 'Required' },
  ]
  const metCount = requirements.filter(r => r.met).length
  const allMet   = metCount === requirements.length

  return (
    <div style={{ border: `1px solid ${allMet ? '#bbf7d0' : '#e8e9ec'}`, borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '10px 16px', background: allMet ? '#f0fdf4' : '#f9fafb', borderBottom: '1px solid #e8e9ec', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: allMet ? '#16a34a' : '#374151' }}>COMPLETION REQUIREMENTS</span>
        <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: allMet ? '#dcfce7' : '#fef3c7', color: allMet ? '#15803d' : '#92400e' }}>
          {metCount} of {requirements.length} met
        </span>
      </div>
      <div>
        {requirements.map((req, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: i < requirements.length - 1 ? '1px solid #f0f1f3' : 'none', background: req.met ? '#fff' : '#fafafa' }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{req.met ? '✅' : '❌'}</span>
            <span style={{ flex: 1, fontSize: 13, color: req.met ? '#15803d' : '#374151', fontWeight: req.met ? 500 : 400 }}>{req.label}</span>
            <span style={{ fontSize: 11.5, color: req.met ? '#16a34a' : '#9ca3af' }}>{req.detail}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Step 5: Summary & Submit ──────────────────────────────────────────────────
function Step5({ job, data, onConfirm, onBack, confirming, success }) {
  const checklist  = getChecklist(job.type)
  const completedAt = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', border: '3px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="30" height="30" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#15803d', margin: '0 0 8px' }}>Job Completed Successfully!</h3>
        <p style={{ fontSize: 13.5, color: '#6b7280', margin: '0 0 28px', lineHeight: 1.6 }}>
          {job.id} has been marked as complete.<br />A completion record has been saved.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => generateCompletionReport(job, data)}
            style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download Completion Report PDF
          </button>
          <button
            onClick={() => success.onBack()}
            style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e8e9ec', background: '#fff', fontSize: 13.5, fontWeight: 600, color: '#374151', cursor: 'pointer' }}
          >
            Back to Jobs
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ textAlign: 'center', paddingBottom: 4 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 4px' }}>Ready to Complete Job</p>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Review the summary below before submitting.</p>
      </div>

      {/* Job info */}
      <div style={{ border: '1px solid #e8e9ec', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', background: '#f9fafb', borderBottom: '1px solid #e8e9ec' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#374151' }}>Job Details</span>
        </div>
        <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            ['Job', job.id],
            ['Client', job.clientName],
            ['Technician', job.techName || '—'],
            ['Service', job.type],
            ['Time Completed', completedAt],
            ['Total', `$${(job.total || 0).toLocaleString()}`],
          ].map(([l, v]) => (
            <div key={l}>
              <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{l}</span>
              <p style={{ fontSize: 13, color: '#1a1d23', fontWeight: 500, margin: '2px 0 0' }}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist summary */}
      <div style={{ border: '1px solid #e8e9ec', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', background: '#f9fafb', borderBottom: '1px solid #e8e9ec', display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#374151' }}>Checklist — {checklist.length}/{checklist.length} items</span>
        </div>
        <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {checklist.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#374151' }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Photos summary */}
      <div style={{ border: '1px solid #e8e9ec', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
          <span style={{ fontSize: 13, color: '#374151' }}><strong>{data.beforePhotos.length}</strong> before photo{data.beforePhotos.length !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
          <span style={{ fontSize: 13, color: '#374151' }}><strong>{data.afterPhotos.length}</strong> after photo{data.afterPhotos.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Completion notes */}
      <div style={{ border: '1px solid #e8e9ec', borderRadius: 10, padding: '12px 16px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>Completion Notes</p>
        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{data.notes}</p>
      </div>

      {/* Signature previews */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ border: '1px solid #e8e9ec', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', background: '#f9fafb', borderBottom: '1px solid #e8e9ec' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Client — {data.clientPrintedName}</span>
          </div>
          <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            {data.signatureDataUrl && (
              <img src={data.signatureDataUrl} alt="Client Sig" style={{ height: 44, maxWidth: 130, border: '1px solid #e8e9ec', borderRadius: 6, background: '#fff', objectFit: 'contain', padding: 3 }} />
            )}
            <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}>✓ Confirmed</span>
          </div>
        </div>
        <div style={{ border: '1px solid #e8e9ec', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', background: '#f9fafb', borderBottom: '1px solid #e8e9ec' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Technician — {data.techPrintedName}</span>
          </div>
          <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            {data.techSignatureDataUrl && (
              <img src={data.techSignatureDataUrl} alt="Tech Sig" style={{ height: 44, maxWidth: 130, border: '1px solid #e8e9ec', borderRadius: 6, background: '#fff', objectFit: 'contain', padding: 3 }} />
            )}
            {data.techSignatureDataUrl && <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}>✓ Certified</span>}
          </div>
        </div>
      </div>

      {/* Timestamp */}
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: '#15803d', fontWeight: 500 }}>
        Job will be marked as <strong>Completed</strong> at {completedAt}. An invoice will be auto-generated if none exists.
      </div>

      {/* Completion requirements checklist */}
      <CompletionRequirementsPanel job={job} data={data} />

      {(() => {
        const rules    = getFieldRules()
        const checklist = getChecklist(job.type)
        const allChecked = data.checked.length === checklist.length
        const notesOk   = (data.notes || '').trim().length >= 20
        const beforeOk  = !rules.requireBeforePhotos || data.beforePhotos.length >= 1
        const afterOk   = !rules.requireAfterPhotos  || data.afterPhotos.length  >= 1
        const sigOk     = !!data.signatureDataUrl
        const nameOk    = (data.clientPrintedName || '').trim().length > 0
        const techSigOk = !!data.techSignatureDataUrl
        const techNameOk= (data.techPrintedName || '').trim().length > 0
        const allMet    = allChecked && notesOk && beforeOk && afterOk && sigOk && nameOk && techSigOk && techNameOk
        return (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', paddingTop: 4 }}>
            <button onClick={onBack} disabled={confirming}
              style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e8e9ec', background: '#fff', fontSize: 13.5, fontWeight: 500, color: '#374151', cursor: 'pointer', opacity: confirming ? 0.5 : 1 }}>
              ← Back
            </button>
            <button onClick={allMet ? onConfirm : undefined} disabled={confirming || !allMet}
              title={!allMet ? 'Complete all requirements above to submit' : ''}
              style={{
                padding: '10px 26px', borderRadius: 8, border: 'none',
                background: confirming ? '#86efac' : allMet ? '#16a34a' : '#d1d5db',
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: (confirming || !allMet) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.2s',
                boxShadow: allMet && !confirming ? '0 0 0 3px #bbf7d0' : 'none',
              }}>
              {confirming ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                    <polyline points="23 4 23 10 17 10" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Completing…
                </>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Submit Completion
                </>
              )}
            </button>
          </div>
        )
      })()}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function JobCompletion({ job, onClose, onComplete }) {
  const [step, setStep]         = useState(1)
  const [attempted, setAttempted] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [success, setSuccess]   = useState(false)
  const [showRating, setShowRating] = useState(false)

  const parts = (job.lineItems || []).filter(li => li.description?.trim())
  const defaultPartsConfirmed = parts.reduce((acc, li) => ({ ...acc, [li.id]: false }), {})

  const [data, setData] = useState({
    checked:              [],
    partsConfirmed:       defaultPartsConfirmed,
    notes:                job.completionNotes || '',
    beforePhotos:         [],
    afterPhotos:          [],
    signatureDataUrl:     '',
    clientPrintedName:    '',
    clientConfirmed:      false,
    techSignatureDataUrl: '',
    techPrintedName:      job.techName || '',
  })

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const checklist  = getChecklist(job.type)

  // Step 1 validation
  function tryStep1() {
    const allChecked = data.checked.length === checklist.length
    const notesOk    = (data.notes || '').trim().length >= 20
    const allPartsOk = parts.every(li => data.partsConfirmed[li.id])
    if (!allChecked || !notesOk || !allPartsOk) { setAttempted(true); return }
    setAttempted(false)
    setStep(2)
  }

  // Step 2 validation
  function tryStep2() {
    const rules    = getFieldRules()
    const needBefore = rules.requireBeforePhotos && data.beforePhotos.length === 0
    const needAfter  = rules.requireAfterPhotos  && data.afterPhotos.length  === 0
    if (needBefore || needAfter) { setAttempted(true); return }
    setAttempted(false)
    setStep(3)
  }

  // Step 3 validation
  function tryStep3() {
    const sigOk      = !!data.signatureDataUrl
    const nameOk     = (data.clientPrintedName || '').trim().length > 0
    const checkboxOk = !!data.clientConfirmed
    if (!sigOk || !nameOk || !checkboxOk) { setAttempted(true); return }
    setAttempted(false)
    setStep(4)
  }

  // Step 4 validation (tech sig)
  function tryStep4() {
    const sigOk  = !!data.techSignatureDataUrl
    const nameOk = (data.techPrintedName || '').trim().length > 0
    if (!sigOk || !nameOk) { setAttempted(true); return }
    setAttempted(false)
    setStep(5)
  }

  function handleConfirm() {
    setConfirming(true)
    setTimeout(() => {
      const completionData = {
        status:               'Completed',
        completionNotes:      data.notes.trim(),
        completionChecklist:  data.checked,
        partsConfirmed:       data.partsConfirmed,
        clientSignature:      data.signatureDataUrl,
        clientPrintedName:    data.clientPrintedName,
        techSignature:        data.techSignatureDataUrl,
        techPrintedName:      data.techPrintedName,
        beforePhotos:         data.beforePhotos,
        afterPhotos:          data.afterPhotos,
        completedAt:          new Date().toISOString(),
      }
      onComplete(completionData)
      setConfirming(false)
      setSuccess(true)
      // Show rating prompt after user sees success screen
      setTimeout(() => setShowRating(true), 1800)
    }, 700)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(10,15,30,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget && !success) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: 14,
        width: '100%', maxWidth: success ? 520 : 680,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
        animation: 'modalIn 0.18s ease',
        transition: 'max-width 0.2s',
      }}>
        {/* Header */}
        {!success && (
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f1f3', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1a1d23', margin: 0 }}>Complete Job</h2>
              <p style={{ fontSize: 12.5, color: '#9ca3af', margin: '2px 0 0' }}>{job.id} — {job.clientName}</p>
            </div>
            <button onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e8e9ec', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280' }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: success ? '40px 32px' : '24px' }}>
          {!success && <StepIndicator step={step} total={5} />}

          {step === 1 && !success && (
            <Step1
              job={job} data={data} onChange={setData}
              onNext={tryStep1} onCancel={onClose} attempted={attempted}
            />
          )}
          {step === 2 && !success && (
            <Step2
              data={data} onChange={setData}
              onNext={tryStep2} onBack={() => { setAttempted(false); setStep(1) }} attempted={attempted}
            />
          )}
          {step === 3 && !success && (
            <Step3
              job={job} data={data} onChange={setData}
              onNext={tryStep3} onBack={() => { setAttempted(false); setStep(2) }} attempted={attempted}
            />
          )}
          {step === 4 && !success && (
            <Step4Tech
              job={job} data={data} onChange={setData}
              onNext={tryStep4} onBack={() => { setAttempted(false); setStep(3) }} attempted={attempted}
            />
          )}
          {step === 5 && (
            <Step5
              job={job} data={data}
              onConfirm={handleConfirm}
              onBack={() => { setAttempted(false); setStep(4) }}
              confirming={confirming}
              success={success ? { onBack: onClose } : null}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.97) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {showRating && (
        <SatisfactionRating
          job={job}
          onSubmit={() => setShowRating(false)}
          onSkip={() => setShowRating(false)}
        />
      )}
    </div>
  )
}
