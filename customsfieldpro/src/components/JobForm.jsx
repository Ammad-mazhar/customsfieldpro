import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { apiPost } from '../utils/apiClient'
import { saveJob, getClients, getSettings, clientDisplayName } from '../data/store'
import { getNextNumber, peekNextNumber, formatJobNumber } from '../utils/numberGenerator'
import { useAuth } from '../auth/AuthContext'
import { logActivity, ACTIONS } from '../utils/activityLog'
import { createNotification, NOTIF_TYPES } from '../utils/notifications'
import { sendJobAssignedEmail } from '../utils/emailService'
import AddressAutocomplete from './AddressAutocomplete'
import AIEstimator from './AIEstimator'
import { isAIEnabled } from '../utils/aiEstimator'

const JOB_TYPES     = ['HVAC','Plumbing','Electrical','Appliance Repair']
const JOB_STATUSES  = ['New','Scheduled','In Progress','On Hold','Completed','Cancelled']
const RECURRENCES   = ['One-time','Daily','Weekly','Monthly']
const WARRANTIES    = ['Under Warranty','Out of Warranty','Unknown']
const PRIORITIES    = ['Low','Normal','High','Urgent']
const EQUIPMENT_TYPES = [
  'Microwave','Refrigerator','Oven','Stove & Cooktop',
  'Dryer','Washer','Dishwasher','HVAC & Furnace',
  'Garbage Disposal','Water Heater',
]

function blankForm(clientId, clientAddress, clientPhone) {
  return {
    clientId: clientId || '',
    clientAddress: clientAddress || '',
    clientPhone: clientPhone || '',
    jobNumber: formatJobNumber(peekNextNumber('jobs')),
    linkedRequestId: '', linkedQuoteId: '',
    title: '', type: '', description: '', internalNotes: '', claimNumber: '',
    techName: '', technicianId: '', startDate: '', startTime: '', endTime: '', duration: '', recurrence: 'One-time',
    equipment: [], equipBrand: '', equipModel: '', equipSerial: '',
    warrantyStatus: 'Unknown', lastServiceDate: '',
    lineItems: [{ id: Date.now(), description: '', qty: 1, unit: 0, total: 0 }],
    taxRate: 0, status: 'New', priority: 'Normal', completionNotes: '',
  }
}

