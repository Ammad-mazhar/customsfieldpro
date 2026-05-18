import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getQuotes as storeGetQuotes, saveQuotes, saveQuote,
  saveJob,
  getClients as storeGetClients,
  getSettings,
} from '../data/store'
import * as quotesApi from '../api/quotes'
import * as clientsApi from '../api/clients'
import { useApiData } from '../api/hooks'
import { generateQuotePDF, printQuotePDF } from '../utils/generateQuotePDF'
import { useAuth } from '../auth/AuthContext'
import { logActivity, ACTIONS } from '../utils/activityLog'
import { notifyAdmins, NOTIF_TYPES } from '../utils/notifications'
import { sendQuoteEmail } from '../utils/emailService'
import AIEstimator from '../components/AIEstimator'
import { isAIEnabled } from '../utils/aiEstimator'

const SC = { Approved:{bg:'#f0fdf4',color:'#16a34a'}, Sent:{bg:'#eff6ff',color:'#2563eb'}, Declined:{bg:'#fef2f2',color:'#dc2626'}, Draft:{bg:'#f3f4f6',color:'#6b7280'} }

const BLANK_FORM = {clientId:'',type:'',description:'',expires:'',notes:''}
const BLANK_LINE = () => ({id:Date.now()+Math.random(),description:'',qty:1,unit:0,total:0})

function Bdg({label}) {
  const c=SC[label]??{bg:'#f3f4f6',color:'#6b7280'}
  return <span style={{display:'inline-block',fontSize:12,fontWeight:600,padding:'3px 9px',borderRadius:20,background:c.bg,color:c.color}}>{label}</span>
}
function Tabs({tabs,active,onSelect}) {
  return (
    <div style={{display:'flex',borderBottom:'1px solid #e8e9ec'}}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>t.enabled!==false&&onSelect(t.id)}
          style={{padding:'11px 20px',fontSize:13.5,fontWeight:active===t.id?600:500,
            color:active===t.id?'#2563eb':t.enabled===false?'#c4c9d4':'#6b7280',
            background:'none',border:'none',borderBottom:`2px solid ${active===t.id?'#2563eb':'transparent'}`,
            cursor:t.enabled===false?'default':'pointer',marginBottom:-1,whiteSpace:'nowrap'}}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

function AccessDenied() {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'50vh',gap:10,textAlign:'center'}}>
      <div style={{width:52,height:52,borderRadius:'50%',background:'#fef2f2',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" strokeLinecap="round"/></svg>
      </div>
      <h2 style={{fontSize:17,fontWeight:700,color:'#1a1d23',margin:0}}>Access Denied</h2>
      <p style={{fontSize:13.5,color:'#9ca3af',margin:0,maxWidth:320}}>You don't have permission to view Quotes. Contact your administrator.</p>
    </div>
  )
}

