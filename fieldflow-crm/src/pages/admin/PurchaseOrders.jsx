import { useState, useMemo } from 'react'
import { getNextNumber, formatPONumber } from '../../utils/numberGenerator'

// ─── Storage ───────────────────────────────────────────────────────────────────
const PO_KEY  = 'customsfieldpro_purchase_orders'
const SUP_KEY = 'customsfieldpro_suppliers'
const RET_KEY = 'customsfieldpro_po_returns'

function load(key) { try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null } }
function persist(key, val) { localStorage.setItem(key, JSON.stringify(val)) }

// ─── Sample Data ───────────────────────────────────────────────────────────────
const SAMPLE_SUPPLIERS = [
  { id: 's1', name: 'HVAC Supply Co', contact: 'John Miller', email: 'orders@hvacsupply.com', phone: '(555) 201-3040', address: '1204 Industrial Blvd, Dallas TX 75201', terms: 'Net 30', notes: 'Preferred HVAC parts supplier. 10% discount on orders over $500.', active: true },
  { id: 's2', name: 'Plumbing World',  contact: 'Sara Chen',   email: 'supply@plumbingworld.com', phone: '(555) 388-9210', address: '87 Commerce Dr, Dallas TX 75202', terms: 'Net 15', notes: 'Good for copper fittings and PVC pipe. Quick delivery.', active: true },
  { id: 's3', name: 'Electrical Plus', contact: 'Mike Torres', email: 'sales@electricalplus.com', phone: '(555) 477-1562', address: '3300 Supply Way, Dallas TX 75203', terms: 'Net 30', notes: 'Breakers, conduit, wire. Request quote for large orders.', active: true },
]

const SAMPLE_POS = [
  {
    id: 'po1', number: 'PO-2026-001', supplierId: 's1', supplierName: 'HVAC Supply Co',
    status: 'awaiting_delivery', createdAt: '2026-04-01', expectedDate: '2026-04-10',
    receivedDate: null, notes: 'Urgent restock for spring season',
    shippingCost: 45, tax: 38.50,
    items: [
      { id: 'i1', sku: 'FILT-16X25', description: 'Air Filter 16x25x1 MERV-8', qty: 24, unitCost: 6.50, received: 0 },
      { id: 'i2', sku: 'CAP-45MFD',  description: 'Run Capacitor 45/5 MFD',    qty: 10, unitCost: 12.00, received: 0 },
      { id: 'i3', sku: 'BELT-A38',   description: 'Blower Belt A38',           qty: 8,  unitCost: 4.25,  received: 0 },
    ],
    history: [
      { date: '2026-04-01', action: 'Created', user: 'Admin' },
      { date: '2026-04-02', action: 'Sent to supplier', user: 'Admin' },
    ],
  },
  {
    id: 'po2', number: 'PO-2026-002', supplierId: 's2', supplierName: 'Plumbing World',
    status: 'fully_received', createdAt: '2026-03-20', expectedDate: '2026-03-28',
    receivedDate: '2026-03-27', notes: '',
    shippingCost: 22, tax: 15.00,
    items: [
      { id: 'i4', sku: 'COPE-34',   description: '3/4" Copper Elbow 90°', qty: 50, unitCost: 1.80, received: 50 },
      { id: 'i5', sku: 'PVCM-12',   description: 'PVC Male Adapter 1/2"', qty: 30, unitCost: 0.95, received: 30 },
    ],
    history: [
      { date: '2026-03-20', action: 'Created', user: 'Admin' },
      { date: '2026-03-21', action: 'Sent to supplier', user: 'Admin' },
      { date: '2026-03-27', action: 'Fully received', user: 'Admin' },
    ],
  },
  {
    id: 'po3', number: 'PO-2026-003', supplierId: 's3', supplierName: 'Electrical Plus',
    status: 'draft', createdAt: '2026-04-09', expectedDate: '',
    receivedDate: null, notes: 'Pending approval from owner',
    shippingCost: 0, tax: 0,
    items: [
      { id: 'i6', sku: 'BRK-20A', description: '20A Single Pole Breaker', qty: 12, unitCost: 8.50, received: 0 },
      { id: 'i7', sku: 'WIRE-12', description: '12 AWG Wire (per ft)',    qty: 200, unitCost: 0.45, received: 0 },
    ],
    history: [
      { date: '2026-04-09', action: 'Created', user: 'Admin' },
    ],
  },
]

const SAMPLE_RETURNS = []

function initData() {
  if (!load(SUP_KEY)) persist(SUP_KEY, SAMPLE_SUPPLIERS)
  if (!load(PO_KEY))  persist(PO_KEY,  SAMPLE_POS)
  if (!load(RET_KEY)) persist(RET_KEY, SAMPLE_RETURNS)
}
initData()

// ─── Helpers ───────────────────────────────────────────────────────────────────
function generatePONumber(pos) {
  const year = new Date().getFullYear()
  const yearPos = pos.filter(p => p.number.startsWith(`PO-${year}-`))
  const max = yearPos.reduce((m, p) => {
    const n = parseInt(p.number.split('-')[2] || '0', 10)
    return Math.max(m, n)
  }, 0)
  return `PO-${year}-${String(max + 1).padStart(3, '0')}`
}