function calcDuration(start, end) {
  if (!start || !end) return ''
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) return ''
  const h = Math.floor(mins / 60), m = mins % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} hr${h > 1 ? 's' : ''}`
  return `${h} hr${h > 1 ? 's' : ''} ${m} min`
}

function SH({ title }) {
  return <p style={{fontSize:11.5,fontWeight:700,color:'#9ca3af',margin:'0 0 14px',textTransform:'uppercase',letterSpacing:'0.6px',borderBottom:'1px solid #f0f1f3',paddingBottom:10}}>{title}</p>
}
function Req() { return <span style={{color:'#dc2626'}}> *</span> }

const LB = {display:'block',fontSize:12,fontWeight:600,color:'#6b7280',marginBottom:5}
const ET = {fontSize:11,color:'#dc2626',margin:'4px 0 0'}
const CS = {background:'#fff',border:'1px solid #e8e9ec',borderRadius:10,padding:'18px 20px',marginBottom:16}

export default function JobForm({ clientId, clientName, clientPhone: initPhone, clientAddress: initAddress, onClose, onSuccess }) {
  const { isAdmin, hasPermission } = useAuth()
  const [settings] = useState(() => getSettings())
  const [techs] = useState(() => settings.technicians || [])
  const [clients, setClients] = useState(() => getClients())
  const [requests, setRequests] = useState([])
  const [quotes, setQuotes] = useState([])
  const [form, setForm] = useState(() => blankForm(clientId, initAddress, initPhone))
  const [errs, setErrs] = useState({})
  const [errList, setErrList] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [banner, setBanner] = useState('')
  const [showAI, setShowAI] = useState(false)

  useEffect(() => {
    api.getClients().then(res => {
      const list = res?.data || res || []
      if (Array.isArray(list) && list.length > 0) setClients(list)
    }).catch(() => {})
    api.getRequests().then(res => {
      setRequests((res?.data || []).filter(r => r.client_id === clientId).map(r => ({
        id: r.id, type: r.service_type || '', description: r.description || '', status: r.status || '',
      })))
    }).catch(() => {})
    api.getQuotes().then(res => {
      setQuotes((res?.data || []).filter(q => q.client_id === clientId).map(q => ({
        id: q.id, type: q.title || '', description: q.description || '',
      })))
    }).catch(() => {})
  }, [clientId])

  function set(f, v) { setForm(p => ({ ...p, [f]: v })); setErrs(p => ({ ...p, [f]: undefined })) }

  function inpStyle(f) {
    return {width:'100%',boxSizing:'border-box',height:38,border:`1px solid ${errs[f]?'#dc2626':'#e8e9ec'}`,borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',outline:'none',background:'#fff'}
  }
  function selStyle(f) {
    return {width:'100%',height:38,border:`1px solid ${errs[f]?'#dc2626':'#e8e9ec'}`,borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',background:'#fff'}
  }

  function handleTimeChange(f, v) {
    setForm(p => {
      const updated = { ...p, [f]: v }
      updated.duration = calcDuration(f === 'startTime' ? v : p.startTime, f === 'endTime' ? v : p.endTime)
      return updated
    })
    setErrs(p => ({ ...p, [f]: undefined, endTime: undefined }))
  }

  function toggleEquipment(item) {
    setForm(p => ({ ...p, equipment: p.equipment.includes(item) ? p.equipment.filter(e => e !== item) : [...p.equipment, item] }))
    setErrs(p => ({ ...p, equipment: undefined }))
  }

  function updateLineItem(id, field, rawVal) {
    setForm(p => {
      const items = p.lineItems.map(li => {
        if (li.id !== id) return li
        const upd = { ...li, [field]: field === 'description' ? rawVal : Number(rawVal) || 0 }
        upd.total = upd.qty * upd.unit
        return upd
      })
      return { ...p, lineItems: items }
    })
    setErrs(p => ({ ...p, lineItems: undefined }))
  }

  function handleLinkedRequest(requestId) {
    if (!requestId) { setForm(p => ({ ...p, linkedRequestId: '' })); return }
    const req = requests.find(r => r.id === requestId)
    setForm(p => ({
      ...p, linkedRequestId: requestId,
      type:        p.type        || req?.type        || '',
      description: p.description || req?.description || '',
    }))
  }

  function handleLinkedQuote(quoteId) {
    if (!quoteId) { setForm(p => ({ ...p, linkedQuoteId: '' })); return }
    const q = quotes.find(x => x.id === quoteId)
    setForm(p => ({
      ...p, linkedQuoteId: quoteId,
      type:        p.type        || q?.type        || '',
      description: p.description || q?.description || '',
    }))
  }

  const subtotal   = form.lineItems.reduce((s, li) => s + li.total, 0)
  const taxAmt     = subtotal * (form.taxRate / 100)
  const grandTotal = subtotal + taxAmt

  function validate() {
    const e = {}, list = []
    if (!form.title.trim())                               { e.title = 'Required'; list.push('Job Title') }
    if (!form.type)                                       { e.type = 'Required'; list.push('Service Type') }
    if (!form.description.trim())                         { e.description = 'Required'; list.push('Job Description') }
    else if (form.description.trim().length < 10)         { e.description = 'Min 10 characters'; list.push('Job Description (min 10 chars)') }
    if (!form.techName)                                   { e.techName = 'Required'; list.push('Assigned Technician') }
    if (!form.startDate)                                  { e.startDate = 'Required'; list.push('Start Date') }
    if (!form.startTime)                                  { e.startTime = 'Required'; list.push('Start Time') }
    if (!form.endTime) {
      e.endTime = 'Required'; list.push('End Time')
    } else if (form.startTime) {
      const [sh, sm] = form.startTime.split(':').map(Number)
      const [eh, em] = form.endTime.split(':').map(Number)
      if ((eh * 60 + em) <= (sh * 60 + sm)) { e.endTime = 'Must be after start time'; list.push('End Time') }
    }
    if (form.equipment.length === 0)                      { e.equipment = 'Select at least one'; list.push('Equipment Type') }
    if (!form.lineItems.some(li => li.description.trim())) { e.lineItems = 'At least one line item required'; list.push('Line Items') }
    if (form.status === 'Completed' && !form.completionNotes.trim()) { e.completionNotes = 'Required when Completed'; list.push('Completion Notes') }
    return { e, list }
  }

  async function submit() {
    const { e, list } = validate()
    if (list.length > 0) { setErrs(e); setErrList(list); return }
    setErrList([])
    if (submitting) return
    setSubmitting(true)
    try {
      const c = clients.find(x => String(x.id) === String(clientId))
      const validItems = form.lineItems.filter(li => li.description.trim())
      const sub = validItems.reduce((s, li) => s + li.total, 0)
      const tax = sub * (form.taxRate / 100)
      const jobId = formatJobNumber(getNextNumber('jobs'))
      const newJob = {
        id: jobId,
        clientId, clientName: clientName || (c ? clientDisplayName(c) : ''),
        clientPhone: form.clientPhone, clientEmail: c?.email || '', clientAddress: form.clientAddress,
        type: form.type, title: form.title, description: form.description,
        internalNotes: form.internalNotes, notes: form.internalNotes, claimNumber: form.claimNumber,
        techName: form.techName, technicianId: form.technicianId || '', status: form.status, priority: form.priority,
        date: form.startDate, time: form.startTime, endTime: form.endTime,
        duration: form.duration, recurrence: form.recurrence,
        equipment: form.equipment, equipBrand: form.equipBrand,
        equipModel: form.equipModel, equipSerial: form.equipSerial,
        warrantyStatus: form.warrantyStatus, lastServiceDate: form.lastServiceDate,
        lineItems: validItems, subtotal: sub, taxRate: form.taxRate, total: sub + tax,
        completionNotes: form.completionNotes,
        linkedQuoteNumber: null, linkedQuoteId: null, linkedInvoiceNumbers: [], linkedInvoiceIds: [],
      }
      saveJob(newJob)
      apiPost('/api/jobs', {
        client_id: clientId, title: form.title, description: form.description,
        service_type: form.type,
        status: (form.status || 'New').toLowerCase().replace(/ /g, '_'),
        priority: (form.priority || 'Normal').toLowerCase(),
      }).catch(() => {})
      logActivity(ACTIONS.JOB_CREATED, 'Jobs', newJob.id, `${newJob.id} – ${newJob.clientName}`, `Job created: ${newJob.title}.`)
      if (form.technicianId) {
        const users = (() => { try { return JSON.parse(localStorage.getItem('customsfieldpro_users') || '[]') } catch { return [] } })()
        const tech = users.find(u => u.technicianId === form.technicianId || u.name === form.techName)
        if (tech) {
          createNotification(NOTIF_TYPES.JOB_ASSIGNED, 'New Job Assigned', `You have been assigned ${newJob.id} — ${newJob.clientName} (${newJob.type}).`, tech.id, 'Jobs', newJob.id)
          if (settings.notifications?.emailOnJobAssignment && tech.email) {
            const techRecord = techs.find(t => t.id === form.technicianId) || tech
            sendJobAssignedEmail(newJob, tech, techRecord)
          }
        }
      }
      onSuccess?.()
      onClose?.()
    } catch (err) {
      setBanner(`Error: ${err.message}`)
      setSubmitting(false)
    }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:2000,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:20,overflowY:'auto'}}>
      <div style={{background:'#f8f9fa',borderRadius:12,width:'100%',maxWidth:800,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',margin:'auto',flexShrink:0}}>

        {/* Header */}
        <div style={{padding:'20px 24px',background:'#fff',borderRadius:'12px 12px 0 0',borderBottom:'1px solid #f0f1f3',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <h3 style={{margin:0,fontSize:18,fontWeight:700,color:'#1a1d23'}}>Create New Job</h3>
            <p style={{margin:'2px 0 0',fontSize:13,color:'#9ca3af'}}>{clientName}</p>
          </div>
          <button onClick={onClose} style={{width:32,height:32,border:'none',background:'#f3f4f6',borderRadius:8,fontSize:20,cursor:'pointer',color:'#6b7280',lineHeight:1}}>×</button>
        </div>

        {/* Body */}
        <div style={{padding:20}}>
          {banner&&<div style={{background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',borderRadius:8,padding:'10px 16px',fontSize:13,marginBottom:16}}>{banner}</div>}

          {errList.length > 0 && (
            <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'12px 16px',marginBottom:16}}>
              <p style={{fontSize:13.5,fontWeight:700,color:'#dc2626',margin:'0 0 6px'}}>Please fix the following errors:</p>
              <ul style={{margin:0,paddingLeft:18}}>
                {errList.map(e => <li key={e} style={{fontSize:13,color:'#dc2626',lineHeight:1.8}}>{e}</li>)}
              </ul>
            </div>
          )}

          {/* Client (locked) */}
          <div style={CS}>
            <SH title="Client Info" />
            <div style={{marginBottom:14}}>
              <label style={LB}>Client</label>
              <div style={{height:38,border:'1px solid #e8e9ec',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',background:'#f9fafb',display:'flex',alignItems:'center'}}>{clientName}</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div>
                <label style={LB}>Contact Phone</label>
                <input value={form.clientPhone} onChange={e=>set('clientPhone',e.target.value)} placeholder="Phone"
                  style={inpStyle('clientPhone')}/>
              </div>
              <div>
                <label style={LB}>Property Address</label>
                <AddressAutocomplete
                  value={form.clientAddress}
                  placeholder="Auto-filled from client, editable"
                  onChange={fields => set('clientAddress', fields.address ?? form.clientAddress)}
                />
              </div>
            </div>
          </div>

          {/* Linked records */}
          {(requests.length > 0 || quotes.length > 0) && (
            <div style={CS}>
              <SH title="Linked Records (optional — auto-fills fields)" />
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                {requests.length > 0 && (
                  <div>
                    <label style={LB}>From Request</label>
                    <select value={form.linkedRequestId} onChange={e=>handleLinkedRequest(e.target.value)}
                      style={{width:'100%',height:38,border:'1px solid #e8e9ec',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',background:'#fff'}}>
                      <option value="">— None —</option>
                      {requests.filter(r=>r.status!=='converted').map(r=>(
                        <option key={r.id} value={r.id}>{r.type || 'Service Request'} ({r.id})</option>
                      ))}
                    </select>
                  </div>
                )}
                {quotes.length > 0 && (
                  <div>
                    <label style={LB}>From Quote</label>
                    <select value={form.linkedQuoteId} onChange={e=>handleLinkedQuote(e.target.value)}
                      style={{width:'100%',height:38,border:'1px solid #e8e9ec',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',background:'#fff'}}>
                      <option value="">— None —</option>
                      {quotes.map(q=><option key={q.id} value={q.id}>{q.type || 'Quote'} ({q.id})</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Job details */}
          <div style={CS}>
            <SH title="Job Details" />
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div>
                <label style={LB}>Job Title<Req /></label>
                <input value={form.title} onChange={e=>set('title',e.target.value)} placeholder="e.g. AC Unit Refrigerant Check" style={inpStyle('title')}/>
                {errs.title&&<p style={ET}>{errs.title}</p>}
              </div>
              <div>
                <label style={LB}>Job Number</label>
                <input value={form.jobNumber} readOnly style={{...inpStyle('jobNumber'),background:'#f9fafb',color:'#9ca3af',fontFamily:'monospace'}}/>
              </div>
            </div>
            <div style={{marginTop:14,maxWidth:'50%'}}>
              <label style={LB}>Service Type<Req /></label>
              <select value={form.type} onChange={e=>set('type',e.target.value)} style={selStyle('type')}>
                <option value="">— Select type —</option>
                {JOB_TYPES.map(t=><option key={t}>{t}</option>)}
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
            <div style={{marginTop:14}}>
              <label style={LB}>Job Description<Req /></label>
              <textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={3}
                placeholder="Describe the work to be done (min 10 characters)…"
                style={{width:'100%',boxSizing:'border-box',border:`1px solid ${errs.description?'#dc2626':'#e8e9ec'}`,borderRadius:7,padding:'10px 12px',fontSize:13.5,color:'#374151',resize:'vertical',outline:'none'}}/>
              {errs.description&&<p style={ET}>{errs.description}</p>}
            </div>
            <div style={{marginTop:14}}>
              <label style={LB}>Internal Notes</label>
              <textarea value={form.internalNotes} onChange={e=>set('internalNotes',e.target.value)} rows={2}
                placeholder="Private notes for your team…"
                style={{width:'100%',boxSizing:'border-box',border:'1px solid #e8e9ec',borderRadius:7,padding:'10px 12px',fontSize:13.5,color:'#374151',resize:'vertical',outline:'none'}}/>
            </div>
            <div style={{marginTop:14,maxWidth:'50%'}}>
              <label style={LB}>Claim Number</label>
              <input value={form.claimNumber} onChange={e=>set('claimNumber',e.target.value)} placeholder="e.g. CLM-2024-00123"
                style={{...inpStyle('claimNumber'),fontFamily:'monospace'}}/>
            </div>
          </div>

          {/* Scheduling */}
          <div style={CS}>
            <SH title="Scheduling" />
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div>
                <label style={LB}>Assigned Technician<Req /></label>
                <select value={form.techName} onChange={e=>{
                    const tech = techs.find(t => t.name === e.target.value)
                    setForm(p=>({...p,techName:e.target.value,technicianId:tech?.id||''}))
                    setErrs(p=>({...p,techName:undefined}))
                  }} style={{...selStyle('techName')}}>
                  <option value="">— Select technician —</option>
                  {techs.map(t=><option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
                {errs.techName&&<p style={ET}>Required</p>}
              </div>
              <div>
                <label style={LB}>Recurrence</label>
                <select value={form.recurrence} onChange={e=>set('recurrence',e.target.value)} style={selStyle('recurrence')}>
                  {RECURRENCES.map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={LB}>Start Date<Req /></label>
                <input type="date" value={form.startDate} onChange={e=>set('startDate',e.target.value)} style={inpStyle('startDate')}/>
                {errs.startDate&&<p style={ET}>Required</p>}
              </div>
              <div/>
              <div>
                <label style={LB}>Start Time<Req /></label>
                <input type="time" value={form.startTime} onChange={e=>handleTimeChange('startTime',e.target.value)} style={inpStyle('startTime')}/>
                {errs.startTime&&<p style={ET}>Required</p>}
              </div>
              <div>
                <label style={LB}>End Time<Req /></label>
                <input type="time" value={form.endTime} onChange={e=>handleTimeChange('endTime',e.target.value)} style={inpStyle('endTime')}/>
                {errs.endTime&&<p style={ET}>{errs.endTime}</p>}
              </div>
            </div>
            {form.duration&&(
              <div style={{marginTop:12,display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:12,color:'#9ca3af'}}>Estimated Duration:</span>
                <span style={{fontSize:13,fontWeight:600,color:'#2563eb',background:'#eff6ff',padding:'2px 10px',borderRadius:20}}>{form.duration}</span>
              </div>
            )}
          </div>

          {/* Equipment */}
          <div style={CS}>
            <SH title="Equipment / Appliance" />
            <label style={LB}>Equipment Type<Req /></label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:6}}>
              {EQUIPMENT_TYPES.map(item=>(
                <label key={item} style={{display:'flex',alignItems:'center',gap:8,fontSize:13.5,color:'#374151',cursor:'pointer',padding:'7px 12px',border:`1px solid ${form.equipment.includes(item)?'#bfdbfe':'#e8e9ec'}`,borderRadius:7,background:form.equipment.includes(item)?'#eff6ff':'#fff',userSelect:'none'}}>
                  <input type="checkbox" checked={form.equipment.includes(item)} onChange={()=>toggleEquipment(item)} style={{accentColor:'#2563eb',width:15,height:15}}/>
                  {item}
                </label>
              ))}
            </div>
            {errs.equipment&&<p style={ET}>{errs.equipment}</p>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:16}}>
              <div>
                <label style={LB}>Equipment Brand</label>
                <input value={form.equipBrand} onChange={e=>set('equipBrand',e.target.value)} placeholder="e.g. Carrier, Whirlpool" style={inpStyle('equipBrand')}/>
              </div>
              <div>
                <label style={LB}>Model Number</label>
                <input value={form.equipModel} onChange={e=>set('equipModel',e.target.value)} placeholder="e.g. 58MVC080" style={inpStyle('equipModel')}/>
              </div>
              <div>
                <label style={LB}>Serial Number</label>
                <input value={form.equipSerial} onChange={e=>set('equipSerial',e.target.value)} placeholder="e.g. 1234-ABCD-5678" style={inpStyle('equipSerial')}/>
              </div>
              <div>
                <label style={LB}>Warranty Status</label>
                <select value={form.warrantyStatus} onChange={e=>set('warrantyStatus',e.target.value)} style={selStyle('warrantyStatus')}>
                  {WARRANTIES.map(w=><option key={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label style={LB}>Last Service Date</label>
                <input type="date" value={form.lastServiceDate} onChange={e=>set('lastServiceDate',e.target.value)} style={inpStyle('lastServiceDate')}/>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div style={CS}>
            <SH title="Line Items" />
            {errs.lineItems&&<p style={{...ET,marginBottom:10}}>{errs.lineItems}</p>}
            <table style={{width:'100%',borderCollapse:'collapse',marginBottom:10}}>
              <thead>
                <tr>{['Description','Qty','Unit Price ($)','Total',''].map((h,i)=>(
                  <th key={i} style={{textAlign:i===0?'left':'center',fontSize:11.5,fontWeight:600,color:'#9ca3af',padding:'6px 8px',borderBottom:'1px solid #f0f1f3'}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {form.lineItems.map(li=>(
                  <tr key={li.id} style={{borderBottom:'1px solid #f8f9fa'}}>
                    <td style={{padding:'5px 4px'}}>
                      <input value={li.description} onChange={e=>updateLineItem(li.id,'description',e.target.value)} placeholder="Description"
                        style={{width:'100%',height:34,border:'1px solid #e8e9ec',borderRadius:6,padding:'0 8px',fontSize:13.5,outline:'none'}}/>
                    </td>
                    <td style={{padding:'5px 4px',width:72}}>
                      <input type="number" value={li.qty} min={1} onChange={e=>updateLineItem(li.id,'qty',e.target.value)}
                        style={{width:'100%',height:34,border:'1px solid #e8e9ec',borderRadius:6,padding:'0 6px',fontSize:13.5,outline:'none',textAlign:'center'}}/>
                    </td>
                    <td style={{padding:'5px 4px',width:120}}>
                      <input type="number" value={li.unit} min={0} step="0.01" onChange={e=>updateLineItem(li.id,'unit',e.target.value)}
                        style={{width:'100%',height:34,border:'1px solid #e8e9ec',borderRadius:6,padding:'0 8px',fontSize:13.5,outline:'none',textAlign:'right'}}/>
                    </td>
                    <td style={{padding:'5px 8px',width:90,textAlign:'right',fontSize:13.5,fontWeight:600,color:'#1a1d23'}}>${li.total.toLocaleString()}</td>
                    <td style={{padding:'5px 4px',width:36,textAlign:'center'}}>
                      <button onClick={()=>setForm(p=>({...p,lineItems:p.lineItems.filter(x=>x.id!==li.id)}))}
                        style={{width:28,height:28,border:'none',background:'#fef2f2',color:'#dc2626',borderRadius:6,cursor:'pointer',fontSize:16,lineHeight:'28px'}}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={()=>setForm(p=>({...p,lineItems:[...p.lineItems,{id:Date.now(),description:'',qty:1,unit:0,total:0}]}))}
              style={{fontSize:13,color:'#2563eb',background:'none',border:'1px dashed #bfdbfe',borderRadius:7,padding:'6px 14px',cursor:'pointer',fontWeight:500}}>
              + Add Line Item
            </button>
            <div style={{borderTop:'1px solid #f0f1f3',marginTop:14,paddingTop:12,display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end'}}>
              <div style={{display:'flex',gap:24,fontSize:13.5,color:'#6b7280'}}><span>Subtotal</span><span style={{minWidth:80,textAlign:'right'}}>${subtotal.toLocaleString()}</span></div>
              <div style={{display:'flex',gap:24,fontSize:13.5,color:'#6b7280',alignItems:'center'}}>
                <span>Tax</span>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <input type="number" value={form.taxRate} min={0} max={100} step="0.1" onChange={e=>set('taxRate',Number(e.target.value)||0)}
                    style={{width:52,height:28,border:'1px solid #e8e9ec',borderRadius:5,padding:'0 6px',fontSize:13,textAlign:'center',outline:'none'}}/>
                  <span>%</span>
                  <span style={{minWidth:60,textAlign:'right'}}>${taxAmt.toFixed(2)}</span>
                </div>
              </div>
              <div style={{display:'flex',gap:24,fontSize:15,fontWeight:700,color:'#1a1d23',borderTop:'1px solid #f0f1f3',paddingTop:8,marginTop:2}}>
                <span>Grand Total</span><span style={{minWidth:80,textAlign:'right'}}>${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Status */}
          {(isAdmin || hasPermission('update_job_status')) && (
            <div style={CS}>
              <SH title="Job Status" />
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div>
                  <label style={LB}>Status</label>
                  <select value={form.status} onChange={e=>set('status',e.target.value)} style={selStyle('status')}>
                    {JOB_STATUSES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LB}>Priority</label>
                  <select value={form.priority} onChange={e=>set('priority',e.target.value)} style={selStyle('priority')}>
                    {PRIORITIES.map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              {form.status === 'Completed' && (
                <div style={{marginTop:14}}>
                  <label style={LB}>Completion Notes<Req /></label>
                  <textarea value={form.completionNotes} onChange={e=>set('completionNotes',e.target.value)} rows={3}
                    placeholder="Describe what was completed…"
                    style={{width:'100%',boxSizing:'border-box',border:`1px solid ${errs.completionNotes?'#dc2626':'#e8e9ec'}`,borderRadius:7,padding:'10px 12px',fontSize:13.5,color:'#374151',resize:'vertical',outline:'none'}}/>
                  {errs.completionNotes&&<p style={ET}>{errs.completionNotes}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'16px 24px',borderTop:'1px solid #e8e9ec',display:'flex',justifyContent:'flex-end',gap:10,background:'#fff',borderRadius:'0 0 12px 12px'}}>
          <button onClick={onClose} style={{height:40,padding:'0 20px',background:'#f3f4f6',color:'#374151',border:'none',borderRadius:8,fontSize:14,fontWeight:500,cursor:'pointer'}}>Cancel</button>
          <button onClick={submit} disabled={submitting}
            style={{height:40,padding:'0 24px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer',opacity:submitting?0.6:1}}>
            {submitting?'Creating…':'Create Job'}
          </button>
        </div>
      </div>

      {showAI&&(
        <AIEstimator
          serviceType={form.type} equipment={form.equipBrand}
          onUseEstimate={items=>setForm(p=>({...p,lineItems:items.map(li=>({id:Date.now()+Math.random(),description:li.description||'',qty:li.qty||1,unit:li.unit||0,total:li.total||0}))}))}
          onClose={()=>setShowAI(false)}
        />
      )}
    </div>
  )
}
