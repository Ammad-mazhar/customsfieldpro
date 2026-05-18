import { useState, useMemo } from 'react'
import {
  getWarrantyClaims, saveWarrantyClaim, generateWarrantyClaimNumber,
  getWarrantyProviders, saveWarrantyProvider,
  getServiceCalls, getEquipment,
} from '../data/store'
import { useAuth } from '../auth/AuthContext'

// ─── Status config ─────────────────────────────────────────────────────────────
const CLAIM_STATUSES = [
  { code: 'draft',        label: 'Draft',        color: '#6B7280', bg: '#F3F4F6' },
  { code: 'submitted',    label: 'Submitted',    color: '#2563EB', bg: '#EFF6FF' },
  { code: 'under_review', label: 'Under Review', color: '#D97706', bg: '#FFFBEB' },
  { code: 'approved',     label: 'Approved',     color: '#059669', bg: '#ECFDF5' },
  { code: 'rejected',     label: 'Rejected',     color: '#DC2626', bg: '#FEF2F2' },
  { code: 'paid',         label: 'Paid',         color: '#7C3AED', bg: '#F5F3FF' },
]
const STATUS_MAP = Object.fromEntries(CLAIM_STATUSES.map(s => [s.code, s]))
function claimStatus(code) {
  return STATUS_MAP[code] || { label: code || 'Unknown', color: '#6B7280', bg: '#F3F4F6' }
}

const STATUS_FLOW = ['draft', 'submitted', 'under_review', 'approved', 'paid']

function StatusBadge({ code }) {
  const s = claimStatus(code)
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 700,
      padding: '2px 8px', borderRadius: 3,
      background: s.bg, color: s.color, border: `1px solid ${s.color}40`,
      whiteSpace: 'nowrap',
    }}>{s.label}</span>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return d }
}
function today() { return new Date().toISOString().slice(0, 10) }

// ─── Shared card style ─────────────────────────────────────────────────────────
const card = {
  background: '#fff',
  border: '1px solid #e8e9ec',
  borderRadius: 8,
  padding: '18px 20px',
  marginBottom: 16,
}