export default function Quotes() {
  const { isAdmin, hasPermission } = useAuth()
  const navigate = useNavigate()

  const { data: quotes, setData: setQuotes, loading: quotesLoading, error: quotesError } = useApiData(quotesApi.getQuotes, storeGetQuotes)
  const { data: clients } = useApiData(clientsApi.getClients, storeGetClients)
  const [settings]         = useState(() => getSettings())
  const [tab,setTab]       = useState('all')
  const [selId,setSelId]   = useState(null)
  const [statusF,setStatusF]= useState('All')
  const [form,setForm]     = useState(BLANK_FORM)
  const [lines,setLines]   = useState([BLANK_LINE()])
  const [errs,setErrs]     = useState({})
  const [banner,setBanner] = useState('')
  const [showAI,setShowAI] = useState(false)

  if (!isAdmin && !hasPermission('view_quotes')) return <AccessDenied />

  const sel = quotes.find(q=>q.id===selId)
  const canCreate = isAdmin || hasPermission('create_quotes')
  const tabs=[
    {id:'all',    label:'All Quotes'},
    {id:'detail', label: sel?`Quote Detail (${sel.id})`:'Quote Detail', enabled:!!sel},
    ...(canCreate ? [{id:'create', label:'Create Quote'}] : []),
  ]

  function open(id) { setSelId(id); setTab('detail') }
  function flash(msg) { setBanner(msg); setTimeout(()=>setBanner(''),3000) }

  function setStatus(id,status) {
    const q = quotes.find(x => x.id === id)
    quotesApi.updateQuote(id, { status }).catch(() => {})
    const newArr = quotes.map(x=>x.id===id?{...x,status}:x)
    setQuotes(newArr)
    saveQuotes(newArr)
    const action = status === 'Approved' ? ACTIONS.QUOTE_APPROVED : status === 'Sent' ? ACTIONS.QUOTE_SENT : ACTIONS.QUOTE_CREATED
    logActivity(action, 'Quotes', id, `${id} – ${q?.clientName || ''}`, `Quote status set to ${status}.`)
    if (status === 'Approved') {
      notifyAdmins(NOTIF_TYPES.QUOTE_APPROVED, 'Quote Approved', `Quote ${id} approved by ${q?.clientName || 'client'} ($${(q?.total || 0).toLocaleString()}).`, 'Quotes', id)
    }
  }

  function toJob(q) {
    const newJob = {
      id:`JOB-${Date.now()}`,
      clientId:q.clientId,clientName:q.clientName,
      clientPhone:q.clientPhone||'',clientEmail:q.clientEmail||'',clientAddress:'',
      type:q.type,title:`${q.type} — from ${q.id}`,
      techName:'',status:'Scheduled',
      date:new Date().toISOString().split('T')[0],time:'',duration:'2 hrs',
      lineItems:(q.lineItems||[]).map(li=>({...li,id:Date.now()+Math.random()})),
      taxRate:0,total:q.total||0,
      notes:`Converted from quote ${q.id}. ${q.description||''}`.trim(),
    }
    saveJob(newJob)
    logActivity(ACTIONS.QUOTE_CONVERTED, 'Quotes', q.id, `${q.id} – ${q.clientName}`, `Quote converted to ${newJob.id}.`)
    navigate('/jobs')
    flash(`Job ${newJob.id} created from ${q.id}.`)
  }

  const visible = quotes.filter(q=>statusF==='All'||q.status===statusF)

  function updateLine(id,field,val) {
    setLines(p=>p.map(li=>{
      if(li.id!==id) return li
      const u={...li,[field]:val}
      if(field==='qty'||field==='unit') u.total=parseFloat(u.qty||0)*parseFloat(u.unit||0)
      return u
    }))
  }

  const sub   = lines.reduce((s,l)=>s+(parseFloat(l.total)||0),0)
  const grand = sub

  function validate() {
    const e={}
    if(!form.clientId) e.clientId='Required'
    if(!form.type.trim()) e.type='Required'
    if(!form.description.trim()) e.description='Required'
    if(!form.expires) e.expires='Required'
    if(!lines.some(l=>l.description.trim())) e.lines='At least one line item required'
    return e
  }

  function submitCreate() {
    const e=validate(); if(Object.keys(e).length){setErrs(e);return}
    const c=clients.find(x=>x.id===Number(form.clientId))
    const n={
      id:`QUO-${Date.now()}`,
      clientId:Number(form.clientId),clientName:c?.name||'',clientPhone:c?.phone||'',clientEmail:c?.email||'',
      type:form.type,description:form.description,
      created:new Date().toISOString().split('T')[0],expires:form.expires,status:'Sent',
      lineItems:lines.filter(l=>l.description.trim()),total:grand,notes:form.notes,
    }
    quotesApi.createQuote(n).catch(() => {})
    const updated = saveQuote(n)
    setQuotes(updated)
    logActivity(ACTIONS.QUOTE_CREATED, 'Quotes', n.id, `${n.id} – ${n.clientName}`, `Quote created: ${n.type}.`)
    // Send quote email to client if toggle is on
    if (settings.notifications?.emailOnQuoteSent && c?.email) {
      sendQuoteEmail(n, c)
    }
    setForm(BLANK_FORM);setLines([BLANK_LINE()]);setErrs({});setTab('all')
    flash(`${n.id} created and marked as Sent.`)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {banner&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',color:'#16a34a',borderRadius:8,padding:'10px 16px',fontSize:13.5,fontWeight:600}}>✓ {banner}</div>}
      {quotesLoading&&<div style={{fontSize:12.5,color:'#9ca3af',display:'flex',alignItems:'center',gap:6}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{animation:'spin 0.8s linear infinite'}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Syncing with server…</div>}
      {quotesError&&<div style={{background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',borderRadius:8,padding:'8px 14px',fontSize:13}}>API unavailable — showing cached data</div>}

      <div style={{background:'#fff',border:'1px solid #e8e9ec',borderRadius:10,boxShadow:'0 1px 3px rgba(0,0,0,0.05)',overflow:'hidden'}}>
        <Tabs tabs={tabs} active={tab} onSelect={setTab}/>
        <div style={{padding:24}}>

          {/* ALL */}
          {tab==='all'&&(
            <div>
              <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {['All','Sent','Approved','Declined','Draft'].map(s=>(
                    <button key={s} onClick={()=>setStatusF(s)}
                      style={{height:32,padding:'0 12px',border:`1px solid ${statusF===s?'#bfdbfe':'#e8e9ec'}`,borderRadius:7,fontSize:12.5,fontWeight:500,color:statusF===s?'#2563eb':'#6b7280',background:statusF===s?'#eff6ff':'#fff',cursor:'pointer'}}>{s}</button>
                  ))}
                </div>
                <button onClick={()=>{setForm(BLANK_FORM);setLines([BLANK_LINE()]);setErrs({});setTab('create')}}
                  style={{height:36,padding:'0 16px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:'pointer',marginLeft:'auto'}}>+ New Quote</button>
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>{['Quote #','Client','Type','Description','Created','Expires','Total','Status','Actions'].map(h=>(
                    <th key={h} style={{textAlign:'left',fontSize:11.5,fontWeight:600,color:'#9ca3af',letterSpacing:'0.4px',padding:'9px 14px',borderBottom:'1px solid #f0f1f3',whiteSpace:'nowrap'}}>{h}</th>
                  ))}</tr></thead>
                  <tbody>
                    {visible.map(q=>(
                      <tr key={q.id} onClick={()=>open(q.id)} style={{borderBottom:'1px solid #f8f9fa',cursor:'pointer'}}
                        onMouseEnter={e=>e.currentTarget.style.background='#fafbff'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{padding:'11px 14px'}}><span style={{fontFamily:'monospace',fontSize:12,background:'#f3f4f6',padding:'2px 7px',borderRadius:4,color:'#6b7280'}}>{q.id}</span></td>
                        <td style={{padding:'11px 14px',fontWeight:600,color:'#1a1d23',fontSize:13.5,whiteSpace:'nowrap'}}>{q.clientName}</td>
                        <td style={{padding:'11px 14px',fontSize:13,color:'#6b7280',whiteSpace:'nowrap'}}>{q.type}</td>
                        <td style={{padding:'11px 14px',fontSize:13,color:'#6b7280',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{q.description}</td>
                        <td style={{padding:'11px 14px',fontSize:12.5,color:'#9ca3af',whiteSpace:'nowrap'}}>{q.created}</td>
                        <td style={{padding:'11px 14px',fontSize:13,color:'#374151',whiteSpace:'nowrap'}}>{q.expires}</td>
                        <td style={{padding:'11px 14px',fontSize:13.5,fontWeight:700,color:'#1a1d23',whiteSpace:'nowrap'}}>${(q.total||0).toLocaleString()}</td>
                        <td style={{padding:'11px 14px'}}><Bdg label={q.status}/></td>
                        <td style={{padding:'11px 14px'}}>
                          <div style={{display:'flex',gap:6}} onClick={e=>e.stopPropagation()}>
                            <button onClick={()=>open(q.id)} style={{fontSize:12,color:'#2563eb',background:'#eff6ff',border:'none',borderRadius:6,padding:'3px 8px',cursor:'pointer'}}>View</button>
                            {q.status==='Sent'&&<button onClick={()=>setStatus(q.id,'Approved')} style={{fontSize:12,color:'#16a34a',background:'#f0fdf4',border:'none',borderRadius:6,padding:'3px 8px',cursor:'pointer'}}>Approve</button>}
                            {q.status==='Approved'&&<button onClick={()=>toJob(q)} style={{fontSize:12,color:'#d97706',background:'#fffbeb',border:'none',borderRadius:6,padding:'3px 8px',cursor:'pointer'}}>→ Job</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!visible.length&&<tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'#9ca3af'}}>No quotes found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DETAIL */}
          {tab==='detail'&&sel&&(
            <div style={{display:'flex',flexDirection:'column',gap:20}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                <div>
                  <button onClick={()=>setTab('all')} style={{background:'none',border:'none',color:'#6b7280',fontSize:13,cursor:'pointer',padding:0,marginBottom:8}}>← All Quotes</button>
                  <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                    <span style={{fontFamily:'monospace',fontSize:13,background:'#f3f4f6',padding:'3px 8px',borderRadius:5,color:'#6b7280'}}>{sel.id}</span>
                    <h2 style={{fontSize:20,fontWeight:700,color:'#1a1d23',margin:0}}>{sel.type}</h2>
                    <Bdg label={sel.status}/>
                  </div>
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {sel.status==='Sent'&&<>
                    <button onClick={()=>setStatus(sel.id,'Approved')} style={{height:36,padding:'0 16px',background:'#16a34a',color:'#fff',border:'none',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:'pointer'}}>Approve Quote</button>
                    <button onClick={()=>setStatus(sel.id,'Declined')} style={{height:36,padding:'0 16px',background:'#fff',border:'1px solid #fecaca',color:'#dc2626',borderRadius:8,fontSize:13.5,cursor:'pointer'}}>Mark Declined</button>
                  </>}
                  {sel.status==='Approved'&&<>
                    <button onClick={()=>toJob(sel)} style={{height:36,padding:'0 16px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:'pointer'}}>Convert to Job →</button>
                    <button onClick={()=>setStatus(sel.id,'Sent')} style={{height:36,padding:'0 16px',background:'#fff',border:'1px solid #e8e9ec',color:'#374151',borderRadius:8,fontSize:13.5,cursor:'pointer'}}>Resend</button>
                  </>}
                  {sel.status==='Declined'&&<>
                    <button onClick={()=>setStatus(sel.id,'Sent')} style={{height:36,padding:'0 16px',background:'#fff',border:'1px solid #e8e9ec',color:'#2563eb',borderRadius:8,fontSize:13.5,cursor:'pointer'}}>Resend Quote</button>
                  </>}
                  <button onClick={()=>generateQuotePDF(sel,settings)} style={{height:36,padding:'0 16px',background:'#fff',border:'1px solid #e8e9ec',color:'#374151',borderRadius:8,fontSize:13.5,cursor:'pointer'}}>⬇ Download PDF</button>
                  <button onClick={()=>printQuotePDF(sel,settings)} style={{height:36,padding:'0 16px',background:'#fff',border:'1px solid #e8e9ec',color:'#374151',borderRadius:8,fontSize:13.5,cursor:'pointer'}}>🖨 Print</button>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                <div style={C}>
                  <p style={CT}>Client</p>
                  <p style={{fontSize:15,fontWeight:700,color:'#1a1d23',margin:'0 0 6px'}}>{sel.clientName}</p>
                  <p style={{fontSize:13.5,color:'#6b7280',margin:'0 0 3px'}}>{sel.clientPhone}</p>
                  <p style={{fontSize:13.5,color:'#6b7280',margin:0}}>{sel.clientEmail}</p>
                </div>
                <div style={C}>
                  <p style={CT}>Quote Details</p>
                  {[['Quote #',sel.id],['Created',sel.created],['Valid Until',sel.expires],['Status',<Bdg key="s" label={sel.status}/>]].map(([l,v])=>(
                    <div key={l} style={{display:'flex',gap:12,marginBottom:8,alignItems:'center'}}>
                      <span style={{fontSize:12,color:'#9ca3af',width:90,flexShrink:0}}>{l}</span>
                      <span style={{fontSize:13.5,color:'#374151'}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={C}>
                <p style={CT}>Line Items</p>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>{['Description','Qty','Unit Price','Total'].map(h=>(
                    <th key={h} style={{textAlign:h==='Description'?'left':'right',fontSize:11.5,fontWeight:600,color:'#9ca3af',padding:'7px 12px',borderBottom:'1px solid #f0f1f3'}}>{h}</th>
                  ))}</tr></thead>
                  <tbody>{sel.lineItems.map(li=>(
                    <tr key={li.id} style={{borderBottom:'1px solid #f8f9fa'}}>
                      <td style={{padding:'10px 12px',fontSize:13.5,color:'#374151'}}>{li.description}</td>
                      <td style={{padding:'10px 12px',fontSize:13.5,color:'#374151',textAlign:'right'}}>{li.qty}</td>
                      <td style={{padding:'10px 12px',fontSize:13.5,color:'#374151',textAlign:'right'}}>${li.unit.toLocaleString()}</td>
                      <td style={{padding:'10px 12px',fontSize:13.5,fontWeight:600,color:'#1a1d23',textAlign:'right'}}>${li.total.toLocaleString()}</td>
                    </tr>
                  ))}</tbody>
                </table>
                <div style={{borderTop:'2px solid #f0f1f3',marginTop:4}}>
                  <div style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',fontSize:13.5,color:'#6b7280'}}><span>Subtotal</span><span>${(sel.total||0).toLocaleString()}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',padding:'10px 12px',fontSize:15,fontWeight:700,color:'#1a1d23',borderTop:'1px solid #f0f1f3'}}><span>Quote Total</span><span>${(sel.total||0).toLocaleString()}</span></div>
                </div>
              </div>

              <div style={C}>
                <p style={CT}>Description</p>
                <p style={{fontSize:13.5,color:'#374151',lineHeight:1.7,margin:0,background:'#f8f9fa',borderRadius:8,padding:'12px 14px'}}>{sel.description}</p>
                {sel.notes&&<p style={{fontSize:13,color:'#6b7280',marginTop:10,lineHeight:1.7}}>{sel.notes}</p>}
              </div>
            </div>
          )}

          {/* CREATE */}
          {tab==='create'&&(
            <div style={{maxWidth:720}}>
              <h3 style={{fontSize:17,fontWeight:700,color:'#1a1d23',margin:'0 0 20px'}}>Create Quote</h3>
              <div style={C}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                  <div>
                    <label style={LB}>Client <span style={{color:'#dc2626'}}>*</span></label>
                    <select value={form.clientId} onChange={e=>{setForm(p=>({...p,clientId:e.target.value}));setErrs(p=>({...p,clientId:undefined}))}}
                      style={{width:'100%',height:38,border:`1px solid ${errs.clientId?'#dc2626':'#e8e9ec'}`,borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',background:'#fff'}}>
                      <option value="">— Select client —</option>
                      {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {errs.clientId&&<p style={ET}>Required</p>}
                  </div>
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
                        Get AI Estimate
                      </button>
                    )}
                  </div>
                </div>
                <div style={{marginTop:14}}>
                  <label style={LB}>Description <span style={{color:'#dc2626'}}>*</span></label>
                  <textarea value={form.description} onChange={e=>{setForm(p=>({...p,description:e.target.value}));setErrs(p=>({...p,description:undefined}))}} rows={2}
                    placeholder="Brief description of the work to be quoted…"
                    style={{width:'100%',boxSizing:'border-box',border:`1px solid ${errs.description?'#dc2626':'#e8e9ec'}`,borderRadius:7,padding:'10px 12px',fontSize:13.5,color:'#374151',resize:'vertical',outline:'none'}}/>
                  {errs.description&&<p style={ET}>Required</p>}
                </div>
                <div style={{marginTop:14}}>
                  <label style={LB}>Valid Until <span style={{color:'#dc2626'}}>*</span></label>
                  <input type="date" value={form.expires} onChange={e=>{setForm(p=>({...p,expires:e.target.value}));setErrs(p=>({...p,expires:undefined}))}}
                    style={{width:200,height:38,border:`1px solid ${errs.expires?'#dc2626':'#e8e9ec'}`,borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',outline:'none',boxSizing:'border-box'}}/>
                  {errs.expires&&<p style={ET}>Required</p>}
                </div>

                <div style={{marginTop:20}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                    <p style={{...CT,margin:0}}>Line Items</p>
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
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:15,fontWeight:700,color:'#1a1d23',borderTop:'1px solid #e8e9ec',paddingTop:8}}><span>Quote Total</span><span>${grand.toFixed(2)}</span></div>
                    </div>
                  </div>
                </div>

                <div style={{marginTop:14}}>
                  <label style={LB}>Notes</label>
                  <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} placeholder="Validity conditions, lead times, terms…"
                    style={{width:'100%',boxSizing:'border-box',border:'1px solid #e8e9ec',borderRadius:7,padding:'10px 12px',fontSize:13.5,color:'#374151',resize:'vertical',outline:'none'}}/>
                </div>
                <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20,paddingTop:16,borderTop:'1px solid #f0f1f3'}}>
                  <button onClick={()=>{setForm(BLANK_FORM);setLines([BLANK_LINE()]);setErrs({});setTab('all')}}
                    style={{height:38,padding:'0 18px',background:'#f3f4f6',color:'#374151',border:'none',borderRadius:8,fontSize:13.5,fontWeight:500,cursor:'pointer'}}>Cancel</button>
                  <button onClick={submitCreate}
                    style={{height:38,padding:'0 20px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:'pointer'}}>Create Quote</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {showAI&&(
        <AIEstimator
          serviceType={form.type}
          equipment=""
          onUseEstimate={items=>{
            setLines(items.map(li=>({id:Date.now()+Math.random(),description:li.description||'',qty:li.qty||1,unit:li.unit||0,total:li.total||0})))
          }}
          onClose={()=>setShowAI(false)}
        />
      )}
    </div>
  )
}

const C  = {background:'#fff',border:'1px solid #e8e9ec',borderRadius:10,padding:'18px 20px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}
const CT = {fontSize:12,fontWeight:700,color:'#9ca3af',margin:'0 0 14px',textTransform:'uppercase',letterSpacing:'0.5px'}
const LB = {display:'block',fontSize:12,fontWeight:600,color:'#6b7280',marginBottom:5}
const ET = {fontSize:11,color:'#dc2626',margin:'4px 0 0'}
