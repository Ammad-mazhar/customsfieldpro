import { useState, useMemo } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  getParts, savePart, deletePart, saveParts,
  getStockMoves, addStockMove,
  getPurchaseOrders, savePurchaseOrder, savePurchaseOrders,
  getJobs, getSettings,
} from '../../data/store'

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES   = ['HVAC Parts','Plumbing Parts','Electrical Parts','Appliance Parts','Tools & Equipment','Consumables']
const MOVE_TYPES   = ['USED_ON_JOB','STOCK_ADDED','ADJUSTMENT','RETURNED']
const PO_STATUSES  = ['Draft','Sent','Received']
const MOVE_TYPE_COLORS = {
  USED_ON_JOB: { bg:'#fef2f2', color:'#dc2626' },
  STOCK_ADDED:  { bg:'#f0fdf4', color:'#16a34a' },
  ADJUSTMENT:   { bg:'#fffbeb', color:'#d97706' },
  RETURNED:     { bg:'#eff6ff', color:'#2563eb' },
}
const PO_STATUS_COLORS = {
  Draft:    { bg:'#f3f4f6', color:'#6b7280' },
  Sent:     { bg:'#eff6ff', color:'#2563eb' },
  Received: { bg:'#f0fdf4', color:'#16a34a' },
}

function uid()  { return `${Date.now()}-${Math.random().toString(36).slice(2,6)}` }
function $c(n)  { return typeof n === 'number' ? `$${n.toFixed(2)}` : '—' }
function fmtTs(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
}

function Bdg({ label, map }) {
  const c = (map||{})[label] ?? { bg:'#f3f4f6', color:'#6b7280' }
  return <span style={{ display:'inline-block', fontSize:11.5, fontWeight:700, padding:'2px 9px', borderRadius:20, background:c.bg, color:c.color, whiteSpace:'nowrap' }}>{label.replace('_',' ')}</span>
}