// ─── Tab 1: All Claims ─────────────────────────────────────────────────────────
function AllClaims({ onDetail }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [providerFilter, setProviderFilter] = useState('')

  const claims = useMemo(() => getWarrantyClaims(), [])

  const providers = useMemo(() => {
    const ps = new Set(claims.map(c => c.warrantyProvider).filter(Boolean))
    return [...ps]
  }, [claims])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return claims.filter(c => {
      if (statusFilter && c.status !== statusFilter) return false
      if (providerFilter && c.warrantyProvider !== providerFilter) return false
      if (q) {
        return (
          (c.claimNumber || '').toLowerCase().includes(q) ||
          (c.customerName || '').toLowerCase().includes(q) ||
          (c.serviceCallNumber || '').toLowerCase().includes(q) ||
          (c.warrantyProvider || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [claims, search, statusFilter, providerFilter])

  const totals = useMemo(() => ({
    claimed: filtered.reduce((s, c) => s + (c.totalClaimed || 0), 0),
    approved: filtered.reduce((s, c) => s + (c.totalApproved || 0), 0),
  }), [filtered])

  const countByStatus = useMemo(() => {
    const m = {}
    claims.forEach(c => { m[c.status] = (m[c.status] || 0) + 1 })
    return m
  }, [claims])

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 20 }}>
        {CLAIM_STATUSES.map(s => (
          <div key={s.code} style={{ ...card, padding: '12px 14px', marginBottom: 0, borderTop: `3px solid ${s.color}`, cursor: 'pointer' }}
            onClick={() => setStatusFilter(v => v === s.code ? '' : s.code)}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{countByStatus[s.code] || 0}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search claim #, customer, service call..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 220, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, minWidth: 150 }}>
          <option value="">All Statuses</option>
          {CLAIM_STATUSES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
        </select>
        <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, minWidth: 160 }}>
          <option value="">All Providers</option>
          {providers.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <span style={{ fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>
          {filtered.length} claim{filtered.length !== 1 ? 's' : ''}
          {' · '}Claimed: <strong>${totals.claimed.toLocaleString()}</strong>
          {' · '}Approved: <strong style={{ color: '#059669' }}>${totals.approved.toLocaleString()}</strong>
        </span>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e8e9ec' }}>
              {['Claim #', 'Customer', 'Service Call', 'Equipment', 'Provider', 'Claim Type', 'Claimed', 'Approved', 'Status', 'Submitted', 'Actions'].map(h => (
                <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f1f3' }}>
                <td style={{ padding: '8px 12px', fontWeight: 700, color: '#2563eb', cursor: 'pointer' }} onClick={() => onDetail(c)}>{c.claimNumber}</td>
                <td style={{ padding: '8px 12px', fontWeight: 600, textTransform: 'uppercase', maxWidth: 160 }}>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.customerName}>{c.customerName || '—'}</span>
                </td>
                <td style={{ padding: '8px 12px', color: '#2563eb', fontWeight: 600 }}>{c.serviceCallNumber || '—'}</td>
                <td style={{ padding: '8px 12px', color: '#374151' }}>
                  {[c.equipmentBrand, c.equipmentModel].filter(Boolean).join(' ') || '—'}
                  {c.serialNumber && <div style={{ fontSize: 11, color: '#9ca3af' }}>S/N: {c.serialNumber}</div>}
                </td>
                <td style={{ padding: '8px 12px', color: '#374151' }}>{c.warrantyProvider || '—'}</td>
                <td style={{ padding: '8px 12px', color: '#374151' }}>{c.claimType || '—'}</td>
                <td style={{ padding: '8px 12px', color: '#374151' }}>{c.totalClaimed != null ? `$${c.totalClaimed.toLocaleString()}` : '—'}</td>
                <td style={{ padding: '8px 12px', color: '#059669', fontWeight: 600 }}>{c.totalApproved != null ? `$${c.totalApproved.toLocaleString()}` : '—'}</td>
                <td style={{ padding: '8px 12px' }}><StatusBadge code={c.status} /></td>
                <td style={{ padding: '8px 12px', color: '#6b7280' }}>{fmtDate(c.submittedDate)}</td>
                <td style={{ padding: '8px 12px' }}>
                  <button onClick={() => onDetail(c)}
                    style={{ padding: '4px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                    View
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={11} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No warranty claims found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab 2: Create Claim ───────────────────────────────────────────────────────
const EMPTY_FORM = {
  serviceCallNumber: '', customerName: '', equipmentBrand: '', equipmentModel: '',
  serialNumber: '', warrantyProvider: '', warrantyType: 'manufacturer',
  contractNumber: '', claimType: 'Parts + Labor',
  failureDescription: '', causeOfFailure: '',
  dateOfFailure: '', dateOfRepair: today(),
  laborHours: '', laborRate: '', tripCharge: 0,
  parts: [],
  notes: '', status: 'draft',
}

function PartRow({ part, index, onChange, onRemove }) {
  return (
    <tr>
      <td style={{ padding: '4px 6px' }}>
        <input value={part.partNumber} onChange={e => onChange(index, 'partNumber', e.target.value)}
          style={{ width: '100%', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }} placeholder="Part #" />
      </td>
      <td style={{ padding: '4px 6px' }}>
        <input value={part.description} onChange={e => onChange(index, 'description', e.target.value)}
          style={{ width: '100%', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }} placeholder="Description" />
      </td>
      <td style={{ padding: '4px 6px' }}>
        <input type="number" min="1" value={part.qty} onChange={e => onChange(index, 'qty', parseInt(e.target.value) || 1)}
          style={{ width: 60, padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }} />
      </td>
      <td style={{ padding: '4px 6px' }}>
        <input type="number" min="0" step="0.01" value={part.unitCost} onChange={e => onChange(index, 'unitCost', parseFloat(e.target.value) || 0)}
          style={{ width: 80, padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }} />
      </td>
      <td style={{ padding: '4px 6px', color: '#374151', fontWeight: 600, fontSize: 12 }}>
        ${((part.qty || 0) * (part.unitCost || 0)).toFixed(2)}
      </td>
      <td style={{ padding: '4px 6px' }}>
        <button onClick={() => onRemove(index)}
          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
      </td>
    </tr>
  )
}

function CreateClaim({ onCreated }) {
  const { user } = useAuth()
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)

  const providers = useMemo(() => getWarrantyProviders(), [])
  const serviceCalls = useMemo(() => getServiceCalls(), [])

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function addPart() {
    setForm(f => ({ ...f, parts: [...f.parts, { partNumber: '', description: '', qty: 1, unitCost: 0, total: 0 }] }))
  }
  function updatePart(i, k, v) {
    setForm(f => {
      const parts = f.parts.map((p, idx) => idx === i ? { ...p, [k]: v, total: (k === 'qty' || k === 'unitCost') ? (k === 'qty' ? v : p.qty) * (k === 'unitCost' ? v : p.unitCost) : p.total } : p)
      return { ...f, parts }
    })
  }
  function removePart(i) { setForm(f => ({ ...f, parts: f.parts.filter((_, idx) => idx !== i) })) }

  const laborTotal = (parseFloat(form.laborHours) || 0) * (parseFloat(form.laborRate) || 0)
  const partsTotal = form.parts.reduce((s, p) => s + (p.qty || 0) * (p.unitCost || 0), 0)
  const totalClaimed = laborTotal + partsTotal + (parseFloat(form.tripCharge) || 0)

  function validate() {
    const e = {}
    if (!form.customerName.trim()) e.customerName = 'Required'
    if (!form.warrantyProvider.trim()) e.warrantyProvider = 'Required'
    if (!form.failureDescription.trim()) e.failureDescription = 'Required'
    if (!form.dateOfFailure) e.dateOfFailure = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(asDraft) {
    if (!asDraft && !validate()) return
    const claimNumber = generateWarrantyClaimNumber()
    const id = `wc-${Date.now()}`
    const claim = {
      ...form,
      id, claimNumber,
      laborTotal, partsTotal, totalClaimed,
      totalApproved: null,
      status: asDraft ? 'draft' : 'submitted',
      submittedDate: asDraft ? null : today(),
      responseDate: null, rejectionReason: '', authNumber: '', paymentReference: '',
      activityLog: [
        { action: `Claim created`, by: user?.name || 'Unknown', at: new Date().toISOString() },
        ...(!asDraft ? [{ action: 'Status → Submitted', by: user?.name || 'Unknown', at: new Date().toISOString() }] : []),
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    saveWarrantyClaim(claim)
    setSaved(true)
    setTimeout(() => { setSaved(false); onCreated(claim) }, 1200)
  }

  const inp = (extra = {}) => ({
    style: { width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', ...extra.style },
    ...extra,
  })

  const fieldErr = (k) => errors[k] ? <div style={{ color: '#dc2626', fontSize: 11, marginTop: 2 }}>{errors[k]}</div> : null

  return (
    <div style={{ maxWidth: 860 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1d23', marginBottom: 20 }}>New Warranty Claim</h2>

      {saved && (
        <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 6, padding: '10px 16px', marginBottom: 16, color: '#065f46', fontWeight: 600, fontSize: 13 }}>
          Claim saved successfully.
        </div>
      )}

      {/* Service Call lookup */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Service Call & Customer</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Service Call #</label>
            <select value={form.serviceCallNumber} onChange={e => {
              const sc = serviceCalls.find(s => s.callId === e.target.value || s.id === e.target.value)
              if (sc) {
                setF('serviceCallNumber', e.target.value)
                setF('customerName', sc.customer || sc.clientName || '')
                setF('equipmentBrand', sc.equipmentBrand || '')
              } else {
                setF('serviceCallNumber', e.target.value)
              }
            }} style={{ ...inp().style }}>
              <option value="">— Select —</option>
              {serviceCalls.map(sc => <option key={sc.id} value={sc.callId || sc.id}>{sc.callId || sc.id} — {sc.customer || sc.clientName}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Customer Name *</label>
            <input {...inp()} value={form.customerName} onChange={e => setF('customerName', e.target.value)} />
            {fieldErr('customerName')}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Warranty Provider *</label>
            <select value={form.warrantyProvider} onChange={e => {
              setF('warrantyProvider', e.target.value)
              const prov = providers.find(p => p.name === e.target.value)
              if (prov) {
                setF('laborRate', prov.standardLaborRate)
                setF('tripCharge', prov.standardTripCharge)
              }
            }} style={{ ...inp().style }}>
              <option value="">— Select Provider —</option>
              {providers.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              <option value="Other">Other</option>
            </select>
            {fieldErr('warrantyProvider')}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Warranty Type</label>
            <select value={form.warrantyType} onChange={e => setF('warrantyType', e.target.value)} style={{ ...inp().style }}>
              <option value="manufacturer">Manufacturer</option>
              <option value="extended">Extended</option>
              <option value="service_contract">Service Contract</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Contract / Policy #</label>
            <input {...inp()} value={form.contractNumber} onChange={e => setF('contractNumber', e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Claim Type</label>
            <select value={form.claimType} onChange={e => setF('claimType', e.target.value)} style={{ ...inp().style }}>
              <option>Parts + Labor</option>
              <option>Parts Only</option>
              <option>Labor Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Equipment */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Equipment</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Brand / Make</label>
            <input {...inp()} value={form.equipmentBrand} onChange={e => setF('equipmentBrand', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Model</label>
            <input {...inp()} value={form.equipmentModel} onChange={e => setF('equipmentModel', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Serial Number</label>
            <input {...inp()} value={form.serialNumber} onChange={e => setF('serialNumber', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Failure info */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Failure Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Date of Failure *</label>
            <input {...inp()} type="date" value={form.dateOfFailure} onChange={e => setF('dateOfFailure', e.target.value)} />
            {fieldErr('dateOfFailure')}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Date of Repair</label>
            <input {...inp()} type="date" value={form.dateOfRepair} onChange={e => setF('dateOfRepair', e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Failure Description *</label>
          <textarea {...inp()} rows={3} value={form.failureDescription} onChange={e => setF('failureDescription', e.target.value)}
            style={{ ...inp().style, resize: 'vertical' }} />
          {fieldErr('failureDescription')}
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Cause of Failure</label>
          <input {...inp()} value={form.causeOfFailure} onChange={e => setF('causeOfFailure', e.target.value)} placeholder="e.g. Component failure, Normal wear" />
        </div>
      </div>

      {/* Labor */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Labor & Trip Charge</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Hours</label>
            <input {...inp()} type="number" min="0" step="0.25" value={form.laborHours} onChange={e => setF('laborHours', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Rate / hr</label>
            <input {...inp()} type="number" min="0" value={form.laborRate} onChange={e => setF('laborRate', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Trip Charge</label>
            <input {...inp()} type="number" min="0" value={form.tripCharge} onChange={e => setF('tripCharge', e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Labor Total</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23' }}>${laborTotal.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Parts */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Parts</div>
          <button onClick={addPart}
            style={{ padding: '5px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            + Add Part
          </button>
        </div>
        {form.parts.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #e8e9ec' }}>
                {['Part #', 'Description', 'Qty', 'Unit Cost', 'Total', ''].map(h => (
                  <th key={h} style={{ padding: '6px 6px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {form.parts.map((p, i) => <PartRow key={i} part={p} index={i} onChange={updatePart} onRemove={removePart} />)}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 700, color: '#374151', fontSize: 12 }}>Parts Total:</td>
                <td style={{ padding: '6px 6px', fontWeight: 700, color: '#059669' }}>${partsTotal.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <div style={{ padding: '20px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No parts added. Click "+ Add Part" to add parts.</div>
        )}
      </div>

      {/* Total + notes */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Notes</label>
            <textarea {...inp()} rows={3} value={form.notes} onChange={e => setF('notes', e.target.value)}
              style={{ ...inp().style, resize: 'vertical' }} placeholder="Additional notes, reference numbers..." />
          </div>
          <div style={{ minWidth: 200, background: '#f9fafb', borderRadius: 6, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#6b7280' }}>Labor:</span>
              <span>${laborTotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#6b7280' }}>Parts:</span>
              <span>${partsTotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#6b7280' }}>Trip:</span>
              <span>${(parseFloat(form.tripCharge) || 0).toFixed(2)}</span>
            </div>
            <div style={{ borderTop: '1px solid #e8e9ec', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800 }}>
              <span>Total Claimed:</span>
              <span style={{ color: '#2563eb' }}>${totalClaimed.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={() => handleSubmit(true)}
          style={{ padding: '8px 20px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
          Save as Draft
        </button>
        <button onClick={() => handleSubmit(false)}
          style={{ padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
          Submit Claim
        </button>
      </div>
    </div>
  )
}

// ─── Tab 3: Claim Detail ───────────────────────────────────────────────────────
function ClaimDetail({ claim: initialClaim, onBack }) {
  const { user } = useAuth()
  const [claim, setClaim] = useState(initialClaim)
  const [editNotes, setEditNotes] = useState(false)
  const [notesVal, setNotesVal] = useState(claim.notes || '')
  const [authInput, setAuthInput] = useState(claim.authNumber || '')
  const [approvedInput, setApprovedInput] = useState(claim.totalApproved != null ? String(claim.totalApproved) : '')
  const [rejectReason, setRejectReason] = useState(claim.rejectionReason || '')
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState(claim.status)

  function update(changes) {
    const updated = {
      ...claim, ...changes, updatedAt: new Date().toISOString(),
      activityLog: [
        ...(claim.activityLog || []),
        ...(changes._log ? [{ action: changes._log, by: user?.name || 'User', at: new Date().toISOString() }] : []),
      ],
    }
    delete updated._log
    saveWarrantyClaim(updated)
    setClaim(updated)
  }

  function advanceStatus() {
    const idx = STATUS_FLOW.indexOf(claim.status)
    if (idx < STATUS_FLOW.length - 1) {
      const next = STATUS_FLOW[idx + 1]
      update({
        status: next,
        ...(next === 'submitted' ? { submittedDate: today() } : {}),
        ...(next === 'approved' ? { responseDate: today(), totalApproved: parseFloat(approvedInput) || claim.totalClaimed, authNumber: authInput } : {}),
        _log: `Status → ${claimStatus(next).label}`,
      })
    }
  }

  const s = claimStatus(claim.status)
  const nextIdx = STATUS_FLOW.indexOf(claim.status) + 1
  const nextStatus = nextIdx < STATUS_FLOW.length ? STATUS_FLOW[nextIdx] : null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, cursor: 'pointer', color: '#374151', fontWeight: 600 }}>
          ← All Claims
        </button>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1a1d23', margin: 0 }}>{claim.claimNumber}</h2>
        <StatusBadge code={claim.status} />
        <div style={{ flex: 1 }} />
        {nextStatus && (
          <button onClick={advanceStatus}
            style={{ padding: '6px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
            → Mark as {claimStatus(nextStatus).label}
          </button>
        )}
        {claim.status !== 'rejected' && (
          <button onClick={() => {
            update({ status: 'rejected', rejectionReason: rejectReason || 'Claim rejected.', responseDate: today(), _log: 'Status → Rejected' })
          }}
            style={{ padding: '6px 16px', background: '#fff', color: '#dc2626', border: '1px solid #dc2626', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
            Reject
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Left column */}
        <div>
          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Claim Info</div>
            {[
              ['Customer', claim.customerName],
              ['Service Call', claim.serviceCallNumber || '—'],
              ['Provider', claim.warrantyProvider],
              ['Warranty Type', claim.warrantyType],
              ['Contract #', claim.contractNumber || '—'],
              ['Claim Type', claim.claimType],
              ['Date of Failure', fmtDate(claim.dateOfFailure)],
              ['Date of Repair', fmtDate(claim.dateOfRepair)],
              ['Submitted', fmtDate(claim.submittedDate)],
              ['Response', fmtDate(claim.responseDate)],
              ['Auth #', claim.authNumber || '—'],
              ['Payment Ref', claim.paymentReference || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                <span style={{ color: '#6b7280', fontWeight: 600 }}>{k}</span>
                <span style={{ color: '#1a1d23', fontWeight: 500, textAlign: 'right', maxWidth: 220 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Equipment</div>
            <div style={{ fontSize: 13, color: '#374151' }}>
              <strong>{claim.equipmentBrand}</strong> {claim.equipmentModel}
              {claim.serialNumber && <div style={{ color: '#6b7280', marginTop: 4 }}>S/N: {claim.serialNumber}</div>}
            </div>
          </div>

          {claim.status === 'approved' || claim.status === 'rejected' ? (
            <div style={{ ...card, border: `1px solid ${s.color}40`, background: s.bg }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                {claim.status === 'approved' ? 'Approval Details' : 'Rejection Reason'}
              </div>
              {claim.status === 'approved' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: '#6b7280' }}>Approved Amount</span>
                    <span style={{ fontWeight: 800, color: '#059669', fontSize: 15 }}>${(claim.totalApproved || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Auth: {claim.authNumber || '—'}</div>
                </>
              )}
              {claim.status === 'rejected' && (
                <div style={{ fontSize: 13, color: '#dc2626' }}>{claim.rejectionReason || 'No reason provided.'}</div>
              )}
            </div>
          ) : null}

          {claim.status === 'under_review' && (
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Approval Details (pre-fill)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Approved Amount</label>
                  <input type="number" value={approvedInput} onChange={e => setApprovedInput(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Auth #</label>
                  <input value={authInput} onChange={e => setAuthInput(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: 13 }} />
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Rejection Reason (if rejecting)</label>
                <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: 13 }} />
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div>
          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Failure Description</div>
            <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>{claim.failureDescription || '—'}</p>
            {claim.causeOfFailure && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>Cause: {claim.causeOfFailure}</div>
            )}
          </div>

          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Financials</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                ['Labor', `${claim.laborHours || 0}h × $${claim.laborRate || 0}/hr = $${(claim.laborTotal || 0).toFixed(2)}`],
                ['Trip Charge', `$${(claim.tripCharge || 0).toFixed(2)}`],
                ['Parts', `$${(claim.partsTotal || 0).toFixed(2)}`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#6b7280' }}>{k}</span>
                  <span>{v}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #e8e9ec', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800 }}>
                <span>Total Claimed</span>
                <span style={{ color: '#2563eb' }}>${(claim.totalClaimed || 0).toLocaleString()}</span>
              </div>
              {claim.totalApproved != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800 }}>
                  <span>Total Approved</span>
                  <span style={{ color: '#059669' }}>${(claim.totalApproved || 0).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Parts table */}
          {claim.parts?.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Parts</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #e8e9ec' }}>
                    {['Part #', 'Description', 'Qty', 'Unit', 'Total'].map(h => (
                      <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {claim.parts.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f0f1f3' }}>
                      <td style={{ padding: '5px 8px', color: '#6b7280' }}>{p.partNumber || '—'}</td>
                      <td style={{ padding: '5px 8px' }}>{p.description}</td>
                      <td style={{ padding: '5px 8px' }}>{p.qty}</td>
                      <td style={{ padding: '5px 8px' }}>${(p.unitCost || 0).toFixed(2)}</td>
                      <td style={{ padding: '5px 8px', fontWeight: 600 }}>${((p.qty || 0) * (p.unitCost || 0)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Notes */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes</div>
              <button onClick={() => setEditNotes(v => !v)}
                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                {editNotes ? 'Cancel' : 'Edit'}
              </button>
            </div>
            {editNotes ? (
              <div>
                <textarea value={notesVal} onChange={e => setNotesVal(e.target.value)} rows={4}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                <button onClick={() => { update({ notes: notesVal, _log: 'Notes updated' }); setEditNotes(false) }}
                  style={{ marginTop: 8, padding: '6px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                  Save Notes
                </button>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>{claim.notes || 'No notes.'}</p>
            )}
          </div>

          {/* Activity log */}
          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Activity Log</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(claim.activityLog || []).slice().reverse().map((entry, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb', marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <span style={{ color: '#374151', fontWeight: 600 }}>{entry.action}</span>
                    <span style={{ color: '#9ca3af', marginLeft: 6 }}>by {entry.by}</span>
                    <div style={{ color: '#9ca3af' }}>{fmtDate(entry.at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab 4: Providers ──────────────────────────────────────────────────────────
const EMPTY_PROVIDER = {
  name: '', contactPerson: '', phone: '', email: '',
  submissionMethod: 'Portal', portalUrl: '',
  accountNumber: '', standardLaborRate: '', standardTripCharge: 0,
  avgApprovalDays: '', approvalRate: '',
  notes: '',
}

function Providers() {
  const [providers, setProviders] = useState(() => getWarrantyProviders())
  const [editing, setEditing] = useState(null) // provider object or null
  const [form, setForm] = useState(EMPTY_PROVIDER)

  function startEdit(p) { setEditing(p); setForm({ ...p }) }
  function startNew() { setEditing('new'); setForm({ ...EMPTY_PROVIDER }) }
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function save() {
    const p = editing === 'new'
      ? { ...form, id: `wp-${Date.now()}` }
      : { ...form, id: editing.id }
    saveWarrantyProvider(p)
    setProviders(getWarrantyProviders())
    setEditing(null)
  }

  const inp = (extra = {}) => ({
    style: { width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', ...extra.style },
    ...extra,
  })

  if (editing) {
    return (
      <div style={{ maxWidth: 680 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setEditing(null)}
            style={{ padding: '6px 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
            ← Back
          </button>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1d23', margin: 0 }}>
            {editing === 'new' ? 'Add Provider' : `Edit: ${editing.name}`}
          </h2>
        </div>
        <div style={card}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['Provider Name', 'name'],
              ['Contact Person', 'contactPerson'],
              ['Phone', 'phone'],
              ['Email', 'email'],
              ['Account #', 'accountNumber'],
            ].map(([label, key]) => (
              <div key={key}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{label}</label>
                <input {...inp()} value={form[key]} onChange={e => setF(key, e.target.value)} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Submission Method</label>
              <select value={form.submissionMethod} onChange={e => setF('submissionMethod', e.target.value)} style={{ ...inp().style }}>
                <option>Portal</option>
                <option>Email</option>
                <option>Phone</option>
                <option>Mail</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Portal URL</label>
              <input {...inp()} value={form.portalUrl} onChange={e => setF('portalUrl', e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Standard Labor Rate</label>
              <input {...inp()} type="number" value={form.standardLaborRate} onChange={e => setF('standardLaborRate', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Standard Trip Charge</label>
              <input {...inp()} type="number" value={form.standardTripCharge} onChange={e => setF('standardTripCharge', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Avg Approval Days</label>
              <input {...inp()} type="number" value={form.avgApprovalDays} onChange={e => setF('avgApprovalDays', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Approval Rate (%)</label>
              <input {...inp()} type="number" min="0" max="100" value={form.approvalRate} onChange={e => setF('approvalRate', e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Notes</label>
            <textarea {...inp()} rows={3} value={form.notes} onChange={e => setF('notes', e.target.value)} style={{ ...inp().style, resize: 'vertical' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={() => setEditing(null)}
            style={{ padding: '8px 18px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
            Cancel
          </button>
          <button onClick={save}
            style={{ padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
            Save Provider
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={startNew}
          style={{ padding: '7px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
          + Add Provider
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 16 }}>
        {providers.map(p => (
          <div key={p.id} style={{ ...card, marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1d23' }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{p.contactPerson}</div>
              </div>
              <button onClick={() => startEdit(p)}
                style={{ padding: '4px 10px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                Edit
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                ['Phone', p.phone],
                ['Email', p.email],
                ['Method', p.submissionMethod],
                ['Account #', p.accountNumber],
                ['Labor Rate', `$${p.standardLaborRate}/hr`],
                ['Trip Charge', `$${p.standardTripCharge}`],
              ].map(([k, v]) => v ? (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#9ca3af' }}>{k}</span>
                  <span style={{ color: '#374151' }}>{v}</span>
                </div>
              ) : null)}
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 5, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#059669' }}>{p.approvalRate}%</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>Approval Rate</div>
              </div>
              <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 5, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#2563eb' }}>{p.avgApprovalDays}d</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>Avg. Approval</div>
              </div>
            </div>
            {p.notes && <div style={{ marginTop: 10, fontSize: 11, color: '#6b7280', borderTop: '1px solid #f3f4f6', paddingTop: 8 }}>{p.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab 5: Reports ────────────────────────────────────────────────────────────
function WarrantyReports() {
  const claims = useMemo(() => getWarrantyClaims(), [])

  const byProvider = useMemo(() => {
    const m = {}
    claims.forEach(c => {
      const k = c.warrantyProvider || 'Unknown'
      if (!m[k]) m[k] = { count: 0, claimed: 0, approved: 0, paid: 0 }
      m[k].count++
      m[k].claimed += c.totalClaimed || 0
      m[k].approved += c.totalApproved || 0
      if (c.status === 'paid') m[k].paid += c.totalApproved || 0
    })
    return Object.entries(m).map(([name, v]) => ({ name, ...v, rate: v.count ? Math.round((v.approved / (v.claimed || 1)) * 100) : 0 }))
      .sort((a, b) => b.claimed - a.claimed)
  }, [claims])

  const byStatus = useMemo(() => {
    const m = {}
    claims.forEach(c => { m[c.status] = (m[c.status] || 0) + 1 })
    return m
  }, [claims])

  const totalClaimed = claims.reduce((s, c) => s + (c.totalClaimed || 0), 0)
  const totalApproved = claims.reduce((s, c) => s + (c.totalApproved || 0), 0)
  const approvalRate = totalClaimed > 0 ? Math.round((totalApproved / totalClaimed) * 100) : 0

  return (
    <div>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Claims', value: claims.length, color: '#2563eb' },
          { label: 'Total Claimed', value: `$${totalClaimed.toLocaleString()}`, color: '#374151' },
          { label: 'Total Approved', value: `$${totalApproved.toLocaleString()}`, color: '#059669' },
          { label: 'Approval Rate', value: `${approvalRate}%`, color: approvalRate >= 80 ? '#059669' : approvalRate >= 60 ? '#d97706' : '#dc2626' },
        ].map(k => (
          <div key={k.label} style={{ ...card, marginBottom: 0, textAlign: 'center', padding: '18px 16px' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Claims by Status</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CLAIM_STATUSES.map(s => {
              const count = byStatus[s.code] || 0
              const pct = claims.length ? Math.round((count / claims.length) * 100) : 0
              return (
                <div key={s.code}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: s.color, fontWeight: 600 }}>{s.label}</span>
                    <span style={{ color: '#374151', fontWeight: 700 }}>{count}</span>
                  </div>
                  <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: s.color, borderRadius: 3 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>By Provider</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e8e9ec' }}>
                {['Provider', 'Claims', 'Claimed', 'Approved', 'Rate'].map(h => (
                  <th key={h} style={{ padding: '5px 6px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byProvider.map(p => (
                <tr key={p.name} style={{ borderBottom: '1px solid #f0f1f3' }}>
                  <td style={{ padding: '7px 6px', fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: '7px 6px', color: '#374151' }}>{p.count}</td>
                  <td style={{ padding: '7px 6px', color: '#374151' }}>${p.claimed.toLocaleString()}</td>
                  <td style={{ padding: '7px 6px', color: '#059669', fontWeight: 600 }}>${p.approved.toLocaleString()}</td>
                  <td style={{ padding: '7px 6px' }}>
                    <span style={{ color: p.rate >= 80 ? '#059669' : p.rate >= 60 ? '#d97706' : '#dc2626', fontWeight: 700 }}>{p.rate}%</span>
                  </td>
                </tr>
              ))}
              {byProvider.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>No data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Main Warranty Page ────────────────────────────────────────────────────────
const TABS = ['All Claims', 'Create Claim', 'Providers', 'Reports']

export default function Warranty() {
  const [tab, setTab] = useState(0)
  const [detailClaim, setDetailClaim] = useState(null)

  function handleDetail(claim) {
    setDetailClaim(claim)
    setTab(-1)
  }

  function handleCreated(claim) {
    setDetailClaim(claim)
    setTab(-1)
  }

  if (tab === -1 && detailClaim) {
    return (
      <div>
        <TabBar tab={tab} setTab={t => { setDetailClaim(null); setTab(t) }} />
        <div style={{ marginTop: 20 }}>
          <ClaimDetail claim={detailClaim} onBack={() => { setDetailClaim(null); setTab(0) }} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Warranty Claims</h1>
      </div>
      <TabBar tab={tab} setTab={setTab} />
      <div style={{ marginTop: 20 }}>
        {tab === 0 && <AllClaims onDetail={handleDetail} />}
        {tab === 1 && <CreateClaim onCreated={handleCreated} />}
        {tab === 2 && <Providers />}
        {tab === 3 && <WarrantyReports />}
      </div>
    </div>
  )
}

function TabBar({ tab, setTab }) {
  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e8e9ec' }}>
      {TABS.map((t, i) => (
        <button key={t} onClick={() => setTab(i)}
          style={{
            padding: '9px 20px', background: 'none', border: 'none',
            borderBottom: tab === i ? '2px solid #2563eb' : '2px solid transparent',
            marginBottom: -2,
            color: tab === i ? '#2563eb' : '#6b7280',
            fontWeight: tab === i ? 700 : 500,
            fontSize: 13, cursor: 'pointer',
          }}>
          {t}
        </button>
      ))}
    </div>
  )
}
