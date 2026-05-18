import { useState, useMemo } from 'react'
import {
  getEquipment, saveEquipmentList, saveEquipmentItem,
  deleteEquipmentItem, generateEquipmentId, getServiceCalls,
} from '../data/store'
import { useAuth } from '../auth/AuthContext'

// ── Constants ─────────────────────────────────────────────────────────────────
const EQUIPMENT_ABBREV = {
  'Washer': 'WSH', 'Dryer': 'DR', 'Refrigerator': 'REF',
  'Dishwasher': 'DW', 'Microwave': 'MW', 'Oven': 'OVN',
  'Stove': 'STV', 'HVAC': 'HVAC', 'Furnace': 'FURN',
  'Water Heater': 'WH', 'Garbage Disposal': 'GD', 'Freezer': 'FRZ',
  'AC Unit': 'AC', 'Boiler': 'BLR', 'Elec. Panel': 'PANEL',
}
const EQ_TYPES   = Object.keys(EQUIPMENT_ABBREV)
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical', 'Not Repairable']
const BRANDS     = ['WHIRLPOOL', 'MAYTAG', 'LG', 'SAMSUNG', 'GE', 'FRIGIDAIRE', 'BOSCH',
                    'ADMIRAL', 'ALLIANCE', 'SPEED QUEEN', 'CARRIER', 'LENNOX', 'TRANE',
                    'RHEEM', 'A.O. SMITH', 'Other']
const WARRANTY_TYPES = ['none', 'manufacturer', 'extended', 'home_warranty']

const COND_STYLES = {
  Excellent:      { bg: '#f0fdf4', color: '#16a34a' },
  Good:           { bg: '#f0fdf4', color: '#16a34a' },
  Fair:           { bg: '#fffbeb', color: '#d97706' },
  Poor:           { bg: '#fff7ed', color: '#ea580c' },
  Critical:       { bg: '#fef2f2', color: '#dc2626' },
  'Not Repairable':{ bg: '#f3f4f6', color: '#6b7280' },
}

function condBadge(cond) {
  const s = COND_STYLES[cond] || { bg: '#f3f4f6', color: '#6b7280' }
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color }}>{cond || 'Unknown'}</span>
}
function warrantyBadge(eq) {
  if (!eq.warrantyEnd) return <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>None</span>
  const now = Date.now()
  const end = eq.warrantyEnd
  const diff = end - now
  const days = Math.floor(diff / 86400000)
  if (diff < 0) return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#fef2f2', color: '#dc2626' }}>Expired</span>
  if (days <= 30) return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#fffbeb', color: '#d97706' }}>Expiring Soon ({days}d)</span>
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#f0fdf4', color: '#16a34a' }}>Active</span>
}
function calcAge(installDate) {
  if (!installDate) return '—'
  const ms = Date.now() - installDate
  const days = Math.floor(ms / 86400000)
  const years = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  if (years === 0) return `${months} mo`
  if (months === 0) return `${years} yr`
  return `${years}y ${months}m`
}
function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtTs(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
}

