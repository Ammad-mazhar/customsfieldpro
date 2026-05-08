import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRequests, saveRequests, saveRequest, saveJob, saveQuote, getClients, getSettings } from '../data/store'
import { useAuth } from '../auth/AuthContext'
import AddressAutocomplete from '../components/AddressAutocomplete'
import { getNextNumber, formatJobNumber, formatQuoteNumber } from '../utils/numberGenerator'
import { notifyAdmins, NOTIF_TYPES } from '../utils/notifications'
import { logActivity, ACTIONS } from '../utils/activityLog'
import { sendRequestConfirmation } from '../utils/emailService'

const PRIORITY_C = { Urgent:{bg:'#fef2f2',color:'#dc2626'}, Normal:{bg:'#eff6ff',color:'#2563eb'}, Low:{bg:'#f3f4f6',color:'#6b7280'} }
const STATUS_C   = { Open:{bg:'#fffbeb',color:'#d97706'}, Converted:{bg:'#f0fdf4',color:'#16a34a'} }

const BLANK = {
  clientMode:'existing',clientId:'',newClientName:'',phone:'',
  type:'',priority:'Normal',internalNotes:'',
  title:'',
  tenantNameContact:'',tenantAddress:'',
  equipmentMake:'',equipmentUnit:'',equipmentModel:'',
  issueSymptoms:'',
  preferredDate1:'',preferredDate2:'',preferredArrivalTime:'any_time',
  scopeFromOffice:'',scopeFieldSupervisor:'',
  claimTrackingId:'',
  jobAcceptedByRep:'',jobAcceptedByCompany:'',
  claimFields:['','','','','','','','','',''],
  uploadedImages:[],
  onSiteAssessment:'',
}