function fmtMoney(n) { return '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }
function fmtDate(s) { if (!s) return '—'; const d = new Date(s + 'T00:00:00'); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
function uid() { return Math.random().toString(36).slice(2, 10) }
function calcSubtotal(items) { return items.reduce((s, i) => s + i.qty * i.unitCost, 0) }
function calcTotal(po) { return calcSubtotal(po.items) + Number(po.shippingCost || 0) + Number(po.tax || 0) }

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  draft:              { label: 'Draft',              color: '#6b7280', bg: '#f3f4f6' },
  sent:               { label: 'Sent',               color: '#2563eb', bg: '#eff6ff' },
  awaiting_delivery:  { label: 'Awaiting Delivery',  color: '#d97706', bg: '#fffbeb' },
  partially_received: { label: 'Partially Received', color: '#7c3aed', bg: '#f5f3ff' },
  fully_received:     { label: 'Fully Received',     color: '#16a34a', bg: '#f0fdf4' },
  cancelled:          { label: 'Cancelled',          color: '#dc2626', bg: '#fef2f2' },
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS[status] || STATUS.draft
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: cfg.bg, color: cfg.color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

function Card({ children, style }) {
  return <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, ...style }}>{children}</div>
}

// ─── Email Modal ───────────────────────────────────────────────────────────────
function EmailModal({ po, supplier, onClose }) {
  const [to, setTo]   = useState(supplier?.email || '')
  const [msg, setMsg] = useState(`Hi ${supplier?.contact || 'there'},\n\nPlease find attached purchase order ${po.number} totalling ${fmtMoney(calcTotal(po))}.\n\nKindly confirm receipt and expected delivery date.\n\nThank you,\nCustomsFieldPro`)
  const [sent, setSent] = useState(false)

  function handleSend() {
    setSent(true)
    setTimeout(onClose, 1500)
  }

  return (
    <div style={overlay}>
      <div style={{ ...modal, maxWidth: 520 }}>
        <div style={modalHeader}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Email PO to Supplier</span>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#16a34a', fontWeight: 600 }}>
              <div style={{ fontSize: 32 }}>✓</div>
              Email sent successfully!
            </div>
          ) : (
            <>
              <label style={labelStyle}>To
                <input value={to} onChange={e => setTo(e.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>Subject
                <input defaultValue={`Purchase Order ${po.number} – CustomsFieldPro`} style={inputStyle} />
              </label>
              <label style={labelStyle}>Message
                <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={6} style={{ ...inputStyle, resize: 'vertical' }} />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button onClick={onClose} style={cancelBtn}>Cancel</button>
                <button onClick={handleSend} style={primaryBtn}>Send Email</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── PO Detail Slideout ────────────────────────────────────────────────────────
function PODetail({ po, suppliers, onClose, onUpdate }) {
  const supplier = suppliers.find(s => s.id === po.supplierId)
  const [emailOpen, setEmailOpen] = useState(false)
  const subtotal = calcSubtotal(po.items)
  const total    = calcTotal(po)

  function printPO() {
    const lines = po.items.map(i => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e8e9ec">${i.sku}</td>
        <td style="padding:8px;border-bottom:1px solid #e8e9ec">${i.description}</td>
        <td style="padding:8px;border-bottom:1px solid #e8e9ec;text-align:center">${i.qty}</td>
        <td style="padding:8px;border-bottom:1px solid #e8e9ec;text-align:right">${fmtMoney(i.unitCost)}</td>
        <td style="padding:8px;border-bottom:1px solid #e8e9ec;text-align:right">${fmtMoney(i.qty * i.unitCost)}</td>
      </tr>`).join('')
    const html = `<!DOCTYPE html><html><head><title>${po.number}</title>
      <style>body{font-family:sans-serif;padding:40px;color:#1a1d23}h1{color:#2563eb}table{width:100%;border-collapse:collapse}th{background:#f3f4f6;padding:8px;text-align:left;border-bottom:2px solid #e8e9ec}.totals{float:right;margin-top:16px;text-align:right}.totals td{padding:4px 8px}</style>
      </head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><h1>Purchase Order</h1><h2 style="margin:0;color:#1a1d23">${po.number}</h2></div>
        <div style="text-align:right"><div style="font-size:13px;color:#6b7280">Date: ${fmtDate(po.createdAt)}</div><div style="font-size:13px;color:#6b7280">Expected: ${fmtDate(po.expectedDate)}</div></div>
      </div>
      <div style="margin:24px 0;padding:16px;background:#f9fafb;border-radius:8px">
        <div style="font-weight:700;margin-bottom:4px">Supplier</div>
        <div>${supplier?.name || po.supplierName}</div>
        <div style="color:#6b7280;font-size:13px">${supplier?.address || ''}</div>
        <div style="color:#6b7280;font-size:13px">${supplier?.email || ''}</div>
      </div>
      <table><thead><tr>
        <th>SKU</th><th>Description</th><th style="text-align:center">Qty</th>
        <th style="text-align:right">Unit Cost</th><th style="text-align:right">Total</th>
      </tr></thead><tbody>${lines}</tbody></table>
      <table class="totals"><tr><td>Subtotal</td><td>${fmtMoney(subtotal)}</td></tr>
        <tr><td>Shipping</td><td>${fmtMoney(po.shippingCost)}</td></tr>
        <tr><td>Tax</td><td>${fmtMoney(po.tax)}</td></tr>
        <tr><td style="font-weight:700;border-top:2px solid #1a1d23;padding-top:8px">Total</td><td style="font-weight:700;border-top:2px solid #1a1d23;padding-top:8px">${fmtMoney(total)}</td></tr>
      </table>
      ${po.notes ? `<div style="margin-top:60px;padding:12px;background:#fffbeb;border-radius:6px"><strong>Notes:</strong> ${po.notes}</div>` : ''}
      </body></html>`
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.print()
  }

  function changeStatus(newStatus) {
    const updated = { ...po, status: newStatus, history: [...po.history, { date: new Date().toISOString().slice(0,10), action: STATUS[newStatus]?.label, user: 'Admin' }] }
    onUpdate(updated)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} onClick={onClose} />
      <div style={{ position: 'relative', zIndex: 1, width: Math.min(620, window.innerWidth), background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #e8e9ec', display: 'flex', alignItems: 'center', gap: 12, background: '#fafafa' }}>
          <button onClick={onClose} style={{ ...closeBtn, fontSize: 18 }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{po.number}</div>
            <div style={{ color: '#9ca3af', fontSize: 12 }}>{supplier?.name || po.supplierName}</div>
          </div>
          <StatusBadge status={po.status} />
          <button onClick={printPO} style={secondaryBtn}>Print / PDF</button>
          <button onClick={() => setEmailOpen(true)} style={primaryBtn}>Email</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Info grid */}
          <Card style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><div style={detailLabel}>Supplier</div><div style={detailVal}>{supplier?.name || po.supplierName}</div></div>
              <div><div style={detailLabel}>Contact</div><div style={detailVal}>{supplier?.contact || '—'}</div></div>
              <div><div style={detailLabel}>Created</div><div style={detailVal}>{fmtDate(po.createdAt)}</div></div>
              <div><div style={detailLabel}>Expected</div><div style={detailVal}>{fmtDate(po.expectedDate)}</div></div>
              {po.receivedDate && <div><div style={detailLabel}>Received</div><div style={detailVal}>{fmtDate(po.receivedDate)}</div></div>}
              {po.notes && <div style={{ gridColumn: '1/-1' }}><div style={detailLabel}>Notes</div><div style={detailVal}>{po.notes}</div></div>}
            </div>
          </Card>

          {/* Items table */}
          <Card>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e8e9ec', fontWeight: 700, fontSize: 14 }}>Line Items</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={th}>SKU</th>
                  <th style={th}>Description</th>
                  <th style={{ ...th, textAlign: 'center' }}>Ordered</th>
                  <th style={{ ...th, textAlign: 'center' }}>Received</th>
                  <th style={{ ...th, textAlign: 'right' }}>Unit</th>
                  <th style={{ ...th, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {po.items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={td}><span style={{ fontFamily: 'monospace', fontSize: 12, background: '#f3f4f6', padding: '2px 5px', borderRadius: 4 }}>{item.sku}</span></td>
                    <td style={td}>{item.description}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{item.qty}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span style={{ color: item.received >= item.qty ? '#16a34a' : item.received > 0 ? '#d97706' : '#9ca3af', fontWeight: 600 }}>{item.received}</span>
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>{fmtMoney(item.unitCost)}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmtMoney(item.qty * item.unitCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '12px 16px', borderTop: '1px solid #e8e9ec', display: 'flex', justifyContent: 'flex-end' }}>
              <table style={{ fontSize: 13 }}>
                <tbody>
                  <tr><td style={{ padding: '3px 16px 3px 0', color: '#6b7280' }}>Subtotal</td><td style={{ textAlign: 'right' }}>{fmtMoney(subtotal)}</td></tr>
                  <tr><td style={{ padding: '3px 16px 3px 0', color: '#6b7280' }}>Shipping</td><td style={{ textAlign: 'right' }}>{fmtMoney(po.shippingCost)}</td></tr>
                  <tr><td style={{ padding: '3px 16px 3px 0', color: '#6b7280' }}>Tax</td><td style={{ textAlign: 'right' }}>{fmtMoney(po.tax)}</td></tr>
                  <tr><td style={{ padding: '8px 16px 3px 0', fontWeight: 700, borderTop: '2px solid #1a1d23' }}>Total</td><td style={{ textAlign: 'right', fontWeight: 700, borderTop: '2px solid #1a1d23', paddingTop: 8 }}>{fmtMoney(total)}</td></tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Status actions */}
          <Card style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Change Status</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(STATUS).map(([key, cfg]) => (
                <button key={key} disabled={po.status === key}
                  onClick={() => changeStatus(key)}
                  style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${po.status === key ? cfg.color : '#e8e9ec'}`, background: po.status === key ? cfg.bg : '#fff', color: po.status === key ? cfg.color : '#4b5563', fontSize: 12, cursor: po.status === key ? 'default' : 'pointer', fontWeight: po.status === key ? 700 : 400 }}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </Card>

          {/* History */}
          <Card style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Activity History</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...po.history].reverse().map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                  <span style={{ color: '#9ca3af', flexShrink: 0, minWidth: 90 }}>{fmtDate(h.date)}</span>
                  <span style={{ color: '#1a1d23' }}>{h.action}</span>
                  <span style={{ color: '#9ca3af', marginLeft: 'auto' }}>{h.user}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      {emailOpen && <EmailModal po={po} supplier={supplier} onClose={() => setEmailOpen(false)} />}
    </div>
  )
}

// ─── Tab: All POs ──────────────────────────────────────────────────────────────
function AllPOsTab({ pos, onSelect, onDelete }) {
  const [search, setSearch]   = useState('')
  const [statusF, setStatusF] = useState('all')
  const [sort, setSort]       = useState('date_desc')

  const filtered = useMemo(() => {
    let arr = pos.filter(p => {
      const q = search.toLowerCase()
      const matchQ = !q || p.number.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q) || p.notes?.toLowerCase().includes(q)
      const matchS = statusF === 'all' || p.status === statusF
      return matchQ && matchS
    })
    if (sort === 'date_desc') arr = arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (sort === 'date_asc')  arr = arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    if (sort === 'total_desc') arr = arr.sort((a, b) => calcTotal(b) - calcTotal(a))
    if (sort === 'number')    arr = arr.sort((a, b) => b.number.localeCompare(a.number))
    return arr
  }, [pos, search, statusF, sort])

  // Summary cards
  const totalValue = pos.reduce((s, p) => s + calcTotal(p), 0)
  const pending    = pos.filter(p => ['sent','awaiting_delivery','partially_received'].includes(p.status)).length
  const received   = pos.filter(p => p.status === 'fully_received').length
  const drafts     = pos.filter(p => p.status === 'draft').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Total PO Value', value: fmtMoney(totalValue), color: '#2563eb', icon: '💰' },
          { label: 'Pending Delivery', value: pending, color: '#d97706', icon: '📦' },
          { label: 'Fully Received', value: received, color: '#16a34a', icon: '✅' },
          { label: 'Drafts', value: drafts, color: '#6b7280', icon: '📝' },
        ].map(c => (
          <Card key={c.label} style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{c.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{c.label}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input placeholder="Search PO number, supplier…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 200, maxWidth: 320 }} />
        <select value={statusF} onChange={e => setStatusF(e.target.value)} style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}>
          <option value="all">All Statuses</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}>
          <option value="date_desc">Newest First</option>
          <option value="date_asc">Oldest First</option>
          <option value="total_desc">Highest Value</option>
          <option value="number">PO Number</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#fafafa', borderBottom: '2px solid #e8e9ec' }}>
              <th style={th}>PO Number</th>
              <th style={th}>Supplier</th>
              <th style={th}>Status</th>
              <th style={{ ...th, textAlign: 'center' }}>Items</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
              <th style={th}>Created</th>
              <th style={th}>Expected</th>
              <th style={{ ...th, width: 48 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>No purchase orders found</td></tr>
            )}
            {filtered.map(po => (
              <tr key={po.id} onClick={() => onSelect(po)} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td style={td}><span style={{ fontWeight: 700, color: '#2563eb' }}>{po.number}</span></td>
                <td style={td}>{po.supplierName}</td>
                <td style={td}><StatusBadge status={po.status} /></td>
                <td style={{ ...td, textAlign: 'center' }}>{po.items.length}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmtMoney(calcTotal(po))}</td>
                <td style={td}>{fmtDate(po.createdAt)}</td>
                <td style={td}>{fmtDate(po.expectedDate)}</td>
                <td style={td} onClick={e => e.stopPropagation()}>
                  <button onClick={() => { if (window.confirm(`Delete ${po.number}?`)) onDelete(po.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px 6px', borderRadius: 4 }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ─── Tab: Create PO ────────────────────────────────────────────────────────────
function CreatePOTab({ suppliers, pos, onSave, lowStockSuggestions }) {
  const [supplierId, setSupplierId] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [shippingCost, setShippingCost] = useState('')
  const [tax, setTax] = useState('')
  const [items, setItems] = useState([{ id: uid(), sku: '', description: '', qty: 1, unitCost: '' }])
  const [saved, setSaved] = useState(false)

  const supplier = suppliers.find(s => s.id === supplierId)
  const subtotal = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitCost) || 0), 0)
  const total    = subtotal + Number(shippingCost || 0) + Number(tax || 0)

  function addItem() { setItems(prev => [...prev, { id: uid(), sku: '', description: '', qty: 1, unitCost: '' }]) }
  function removeItem(id) { setItems(prev => prev.filter(i => i.id !== id)) }
  function updateItem(id, field, val) { setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: val } : i)) }

  function loadSuggestions() {
    const sugg = lowStockSuggestions.map(s => ({ id: uid(), sku: s.sku || '', description: s.name, qty: s.reorderQty || 1, unitCost: s.unitCost || 0 }))
    setItems(prev => [...prev, ...sugg])
  }

  function handleSave(status) {
    if (!supplierId) return alert('Please select a supplier')
    if (items.some(i => !i.description)) return alert('All items need a description')
    const po = {
      id: uid(),
      number: formatPONumber(getNextNumber('po')),
      supplierId,
      supplierName: supplier?.name || '',
      status,
      createdAt: new Date().toISOString().slice(0, 10),
      expectedDate,
      receivedDate: null,
      notes,
      shippingCost: Number(shippingCost || 0),
      tax: Number(tax || 0),
      items: items.map(i => ({ ...i, qty: Number(i.qty), unitCost: Number(i.unitCost), received: 0 })),
      history: [{ date: new Date().toISOString().slice(0,10), action: status === 'draft' ? 'Created as Draft' : 'Created & Sent', user: 'Admin' }],
    }
    onSave(po)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    // Reset form
    setSupplierId(''); setExpectedDate(''); setNotes(''); setShippingCost(''); setTax('')
    setItems([{ id: uid(), sku: '', description: '', qty: 1, unitCost: '' }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 860 }}>
      {saved && <div style={{ padding: '10px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, color: '#16a34a', fontWeight: 600 }}>Purchase order created successfully!</div>}

      {/* Low stock suggestions */}
      {lowStockSuggestions.length > 0 && (
        <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: '#92400e', fontSize: 13 }}>{lowStockSuggestions.length} items are low on stock</div>
            <div style={{ color: '#a16207', fontSize: 12 }}>{lowStockSuggestions.map(s => s.name).join(', ')}</div>
          </div>
          <button onClick={loadSuggestions} style={secondaryBtn}>Add to Order</button>
        </div>
      )}

      {/* Supplier + dates */}
      <Card style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Order Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={labelStyle}>Supplier *
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)} style={inputStyle}>
              <option value="">Select supplier…</option>
              {suppliers.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label style={labelStyle}>Expected Delivery Date
            <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} style={inputStyle} />
          </label>
          <label style={labelStyle}>Shipping Cost ($)
            <input type="number" min="0" step="0.01" value={shippingCost} onChange={e => setShippingCost(e.target.value)} placeholder="0.00" style={inputStyle} />
          </label>
          <label style={labelStyle}>Tax ($)
            <input type="number" min="0" step="0.01" value={tax} onChange={e => setTax(e.target.value)} placeholder="0.00" style={inputStyle} />
          </label>
          <label style={{ ...labelStyle, gridColumn: '1/-1' }}>Notes
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Internal notes about this order…" />
          </label>
        </div>
        {supplier && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#f9fafb', borderRadius: 6, fontSize: 12, color: '#6b7280' }}>
            📧 {supplier.email} · 📞 {supplier.phone} · Terms: {supplier.terms}
          </div>
        )}
      </Card>

      {/* Line items */}
      <Card style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>Line Items</div>
          <button onClick={addItem} style={primaryBtn}>+ Add Item</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px 100px 32px', gap: 8, fontSize: 11, color: '#9ca3af', fontWeight: 600, padding: '0 4px' }}>
            <span>SKU</span><span>Description</span><span>Qty</span><span>Unit Cost</span><span />
          </div>
          {items.map(item => (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px 100px 32px', gap: 8, alignItems: 'center' }}>
              <input value={item.sku} onChange={e => updateItem(item.id, 'sku', e.target.value)} placeholder="SKU" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} />
              <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Item description *" style={inputStyle} />
              <input type="number" min="1" value={item.qty} onChange={e => updateItem(item.id, 'qty', e.target.value)} style={{ ...inputStyle, textAlign: 'center' }} />
              <input type="number" min="0" step="0.01" value={item.unitCost} onChange={e => updateItem(item.id, 'unitCost', e.target.value)} placeholder="0.00" style={{ ...inputStyle, textAlign: 'right' }} />
              <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4, borderRadius: 4, fontSize: 16, lineHeight: 1 }}>✕</button>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <table style={{ fontSize: 13 }}>
            <tbody>
              <tr><td style={{ padding: '3px 16px 3px 0', color: '#6b7280' }}>Subtotal</td><td style={{ textAlign: 'right' }}>{fmtMoney(subtotal)}</td></tr>
              <tr><td style={{ padding: '3px 16px 3px 0', color: '#6b7280' }}>Shipping</td><td style={{ textAlign: 'right' }}>{fmtMoney(shippingCost)}</td></tr>
              <tr><td style={{ padding: '3px 16px 3px 0', color: '#6b7280' }}>Tax</td><td style={{ textAlign: 'right' }}>{fmtMoney(tax)}</td></tr>
              <tr><td style={{ padding: '8px 16px 3px 0', fontWeight: 700, borderTop: '2px solid #1a1d23' }}>Total</td><td style={{ textAlign: 'right', fontWeight: 700, borderTop: '2px solid #1a1d23', paddingTop: 8 }}>{fmtMoney(total)}</td></tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={() => handleSave('draft')} style={secondaryBtn}>Save as Draft</button>
        <button onClick={() => handleSave('sent')} style={primaryBtn}>Create & Send to Supplier</button>
      </div>
    </div>
  )
}