function SH({ title }) {
  return <p style={{ fontSize:11.5, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.6px', margin:'0 0 16px', paddingBottom:10, borderBottom:'1px solid #f0f1f3' }}>{title}</p>
}

function StockBadge({ inStock, minStock }) {
  if (inStock === 0)            return <span style={{ fontSize:12, fontWeight:700, color:'#dc2626', background:'#fef2f2', padding:'2px 8px', borderRadius:20 }}>Out of Stock</span>
  if (inStock <= minStock)      return <span style={{ fontSize:12, fontWeight:700, color:'#d97706', background:'#fffbeb', padding:'2px 8px', borderRadius:20 }}>Low Stock</span>
  return <span style={{ fontSize:12, fontWeight:600, color:'#16a34a' }}>{inStock}</span>
}

// ── Shared modal wrapper ──────────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, children, maxWidth=560 }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth, maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', overflow:'hidden' }}>
        <div style={{ padding:'18px 22px', borderBottom:'1px solid #f0f1f3', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <p style={{ fontSize:16, fontWeight:700, color:'#1a1d23', margin:0 }}>{title}</p>
            {subtitle && <p style={{ fontSize:12.5, color:'#9ca3af', margin:'2px 0 0' }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ width:30, height:30, border:'none', background:'#f3f4f6', borderRadius:7, fontSize:18, cursor:'pointer', color:'#6b7280', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'20px 22px' }}>{children}</div>
      </div>
    </div>
  )
}

// ── Tab 1 — Parts Catalog ─────────────────────────────────────────────────────
function PartsTab({ parts, refresh }) {
  const [search, setSearch]     = useState('')
  const [catF,   setCatF]       = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [editPart, setEditPart] = useState(null)
  const [form, setForm]         = useState(blankPart())
  const [errs, setErrs]         = useState({})

  function blankPart() {
    return { id:'', name:'', sku:`SKU-${Date.now()}`, category:'HVAC Parts', description:'', inStock:0, minStock:5, unitCost:'', sellingPrice:'', supplier:'', supplierContact:'', notes:'' }
  }

  function openAdd()  { setForm(blankPart()); setEditPart(null); setErrs({}); setShowForm(true) }
  function openEdit(p){ setForm({...p}); setEditPart(p); setErrs({}); setShowForm(true) }

  function setF(k,v) {
    setForm(p => {
      const u = {...p, [k]:v}
      if (k === 'unitCost' && !editPart) u.sellingPrice = v ? (parseFloat(v)*2.5).toFixed(2) : ''
      return u
    })
    setErrs(p=>({...p,[k]:undefined}))
  }

  function validate() {
    const e={}
    if (!form.name.trim()) e.name='Required'
    if (!form.sku.trim())  e.sku='Required'
    return e
  }

  function handleSave() {
    const e=validate(); if(Object.keys(e).length){setErrs(e);return}
    const part = {
      ...form,
      id: form.id || `part-${uid()}`,
      inStock: parseInt(form.inStock)||0,
      minStock: parseInt(form.minStock)||0,
      unitCost: parseFloat(form.unitCost)||0,
      sellingPrice: parseFloat(form.sellingPrice)||0,
    }
    savePart(part)
    refresh(); setShowForm(false)
  }

  function handleDelete(p) {
    if (!window.confirm(`Delete "${p.name}"?`)) return
    deletePart(p.id); refresh()
  }

  const visible = useMemo(() => parts.filter(p =>
    (catF==='All' || p.category===catF) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || (p.supplier||'').toLowerCase().includes(search.toLowerCase()))
  ), [parts, catF, search])

  const lowCount = parts.filter(p => p.inStock <= p.minStock).length

  return (
    <div>
      {lowCount > 0 && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:9, padding:'11px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span style={{ fontSize:13, fontWeight:600, color:'#dc2626' }}>{lowCount} part{lowCount!==1?'s':''} at or below minimum stock level</span>
        </div>
      )}

      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search parts, SKU, supplier…"
          style={{ flex:1, minWidth:200, height:34, border:'1px solid #e8e9ec', borderRadius:7, padding:'0 12px', fontSize:13, outline:'none' }}/>
        <select value={catF} onChange={e=>setCatF(e.target.value)} style={SEL}>
          <option>All</option>
          {CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
        <button onClick={openAdd} style={BTN}>+ Add Part</button>
      </div>

      <div style={{ border:'1px solid #e8e9ec', borderRadius:10, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr style={{ background:'#f8f9fa' }}>
            {['Part Name','SKU','Category','In Stock','Min','Unit Cost','Sell Price','Supplier',''].map(h=>(
              <th key={h} style={{ padding:'9px 12px', fontSize:11, fontWeight:600, color:'#9ca3af', textAlign:'left', borderBottom:'1px solid #e8e9ec', whiteSpace:'nowrap' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {visible.map(p=>{
              const low = p.inStock <= p.minStock
              return (
                <tr key={p.id} style={{ borderBottom:'1px solid #f0f1f3', background: low ? '#fff9f9' : 'transparent' }}>
                  <td style={{ padding:'10px 12px' }}>
                    <p style={{ margin:0, fontSize:13.5, fontWeight:600, color:'#1a1d23' }}>{p.name}</p>
                    {p.description && <p style={{ margin:'2px 0 0', fontSize:11.5, color:'#9ca3af' }}>{p.description}</p>}
                  </td>
                  <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:12, color:'#6b7280' }}>{p.sku}</td>
                  <td style={{ padding:'10px 12px' }}><span style={{ fontSize:12, background:'#f3f4f6', color:'#374151', padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' }}>{p.category}</span></td>
                  <td style={{ padding:'10px 12px' }}><StockBadge inStock={p.inStock} minStock={p.minStock}/></td>
                  <td style={{ padding:'10px 12px', fontSize:13, color:'#6b7280' }}>{p.minStock}</td>
                  <td style={{ padding:'10px 12px', fontSize:13, color:'#374151' }}>{$c(p.unitCost)}</td>
                  <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600, color:'#1a1d23' }}>{$c(p.sellingPrice)}</td>
                  <td style={{ padding:'10px 12px', fontSize:12.5, color:'#6b7280', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.supplier||'—'}</td>
                  <td style={{ padding:'10px 12px', whiteSpace:'nowrap' }}>
                    <button onClick={()=>openEdit(p)} style={BTN_ICON} title="Edit">
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={()=>handleDelete(p)} style={{ ...BTN_ICON, color:'#dc2626', background:'#fef2f2' }} title="Delete">
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </td>
                </tr>
              )
            })}
            {!visible.length && <tr><td colSpan={9} style={{ textAlign:'center', padding:36, color:'#9ca3af' }}>No parts found.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Add / Edit modal */}
      {showForm && (
        <Modal title={editPart ? 'Edit Part' : 'Add Part'} subtitle={editPart?.name} onClose={()=>setShowForm(false)} maxWidth={640}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={LB}>Part Name <span style={{ color:'#dc2626' }}>*</span></label>
              <input value={form.name} onChange={e=>setF('name',e.target.value)} style={{ ...INP, borderColor: errs.name?'#dc2626':'#e8e9ec' }} placeholder="e.g. AC Filter 16x20x1"/>
              {errs.name && <p style={ET}>{errs.name}</p>}
            </div>
            <div>
              <label style={LB}>SKU / Part # <span style={{ color:'#dc2626' }}>*</span></label>
              <input value={form.sku} onChange={e=>setF('sku',e.target.value)} style={{ ...INP, borderColor: errs.sku?'#dc2626':'#e8e9ec' }}/>
              {errs.sku && <p style={ET}>{errs.sku}</p>}
            </div>
            <div>
              <label style={LB}>Category</label>
              <select value={form.category} onChange={e=>setF('category',e.target.value)} style={SEL_W}>
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={LB}>Description</label>
              <input value={form.description} onChange={e=>setF('description',e.target.value)} style={INP} placeholder="Brief description"/>
            </div>
            <div>
              <label style={LB}>In Stock (qty)</label>
              <input type="number" min="0" value={form.inStock} onChange={e=>setF('inStock',e.target.value)} style={INP}/>
            </div>
            <div>
              <label style={LB}>Min Stock Level</label>
              <input type="number" min="0" value={form.minStock} onChange={e=>setF('minStock',e.target.value)} style={INP}/>
              <p style={{ fontSize:11, color:'#9ca3af', margin:'3px 0 0' }}>Warning shown when stock ≤ this value</p>
            </div>
            <div>
              <label style={LB}>Unit Cost (what you pay)</label>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ fontSize:13, color:'#9ca3af' }}>$</span>
                <input type="number" min="0" step="0.01" value={form.unitCost} onChange={e=>setF('unitCost',e.target.value)} style={INP} placeholder="0.00"/>
              </div>
            </div>
            <div>
              <label style={LB}>Selling Price (client charge)</label>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ fontSize:13, color:'#9ca3af' }}>$</span>
                <input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={e=>setF('sellingPrice',e.target.value)} style={INP} placeholder="Auto: 2.5× cost"/>
              </div>
            </div>
            <div>
              <label style={LB}>Supplier Name</label>
              <input value={form.supplier} onChange={e=>setF('supplier',e.target.value)} style={INP} placeholder="Supplier Co."/>
            </div>
            <div>
              <label style={LB}>Supplier Contact</label>
              <input value={form.supplierContact} onChange={e=>setF('supplierContact',e.target.value)} style={INP} placeholder="(555) 000-0000"/>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={LB}>Notes</label>
              <textarea value={form.notes} onChange={e=>setF('notes',e.target.value)} rows={2}
                style={{ width:'100%', boxSizing:'border-box', border:'1px solid #e8e9ec', borderRadius:7, padding:'8px 12px', fontSize:13, color:'#374151', resize:'vertical', outline:'none' }}/>
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:20, paddingTop:16, borderTop:'1px solid #f0f1f3' }}>
            <button onClick={()=>setShowForm(false)} style={BTN_GHOST}>Cancel</button>
            <button onClick={handleSave} style={BTN}>{editPart ? 'Save Changes' : 'Add Part'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Tab 2 — Stock Movements ───────────────────────────────────────────────────
function MovementsTab({ parts, refresh }) {
  const [moves, setMoves]     = useState(() => getStockMoves())
  const [filterPart, setFilterPart]   = useState('All')
  const [filterType, setFilterType]   = useState('All')
  const [filterTech, setFilterTech]   = useState('')
  const [filterFrom, setFilterFrom]   = useState('')
  const [filterTo,   setFilterTo]     = useState('')
  const [showAdjust, setShowAdjust]   = useState(false)
  const [adjForm, setAdjForm]         = useState({ partId:'', adjType:'Add', qty:1, reason:'', notes:'' })

  function refreshMoves() { setMoves(getStockMoves()) }

  const visible = useMemo(() => {
    return moves.filter(m => {
      if (filterPart !== 'All' && m.partId !== filterPart) return false
      if (filterType !== 'All' && m.type !== filterType)   return false
      if (filterTech && !m.technicianId.includes(filterTech) && !m.notes.toLowerCase().includes(filterTech.toLowerCase())) return false
      if (filterFrom && m.timestamp < new Date(filterFrom).getTime()) return false
      if (filterTo   && m.timestamp > new Date(filterTo).getTime() + 86400000) return false
      return true
    })
  }, [moves, filterPart, filterType, filterTech, filterFrom, filterTo])

  // Compute running balance per part
  const balanceMap = useMemo(() => {
    const map = {}
    // Sort oldest-first, track running qty
    const sorted = [...moves].sort((a,b)=>a.timestamp-b.timestamp)
    sorted.forEach(m => {
      if (!map[m.partId]) map[m.partId] = 0
      map[m.partId] += m.quantity
    })
    // Now compute per-move running balance
    const byPart = {}
    const sortedMap = {}
    sorted.forEach(m => {
      if (!byPart[m.partId]) byPart[m.partId] = 0
      byPart[m.partId] += m.quantity
      sortedMap[m.id] = Math.max(0, byPart[m.partId])
    })
    return sortedMap
  }, [moves])

  function handleAdjust() {
    const p   = parts.find(x => x.id === adjForm.partId)
    if (!p || !adjForm.qty) return
    let qty = parseInt(adjForm.qty) || 0
    if (adjForm.adjType === 'Remove') qty = -Math.abs(qty)
    else if (adjForm.adjType === 'Set') qty = Math.abs(qty) - p.inStock  // delta to reach exact
    else qty = Math.abs(qty)

    const move = {
      id: `move-${Date.now()}`,
      partId: p.id, partName: p.name, type: 'ADJUSTMENT',
      quantity: qty, jobId:'', jobNumber:'', technicianId:'',
      notes: adjForm.reason || adjForm.notes || '',
      timestamp: Date.now(),
    }
    addStockMove(move)
    refreshMoves(); refresh()
    setShowAdjust(false)
    setAdjForm({ partId:'', adjType:'Add', qty:1, reason:'', notes:'' })
  }

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <select value={filterPart} onChange={e=>setFilterPart(e.target.value)} style={SEL}>
          <option value="All">All parts</option>
          {parts.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={SEL}>
          <option value="All">All types</option>
          {MOVE_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>
        <input value={filterFrom} onChange={e=>setFilterFrom(e.target.value)} type="date" style={{ ...SEL, width:130 }}/>
        <input value={filterTo}   onChange={e=>setFilterTo(e.target.value)}   type="date" style={{ ...SEL, width:130 }}/>
        <button onClick={()=>setShowAdjust(true)} style={{ ...BTN, marginLeft:'auto' }}>Adjust Stock</button>
      </div>

      <div style={{ border:'1px solid #e8e9ec', borderRadius:10, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr style={{ background:'#f8f9fa' }}>
            {['Date','Part','Type','Qty','Job #','Technician','Notes','Balance'].map(h=>(
              <th key={h} style={{ padding:'9px 12px', fontSize:11, fontWeight:600, color:'#9ca3af', textAlign:'left', borderBottom:'1px solid #e8e9ec', whiteSpace:'nowrap' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {visible.map(m=>(
              <tr key={m.id} style={{ borderBottom:'1px solid #f0f1f3' }}>
                <td style={{ padding:'10px 12px', fontSize:12.5, color:'#6b7280', whiteSpace:'nowrap' }}>{fmtTs(m.timestamp)}</td>
                <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600, color:'#1a1d23', whiteSpace:'nowrap' }}>{m.partName}</td>
                <td style={{ padding:'10px 12px' }}><Bdg label={m.type} map={MOVE_TYPE_COLORS}/></td>
                <td style={{ padding:'10px 12px', fontSize:13.5, fontWeight:700, color: m.quantity > 0 ? '#16a34a' : '#dc2626' }}>
                  {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                </td>
                <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:12, color:'#9ca3af' }}>{m.jobNumber||'—'}</td>
                <td style={{ padding:'10px 12px', fontSize:12.5, color:'#6b7280' }}>{m.technicianId||'—'}</td>
                <td style={{ padding:'10px 12px', fontSize:12.5, color:'#6b7280', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.notes||'—'}</td>
                <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600, color:'#374151' }}>{balanceMap[m.id] ?? '—'}</td>
              </tr>
            ))}
            {!visible.length && <tr><td colSpan={8} style={{ textAlign:'center', padding:32, color:'#9ca3af' }}>No movements found.</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdjust && (
        <Modal title="Adjust Stock" onClose={()=>setShowAdjust(false)} maxWidth={440}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={LB}>Part <span style={{ color:'#dc2626' }}>*</span></label>
              <select value={adjForm.partId} onChange={e=>setAdjForm(p=>({...p,partId:e.target.value}))} style={SEL_W}>
                <option value="">— Select part —</option>
                {parts.map(p=><option key={p.id} value={p.id}>{p.name} (in stock: {p.inStock})</option>)}
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={LB}>Adjustment Type</label>
                <select value={adjForm.adjType} onChange={e=>setAdjForm(p=>({...p,adjType:e.target.value}))} style={SEL_W}>
                  <option>Add</option>
                  <option>Remove</option>
                  <option>Set</option>
                </select>
              </div>
              <div>
                <label style={LB}>Quantity</label>
                <input type="number" min="1" value={adjForm.qty} onChange={e=>setAdjForm(p=>({...p,qty:e.target.value}))} style={INP}/>
              </div>
            </div>
            <div>
              <label style={LB}>Reason</label>
              <input value={adjForm.reason} onChange={e=>setAdjForm(p=>({...p,reason:e.target.value}))} style={INP} placeholder="e.g. Damaged stock, count correction…"/>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:12, borderTop:'1px solid #f0f1f3' }}>
              <button onClick={()=>setShowAdjust(false)} style={BTN_GHOST}>Cancel</button>
              <button onClick={handleAdjust} disabled={!adjForm.partId||!adjForm.qty} style={{ ...BTN, opacity:!adjForm.partId||!adjForm.qty?0.5:1 }}>Apply Adjustment</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Tab 3 — Parts on Jobs (Usage Report) ──────────────────────────────────────
function UsageTab({ parts }) {
  const moves   = getStockMoves()
  const jobs    = getJobs()
  const now     = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const startOfYear  = new Date(now.getFullYear(), 0, 1).getTime()

  // Aggregate usage per part
  const usageData = useMemo(() => {
    const map = {}
    moves.filter(m => m.type === 'USED_ON_JOB').forEach(m => {
      if (!map[m.partId]) map[m.partId] = { partId:m.partId, partName:m.partName, usedMonth:0, usedYear:0, jobIds:new Set(), moves:[] }
      const used = Math.abs(m.quantity)
      if (m.timestamp >= startOfMonth) map[m.partId].usedMonth += used
      if (m.timestamp >= startOfYear)  map[m.partId].usedYear  += used
      if (m.jobId) map[m.partId].jobIds.add(m.jobId)
      map[m.partId].moves.push(m)
    })
    return Object.values(map)
      .map(d => {
        const part = parts.find(p => p.id === d.partId)
        const revenue = d.moves.reduce((s, m) => s + Math.abs(m.quantity) * (part?.sellingPrice||0), 0)
        return { ...d, jobCount: d.jobIds.size, revenue, sellingPrice: part?.sellingPrice||0 }
      })
      .sort((a, b) => b.usedYear - a.usedYear)
  }, [moves, parts])

  const maxUsed = usageData.reduce((m, d) => Math.max(m, d.usedYear), 1)

  // Parts used on each job
  const jobUsage = useMemo(() => {
    const map = {}
    moves.filter(m => m.type==='USED_ON_JOB' && m.jobId).forEach(m => {
      if (!map[m.jobId]) map[m.jobId] = { jobId:m.jobId, jobNumber:m.jobNumber, parts:[] }
      map[m.jobId].parts.push(m)
    })
    return Object.values(map).sort((a,b)=>b.jobId.localeCompare(a.jobId))
  }, [moves])

  if (!usageData.length) {
    return <p style={{ textAlign:'center', padding:40, color:'#9ca3af' }}>No parts usage recorded yet. Use "Adjust Stock" or log parts used on jobs to see reports here.</p>
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {/* Most-used horizontal bar chart */}
      <div style={{ background:'#fff', border:'1px solid #e8e9ec', borderRadius:10, padding:'18px 20px' }}>
        <SH title="Most Used Parts (this year)" />
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {usageData.slice(0,8).map(d => (
            <div key={d.partId} style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:12.5, color:'#374151', width:200, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.partName}</span>
              <div style={{ flex:1, height:12, background:'#f3f4f6', borderRadius:6, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${(d.usedYear/maxUsed)*100}%`, background:'#2563eb', borderRadius:6, transition:'width 0.4s' }}/>
              </div>
              <span style={{ fontSize:12, color:'#6b7280', width:60, textAlign:'right', flexShrink:0 }}>{d.usedYear} units</span>
              <span style={{ fontSize:12, fontWeight:600, color:'#16a34a', width:70, textAlign:'right', flexShrink:0 }}>${d.revenue.toFixed(0)} rev</span>
            </div>
          ))}
        </div>
      </div>

      {/* Usage table */}
      <div>
        <SH title="Parts Usage Report" />
        <div style={{ border:'1px solid #e8e9ec', borderRadius:10, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ background:'#f8f9fa' }}>
              {['Part Name','Used This Month','Used This Year','Revenue Generated','Jobs Used On'].map(h=>(
                <th key={h} style={{ padding:'9px 14px', fontSize:11, fontWeight:600, color:'#9ca3af', textAlign:'left', borderBottom:'1px solid #e8e9ec' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {usageData.map(d=>(
                <tr key={d.partId} style={{ borderBottom:'1px solid #f0f1f3' }}>
                  <td style={{ padding:'10px 14px', fontSize:13.5, fontWeight:600, color:'#1a1d23' }}>{d.partName}</td>
                  <td style={{ padding:'10px 14px', fontSize:13, color:'#374151' }}>{d.usedMonth}</td>
                  <td style={{ padding:'10px 14px', fontSize:13, color:'#374151' }}>{d.usedYear}</td>
                  <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600, color:'#16a34a' }}>${d.revenue.toFixed(2)}</td>
                  <td style={{ padding:'10px 14px', fontSize:13, color:'#374151' }}>{d.jobCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Parts per job */}
      {jobUsage.length > 0 && (
        <div>
          <SH title="Parts Used per Job" />
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {jobUsage.map(j=>(
              <div key={j.jobId} style={{ border:'1px solid #e8e9ec', borderRadius:9, padding:'12px 16px' }}>
                <p style={{ margin:'0 0 8px', fontSize:13.5, fontWeight:700, color:'#1a1d23', fontFamily:'monospace' }}>{j.jobNumber}</p>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {j.parts.map((m,i)=>(
                    <div key={i} style={{ display:'flex', gap:12, fontSize:12.5, color:'#6b7280' }}>
                      <span style={{ fontWeight:600, color:'#374151' }}>{m.partName}</span>
                      <span>×{Math.abs(m.quantity)}</span>
                      {m.technicianId && <span>· {m.technicianId}</span>}
                      {m.notes && <span>· {m.notes}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab 4 — Purchase Orders ───────────────────────────────────────────────────
function PurchaseOrdersTab({ parts, refresh }) {
  const [pos, setPos]             = useState(() => getPurchaseOrders())
  const [showCreate, setShowCreate] = useState(false)
  const [showDetail, setShowDetail] = useState(null)  // PO object
  const [form, setForm]           = useState(blankPO())
  const [poLines, setPoLines]     = useState([blankLine()])

  function blankPO() {
    const d  = new Date()
    const ed = new Date(d); ed.setDate(d.getDate()+7)
    return { supplier:'', supplierContact:'', orderDate: d.toISOString().split('T')[0], expectedDelivery: ed.toISOString().split('T')[0], notes:'' }
  }
  function blankLine() { return { partId:'', partName:'', sku:'', qty:1, unitCost:0, total:0 } }

  function refreshPos() { setPos(getPurchaseOrders()) }

  function setLine(i, k, v) {
    setPoLines(prev => prev.map((l, idx) => {
      if (idx !== i) return l
      const u = {...l, [k]:v}
      if (k==='partId') {
        const p = parts.find(x=>x.id===v)
        u.partName = p?.name||''; u.sku = p?.sku||''; u.unitCost = p?.unitCost||0
        u.total = (p?.unitCost||0)*u.qty
      }
      if (k==='qty'||k==='unitCost') u.total = parseFloat(u.qty||0)*parseFloat(u.unitCost||0)
      return u
    }))
  }

  function nextPONumber() {
    const all = getPurchaseOrders()
    const year = new Date().getFullYear()
    const nums = all.map(p => { const m=p.id.match(/(\d+)$/); return m?parseInt(m[1]):0 })
    const next = (Math.max(0,...nums)+1).toString().padStart(3,'0')
    return `PO-${year}-${next}`
  }

  function handleCreate() {
    const validLines = poLines.filter(l=>l.partId&&l.qty>0)
    if (!form.supplier||!validLines.length) return
    const total = validLines.reduce((s,l)=>s+(parseFloat(l.total)||0),0)
    const po = { id: nextPONumber(), ...form, lineItems: validLines, total, status:'Draft', receivedAt:null }
    savePurchaseOrder(po)
    refreshPos(); setShowCreate(false); setForm(blankPO()); setPoLines([blankLine()])
  }

  function markReceived(po) {
    if (!window.confirm(`Mark ${po.id} as Received? This will update stock quantities.`)) return
    // Add stock moves for each line item
    po.lineItems.forEach(li => {
      const move = {
        id:`move-${Date.now()}-${li.partId}`, partId:li.partId, partName:li.partName,
        type:'STOCK_ADDED', quantity:parseInt(li.qty)||0,
        jobId:'', jobNumber:'', technicianId:'',
        notes:`Received via ${po.id}`, timestamp:Date.now(),
      }
      addStockMove(move)
    })
    const updated = { ...po, status:'Received', receivedAt:new Date().toISOString().split('T')[0] }
    savePurchaseOrder(updated)
    refreshPos(); refresh()
  }

  function downloadPO(po) {
    const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'letter' })
    const settings = getSettings()
    const co = settings.company || {}

    doc.setFillColor(37,99,235)
    doc.rect(0,0,216,22,'F')
    doc.setTextColor(255,255,255)
    doc.setFontSize(14); doc.setFont('helvetica','bold')
    doc.text('PURCHASE ORDER', 14, 14)
    doc.setFontSize(10); doc.setFont('helvetica','normal')
    doc.text(po.id, 160, 14)

    doc.setTextColor(30,30,30); doc.setFontSize(10)
    let y=32
    doc.setFont('helvetica','bold'); doc.text(co.name||'FieldFlow CRM', 14, y)
    doc.setFont('helvetica','normal')
    if (co.address) { y+=5; doc.text(co.address, 14, y) }
    if (co.phone)   { y+=5; doc.text(co.phone, 14, y) }

    doc.setFont('helvetica','bold'); doc.text('Supplier:', 130, 32)
    doc.setFont('helvetica','normal')
    doc.text(po.supplier, 130, 37)
    if (po.supplierContact) doc.text(po.supplierContact, 130, 42)

    y=58
    doc.setFillColor(248,249,250); doc.rect(14,y-4,188,7,'F')
    doc.setFont('helvetica','bold')
    doc.text(`Order Date: ${po.orderDate}`, 14, y)
    doc.text(`Expected Delivery: ${po.expectedDelivery}`, 130, y)
    doc.text(`Status: ${po.status}`, 14, y+6)

    autoTable(doc, {
      startY: y+14,
      head:   [['Part Name','SKU','Qty','Unit Cost','Total']],
      body:   po.lineItems.map(li => [li.partName, li.sku, li.qty, $c(li.unitCost), $c(li.total)]),
      foot:   [['','','','Total',$c(po.total)]],
      styles: { fontSize:9 },
      headStyles: { fillColor:[37,99,235] },
      footStyles: { fillColor:[240,253,244], textColor:[22,163,74], fontStyle:'bold' },
    })

    if (po.notes) {
      const finalY = doc.lastAutoTable?.finalY || 160
      doc.setFont('helvetica','bold'); doc.text('Notes:', 14, finalY+8)
      doc.setFont('helvetica','normal'); doc.text(po.notes, 14, finalY+14)
    }

    doc.save(`${po.id}.pdf`)
  }

  const grand = poLines.reduce((s,l)=>s+(parseFloat(l.total)||0),0)

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
        <button onClick={()=>setShowCreate(true)} style={BTN}>+ Create Purchase Order</button>
      </div>

      <div style={{ border:'1px solid #e8e9ec', borderRadius:10, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr style={{ background:'#f8f9fa' }}>
            {['PO Number','Supplier','Items','Total Cost','Order Date','Expected Delivery','Status','Actions'].map(h=>(
              <th key={h} style={{ padding:'9px 12px', fontSize:11, fontWeight:600, color:'#9ca3af', textAlign:'left', borderBottom:'1px solid #e8e9ec', whiteSpace:'nowrap' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {pos.map(po=>(
              <tr key={po.id} style={{ borderBottom:'1px solid #f0f1f3' }}>
                <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:12.5, fontWeight:700, color:'#1a1d23' }}>{po.id}</td>
                <td style={{ padding:'10px 12px', fontSize:13, color:'#374151' }}>{po.supplier}</td>
                <td style={{ padding:'10px 12px', fontSize:13, color:'#6b7280' }}>{po.lineItems.length} item{po.lineItems.length!==1?'s':''}</td>
                <td style={{ padding:'10px 12px', fontSize:13.5, fontWeight:700, color:'#1a1d23' }}>{$c(po.total)}</td>
                <td style={{ padding:'10px 12px', fontSize:12.5, color:'#6b7280' }}>{po.orderDate}</td>
                <td style={{ padding:'10px 12px', fontSize:12.5, color:'#6b7280' }}>{po.expectedDelivery}</td>
                <td style={{ padding:'10px 12px' }}><Bdg label={po.status} map={PO_STATUS_COLORS}/></td>
                <td style={{ padding:'10px 12px', whiteSpace:'nowrap', display:'flex', gap:6 }}>
                  <button onClick={()=>setShowDetail(po)} style={{ ...BTN_ICON, color:'#2563eb', background:'#eff6ff' }} title="View">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                  <button onClick={()=>downloadPO(po)} style={BTN_ICON} title="Download PDF">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                  {po.status !== 'Received' && (
                    <button onClick={()=>markReceived(po)} style={{ ...BTN_ICON, color:'#16a34a', background:'#f0fdf4' }} title="Mark Received">
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" strokeLinecap="round"/></svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!pos.length && <tr><td colSpan={8} style={{ textAlign:'center', padding:32, color:'#9ca3af' }}>No purchase orders yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Create PO Modal */}
      {showCreate && (
        <Modal title="Create Purchase Order" onClose={()=>setShowCreate(false)} maxWidth={680}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            <div>
              <label style={LB}>Supplier Name <span style={{ color:'#dc2626' }}>*</span></label>
              <input value={form.supplier} onChange={e=>setForm(p=>({...p,supplier:e.target.value}))} style={INP} placeholder="Supplier Co."/>
            </div>
            <div>
              <label style={LB}>Supplier Contact</label>
              <input value={form.supplierContact} onChange={e=>setForm(p=>({...p,supplierContact:e.target.value}))} style={INP} placeholder="(555) 000-0000"/>
            </div>
            <div>
              <label style={LB}>Order Date</label>
              <input type="date" value={form.orderDate} onChange={e=>setForm(p=>({...p,orderDate:e.target.value}))} style={INP}/>
            </div>
            <div>
              <label style={LB}>Expected Delivery</label>
              <input type="date" value={form.expectedDelivery} onChange={e=>setForm(p=>({...p,expectedDelivery:e.target.value}))} style={INP}/>
            </div>
          </div>

          <p style={{ fontSize:12, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>Line Items</p>
          <div style={{ border:'1px solid #e8e9ec', borderRadius:8, overflow:'hidden', marginBottom:8 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 90px 90px 28px', background:'#f8f9fa', padding:'7px 10px', fontSize:11, fontWeight:600, color:'#9ca3af', gap:6 }}>
              <span>Part</span><span style={{ textAlign:'center' }}>Qty</span><span style={{ textAlign:'right' }}>Unit Cost</span><span style={{ textAlign:'right' }}>Total</span><span/>
            </div>
            {poLines.map((line, i)=>(
              <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 80px 90px 90px 28px', gap:6, padding:'6px 10px', borderTop:'1px solid #f3f4f6', alignItems:'center' }}>
                <select value={line.partId} onChange={e=>setLine(i,'partId',e.target.value)} style={{ ...SEL_W, height:32, fontSize:12 }}>
                  <option value="">— Select part —</option>
                  {parts.map(p=><option key={p.id} value={p.id}>{p.name} (stock: {p.inStock})</option>)}
                </select>
                <input type="number" min="1" value={line.qty} onChange={e=>setLine(i,'qty',e.target.value)} style={{ height:32, border:'1px solid #e8e9ec', borderRadius:6, padding:'0 6px', fontSize:12, textAlign:'center', outline:'none' }}/>
                <input type="number" min="0" step="0.01" value={line.unitCost} onChange={e=>setLine(i,'unitCost',e.target.value)} style={{ height:32, border:'1px solid #e8e9ec', borderRadius:6, padding:'0 6px', fontSize:12, textAlign:'right', outline:'none' }}/>
                <div style={{ height:32, background:'#f8f9fa', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:8, fontSize:12, fontWeight:600, color:'#1a1d23' }}>{$c(line.total)}</div>
                <button onClick={()=>poLines.length>1&&setPoLines(p=>p.filter((_,j)=>j!==i))} style={{ width:24, height:24, border:'none', background:'none', color:'#9ca3af', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <button onClick={()=>setPoLines(p=>[...p,blankLine()])} style={{ fontSize:12.5, color:'#2563eb', background:'none', border:'none', cursor:'pointer' }}>+ Add Line Item</button>
            <span style={{ fontSize:14, fontWeight:700, color:'#1a1d23' }}>Total: {$c(grand)}</span>
          </div>

          <div>
            <label style={LB}>Notes / Special Instructions</label>
            <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2}
              style={{ width:'100%', boxSizing:'border-box', border:'1px solid #e8e9ec', borderRadius:7, padding:'8px 12px', fontSize:13, color:'#374151', resize:'vertical', outline:'none' }}/>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:20, paddingTop:16, borderTop:'1px solid #f0f1f3' }}>
            <button onClick={()=>setShowCreate(false)} style={BTN_GHOST}>Cancel</button>
            <button onClick={handleCreate} disabled={!form.supplier||!poLines.some(l=>l.partId)} style={{ ...BTN, opacity:!form.supplier?0.5:1 }}>Create PO</button>
          </div>
        </Modal>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <Modal title={showDetail.id} subtitle={`${showDetail.supplier} · ${showDetail.status}`} onClose={()=>setShowDetail(null)} maxWidth={540}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[['Supplier',showDetail.supplier],['Contact',showDetail.supplierContact||'—'],['Order Date',showDetail.orderDate],['Expected',showDetail.expectedDelivery],['Status',showDetail.status],['Received',showDetail.receivedAt||'—']].map(([l,v])=>(
                <div key={l}><p style={{ fontSize:11, color:'#9ca3af', fontWeight:600, margin:'0 0 2px', textTransform:'uppercase' }}>{l}</p><p style={{ fontSize:13.5, color:'#1a1d23', margin:0, fontWeight:500 }}>{v}</p></div>
              ))}
            </div>
            <div>
              <p style={{ fontSize:12, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.5px', margin:'0 0 8px' }}>Line Items</p>
              {showDetail.lineItems.map((li,i)=>(
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f3f4f6', fontSize:13.5 }}>
                  <span style={{ color:'#1a1d23', fontWeight:500 }}>{li.partName}</span>
                  <span style={{ color:'#6b7280' }}>×{li.qty} @ {$c(li.unitCost)} = <strong style={{ color:'#1a1d23' }}>{$c(li.total)}</strong></span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', fontSize:15, fontWeight:700, color:'#1a1d23' }}>
                <span>Total</span><span>{$c(showDetail.total)}</span>
              </div>
            </div>
            {showDetail.notes && <p style={{ fontSize:13, color:'#6b7280', margin:0 }}><strong>Notes:</strong> {showDetail.notes}</p>}
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={()=>downloadPO(showDetail)} style={BTN_GHOST}>⬇ Download PDF</button>
              {showDetail.status!=='Received' && (
                <button onClick={()=>{markReceived(showDetail);setShowDetail(null)}} style={BTN}>Mark as Received</button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Main Inventory page ───────────────────────────────────────────────────────
const TABS = ['Parts Catalog','Stock Movements','Parts on Jobs','Purchase Orders']

export default function Inventory() {
  const [tab,  setTab]  = useState('Parts Catalog')
  const [parts, setParts] = useState(() => getParts())

  function refresh() { setParts(getParts()) }

  const lowCount = parts.filter(p => p.inStock <= p.minStock).length

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      {/* Summary strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
        {[
          ['Total Parts', parts.length,        '#2563eb'],
          ['Low Stock',   lowCount,             lowCount>0?'#dc2626':'#16a34a'],
          ['Out of Stock',parts.filter(p=>p.inStock===0).length, '#d97706'],
          ['Categories',  new Set(parts.map(p=>p.category)).size, '#7c3aed'],
        ].map(([l,v,col])=>(
          <div key={l} style={{ background:'#fff', border:'1px solid #e8e9ec', borderRadius:10, padding:'14px 18px', borderLeft:`3px solid ${col}`, boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize:11.5, color:'#9ca3af', fontWeight:600, margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.4px' }}>{l}</p>
            <p style={{ fontSize:24, fontWeight:800, color:col, margin:0 }}>{v}</p>
          </div>
        ))}
      </div>

      <div style={{ background:'#fff', border:'1px solid #e8e9ec', borderRadius:10, boxShadow:'0 1px 3px rgba(0,0,0,0.05)', overflow:'hidden' }}>
        {/* Tab bar */}
        <div style={{ display:'flex', borderBottom:'1px solid #e8e9ec' }}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{ padding:'12px 20px', fontSize:13.5, fontWeight:tab===t?600:500, color:tab===t?'#2563eb':'#6b7280', background:'none', border:'none', borderBottom:`2px solid ${tab===t?'#2563eb':'transparent'}`, cursor:'pointer', marginBottom:-1, whiteSpace:'nowrap' }}>
              {t}
              {t==='Parts Catalog' && lowCount>0 && (
                <span style={{ marginLeft:7, background:'#dc2626', color:'#fff', fontSize:10.5, fontWeight:700, padding:'1px 6px', borderRadius:10 }}>{lowCount}</span>
              )}
            </button>
          ))}
        </div>

        <div style={{ padding:22 }}>
          {tab==='Parts Catalog'    && <PartsTab     parts={parts} refresh={refresh}/>}
          {tab==='Stock Movements'  && <MovementsTab parts={parts} refresh={refresh}/>}
          {tab==='Parts on Jobs'    && <UsageTab     parts={parts}/>}
          {tab==='Purchase Orders'  && <PurchaseOrdersTab parts={parts} refresh={refresh}/>}
        </div>
      </div>
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const LB      = { display:'block', fontSize:12, fontWeight:600, color:'#6b7280', marginBottom:5 }
const ET      = { fontSize:11, color:'#dc2626', margin:'3px 0 0' }
const INP     = { width:'100%', boxSizing:'border-box', height:36, border:'1px solid #e8e9ec', borderRadius:7, padding:'0 10px', fontSize:13, color:'#374151', outline:'none', background:'#fff' }
const SEL     = { height:32, padding:'0 8px', border:'1px solid #e8e9ec', borderRadius:7, fontSize:12.5, color:'#374151', background:'#fff', cursor:'pointer', outline:'none' }
const SEL_W   = { width:'100%', height:36, border:'1px solid #e8e9ec', borderRadius:7, padding:'0 10px', fontSize:13, color:'#374151', background:'#fff', outline:'none' }
const BTN     = { height:36, padding:'0 16px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }
const BTN_GHOST={ height:36, padding:'0 16px', background:'#f3f4f6', color:'#374151', border:'1px solid #e8e9ec', borderRadius:8, fontSize:13.5, fontWeight:500, cursor:'pointer', whiteSpace:'nowrap' }
const BTN_ICON = { width:28, height:28, border:'none', background:'#f3f4f6', color:'#6b7280', borderRadius:6, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', marginRight:3 }