function Bdg({label,map}) {
  const c=map[label]??{bg:'#f3f4f6',color:'#6b7280'}
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

export default function Requests() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const imgInputRef = useRef(null)

  const [requests,setRequests]   = useState(() => getRequests())
  const [clients]                = useState(() => getClients())
  const [settings]               = useState(() => getSettings())
  const [tab,setTab]             = useState('all')
  const [selId,setSelId]         = useState(null)
  const [priorityF,setPriorityF] = useState('All')
  const [statusF,setStatusF]     = useState('All')
  const [form,setForm]           = useState(BLANK)
  const [errs,setErrs]           = useState({})
  const [noteDraft,setNoteDraft] = useState('')
  const [editNote,setEditNote]   = useState(false)
  const [banner,setBanner]       = useState('')

  const sel = requests.find(r=>r.id===selId)
  const openCount = requests.filter(r=>r.status==='Open').length

  const tabs=[
    {id:'all',    label:'All Requests'},
    {id:'detail', label: sel?`Request Detail (${sel.id})`:'Request Detail', enabled:!!sel},
    {id:'new',    label:'New Request'},
  ]

  function open(id) { setSelId(id); setTab('detail'); setEditNote(false) }
  function flash(msg) { setBanner(msg); setTimeout(()=>setBanner(''),3000) }

  function markConverted(id, note) {
    const newArr = requests.map(r=>r.id===id?{...r,status:'Converted',internalNotes:note||r.internalNotes}:r)
    setRequests(newArr)
    saveRequests(newArr)
  }

  function saveNote() {
    const newArr = requests.map(r=>r.id===sel.id?{...r,internalNotes:noteDraft}:r)
    setRequests(newArr)
    saveRequests(newArr)
    setEditNote(false)
  }

  function convertToJob(req) {
    const newJob = {
      id: formatJobNumber(getNextNumber('jobs')),
      clientId:req.clientId,clientName:req.clientName,
      clientPhone:req.clientPhone||'',clientEmail:'',clientAddress:'',
      type:req.type,title:req.type,techName:'',status:'Scheduled',
      date:req.preferredDate||new Date().toISOString().split('T')[0],
      time:'',duration:'2 hrs',
      lineItems:[],taxRate:0,total:0,
      notes:req.description||'',
      claimNumber:req.claimNumber||'',
      linkedQuoteNumber:null,linkedQuoteId:null,linkedInvoiceNumbers:[],linkedInvoiceIds:[],
    }
    saveJob(newJob)
    markConverted(req.id, `Converted to ${newJob.id}.`)
    navigate('/jobs')
    flash(`Job ${newJob.id} created.`)
  }

  function convertToQuote(req) {
    const newQuote = {
      id: formatQuoteNumber(getNextNumber('quotes')),
      clientId:req.clientId,clientName:req.clientName,
      clientPhone:req.clientPhone||'',clientEmail:'',
      type:req.type,description:req.description||'',
      created:new Date().toISOString().split('T')[0],expires:'',
      status:'Draft',lineItems:[],total:0,notes:'',
      claimNumber:req.claimNumber||'',
      linkedJobId:null,linkedJobNumber:null,linkedInvoiceId:null,linkedInvoiceNumber:null,
    }
    saveQuote(newQuote)
    markConverted(req.id, `Converted to ${newQuote.id}.`)
    navigate('/quotes')
    flash(`Quote ${newQuote.id} created.`)
  }

  const visible = requests.filter(r=>
    (priorityF==='All'||r.priority===priorityF) &&
    (statusF==='All'||r.status===statusF)
  )

  function validate() {
    const e={}
    if(form.clientMode==='existing'&&!form.clientId) e.clientId='Select a client'
    if(form.clientMode==='new'&&!form.newClientName.trim()) e.newClientName='Enter a name'
    return e
  }

  function submitNew() {
    const e=validate(); if(Object.keys(e).length){setErrs(e);return}
    const c = form.clientMode==='existing' ? clients.find(x=>x.id===Number(form.clientId)) : null
    const arrivalMap = {any_time:'Any Time',morning:'Morning (8am–12pm)',afternoon:'Afternoon (12pm–5pm)',evening:'Evening (5pm–8pm)',emergency:'Emergency'}
    const n = {
      id:`REQ-${Date.now()}`,
      clientId: c?.id||0,
      clientName: c?.name||form.newClientName,
      clientPhone: c?.phone||form.phone,
      type: form.type||'Service Request',
      description: form.issueSymptoms||form.scopeFromOffice||'',
      priority: form.priority,
      received: new Date().toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true}),
      status:'Open',
      preferredDate: form.preferredDate1||'—',
      preferredTime: arrivalMap[form.preferredArrivalTime]||'Any Time',
      internalNotes: form.internalNotes,
      claimNumber: form.claimTrackingId,
      title: form.title,
      tenantNameContact: form.tenantNameContact,
      tenantAddress: form.tenantAddress,
      equipmentMake: form.equipmentMake,
      equipmentUnit: form.equipmentUnit,
      equipmentModel: form.equipmentModel,
      preferredDate2: form.preferredDate2,
      scopeFromOffice: form.scopeFromOffice,
      scopeFieldSupervisor: form.scopeFieldSupervisor,
      jobAcceptedByRep: form.jobAcceptedByRep,
      jobAcceptedByCompany: form.jobAcceptedByCompany,
      claimFields: form.claimFields,
      uploadedImages: form.uploadedImages,
      onSiteAssessment: form.onSiteAssessment,
    }
    const updated = saveRequest(n)
    setRequests(updated)
    logActivity(ACTIONS.REQUEST_CREATED, 'Requests', n.id, `${n.id} – ${n.clientName}`, `New service request: ${n.type}.`)
    notifyAdmins(NOTIF_TYPES.NEW_REQUEST, 'New Service Request', `New service request from ${n.clientName} — ${n.type}.`, 'Requests', n.id)
    if (settings.notifications?.emailOnNewRequest && c?.email) {
      sendRequestConfirmation(n, c)
    }
    setForm({...BLANK,claimFields:['','','','','','','','','',''],uploadedImages:[]})
    setErrs({});setTab('all')
    flash(`${n.id} logged successfully.`)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {banner&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',color:'#16a34a',borderRadius:8,padding:'10px 16px',fontSize:13.5,fontWeight:600}}>✓ {banner}</div>}

      <div style={{background:'#fff',border:'1px solid #e8e9ec',borderRadius:10,boxShadow:'0 1px 3px rgba(0,0,0,0.05)',overflow:'hidden'}}>
        <Tabs tabs={tabs} active={tab} onSelect={setTab}/>
        <div style={{padding:24}}>

          {/* ALL */}
          {tab==='all'&&(
            <div>
              <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {['All','Urgent','Normal','Low'].map(p=>(
                    <button key={p} onClick={()=>setPriorityF(p)}
                      style={{height:32,padding:'0 12px',border:`1px solid ${priorityF===p?'#bfdbfe':'#e8e9ec'}`,borderRadius:7,fontSize:12.5,fontWeight:500,color:priorityF===p?'#2563eb':'#6b7280',background:priorityF===p?'#eff6ff':'#fff',cursor:'pointer'}}>{p}</button>
                  ))}
                  <div style={{width:1,background:'#e8e9ec',margin:'0 4px'}}/>
                  {['All','Open','Converted'].map(s=>(
                    <button key={s} onClick={()=>setStatusF(s)}
                      style={{height:32,padding:'0 12px',border:`1px solid ${statusF===s?'#bfdbfe':'#e8e9ec'}`,borderRadius:7,fontSize:12.5,fontWeight:500,
                        color:statusF===s?'#2563eb':'#6b7280',background:statusF===s?'#eff6ff':'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                      {s}
                      {s==='Open'&&openCount>0&&<span style={{background:'#dc2626',color:'#fff',borderRadius:10,fontSize:10,fontWeight:700,padding:'1px 5px',minWidth:16,textAlign:'center'}}>{openCount}</span>}
                    </button>
                  ))}
                </div>
                <button onClick={()=>{setForm(BLANK);setErrs({});setTab('new')}}
                  style={{height:36,padding:'0 16px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:'pointer',marginLeft:'auto'}}>+ Log Request</button>
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>{['Request #','Client','Phone','Type','Description','Received','Priority','Status','Actions'].map(h=>(
                    <th key={h} style={{textAlign:'left',fontSize:11.5,fontWeight:600,color:'#9ca3af',letterSpacing:'0.4px',padding:'9px 14px',borderBottom:'1px solid #f0f1f3',whiteSpace:'nowrap'}}>{h}</th>
                  ))}</tr></thead>
                  <tbody>
                    {visible.map(req=>(
                      <tr key={req.id} onClick={()=>open(req.id)} style={{borderBottom:'1px solid #f8f9fa',cursor:'pointer'}}
                        onMouseEnter={e=>e.currentTarget.style.background='#fafbff'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{padding:'11px 14px'}}><span style={{fontFamily:'monospace',fontSize:12,background:'#f3f4f6',padding:'2px 7px',borderRadius:4,color:'#6b7280'}}>{req.id}</span></td>
                        <td style={{padding:'11px 14px',fontWeight:600,color:'#1a1d23',fontSize:13.5,whiteSpace:'nowrap'}}>
                          {req.clientName}
                          {req.clientId && <span style={{marginLeft:6,fontFamily:'monospace',fontSize:11,background:'#f0f9ff',color:'#0369a1',border:'1px solid #bae6fd',borderRadius:4,padding:'1px 5px'}}>{req.clientId}</span>}
                        </td>
                        <td style={{padding:'11px 14px',fontSize:13,color:'#6b7280',whiteSpace:'nowrap'}}>{req.clientPhone}</td>
                        <td style={{padding:'11px 14px',fontSize:13,color:'#374151',whiteSpace:'nowrap'}}>{req.type}</td>
                        <td style={{padding:'11px 14px',fontSize:13,color:'#6b7280',maxWidth:200,whiteSpace:'nowrap'}}>
                          <span style={{overflow:'hidden',textOverflow:'ellipsis',display:'block',maxWidth:180}}>{req.description}</span>
                          {req.claimNumber && <span style={{fontFamily:'monospace',fontSize:10.5,background:'#fefce8',color:'#854d0e',border:'1px solid #fde68a',borderRadius:4,padding:'1px 5px',display:'inline-block',marginTop:2}}>{req.claimNumber}</span>}
                        </td>
                        <td style={{padding:'11px 14px',fontSize:12,color:'#9ca3af',whiteSpace:'nowrap'}}>{req.received}</td>
                        <td style={{padding:'11px 14px'}}><Bdg label={req.priority} map={PRIORITY_C}/></td>
                        <td style={{padding:'11px 14px'}}><Bdg label={req.status} map={STATUS_C}/></td>
                        <td style={{padding:'11px 14px'}}>
                          <div style={{display:'flex',gap:5}} onClick={e=>e.stopPropagation()}>
                            <button onClick={()=>open(req.id)} style={{fontSize:12,color:'#2563eb',background:'#eff6ff',border:'none',borderRadius:6,padding:'3px 8px',cursor:'pointer'}}>View</button>
                            {req.status==='Open'&&<>
                              <button onClick={()=>convertToJob(req)} style={{fontSize:12,color:'#fff',background:'#2563eb',border:'none',borderRadius:6,padding:'3px 9px',cursor:'pointer',fontWeight:600}}>→ Job</button>
                              <button onClick={()=>convertToQuote(req)} style={{fontSize:12,color:'#374151',background:'#f3f4f6',border:'none',borderRadius:6,padding:'3px 9px',cursor:'pointer'}}>→ Quote</button>
                            </>}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!visible.length&&<tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'#9ca3af'}}>No requests found.</td></tr>}
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
                  <button onClick={()=>setTab('all')} style={{background:'none',border:'none',color:'#6b7280',fontSize:13,cursor:'pointer',padding:0,marginBottom:8}}>← All Requests</button>
                  <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                    <span style={{fontFamily:'monospace',fontSize:13,background:'#f3f4f6',padding:'3px 8px',borderRadius:5,color:'#6b7280'}}>{sel.id}</span>
                    <h2 style={{fontSize:20,fontWeight:700,color:'#1a1d23',margin:0}}>{sel.type}</h2>
                    <Bdg label={sel.priority} map={PRIORITY_C}/>
                    <Bdg label={sel.status} map={STATUS_C}/>
                  </div>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                <div style={C}>
                  <p style={CT}>Client Information</p>
                  <p style={{fontSize:15,fontWeight:700,color:'#1a1d23',margin:'0 0 6px'}}>
                    {sel.clientName}
                    {sel.clientId && <span style={{marginLeft:8,fontFamily:'monospace',fontSize:11,background:'#f0f9ff',color:'#0369a1',border:'1px solid #bae6fd',borderRadius:4,padding:'2px 6px',fontWeight:400}}>{sel.clientId}</span>}
                  </p>
                  <p style={{fontSize:13.5,color:'#6b7280',margin:'0 0 3px'}}>{sel.clientPhone}</p>
                  <p style={{fontSize:13.5,color:'#6b7280',margin:'0 0 3px'}}>Service Requested: <strong style={{color:'#374151'}}>{sel.type}</strong></p>
                </div>
                <div style={C}>
                  <p style={CT}>Request Details</p>
                  {[['Received',sel.received],['Priority',<Bdg key="p" label={sel.priority} map={PRIORITY_C}/>],['Status',<Bdg key="s" label={sel.status} map={STATUS_C}/>],['Preferred Date',sel.preferredDate],['Preferred Time',sel.preferredTime],...(sel.claimNumber?[['Claim #',<span key="cn" style={{fontFamily:'monospace',fontSize:13,color:'#854d0e',background:'#fefce8',border:'1px solid #fde68a',borderRadius:4,padding:'1px 6px'}}>{sel.claimNumber}</span>]]:[])] .map(([l,v])=>(
                    <div key={l} style={{display:'flex',gap:12,marginBottom:8,alignItems:'center'}}>
                      <span style={{fontSize:12,color:'#9ca3af',width:100,flexShrink:0}}>{l}</span>
                      <span style={{fontSize:13.5,color:'#374151'}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={C}>
                <p style={CT}>Service Request</p>
                <p style={{fontSize:14,color:'#374151',lineHeight:1.8,margin:0,background:'#f8f9fa',borderRadius:8,padding:'14px 16px'}}>{sel.description}</p>
              </div>

              <div style={C}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <p style={{...CT,margin:0}}>Internal Notes <span style={{fontSize:11,color:'#9ca3af',fontWeight:400,marginLeft:6}}>(Staff Only)</span></p>
                  {!editNote
                    ?<button onClick={()=>{setNoteDraft(sel.internalNotes);setEditNote(true)}} style={{fontSize:12.5,color:'#2563eb',background:'none',border:'none',cursor:'pointer',fontWeight:500}}>Edit Notes</button>
                    :<div style={{display:'flex',gap:8}}>
                        <button onClick={saveNote} style={{fontSize:12.5,fontWeight:600,color:'#fff',background:'#2563eb',border:'none',borderRadius:6,padding:'4px 12px',cursor:'pointer'}}>Save</button>
                        <button onClick={()=>setEditNote(false)} style={{fontSize:12.5,color:'#6b7280',background:'none',border:'1px solid #e8e9ec',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>Cancel</button>
                      </div>}
                </div>
                {editNote
                  ?<textarea value={noteDraft} onChange={e=>setNoteDraft(e.target.value)} rows={3}
                      style={{width:'100%',boxSizing:'border-box',border:'1px solid #e8e9ec',borderRadius:7,padding:'10px 12px',fontSize:13.5,color:'#374151',resize:'vertical',outline:'none'}}/>
                  :<p style={{fontSize:13.5,color:sel.internalNotes?'#374151':'#9ca3af',lineHeight:1.7,margin:0}}>{sel.internalNotes||'No internal notes yet.'}</p>}
              </div>

              {sel.status==='Open'&&(
                <div style={{...C,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                  <span style={{fontSize:13,fontWeight:600,color:'#374151',marginRight:4}}>Convert to:</span>
                  <button onClick={()=>convertToJob(sel)} style={{height:38,padding:'0 20px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:'pointer'}}>Create Job →</button>
                  <button onClick={()=>convertToQuote(sel)} style={{height:38,padding:'0 18px',background:'#fff',border:'1px solid #2563eb',color:'#2563eb',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:'pointer'}}>Create Quote →</button>
                </div>
              )}
              {sel.status==='Converted'&&(
                <div style={{...C,background:'#f0fdf4',border:'1px solid #bbf7d0',display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:15,color:'#16a34a'}}>✓</span>
                  <span style={{fontSize:13.5,color:'#16a34a',fontWeight:500}}>This request has been converted.</span>
                  {sel.internalNotes&&<span style={{fontSize:13,color:'#6b7280',marginLeft:4}}>{sel.internalNotes}</span>}
                </div>
              )}
            </div>
          )}

          {/* NEW — Walkabout style */}
          {tab==='new'&&(
            <div style={{maxWidth:700}}>
              <style>{`
                .wrInp:focus{outline:none;border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,0.1)}
                .wrTA:focus{outline:none;border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,0.1)}
                .wrTA{outline:none}
                .wrSec{font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.6px;text-transform:uppercase;margin:0 0 14px}
                .wrUpBox:hover{border-color:#2563eb!important}
              `}</style>

              <div style={{marginBottom:16}}>
                <h2 style={{fontSize:20,fontWeight:700,color:'#111827',margin:0}}>New Service Request</h2>
              </div>

              <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:10,overflow:'hidden'}}>

                {/* Title */}
                <div style={{padding:'16px 20px',borderBottom:'1px solid #f0f1f3'}}>
                  <label style={LB}>Request Title</label>
                  <input className="wrInp" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}
                    placeholder="e.g. AC Unit Not Cooling — Unit 4B"
                    style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151'}}/>
                </div>

                {/* Overview */}
                <div style={{padding:'20px',borderBottom:'1px solid #f0f1f3'}}>
                  <p className="wrSec">Overview</p>

                  {/* Client */}
                  <div style={{marginBottom:16}}>
                    <label style={LB}>Client</label>
                    <div style={{display:'flex',gap:8,marginBottom:10}}>
                      {['existing','new'].map(mode=>(
                        <button key={mode} onClick={()=>setForm(p=>({...p,clientMode:mode,clientId:'',newClientName:'',phone:''}))}
                          style={{height:32,padding:'0 14px',border:`1px solid ${form.clientMode===mode?'#2563eb':'#e5e7eb'}`,borderRadius:7,fontSize:13,fontWeight:form.clientMode===mode?600:400,color:form.clientMode===mode?'#2563eb':'#6b7280',background:form.clientMode===mode?'#eff6ff':'#fff',cursor:'pointer'}}>
                          {mode==='existing'?'Existing Client':'New Client'}
                        </button>
                      ))}
                    </div>
                    {form.clientMode==='existing'?(
                      <>
                        <select value={form.clientId} onChange={e=>{
                          const c=clients.find(x=>x.id===Number(e.target.value))
                          setForm(p=>({...p,clientId:e.target.value,phone:c?.phone||''}))
                          setErrs(p=>({...p,clientId:undefined}))
                        }} style={{width:'100%',height:38,border:`1px solid ${errs.clientId?'#dc2626':'#e5e7eb'}`,borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',background:'#fff'}}>
                          <option value="">— Select client —</option>
                          {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        {errs.clientId&&<p style={ET}>{errs.clientId}</p>}
                      </>
                    ):(
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                        <div>
                          <input className="wrInp" value={form.newClientName} onChange={e=>{setForm(p=>({...p,newClientName:e.target.value}));setErrs(p=>({...p,newClientName:undefined}))}}
                            placeholder="Full name or company *"
                            style={{width:'100%',boxSizing:'border-box',height:38,border:`1px solid ${errs.newClientName?'#dc2626':'#e5e7eb'}`,borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151'}}/>
                          {errs.newClientName&&<p style={ET}>{errs.newClientName}</p>}
                        </div>
                        <input className="wrInp" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="Phone number"
                          style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151'}}/>
                      </div>
                    )}
                  </div>

                  {/* Tenant info */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                    <div>
                      <label style={LB}>Tenant Name / Contact</label>
                      <input className="wrInp" value={form.tenantNameContact} onChange={e=>setForm(p=>({...p,tenantNameContact:e.target.value}))}
                        placeholder="On-site contact name"
                        style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151'}}/>
                    </div>
                    <div>
                      <label style={LB}>Tenant Address</label>
                      <input className="wrInp" value={form.tenantAddress} onChange={e=>setForm(p=>({...p,tenantAddress:e.target.value}))}
                        placeholder="Unit / property address"
                        style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151'}}/>
                    </div>
                  </div>

                  {/* Equipment */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}>
                    <div>
                      <label style={LB}>Equipment Make</label>
                      <input className="wrInp" value={form.equipmentMake} onChange={e=>setForm(p=>({...p,equipmentMake:e.target.value}))}
                        placeholder="e.g. Carrier"
                        style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151'}}/>
                    </div>
                    <div>
                      <label style={LB}>Unit #</label>
                      <input className="wrInp" value={form.equipmentUnit} onChange={e=>setForm(p=>({...p,equipmentUnit:e.target.value}))}
                        placeholder="e.g. 4B"
                        style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151'}}/>
                    </div>
                    <div>
                      <label style={LB}>Equipment Model</label>
                      <input className="wrInp" value={form.equipmentModel} onChange={e=>setForm(p=>({...p,equipmentModel:e.target.value}))}
                        placeholder="Model number"
                        style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151'}}/>
                    </div>
                  </div>

                  {/* Service type */}
                  <div style={{marginBottom:14}}>
                    <label style={LB}>Service Type</label>
                    <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}
                      style={{width:'100%',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',background:'#fff'}}>
                      <option value="">— Select type —</option>
                      {['HVAC Repair','HVAC Install','Furnace Service','Plumbing','Drain','Electrical','Generator','Other'].map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* Issue symptoms */}
                  <div style={{marginBottom:14}}>
                    <label style={LB}>Issue / Symptoms</label>
                    <textarea className="wrTA" value={form.issueSymptoms} onChange={e=>setForm(p=>({...p,issueSymptoms:e.target.value}))} rows={3}
                      placeholder="Describe the issue or symptoms…"
                      style={{width:'100%',boxSizing:'border-box',border:'1px solid #e5e7eb',borderRadius:7,padding:'10px 12px',fontSize:13.5,color:'#374151',resize:'vertical'}}/>
                  </div>

                  {/* Preferred dates */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                    <div>
                      <label style={LB}>Preferred Date 1</label>
                      <input type="date" className="wrInp" value={form.preferredDate1} onChange={e=>setForm(p=>({...p,preferredDate1:e.target.value}))}
                        style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151'}}/>
                    </div>
                    <div>
                      <label style={LB}>Preferred Date 2</label>
                      <input type="date" className="wrInp" value={form.preferredDate2} onChange={e=>setForm(p=>({...p,preferredDate2:e.target.value}))}
                        style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151'}}/>
                    </div>
                  </div>

                  {/* Preferred arrival time */}
                  <div>
                    <label style={LB}>Preferred Arrival Time</label>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      {[
                        {val:'any_time',label:'Any Time'},
                        {val:'morning',label:'Morning (8am–12pm)'},
                        {val:'afternoon',label:'Afternoon (12pm–5pm)'},
                        {val:'evening',label:'Evening (5pm–8pm)'},
                        {val:'emergency',label:'Emergency'},
                      ].map(opt=>(
                        <button key={opt.val} onClick={()=>setForm(p=>({...p,preferredArrivalTime:opt.val}))}
                          style={{height:34,padding:'0 14px',border:`1px solid ${form.preferredArrivalTime===opt.val?'#2563eb':'#e5e7eb'}`,borderRadius:7,fontSize:12.5,
                            fontWeight:form.preferredArrivalTime===opt.val?600:400,
                            color:form.preferredArrivalTime===opt.val?'#2563eb':opt.val==='emergency'?'#dc2626':'#6b7280',
                            background:form.preferredArrivalTime===opt.val?'#eff6ff':'#fff',cursor:'pointer'}}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Scop of work */}
                <div style={{padding:'20px',borderBottom:'1px solid #f0f1f3'}}>
                  <p className="wrSec">Scop of work</p>
                  <div style={{marginBottom:14}}>
                    <label style={LB}>Scope — From Office</label>
                    <textarea className="wrTA" value={form.scopeFromOffice} onChange={e=>setForm(p=>({...p,scopeFromOffice:e.target.value}))} rows={3}
                      placeholder="Scope of work as defined by office…"
                      style={{width:'100%',boxSizing:'border-box',border:'1px solid #e5e7eb',borderRadius:7,padding:'10px 12px',fontSize:13.5,color:'#374151',resize:'vertical'}}/>
                  </div>
                  <div>
                    <label style={LB}>Scope — Field Supervisor</label>
                    <textarea className="wrTA" value={form.scopeFieldSupervisor} onChange={e=>setForm(p=>({...p,scopeFieldSupervisor:e.target.value}))} rows={3}
                      placeholder="Scope as determined on-site…"
                      style={{width:'100%',boxSizing:'border-box',border:'1px solid #e5e7eb',borderRadius:7,padding:'10px 12px',fontSize:13.5,color:'#374151',resize:'vertical'}}/>
                  </div>
                </div>

                {/* Claim number */}
                <div style={{padding:'20px',borderBottom:'1px solid #f0f1f3'}}>
                  <p className="wrSec">Claim number</p>
                  <div style={{maxWidth:320}}>
                    <input className="wrInp" value={form.claimTrackingId} onChange={e=>setForm(p=>({...p,claimTrackingId:e.target.value}))}
                      placeholder="e.g. CLM-2024-00123"
                      style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',fontFamily:'monospace'}}/>
                  </div>
                </div>

                {/* Job accepted by */}
                <div style={{padding:'20px',borderBottom:'1px solid #f0f1f3'}}>
                  <p className="wrSec">Job accepted by</p>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                    <div>
                      <label style={LB}>Representative Name</label>
                      <input className="wrInp" value={form.jobAcceptedByRep} onChange={e=>setForm(p=>({...p,jobAcceptedByRep:e.target.value}))}
                        placeholder="Rep / staff name"
                        style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151'}}/>
                    </div>
                    <div>
                      <label style={LB}>Company Name</label>
                      <input className="wrInp" value={form.jobAcceptedByCompany} onChange={e=>setForm(p=>({...p,jobAcceptedByCompany:e.target.value}))}
                        placeholder="Company / contractor"
                        style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151'}}/>
                    </div>
                  </div>
                </div>

                {/* 10 numbered claim fields */}
                <div style={{padding:'20px',borderBottom:'1px solid #f0f1f3'}}>
                  <p className="wrSec">Claim Details</p>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    {form.claimFields.map((val,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:12,fontWeight:700,color:'#9ca3af',width:18,flexShrink:0,textAlign:'right'}}>{i+1}.</span>
                        <input className="wrInp" value={val} onChange={e=>{
                          const arr=[...form.claimFields]; arr[i]=e.target.value
                          setForm(p=>({...p,claimFields:arr}))
                        }} placeholder={`Field ${i+1}`}
                          style={{flex:1,height:36,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 10px',fontSize:13,color:'#374151'}}/>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upload images */}
                <div style={{padding:'20px',borderBottom:'1px solid #f0f1f3'}}>
                  <p className="wrSec">Upload Images</p>
                  <input ref={imgInputRef} type="file" accept="image/*" multiple style={{display:'none'}}
                    onChange={e=>{
                      const files=Array.from(e.target.files)
                      const readers=files.map(f=>new Promise(res=>{const r=new FileReader();r.onload=ev=>res({name:f.name,url:ev.target.result});r.readAsDataURL(f)}))
                      Promise.all(readers).then(imgs=>setForm(p=>({...p,uploadedImages:[...p.uploadedImages,...imgs]})))
                      e.target.value=''
                    }}/>
                  <div className="wrUpBox" onClick={()=>imgInputRef.current?.click()}
                    style={{border:'2px dashed #d1d5db',borderRadius:10,padding:'28px 20px',textAlign:'center',cursor:'pointer',background:'#f9fafb',transition:'border-color 0.15s'}}>
                    <div style={{fontSize:26,marginBottom:6}}>📷</div>
                    <p style={{fontSize:13.5,color:'#6b7280',margin:0,fontWeight:500}}>Click to upload images</p>
                    <p style={{fontSize:12,color:'#9ca3af',margin:'3px 0 0'}}>JPG, PNG, GIF supported</p>
                  </div>
                  {form.uploadedImages.length>0&&(
                    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
                      {form.uploadedImages.map((img,i)=>(
                        <div key={i} style={{position:'relative'}}>
                          <img src={img.url} alt={img.name} style={{width:72,height:72,objectFit:'cover',borderRadius:8,border:'1px solid #e5e7eb'}}/>
                          <button onClick={()=>setForm(p=>({...p,uploadedImages:p.uploadedImages.filter((_,j)=>j!==i)}))}
                            style={{position:'absolute',top:-6,right:-6,width:20,height:20,borderRadius:'50%',background:'#ef4444',color:'#fff',border:'none',cursor:'pointer',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1,padding:0}}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* On-site assessment */}
                <div style={{padding:'20px',borderBottom:'1px solid #f0f1f3'}}>
                  <p className="wrSec">On-Site Assessment</p>
                  <div style={{border:'2px dashed #d1d5db',borderRadius:10,padding:'14px 16px',background:'#f9fafb'}}>
                    <textarea className="wrTA" value={form.onSiteAssessment} onChange={e=>setForm(p=>({...p,onSiteAssessment:e.target.value}))} rows={4}
                      placeholder="Record findings from on-site visit…"
                      style={{width:'100%',boxSizing:'border-box',border:'none',padding:0,fontSize:13.5,color:'#374151',resize:'vertical',background:'transparent'}}/>
                  </div>
                </div>

                {/* Notes */}
                <div style={{padding:'20px',borderBottom:'1px solid #f0f1f3'}}>
                  <p className="wrSec">Notes</p>
                  <div style={{border:'2px dashed #d1d5db',borderRadius:10,padding:'14px 16px',background:'#f9fafb'}}>
                    <textarea className="wrTA" value={form.internalNotes} onChange={e=>setForm(p=>({...p,internalNotes:e.target.value}))} rows={3}
                      placeholder="Internal notes for staff…"
                      style={{width:'100%',boxSizing:'border-box',border:'none',padding:0,fontSize:13.5,color:'#374151',resize:'vertical',background:'transparent'}}/>
                  </div>
                </div>

                {/* Action bar */}
                <div style={{padding:'14px 20px',display:'flex',justifyContent:'flex-end',gap:10,background:'#f9fafb'}}>
                  <button onClick={()=>{setForm({...BLANK,claimFields:['','','','','','','','','',''],uploadedImages:[]});setErrs({});setTab('all')}}
                    style={{height:40,padding:'0 20px',background:'#fff',color:'#374151',border:'1px solid #e5e7eb',borderRadius:8,fontSize:14,fontWeight:500,cursor:'pointer'}}>Cancel</button>
                  <button onClick={submitNew}
                    style={{height:40,padding:'0 24px',background:'#16a34a',color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer'}}>Save Request</button>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const C  = {background:'#fff',border:'1px solid #e8e9ec',borderRadius:10,padding:'18px 20px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}
const CT = {fontSize:12,fontWeight:700,color:'#9ca3af',margin:'0 0 14px',textTransform:'uppercase',letterSpacing:'0.5px'}
const LB = {display:'block',fontSize:12,fontWeight:600,color:'#6b7280',marginBottom:5}
const ET = {fontSize:11,color:'#dc2626',margin:'4px 0 0'}
