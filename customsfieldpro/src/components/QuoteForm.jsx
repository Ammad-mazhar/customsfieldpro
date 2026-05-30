import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { saveQuote, getClients, getSettings, clientDisplayName } from '../data/store'
import { getNextNumber, formatQuoteNumber } from '../utils/numberGenerator'
import { logActivity, ACTIONS } from '../utils/activityLog'
import { sendQuoteEmail } from '../utils/emailService'
import AIEstimator from './AIEstimator'
import { isAIEnabled } from '../utils/aiEstimator'

const BLANK_LINE = () => ({id:Date.now()+Math.random(),description:'',qty:1,unit:0,total:0})
const LB = {display:'block',fontSize:12,fontWeight:600,color:'#6b7280',marginBottom:5}
const ET = {fontSize:11,color:'#dc2626',margin:'4px 0 0'}

export default function QuoteForm({ clientId, clientName, onClose, onSuccess }) {
  const [settings] = useState(() => getSettings())
  const [clients, setClients] = useState(() => getClients())
  const [requests, setRequests] = useState([])
  const [form, setForm] = useState({linkedRequestId:'',type:'',description:'',expires:'',notes:''})
  const [lines, setLines] = useState([BLANK_LINE()])
  const [errs, setErrs] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [banner, setBanner] = useState('')
  const [showAI, setShowAI] = useState(false)

  useEffect(() => {
    api.getClients().then(res => {
      const list = res?.data || res || []
      if (Array.isArray(list) && list.length > 0) setClients(list)
    }).catch(() => {})
    api.getRequests().then(res => {
      setRequests((res?.data || [])
        .filter(r => r.client_id === clientId)
        .map(r => ({
          id: r.id,
          type: r.service_type || '',
          description: r.description || '',
          status: r.status || '',
        })))
    }).catch(() => {})
  }, [clientId])

  function flash(msg) { setBanner(msg); setTimeout(() => setBanner(''), 3000) }

  function updateLine(id, field, val) {
    setLines(p => p.map(li => {
      if (li.id !== id) return li
      const u = { ...li, [field]: val }
      if (field === 'qty' || field === 'unit') u.total = parseFloat(u.qty||0) * parseFloat(u.unit||0)
      return u
    }))
  }

  const sub = lines.reduce((s, l) => s + (parseFloat(l.total) || 0), 0)

  function validate() {
    const e = {}
    if (!form.type.trim()) e.type = 'Required'
    if (!form.description.trim()) e.description = 'Required'
    if (!form.expires) e.expires = 'Required'
    if (!lines.some(l => l.description.trim())) e.lines = 'At least one line item required'
    return e
  }

  function handleRequestLink(requestId) {
    if (!requestId) { setForm(p => ({ ...p, linkedRequestId: '' })); return }
    const req = requests.find(r => r.id === requestId)
    setForm(p => ({
      ...p,
      linkedRequestId: requestId,
      type:        p.type        || req?.type        || '',
      description: p.description || req?.description || '',
    }))
  }

  async function submit() {
    const e = validate()
    if (Object.keys(e).length) { setErrs(e); return }
    if (submitting) return
    setSubmitting(true)
    try {
      const c = clients.find(x => x.id === clientId)
      const n = {
        id: formatQuoteNumber(getNextNumber('quotes')),
        clientId, clientName: clientName || (c ? clientDisplayName(c) : ''),
        clientPhone: c?.phone || '', clientEmail: c?.email || '',
        type: form.type, description: form.description,
        created: new Date().toISOString().split('T')[0], expires: form.expires, status: 'Sent',
        linkedJobId: null, linkedJobNumber: null, linkedInvoiceId: null, linkedInvoiceNumber: null,
        lineItems: lines.filter(l => l.description.trim()), total: sub, notes: form.notes,
      }
      saveQuote(n)
      api.createQuote({
        client_id: clientId, title: form.type, subtotal: sub, tax_rate: 0,
        line_items: lines.filter(l => l.description.trim()),
        notes: form.notes || null, valid_until: form.expires || null,
      }).catch(() => {})
      logActivity(ACTIONS.QUOTE_CREATED, 'Quotes', n.id, `${n.id} – ${clientName}`, `Quote created: ${n.type}.`)
      if (settings.notifications?.emailOnQuoteSent && c?.email) sendQuoteEmail(n, c)
      onSuccess?.()
      onClose?.()
    } catch (err) {
      flash(`Error: ${err.message}`)
      setSubmitting(false)
    }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:2000,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:20,overflowY:'auto'}}>
      <div style={{background:'#fff',borderRadius:12,width:'100%',maxWidth:720,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',margin:'auto',flexShrink:0}}>

        {/* Header */}
        <div style={{padding:'20px 24px',borderBottom:'1px solid #f0f1f3',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <h3 style={{margin:0,fontSize:18,fontWeight:700,color:'#1a1d23'}}>Create Quote</h3>
            <p style={{margin:'2px 0 0',fontSize:13,color:'#9ca3af'}}>{clientName}</p>
          </div>
          <button onClick={onClose} style={{width:32,height:32,border:'none',background:'#f3f4f6',borderRadius:8,fontSize:20,cursor:'pointer',color:'#6b7280',lineHeight:1}}>×</button>
        </div>

        {/* Body */}
        <div style={{padding:24}}>
          {banner&&<div style={{background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',borderRadius:8,padding:'10px 16px',fontSize:13,marginBottom:16}}>{banner}</div>}

          {/* Client locked */}
          <div style={{marginBottom:16}}>
            <label style={LB}>Client</label>
            <div style={{height:38,border:'1px solid #e8e9ec',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',background:'#f9fafb',display:'flex',alignItems:'center'}}>{clientName}</div>
          </div>

          {/* Link to request */}
          {requests.length > 0 && (
            <div style={{marginBottom:16}}>
              <label style={LB}>Link to Request <span style={{fontWeight:400,color:'#9ca3af'}}>(optional — auto-fills fields)</span></label>
              <select value={form.linkedRequestId} onChange={e=>handleRequestLink(e.target.value)}
                style={{width:'100%',height:38,border:'1px solid #e8e9ec',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',background:'#fff'}}>
                <option value="">— No linked request —</option>
                {requests.filter(r=>r.status!=='converted').map(r=>(
                  <option key={r.id} value={r.id}>{r.type || 'Service Request'} ({r.id})</option>
                ))}
              </select>
            </div>
          )}

          {/* Service type + expires */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            <div>
              <label style={LB}>Service Type <span style={{color:'#dc2626'}}>*</span></label>
              <select value={form.type} onChange={e=>{setForm(p=>({...p,type:e.target.value}));setErrs(p=>({...p,type:undefined}))}}
                style={{width:'100%',height:38,border:`1px solid ${errs.type?'#dc2626':'#e8e9ec'}`,borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',background:'#fff'}}>
                <option value="">— Select type —</option>
                {['HVAC Repair','HVAC Install','Furnace Service','Plumbing','Drain','Electrical','Generator','LED Retrofit','Other'].map(t=><option key={t}>{t}</option>)}
              </select>
              {errs.type&&<p style={ET}>Required</p>}
              {isAIEnabled()&&(
                <button type="button" onClick={()=>setShowAI(true)}
                  style={{marginTop:8,height:34,padding:'0 14px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',borderRadius:7,fontSize:12.5,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg>
                  AI Estimate
                </button>
              )}
            </div>
            <div>
              <label style={LB}>Valid Until <span style={{color:'#dc2626'}}>*</span></label>
              <input type="date" value={form.expires} onChange={e=>{setForm(p=>({...p,expires:e.target.value}));setErrs(p=>({...p,expires:undefined}))}}
                style={{width:'100%',boxSizing:'border-box',height:38,border:`1px solid ${errs.expires?'#dc2626':'#e8e9ec'}`,borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',outline:'none'}}/>
              {errs.expires&&<p style={ET}>Required</p>}
            </div>
          </div>

          {/* Description */}
          <div style={{marginBottom:20}}>
            <label style={LB}>Description <span style={{color:'#dc2626'}}>*</span></label>
            <textarea value={form.description} onChange={e=>{setForm(p=>({...p,description:e.target.value}));setErrs(p=>({...p,description:undefined}))}} rows={2}
              placeholder="Brief description of the work to be quoted…"
              style={{width:'100%',boxSizing:'border-box',border:`1px solid ${errs.description?'#dc2626':'#e8e9ec'}`,borderRadius:7,padding:'10px 12px',fontSize:13.5,color:'#374151',resize:'vertical',outline:'none'}}/>
            {errs.description&&<p style={ET}>Required</p>}
          </div>

          {/* Line items */}
          <div style={{marginBottom:20}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <label style={{...LB,margin:0}}>Line Items</label>
              <button onClick={()=>setLines(p=>[...p,BLANK_LINE()])} style={{fontSize:12.5,color:'#2563eb',background:'none',border:'none',cursor:'pointer',fontWeight:500}}>+ Add Line Item</button>
            </div>
            {errs.lines&&<p style={ET}>{errs.lines}</p>}
            <div style={{border:'1px solid #f0f1f3',borderRadius:8,overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 60px 90px 90px 32px',background:'#f8f9fa',padding:'8px 12px',fontSize:11.5,fontWeight:600,color:'#9ca3af'}}>
                <span>Description</span><span style={{textAlign:'center'}}>Qty</span><span style={{textAlign:'right'}}>Unit $</span><span style={{textAlign:'right'}}>Total</span><span/>
              </div>
              {lines.map(li=>(
                <div key={li.id} style={{display:'grid',gridTemplateColumns:'1fr 60px 90px 90px 32px',gap:6,padding:'8px 12px',borderTop:'1px solid #f3f4f6',alignItems:'center'}}>
                  <input value={li.description} onChange={e=>updateLine(li.id,'description',e.target.value)} placeholder="Description"
                    style={{height:34,border:'1px solid #e8e9ec',borderRadius:6,padding:'0 8px',fontSize:13,color:'#374151',outline:'none'}}/>
                  <input type="number" min="1" value={li.qty} onChange={e=>updateLine(li.id,'qty',e.target.value)}
                    style={{height:34,border:'1px solid #e8e9ec',borderRadius:6,padding:'0 6px',fontSize:13,color:'#374151',outline:'none',textAlign:'center'}}/>
                  <input type="number" min="0" value={li.unit} onChange={e=>updateLine(li.id,'unit',e.target.value)}
                    style={{height:34,border:'1px solid #e8e9ec',borderRadius:6,padding:'0 8px',fontSize:13,color:'#374151',outline:'none',textAlign:'right'}}/>
                  <div style={{height:34,background:'#f8f9fa',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'flex-end',paddingRight:8,fontSize:13,fontWeight:600,color:'#1a1d23'}}>${(parseFloat(li.total)||0).toFixed(2)}</div>
                  <button onClick={()=>lines.length>1&&setLines(p=>p.filter(x=>x.id!==li.id))} style={{height:28,width:28,display:'flex',alignItems:'center',justifyContent:'center',background:'none',border:'none',color:lines.length>1?'#9ca3af':'#e8e9ec',cursor:lines.length>1?'pointer':'default',fontSize:16}}>×</button>
                </div>
              ))}
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:10}}>
              <div style={{background:'#f8f9fa',borderRadius:8,padding:'12px 16px',minWidth:200}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:13.5,color:'#6b7280',marginBottom:6}}><span>Subtotal</span><span>${sub.toFixed(2)}</span></div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:15,fontWeight:700,color:'#1a1d23',borderTop:'1px solid #e8e9ec',paddingTop:8}}><span>Quote Total</span><span>${sub.toFixed(2)}</span></div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={LB}>Notes</label>
            <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} placeholder="Validity conditions, lead times, terms…"
              style={{width:'100%',boxSizing:'border-box',border:'1px solid #e8e9ec',borderRadius:7,padding:'10px 12px',fontSize:13.5,color:'#374151',resize:'vertical',outline:'none'}}/>
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:'16px 24px',borderTop:'1px solid #f0f1f3',display:'flex',justifyContent:'flex-end',gap:10,background:'#f9fafb',borderRadius:'0 0 12px 12px'}}>
          <button onClick={onClose} style={{height:40,padding:'0 20px',background:'#fff',color:'#374151',border:'1px solid #e5e7eb',borderRadius:8,fontSize:14,fontWeight:500,cursor:'pointer'}}>Cancel</button>
          <button onClick={submit} disabled={submitting}
            style={{height:40,padding:'0 24px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer',opacity:submitting?0.6:1}}>
            {submitting?'Creating…':'Create Quote'}
          </button>
        </div>
      </div>

      {showAI&&(
        <AIEstimator
          serviceType={form.type} equipment=""
          onUseEstimate={items=>setLines(items.map(li=>({id:Date.now()+Math.random(),description:li.description||'',qty:li.qty||1,unit:li.unit||0,total:li.total||0})))}
          onClose={()=>setShowAI(false)}
        />
      )}
    </div>
  )
}