// ── Add / Edit Equipment Form ─────────────────────────────────────────────────
function EquipmentForm({ initial, onSave, onCancel }) {
  const blank = {
    customerId: '', customerName: '', propertyAddress: '',
    type: 'Washer', typeAbbrev: 'WSH', brand: 'WHIRLPOOL', model: '', serialNumber: '',
    color: '', installDate: '', purchasePrice: '', purchasedFrom: '',
    warrantyType: 'none', warrantyProvider: '', warrantyStart: '', warrantyEnd: '',
    warrantyCoverage: '', condition: 'Good', notes: '',
  }
  const [form, setForm] = useState(initial ? {
    ...blank, ...initial,
    installDate: initial.installDate ? new Date(initial.installDate).toISOString().slice(0, 10) : '',
    warrantyStart: initial.warrantyStart ? new Date(initial.warrantyStart).toISOString().slice(0, 10) : '',
    warrantyEnd: initial.warrantyEnd ? new Date(initial.warrantyEnd).toISOString().slice(0, 10) : '',
  } : blank)

  function set(k, v) {
    setForm(f => {
      const next = { ...f, [k]: v }
      if (k === 'type') next.typeAbbrev = EQUIPMENT_ABBREV[v] || v.slice(0, 4).toUpperCase()
      return next
    })
  }

  function handleSave(e) {
    e.preventDefault()
    if (!form.customerName.trim()) return alert('Customer name is required.')
    if (!form.serialNumber.trim()) return alert('Serial number is required.')
    const ts = (d) => d ? new Date(d + 'T12:00:00').getTime() : null
    onSave({
      ...form,
      installDate: ts(form.installDate),
      warrantyStart: ts(form.warrantyStart),
      warrantyEnd: ts(form.warrantyEnd),
      purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : null,
    })
  }

  const showWarranty = form.warrantyType !== 'none'

  return (
    <form onSubmit={handleSave}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Customer */}
        <div style={{ gridColumn: 'span 2' }}>
          <p style={sectionHeadStyle}>Customer & Location</p>
        </div>
        <div>
          <label style={lbl}>Customer Name *</label>
          <input value={form.customerName} onChange={e => set('customerName', e.target.value)} required style={{ ...inp, marginTop: 4 }} placeholder="Customer name" />
        </div>
        <div>
          <label style={lbl}>Property Address</label>
          <input value={form.propertyAddress} onChange={e => set('propertyAddress', e.target.value)} style={{ ...inp, marginTop: 4 }} placeholder="123 Main St" />
        </div>

        {/* Equipment details */}
        <div style={{ gridColumn: 'span 2', marginTop: 8 }}>
          <p style={sectionHeadStyle}>Equipment Details</p>
        </div>
        <div>
          <label style={lbl}>Type *</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} style={{ ...inp, marginTop: 4 }}>
            {EQ_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Brand</label>
          <input value={form.brand} onChange={e => set('brand', e.target.value)} list="brands-list" style={{ ...inp, marginTop: 4 }} />
          <datalist id="brands-list">{BRANDS.map(b => <option key={b} value={b} />)}</datalist>
        </div>
        <div>
          <label style={lbl}>Model Number</label>
          <input value={form.model} onChange={e => set('model', e.target.value)} style={{ ...inp, marginTop: 4 }} placeholder="Model #" />
        </div>
        <div>
          <label style={lbl}>Serial Number *</label>
          <input value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)} required style={{ ...inp, marginTop: 4 }} placeholder="Serial #" />
        </div>
        <div>
          <label style={lbl}>Color / Finish</label>
          <input value={form.color} onChange={e => set('color', e.target.value)} style={{ ...inp, marginTop: 4 }} placeholder="White, Black, SS…" />
        </div>
        <div>
          <label style={lbl}>Install Date</label>
          <input type="date" value={form.installDate} onChange={e => set('installDate', e.target.value)} style={{ ...inp, marginTop: 4 }} />
        </div>
        <div>
          <label style={lbl}>Purchase Price ($)</label>
          <input type="number" value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} style={{ ...inp, marginTop: 4 }} placeholder="0.00" />
        </div>
        <div>
          <label style={lbl}>Purchased From</label>
          <input value={form.purchasedFrom} onChange={e => set('purchasedFrom', e.target.value)} style={{ ...inp, marginTop: 4 }} placeholder="Home Depot, etc." />
        </div>

        {/* Warranty */}
        <div style={{ gridColumn: 'span 2', marginTop: 8 }}>
          <p style={sectionHeadStyle}>Warranty</p>
        </div>
        <div>
          <label style={lbl}>Warranty Type</label>
          <select value={form.warrantyType} onChange={e => set('warrantyType', e.target.value)} style={{ ...inp, marginTop: 4 }}>
            <option value="none">No Warranty</option>
            <option value="manufacturer">Manufacturer</option>
            <option value="extended">Extended</option>
            <option value="home_warranty">Home Warranty</option>
          </select>
        </div>
        {showWarranty && <>
          <div>
            <label style={lbl}>Warranty Provider</label>
            <input value={form.warrantyProvider} onChange={e => set('warrantyProvider', e.target.value)} style={{ ...inp, marginTop: 4 }} placeholder="e.g. Whirlpool, SquareTrade" />
          </div>
          <div>
            <label style={lbl}>Warranty Start</label>
            <input type="date" value={form.warrantyStart} onChange={e => set('warrantyStart', e.target.value)} style={{ ...inp, marginTop: 4 }} />
          </div>
          <div>
            <label style={lbl}>Warranty End</label>
            <input type="date" value={form.warrantyEnd} onChange={e => set('warrantyEnd', e.target.value)} style={{ ...inp, marginTop: 4 }} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={lbl}>Coverage Details</label>
            <textarea value={form.warrantyCoverage} onChange={e => set('warrantyCoverage', e.target.value)} rows={2} style={{ ...inp, marginTop: 4, resize: 'vertical' }} placeholder="What is covered…" />
          </div>
        </>}

        {/* Condition */}
        <div style={{ gridColumn: 'span 2', marginTop: 8 }}>
          <p style={sectionHeadStyle}>Initial Condition</p>
        </div>
        <div>
          <label style={lbl}>Condition</label>
          <select value={form.condition} onChange={e => set('condition', e.target.value)} style={{ ...inp, marginTop: 4 }}>
            {CONDITIONS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={lbl}>Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} style={{ ...inp, marginTop: 4, resize: 'vertical' }} placeholder="Any additional notes…" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button type="submit" style={btnPrimary}>Save Equipment</button>
        <button type="button" onClick={onCancel} style={btnSec}>Cancel</button>
      </div>
    </form>
  )
}