// ─── Tab: Receive Items ────────────────────────────────────────────────────────
function ReceiveTab({ pos, onUpdate }) {
  const [selPO, setSelPO] = useState(null)
  const [qtys, setQtys]   = useState({})

  const receivable = pos.filter(p => ['sent','awaiting_delivery','partially_received'].includes(p.status))

  function openPO(po) {
    setSelPO(po)
    const init = {}
    po.items.forEach(i => { init[i.id] = i.qty - i.received })
    setQtys(init)
  }

  function handleReceive() {
    if (!selPO) return
    const updatedItems = selPO.items.map(i => ({ ...i, received: Math.min(i.received + (Number(qtys[i.id]) || 0), i.qty) }))
    const allReceived  = updatedItems.every(i => i.received >= i.qty)
    const anyReceived  = updatedItems.some(i => i.received > 0)
    const newStatus    = allReceived ? 'fully_received' : anyReceived ? 'partially_received' : selPO.status
    const updated = {
      ...selPO,
      items: updatedItems,
      status: newStatus,
      receivedDate: allReceived ? new Date().toISOString().slice(0,10) : selPO.receivedDate,
      history: [...selPO.history, { date: new Date().toISOString().slice(0,10), action: allReceived ? 'Fully received' : 'Partial receipt recorded', user: 'Admin' }],
    }
    onUpdate(updated)
    setSelPO(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {receivable.length === 0 && (
        <Card style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
          No orders awaiting receipt
        </Card>
      )}

      {receivable.map(po => (
        <Card key={po.id} style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e8e9ec', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 700, color: '#2563eb' }}>{po.number}</span>
            <span style={{ color: '#9ca3af' }}>·</span>
            <span>{po.supplierName}</span>
            <StatusBadge status={po.status} />
            <span style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: 12 }}>Expected: {fmtDate(po.expectedDate)}</span>
            <button onClick={() => selPO?.id === po.id ? setSelPO(null) : openPO(po)} style={primaryBtn}>
              {selPO?.id === po.id ? 'Cancel' : 'Receive Items'}
            </button>
          </div>

          {selPO?.id === po.id && (
            <div style={{ padding: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#fafafa', borderBottom: '2px solid #e8e9ec' }}>
                    <th style={th}>Description</th>
                    <th style={{ ...th, textAlign: 'center' }}>Ordered</th>
                    <th style={{ ...th, textAlign: 'center' }}>Previously Received</th>
                    <th style={{ ...th, textAlign: 'center' }}>Receiving Now</th>
                  </tr>
                </thead>
                <tbody>
                  {selPO.items.map(item => {
                    const remaining = item.qty - item.received
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={td}><div>{item.description}</div><div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{item.sku}</div></td>
                        <td style={{ ...td, textAlign: 'center' }}>{item.qty}</td>
                        <td style={{ ...td, textAlign: 'center', color: item.received > 0 ? '#16a34a' : '#9ca3af' }}>{item.received}</td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <input type="number" min="0" max={remaining} value={qtys[item.id] ?? 0}
                            onChange={e => setQtys(prev => ({ ...prev, [item.id]: e.target.value }))}
                            style={{ ...inputStyle, width: 70, textAlign: 'center', display: 'inline-block' }}
                            disabled={remaining === 0} />
                          {remaining === 0 && <span style={{ marginLeft: 6, color: '#16a34a', fontWeight: 600 }}>✓ Done</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
                <button onClick={() => setSelPO(null)} style={cancelBtn}>Cancel</button>
                <button onClick={handleReceive} style={primaryBtn}>Confirm Receipt</button>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

// ─── Tab: Suppliers ────────────────────────────────────────────────────────────
function SuppliersTab({ suppliers, onChange }) {
  const [editing, setEditing] = useState(null) // null | 'new' | supplier object
  const [form, setForm] = useState({})

  function openNew() {
    setForm({ id: uid(), name: '', contact: '', email: '', phone: '', address: '', terms: 'Net 30', notes: '', active: true })
    setEditing('new')
  }
  function openEdit(s) { setForm({ ...s }); setEditing(s) }
  function closeForm() { setEditing(null); setForm({}) }

  function handleSave() {
    if (!form.name) return alert('Supplier name is required')
    if (editing === 'new') { onChange([...suppliers, form]) }
    else { onChange(suppliers.map(s => s.id === form.id ? form : s)) }
    closeForm()
  }

  function toggleActive(id) {
    onChange(suppliers.map(s => s.id === id ? { ...s, active: !s.active } : s))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={openNew} style={primaryBtn}>+ Add Supplier</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {suppliers.map(s => (
          <Card key={s.id} style={{ padding: 16, opacity: s.active ? 1 : 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                {s.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{s.contact}</div>
              </div>
              {!s.active && <span style={{ fontSize: 10, background: '#f3f4f6', color: '#9ca3af', padding: '2px 6px', borderRadius: 10, fontWeight: 600 }}>INACTIVE</span>}
            </div>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#6b7280' }}>
              {s.email    && <div>📧 {s.email}</div>}
              {s.phone    && <div>📞 {s.phone}</div>}
              {s.terms    && <div>💳 {s.terms}</div>}
              {s.address  && <div>📍 {s.address}</div>}
              {s.notes    && <div style={{ marginTop: 6, padding: '6px 8px', background: '#f9fafb', borderRadius: 4, fontStyle: 'italic' }}>{s.notes}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => openEdit(s)} style={{ ...secondaryBtn, flex: 1 }}>Edit</button>
              <button onClick={() => toggleActive(s.id)} style={{ ...cancelBtn, flex: 1 }}>{s.active ? 'Deactivate' : 'Activate'}</button>
            </div>
          </Card>
        ))}
      </div>

      {/* Supplier form modal */}
      {editing && (
        <div style={overlay}>
          <div style={{ ...modal, maxWidth: 520 }}>
            <div style={modalHeader}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{editing === 'new' ? 'Add Supplier' : 'Edit Supplier'}</span>
              <button onClick={closeForm} style={closeBtn}>✕</button>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ ...labelStyle, gridColumn: '1/-1' }}>Company Name *
                  <input value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
                </label>
                <label style={labelStyle}>Contact Name
                  <input value={form.contact || ''} onChange={e => setForm(p => ({ ...p, contact: e.target.value }))} style={inputStyle} />
                </label>
                <label style={labelStyle}>Payment Terms
                  <select value={form.terms || 'Net 30'} onChange={e => setForm(p => ({ ...p, terms: e.target.value }))} style={inputStyle}>
                    <option>Net 15</option><option>Net 30</option><option>Net 60</option><option>COD</option><option>Prepaid</option>
                  </select>
                </label>
                <label style={labelStyle}>Email
                  <input type="email" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
                </label>
                <label style={labelStyle}>Phone
                  <input value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} style={inputStyle} />
                </label>
                <label style={{ ...labelStyle, gridColumn: '1/-1' }}>Address
                  <input value={form.address || ''} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} style={inputStyle} />
                </label>
                <label style={{ ...labelStyle, gridColumn: '1/-1' }}>Notes
                  <textarea value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={closeForm} style={cancelBtn}>Cancel</button>
                <button onClick={handleSave} style={primaryBtn}>Save Supplier</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Returns ──────────────────────────────────────────────────────────────
function ReturnsTab({ returns, pos, suppliers, onChange }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ poId: '', supplierId: '', reason: '', items: [{ id: uid(), description: '', qty: 1 }] })

  function addReturnItem() { setForm(p => ({ ...p, items: [...p.items, { id: uid(), description: '', qty: 1 }] })) }
  function updateReturnItem(id, field, val) { setForm(p => ({ ...p, items: p.items.map(i => i.id === id ? { ...i, [field]: val } : i) })) }

  function handleSave() {
    if (!form.supplierId) return alert('Select a supplier')
    const ret = { ...form, id: uid(), status: 'pending', createdAt: new Date().toISOString().slice(0,10), returnNumber: `RET-${new Date().getFullYear()}-${String(returns.length + 1).padStart(3,'0')}` }
    onChange([...returns, ret])
    setShowForm(false)
    setForm({ poId: '', supplierId: '', reason: '', items: [{ id: uid(), description: '', qty: 1 }] })
  }

  const RETURN_STATUS = { pending: { label: 'Pending', color: '#d97706', bg: '#fffbeb' }, approved: { label: 'Approved', color: '#16a34a', bg: '#f0fdf4' }, completed: { label: 'Completed', color: '#2563eb', bg: '#eff6ff' }, rejected: { label: 'Rejected', color: '#dc2626', bg: '#fef2f2' } }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowForm(!showForm)} style={primaryBtn}>+ New Return</button>
      </div>

      {showForm && (
        <Card style={{ padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Create Return</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label style={labelStyle}>Supplier *
              <select value={form.supplierId} onChange={e => setForm(p => ({ ...p, supplierId: e.target.value }))} style={inputStyle}>
                <option value="">Select…</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label style={labelStyle}>Related PO
              <select value={form.poId} onChange={e => setForm(p => ({ ...p, poId: e.target.value }))} style={inputStyle}>
                <option value="">None</option>
                {pos.filter(p => p.supplierId === form.supplierId).map(p => <option key={p.id} value={p.id}>{p.number}</option>)}
              </select>
            </label>
            <label style={{ ...labelStyle, gridColumn: '1/-1' }}>Reason for Return
              <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Describe why items are being returned…" />
            </label>
          </div>

          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Items to Return</div>
          {form.items.map(item => (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8, marginBottom: 6 }}>
              <input value={item.description} onChange={e => updateReturnItem(item.id, 'description', e.target.value)} placeholder="Item description" style={inputStyle} />
              <input type="number" min="1" value={item.qty} onChange={e => updateReturnItem(item.id, 'qty', e.target.value)} style={{ ...inputStyle, textAlign: 'center' }} />
            </div>
          ))}
          <button onClick={addReturnItem} style={{ ...secondaryBtn, marginTop: 4, marginBottom: 12 }}>+ Add Item</button>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setShowForm(false)} style={cancelBtn}>Cancel</button>
            <button onClick={handleSave} style={primaryBtn}>Submit Return</button>
          </div>
        </Card>
      )}

      {returns.length === 0 && !showForm && (
        <Card style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>↩️</div>
          No returns on record
        </Card>
      )}

      {returns.map(ret => {
        const cfg = RETURN_STATUS[ret.status] || RETURN_STATUS.pending
        const sup = suppliers.find(s => s.id === ret.supplierId)
        return (
          <Card key={ret.id} style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontWeight: 700, color: '#2563eb' }}>{ret.returnNumber}</span>
              <span style={{ color: '#9ca3af' }}>·</span>
              <span>{sup?.name}</span>
              {ret.poId && <span style={{ color: '#9ca3af', fontSize: 12 }}>→ {pos.find(p => p.id === ret.poId)?.number}</span>}
              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>{fmtDate(ret.createdAt)}</span>
            </div>
            {ret.reason && <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{ret.reason}</div>}
            <div style={{ fontSize: 12, color: '#9ca3af' }}>{ret.items.length} item(s) to return</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              {['approved','completed','rejected'].map(s => (
                <button key={s} disabled={ret.status === s}
                  onClick={() => onChange(returns.map(r => r.id === ret.id ? { ...r, status: s } : r))}
                  style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${RETURN_STATUS[s].color}`, background: ret.status === s ? RETURN_STATUS[s].bg : '#fff', color: RETURN_STATUS[s].color, fontSize: 11.5, cursor: ret.status === s ? 'default' : 'pointer', fontWeight: ret.status === s ? 700 : 400 }}>
                  Mark {RETURN_STATUS[s].label}
                </button>
              ))}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PurchaseOrders() {
  const [pos,       setPos]       = useState(() => load(PO_KEY)  || [])
  const [suppliers, setSuppliers] = useState(() => load(SUP_KEY) || [])
  const [returns,   setReturns]   = useState(() => load(RET_KEY) || [])
  const [activeTab, setActiveTab] = useState('all')
  const [selected,  setSelected]  = useState(null)

  function savePOs(arr)       { persist(PO_KEY,  arr); setPos(arr) }
  function saveSuppliers(arr) { persist(SUP_KEY, arr); setSuppliers(arr) }
  function saveReturns(arr)   { persist(RET_KEY, arr); setReturns(arr) }

  function handlePOUpdate(updated) {
    const arr = pos.map(p => p.id === updated.id ? updated : p)
    savePOs(arr)
    if (selected?.id === updated.id) setSelected(updated)
  }

  function handlePOSave(po) {
    const arr = [...pos, po]
    savePOs(arr)
  }

  function handlePODelete(id) {
    savePOs(pos.filter(p => p.id !== id))
  }

  // Low stock suggestions from inventory
  const lowStockSuggestions = useMemo(() => {
    try {
      const inv = JSON.parse(localStorage.getItem('customsfieldpro_inventory') || '[]')
      return inv.filter(i => i.quantity <= (i.reorderPoint || 0))
    } catch { return [] }
  }, [])

  const TABS = [
    { id: 'all',      label: 'All POs',       count: pos.length },
    { id: 'create',   label: 'Create PO' },
    { id: 'receive',  label: 'Receive Items',  count: pos.filter(p => ['sent','awaiting_delivery','partially_received'].includes(p.status)).length },
    { id: 'suppliers',label: 'Suppliers',      count: suppliers.length },
    { id: 'returns',  label: 'Returns',        count: returns.length },
  ]

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1a1d23', margin: '0 0 4px' }}>Purchase Orders</h1>
        <p style={{ color: '#9ca3af', margin: 0, fontSize: 14 }}>Manage supplier orders, receiving, and returns</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e8e9ec', paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent', marginBottom: -2, cursor: 'pointer', fontSize: 14, fontWeight: activeTab === tab.id ? 700 : 500, color: activeTab === tab.id ? '#2563eb' : '#4b5563', transition: 'color 0.1s', display: 'flex', alignItems: 'center', gap: 6 }}>
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span style={{ background: activeTab === tab.id ? '#2563eb' : '#e8e9ec', color: activeTab === tab.id ? '#fff' : '#6b7280', fontSize: 10.5, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'all' && (
        <AllPOsTab pos={pos} onSelect={setSelected} onDelete={handlePODelete} />
      )}
      {activeTab === 'create' && (
        <CreatePOTab suppliers={suppliers} pos={pos} onSave={po => { handlePOSave(po); setActiveTab('all') }} lowStockSuggestions={lowStockSuggestions} />
      )}
      {activeTab === 'receive' && (
        <ReceiveTab pos={pos} onUpdate={handlePOUpdate} />
      )}
      {activeTab === 'suppliers' && (
        <SuppliersTab suppliers={suppliers} onChange={saveSuppliers} />
      )}
      {activeTab === 'returns' && (
        <ReturnsTab returns={returns} pos={pos} suppliers={suppliers} onChange={saveReturns} />
      )}

      {/* Detail slideout */}
      {selected && (
        <PODetail
          po={selected}
          suppliers={suppliers}
          onClose={() => setSelected(null)}
          onUpdate={handlePOUpdate}
        />
      )}
    </div>
  )
}

// ─── Shared styles ─────────────────────────────────────────────────────────────
const overlay   = { position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const modal     = { background: '#fff', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxHeight: '90vh', overflowY: 'auto' }
const modalHeader = { padding: '16px 20px', borderBottom: '1px solid #e8e9ec', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
const closeBtn  = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9ca3af', padding: '2px 6px', borderRadius: 6, lineHeight: 1 }
const primaryBtn  = { padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 }
const secondaryBtn = { padding: '8px 14px', background: '#fff', color: '#4b5563', border: '1px solid #e8e9ec', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 500 }
const cancelBtn = { padding: '8px 14px', background: '#f3f4f6', color: '#4b5563', border: '1px solid #e8e9ec', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 500 }
const inputStyle = { display: 'block', width: '100%', padding: '8px 10px', border: '1px solid #e8e9ec', borderRadius: 7, fontSize: 13, color: '#1a1d23', background: '#fff', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#4b5563' }
const th = { padding: '10px 12px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }
const td = { padding: '12px 12px', verticalAlign: 'middle', color: '#1a1d23' }
const detailLabel = { fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }
const detailVal   = { fontSize: 13, color: '#1a1d23', fontWeight: 500 }