// ── Equipment Detail View ─────────────────────────────────────────────────────
function EquipmentDetail({ eq, allCalls, onBack, onUpdate }) {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [condNote, setCondNote] = useState('')
  const [newCond, setNewCond] = useState(eq.condition || 'Good')

  // Service calls for this unit
  const unitCalls = useMemo(() =>
    allCalls.filter(c => (c.callId || c.id) && eq.serviceCallIds && eq.serviceCallIds.includes(String(c.callId || c.id)))
  , [allCalls, eq])

  const totalRepairCost = eq.partsHistory ? eq.partsHistory.reduce((s, p) => s + (p.cost || 0), 0) : 0
  const repairRatio = eq.purchasePrice ? totalRepairCost / eq.purchasePrice : 0

  // Recurring issues detection
  const partCounts = {}
  ;(eq.partsHistory || []).forEach(p => {
    partCounts[p.partName] = (partCounts[p.partName] || 0) + 1
  })
  const recurringParts = Object.entries(partCounts).filter(([, c]) => c >= 2)

  function handleConditionUpdate() {
    if (!condNote.trim()) return
    const entry = { condition: newCond, note: condNote, changedBy: user?.name || 'Admin', changedAt: Date.now() }
    const updated = { ...eq, condition: newCond, conditionHistory: [...(eq.conditionHistory || []), entry], updatedAt: Date.now() }
    onUpdate(updated)
    setCondNote('')
  }

  function handleFlag() {
    const reason = prompt('Reason for flagging as Not Repairable:')
    if (!reason) return
    onUpdate({ ...eq, isFlagged: true, flagReason: reason, condition: 'Not Repairable', updatedAt: Date.now() })
  }

  if (editing) {
    return (
      <div>
        <button onClick={() => setEditing(false)} style={{ ...btnSec, marginBottom: 16, fontSize: 12 }}>← Back to Detail</button>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Edit {eq.equipmentId}</h2>
        <EquipmentForm
          initial={eq}
          onSave={(data) => {
            onUpdate({ ...eq, ...data, updatedAt: Date.now() })
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <div>
      {/* Back + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ ...btnSec, fontSize: 12 }}>← Back to Registry</button>
        <div style={{ flex: 1 }} />
        <button onClick={() => setEditing(true)} style={btnSec}>Edit</button>
        {!eq.isFlagged && (
          <button onClick={handleFlag} style={{ ...btnSec, color: '#dc2626', borderColor: '#fca5a5' }}>Flag Not Repairable</button>
        )}
      </div>

      {/* Flag warning */}
      {eq.isFlagged && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
          ⛔ NOT REPAIRABLE — {eq.flagReason}
        </div>
      )}

      {repairRatio >= 1 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#dc2626' }}>
          🔴 <strong>Replacement recommended</strong> — Total repairs (${totalRepairCost}) exceed unit value (${eq.purchasePrice || 0})
        </div>
      )}
      {repairRatio >= 0.5 && repairRatio < 1 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#d97706' }}>
          ⚠️ <strong>Consider replacement</strong> — Total repairs (${totalRepairCost}) are {Math.round(repairRatio * 100)}% of unit value (${eq.purchasePrice || 0})
        </div>
      )}

      {recurringParts.length > 0 && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#ea580c' }}>
          {recurringParts.map(([name, count]) => (
            <div key={name}>⚠️ <strong>Recurring issue:</strong> {name} replaced {count} times</div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Left column */}
        <div style={{ flex: 2, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Equipment Info */}
          <div style={card}>
            <p style={cardTitle}>{eq.equipmentId} — {eq.brand} {eq.model}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 13 }}>
              <InfoRow label="Type" value={`${eq.type} (${eq.typeAbbrev})`} />
              <InfoRow label="Brand" value={eq.brand} />
              <InfoRow label="Model" value={eq.model || '—'} />
              <InfoRow label="Serial #" value={eq.serialNumber} />
              <InfoRow label="Color" value={eq.color || '—'} />
              <InfoRow label="Install Date" value={fmtDate(eq.installDate)} />
              <InfoRow label="Age" value={calcAge(eq.installDate)} />
              <InfoRow label="Purchase Price" value={eq.purchasePrice ? `$${eq.purchasePrice.toLocaleString()}` : '—'} />
              <InfoRow label="Purchased From" value={eq.purchasedFrom || '—'} />
              <InfoRow label="Condition" value={condBadge(eq.condition)} />
            </div>
            {eq.notes && <p style={{ fontSize: 12.5, color: '#6b7280', marginTop: 8, fontStyle: 'italic' }}>{eq.notes}</p>}
          </div>

          {/* Warranty */}
          <div style={card}>
            <p style={cardTitle}>Warranty</p>
            {eq.warrantyType === 'none' ? (
              <p style={{ fontSize: 13, color: '#9ca3af' }}>No warranty on file.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 13 }}>
                <InfoRow label="Type" value={eq.warrantyType?.replace('_', ' ')} />
                <InfoRow label="Provider" value={eq.warrantyProvider || '—'} />
                <InfoRow label="Start" value={fmtDate(eq.warrantyStart)} />
                <InfoRow label="End" value={fmtDate(eq.warrantyEnd)} />
                <InfoRow label="Status" value={warrantyBadge(eq)} />
                {eq.warrantyCoverage && <div style={{ gridColumn: 'span 2' }}><InfoRow label="Coverage" value={eq.warrantyCoverage} /></div>}
              </div>
            )}
          </div>

          {/* Service History Timeline */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ ...cardTitle, margin: 0 }}>Service History</p>
              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#6b7280' }}>
                <span>{unitCalls.length} calls</span>
                <span>Total spent: <strong style={{ color: '#1a1d23' }}>${totalRepairCost}</strong></span>
              </div>
            </div>
            {unitCalls.length === 0 && <p style={{ fontSize: 12.5, color: '#9ca3af' }}>No service calls linked to this unit yet.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {unitCalls.map(c => {
                const parts = (c.partsHistory || c.lineItems || [])
                return (
                  <div key={c.callId || c.id} style={{ borderLeft: '3px solid #2563eb', paddingLeft: 12, paddingBottom: 4 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#2563eb' }}>#{c.callId || c.id}</span>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{c.createdDate || fmtDate(c.createdAt)}</span>
                      <span style={{ fontSize: 12, color: '#374151' }}>· {c.techId ? `${c.techId} ${c.techName}` : (c.techName || '—')}</span>
                    </div>
                    <p style={{ fontSize: 12.5, color: '#1a1d23', margin: '3px 0' }}>{c.description || '—'}</p>
                    {parts.length > 0 && (
                      <p style={{ fontSize: 11.5, color: '#6b7280', margin: 0 }}>
                        Parts: {parts.slice(0, 3).map(p => p.description || p.partName).join(', ')}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Parts History */}
          {eq.partsHistory && eq.partsHistory.length > 0 && (
            <div style={card}>
              <p style={cardTitle}>Parts History</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f0f1f3' }}>
                    <th style={th}>Part</th><th style={th}>Date</th><th style={th}>Cost</th><th style={th}>Tech</th>
                  </tr>
                </thead>
                <tbody>
                  {[...eq.partsHistory].sort((a, b) => b.date - a.date).map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                      <td style={td}>{p.partName}{p.note ? <span style={{ color: '#9ca3af', fontSize: 11 }}> — {p.note}</span> : null}</td>
                      <td style={{ ...td, color: '#6b7280' }}>{fmtDate(p.date)}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{p.cost ? `$${p.cost}` : 'Free'}</td>
                      <td style={{ ...td, color: '#6b7280' }}>{p.techName || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Customer */}
          <div style={card}>
            <p style={cardTitle}>Customer</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1d23', margin: '0 0 4px', textTransform: 'uppercase' }}>{eq.customerName}</p>
            <p style={{ fontSize: 12.5, color: '#6b7280', margin: 0 }}>{eq.propertyAddress}</p>
          </div>

          {/* Condition Assessment */}
          <div style={card}>
            <p style={cardTitle}>Condition Assessment</p>
            <div style={{ marginBottom: 10 }}>
              {condBadge(eq.condition)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {[...(eq.conditionHistory || [])].reverse().slice(0, 3).map((h, i) => (
                <div key={i} style={{ fontSize: 12, color: '#374151' }}>
                  <span style={{ fontWeight: 600 }}>{h.condition}</span> — {h.note}
                  <span style={{ color: '#9ca3af', display: 'block', fontSize: 11 }}>{h.changedBy} · {fmtDate(h.changedAt)}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid #f0f1f3', paddingTop: 10 }}>
              <label style={lbl}>Update Condition</label>
              <select value={newCond} onChange={e => setNewCond(e.target.value)} style={{ ...inp, marginTop: 4, marginBottom: 6 }}>
                {CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
              <textarea value={condNote} onChange={e => setCondNote(e.target.value)} rows={2} placeholder="Reason for change…" style={{ ...inp, resize: 'none', marginBottom: 6 }} />
              <button onClick={handleConditionUpdate} style={{ ...btnPrimary, fontSize: 12, padding: '5px 12px' }}>Update</button>
            </div>
          </div>

          {/* Stats */}
          <div style={card}>
            <p style={cardTitle}>Repair Stats</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13 }}>
              <InfoRow label="Total Calls" value={unitCalls.length} />
              <InfoRow label="Parts Replaced" value={eq.partsHistory?.length || 0} />
              <InfoRow label="Total Cost" value={`$${totalRepairCost}`} />
              <InfoRow label="Unit Value" value={eq.purchasePrice ? `$${eq.purchasePrice}` : '—'} />
              {eq.purchasePrice && <InfoRow label="Cost Ratio" value={`${Math.round(repairRatio * 100)}%`} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Reports Tab ───────────────────────────────────────────────────────────────
function EquipmentReports({ equipment }) {
  // Most serviced
  const byCallCount = [...equipment].sort((a, b) => (b.serviceCallIds?.length || 0) - (a.serviceCallIds?.length || 0)).slice(0, 10)

  // Most expensive
  const byCost = [...equipment].map(e => ({
    ...e, totalCost: (e.partsHistory || []).reduce((s, p) => s + (p.cost || 0), 0),
  })).sort((a, b) => b.totalCost - a.totalCost).slice(0, 10)

  // Brand breakdown
  const byBrand = {}
  equipment.forEach(e => {
    if (!byBrand[e.brand]) byBrand[e.brand] = { count: 0, calls: 0 }
    byBrand[e.brand].count++
    byBrand[e.brand].calls += e.serviceCallIds?.length || 0
  })
  const brandData = Object.entries(byBrand).map(([brand, d]) => ({
    brand, count: d.count,
    avgCalls: d.count ? (d.calls / d.count).toFixed(1) : 0,
  })).sort((a, b) => b.count - a.count)

  // Expiring warranty (next 90 days)
  const expiringSoon = equipment.filter(e => {
    if (!e.warrantyEnd) return false
    const days = Math.floor((e.warrantyEnd - Date.now()) / 86400000)
    return days >= 0 && days <= 90
  }).sort((a, b) => a.warrantyEnd - b.warrantyEnd)

  const Section = ({ title, children }) => (
    <div style={{ ...card, marginBottom: 20 }}>
      <p style={{ ...cardTitle, marginBottom: 12 }}>{title}</p>
      {children}
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <Section title="Most Serviced Units (Top 10)">
        {byCallCount.map((e, i) => (
          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid #f0f1f3' }}>
            <span style={{ color: '#374151' }}>{i + 1}. {e.equipmentId} — {e.brand} {e.type} (S/N: {e.serialNumber})</span>
            <span style={{ fontWeight: 700, color: '#2563eb' }}>{e.serviceCallIds?.length || 0} calls</span>
          </div>
        ))}
        {byCallCount.length === 0 && <p style={{ color: '#9ca3af', fontSize: 13 }}>No data yet.</p>}
      </Section>

      <Section title="Most Expensive to Maintain (Top 10)">
        {byCost.filter(e => e.totalCost > 0).map((e, i) => (
          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid #f0f1f3' }}>
            <span style={{ color: '#374151' }}>{i + 1}. {e.equipmentId} — {e.brand} {e.type}</span>
            <span style={{ fontWeight: 700, color: '#ea580c' }}>${e.totalCost}</span>
          </div>
        ))}
        {byCost.filter(e => e.totalCost > 0).length === 0 && <p style={{ color: '#9ca3af', fontSize: 13 }}>No parts cost data.</p>}
      </Section>

      <Section title="Brand Reliability">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ borderBottom: '1px solid #f0f1f3' }}>
            <th style={th}>Brand</th><th style={th}>Units</th><th style={th}>Avg Calls / Unit</th>
          </tr></thead>
          <tbody>
            {brandData.map(b => (
              <tr key={b.brand} style={{ borderBottom: '1px solid #f9fafb' }}>
                <td style={td}>{b.brand}</td>
                <td style={td}>{b.count}</td>
                <td style={{ ...td, fontWeight: 600, color: Number(b.avgCalls) > 2 ? '#dc2626' : '#16a34a' }}>{b.avgCalls}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Warranty Expiring (Next 90 Days)">
        {expiringSoon.length === 0 && <p style={{ color: '#16a34a', fontSize: 13 }}>No warranties expiring in the next 90 days.</p>}
        {expiringSoon.map(e => {
          const days = Math.floor((e.warrantyEnd - Date.now()) / 86400000)
          return (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid #f0f1f3' }}>
              <span style={{ color: '#374151' }}>{e.equipmentId} — {e.brand} · {e.customerName}</span>
              <span style={{ fontWeight: 700, color: days <= 30 ? '#dc2626' : '#d97706' }}>Expires in {days}d</span>
            </div>
          )
        })}
      </Section>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Equipment() {
  const { user } = useAuth()
  const [equipment, setEquipment] = useState(() => getEquipment())
  const [allCalls]                = useState(() => getServiceCalls())
  const [tab, setTab]             = useState('registry')
  const [detailEq, setDetailEq]   = useState(null)
  const [search, setSearch]       = useState('')
  const [fType, setFType]         = useState('All')
  const [fBrand, setFBrand]       = useState('All')
  const [fWarranty, setFWarranty] = useState('All')
  const [fCond, setFCond]         = useState('All')
  const [toast, setToast]         = useState(null)

  function reload() { setEquipment(getEquipment()) }
  function flash(msg) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  function handleSaveNew(formData) {
    const id = `eq-${Date.now()}`
    const equipmentId = generateEquipmentId()
    const record = {
      id, equipmentId,
      serviceCallIds: [], partsHistory: [], conditionHistory: [], documents: [],
      isFlagged: false, flagReason: '',
      createdAt: Date.now(), updatedAt: Date.now(),
      ...formData,
      conditionHistory: [{ condition: formData.condition, note: 'Initial assessment', changedBy: user?.name || 'Admin', changedAt: Date.now() }],
    }
    saveEquipmentItem(record)
    reload()
    setTab('registry')
    flash(`${equipmentId} registered.`)
  }

  function handleUpdate(updated) {
    saveEquipmentItem(updated)
    reload()
    setDetailEq(updated)
    flash('Equipment updated.')
  }

  const typeOptions  = useMemo(() => ['All', ...new Set(equipment.map(e => e.type).filter(Boolean))], [equipment])
  const brandOptions = useMemo(() => ['All', ...new Set(equipment.map(e => e.brand).filter(Boolean))], [equipment])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return equipment.filter(e => {
      if (q && !`${e.serialNumber} ${e.model} ${e.brand} ${e.customerName}`.toLowerCase().includes(q)) return false
      if (fType !== 'All' && e.type !== fType) return false
      if (fBrand !== 'All' && e.brand !== fBrand) return false
      if (fCond !== 'All' && e.condition !== fCond) return false
      if (fWarranty !== 'All') {
        if (fWarranty === 'Under Warranty' && !(e.warrantyEnd && e.warrantyEnd > Date.now())) return false
        if (fWarranty === 'Out of Warranty' && !(e.warrantyEnd && e.warrantyEnd <= Date.now())) return false
        if (fWarranty === 'None' && e.warrantyType !== 'none') return false
      }
      return true
    })
  }, [equipment, search, fType, fBrand, fWarranty, fCond])

  // Summary stats
  const totalCount    = equipment.length
  const underWarranty = equipment.filter(e => e.warrantyEnd && e.warrantyEnd > Date.now()).length
  const serviceDue    = equipment.filter(e => {
    if (!e.installDate) return false
    const months = Math.floor((Date.now() - e.installDate) / (86400000 * 30))
    return months % 12 < 1
  }).length
  const notRepairable = equipment.filter(e => e.isFlagged || e.condition === 'Not Repairable').length

  if (detailEq) {
    return (
      <EquipmentDetail
        eq={detailEq}
        allCalls={allCalls}
        onBack={() => setDetailEq(null)}
        onUpdate={handleUpdate}
      />
    )
  }

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#1e293b', color: '#fff', padding: '10px 20px', borderRadius: 8, zIndex: 3000, fontSize: 13, fontWeight: 600 }}>{toast}</div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Registered', value: totalCount, color: '#2563eb', bg: '#eff6ff' },
          { label: 'Under Warranty', value: underWarranty, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Service Due This Mo.', value: serviceDue, color: '#d97706', bg: '#fffbeb' },
          { label: 'Not Repairable', value: notRepairable, color: '#dc2626', bg: '#fef2f2' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}30`, borderRadius: 10, padding: '14px 18px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e8e9ec', marginBottom: 20 }}>
        {[['registry', 'Equipment Registry'], ['add', '+ Add Equipment'], ['reports', 'Reports']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '9px 18px', fontSize: 13.5, fontWeight: 600,
            background: 'none', border: 'none', cursor: 'pointer',
            color: tab === t ? '#2563eb' : '#6b7280',
            borderBottom: tab === t ? '2px solid #2563eb' : '2px solid transparent',
            marginBottom: -2,
          }}>{label}</button>
        ))}
      </div>

      {/* Registry Tab */}
      {tab === 'registry' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search serial, model, brand, customer…"
              style={{ ...inp, flex: 2, minWidth: 200 }}
            />
            {[
              { label: 'Type', val: fType, set: setFType, opts: typeOptions },
              { label: 'Brand', val: fBrand, set: setFBrand, opts: brandOptions },
              { label: 'Warranty', val: fWarranty, set: setFWarranty, opts: ['All', 'Under Warranty', 'Out of Warranty', 'None'] },
              { label: 'Condition', val: fCond, set: setFCond, opts: ['All', ...CONDITIONS] },
            ].map(f => (
              <select key={f.label} value={f.val} onChange={e => f.set(e.target.value)} style={{ ...inp, flex: 1, minWidth: 120 }}>
                {f.opts.map(o => <option key={o}>{o}</option>)}
              </select>
            ))}
            <span style={{ fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>{filtered.length} of {equipment.length}</span>
          </div>

          {/* Table */}
          <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e8e9ec' }}>
                    {['ID', 'Brand + Model', 'Type', 'Serial #', 'Customer', 'Age', 'Warranty', 'Condition', 'Calls', 'Last Service', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, i) => {
                    const lastCall = allCalls.filter(c => e.serviceCallIds?.includes(String(c.callId || c.id))).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0]
                    return (
                      <tr key={e.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f1f3' }}>
                        <td style={{ ...td, fontWeight: 700 }}>
                          <span style={{ color: e.isFlagged ? '#dc2626' : '#2563eb' }}>
                            {e.isFlagged ? '⛔ ' : ''}{e.equipmentId}
                          </span>
                        </td>
                        <td style={td}>{e.brand} {e.model}</td>
                        <td style={td}><span style={{ fontSize: 11, fontWeight: 700, background: '#f0f4ff', color: '#2563eb', padding: '2px 7px', borderRadius: 10 }}>{e.typeAbbrev}</span> {e.type}</td>
                        <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{e.serialNumber}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{e.customerName}</td>
                        <td style={td}>{calcAge(e.installDate)}</td>
                        <td style={td}>{warrantyBadge(e)}</td>
                        <td style={td}>{condBadge(e.condition)}</td>
                        <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{e.serviceCallIds?.length || 0}</td>
                        <td style={{ ...td, color: '#6b7280' }}>{lastCall ? (lastCall.createdDate || fmtDate(lastCall.createdAt)) : '—'}</td>
                        <td style={td}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setDetailEq(e)} style={btnSmall}>View</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={11} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No equipment found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add Equipment Tab */}
      {tab === 'add' && (
        <div style={{ maxWidth: 700 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 18px' }}>Register New Equipment</h2>
          <EquipmentForm onSave={handleSaveNew} onCancel={() => setTab('registry')} />
        </div>
      )}

      {/* Reports Tab */}
      {tab === 'reports' && <EquipmentReports equipment={equipment} />}
    </div>
  )
}

// ── Shared micro-styles ───────────────────────────────────────────────────────
const lbl   = { fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px' }
const inp   = { width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: '#fff', boxSizing: 'border-box', outline: 'none' }
const btnPrimary = { padding: '8px 16px', background: '#1565C0', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const btnSec  = { padding: '7px 14px', background: '#f3f4f6', color: '#374151', border: '1px solid #e8e9ec', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }
const btnSmall = { padding: '4px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer' }
const sectionHeadStyle = { fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0 }
const card = { background: '#f9fafb', border: '1px solid #f0f1f3', borderRadius: 8, padding: '12px 14px' }
const cardTitle = { fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }
const th = { padding: '5px 0', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#6b7280' }
const td = { padding: '6px 0', fontSize: 12.5, color: '#1a1d23' }

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 12.5 }}>
      <span style={{ color: '#9ca3af', fontWeight: 600, minWidth: 90, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#374151', flex: 1 }}>{value}</span>
    </div>
  )
}
