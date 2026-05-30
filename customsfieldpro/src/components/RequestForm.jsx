import { useState, useRef } from 'react'
import { api } from '../services/api'
import { getSettings } from '../data/store'
import { notifyAdmins, NOTIF_TYPES } from '../utils/notifications'
import { logActivity, ACTIONS } from '../utils/activityLog'

const BLANK = {
  type:'',priority:'Normal',internalNotes:'',title:'',
  tenantNameContact:'',tenantAddress:'',
  equipmentMake:'',equipmentUnit:'',equipmentModel:'',equipmentSerial:'',
  issueSymptoms:'',
  preferredDate1:'',preferredDate2:'',preferredArrivalTime:'any_time',
  scopeFromOffice:'',scopeFieldSupervisor:'',
  claimTrackingId:'',serviceFee:'0',authLimit:'100',assignedTechId:'',
  jobAcceptedByRep:'',jobAcceptedByCompany:'',
  claimFields:['','','','','','','','','',''],
  uploadedImages:[],onSiteAssessment:'',
}
const LB = {display:'block',fontSize:12,fontWeight:600,color:'#6b7280',marginBottom:5}
const ET = {fontSize:11,color:'#dc2626',margin:'4px 0 0'}

export default function RequestForm({ clientId, clientName, onClose, onSuccess }) {
  const imgInputRef = useRef(null)
  const [techs] = useState(() => getSettings().technicians || [])
  const [form, setForm] = useState({ ...BLANK, claimFields:['','','','','','','','','',''], uploadedImages:[] })
  const [submitting, setSubmitting] = useState(false)
  const [banner, setBanner] = useState('')

  function flash(msg) { setBanner(msg); setTimeout(() => setBanner(''), 3000) }

  async function submit() {
    if (submitting) return
    setSubmitting(true)
    try {
      const descParts = []
      if (form.issueSymptoms) descParts.push(form.issueSymptoms)
      if (form.scopeFromOffice) descParts.push(`Scope (Office): ${form.scopeFromOffice}`)
      if (form.equipmentMake||form.equipmentModel||form.equipmentSerial||form.equipmentUnit) {
        const equip = [
          form.equipmentMake   && `Make: ${form.equipmentMake}`,
          form.equipmentModel  && `Model: ${form.equipmentModel}`,
          form.equipmentSerial && `Serial: ${form.equipmentSerial}`,
          form.equipmentUnit   && `Unit: ${form.equipmentUnit}`,
        ].filter(Boolean).join(', ')
        descParts.push(`Equipment — ${equip}`)
      }
      if (form.tenantNameContact||form.tenantAddress) {
        descParts.push(`Tenant — ${[
          form.tenantNameContact && `Contact: ${form.tenantNameContact}`,
          form.tenantAddress     && `Address: ${form.tenantAddress}`,
        ].filter(Boolean).join(', ')}`)
      }
      const result = await api.createRequest({
        client_id:      clientId,
        service_type:   form.type || 'Service Request',
        description:    descParts.join('\n\n') || form.title || 'Service Request',
        priority:       form.priority.toLowerCase(),
        preferred_time: form.preferredDate1 || null,
        claim_number:   form.claimTrackingId || null,
      })
      logActivity(ACTIONS.REQUEST_CREATED, 'Requests', String(result.id), `${result.id} – ${clientName}`, `New service request: ${form.type}.`)
      notifyAdmins(NOTIF_TYPES.NEW_REQUEST, 'New Service Request', `New service request from ${clientName} — ${form.type}.`, 'Requests', result.id)
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
        <style>{`.rfI:focus{outline:none;border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,0.1)}`}</style>

        {/* Header */}
        <div style={{padding:'20px 24px',borderBottom:'1px solid #f0f1f3',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <h3 style={{margin:0,fontSize:18,fontWeight:700,color:'#1a1d23'}}>New Service Request</h3>
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
            <div style={{height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',background:'#f9fafb',display:'flex',alignItems:'center'}}>{clientName}</div>
          </div>

          {/* Title */}
          <div style={{marginBottom:14}}>
            <label style={LB}>Request Title</label>
            <input className="rfI" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}
              placeholder="e.g. AC Unit Not Cooling — Unit 4B"
              style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151'}}/>
          </div>

          {/* Tenant */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            <div>
              <label style={LB}>Tenant Name / Contact</label>
              <input className="rfI" value={form.tenantNameContact} onChange={e=>setForm(p=>({...p,tenantNameContact:e.target.value}))}
                placeholder="On-site contact name"
                style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151'}}/>
            </div>
            <div>
              <label style={LB}>Tenant Address</label>
              <input className="rfI" value={form.tenantAddress} onChange={e=>setForm(p=>({...p,tenantAddress:e.target.value}))}
                placeholder="Unit / property address"
                style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151'}}/>
            </div>
          </div>

          {/* Equipment */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            {[['equipmentMake','Equipment Make / Brand','e.g. Carrier, Kenmore',false],
              ['equipmentUnit','Unit # / Location','e.g. Unit 4B, Basement',false],
              ['equipmentModel','Model Number','Model number',true],
              ['equipmentSerial','Serial Number','Serial number',true],
            ].map(([f,lbl,ph,mono])=>(
              <div key={f}>
                <label style={LB}>{lbl}</label>
                <input className="rfI" value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                  placeholder={ph}
                  style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',...(mono?{fontFamily:'monospace'}:{})}}/>
              </div>
            ))}
          </div>

          {/* Service type + Priority */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            <div>
              <label style={LB}>Service Type</label>
              <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}
                style={{width:'100%',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',background:'#fff'}}>
                <option value="">— Select type —</option>
                {['HVAC Repair','HVAC Install','Furnace Service','Plumbing','Drain','Electrical','Appliance Repair','Generator','Other'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={LB}>Priority</label>
              <div style={{display:'flex',gap:6}}>
                {['Normal','Urgent','Low'].map(p=>(
                  <button key={p} onClick={()=>setForm(f=>({...f,priority:p}))}
                    style={{flex:1,height:38,border:`1px solid ${form.priority===p?(p==='Urgent'?'#dc2626':p==='Low'?'#9ca3af':'#2563eb'):'#e5e7eb'}`,borderRadius:7,fontSize:12.5,fontWeight:form.priority===p?700:400,
                      color:form.priority===p?(p==='Urgent'?'#dc2626':p==='Low'?'#6b7280':'#2563eb'):'#9ca3af',
                      background:form.priority===p?(p==='Urgent'?'#fef2f2':p==='Low'?'#f3f4f6':'#eff6ff'):'#fff',cursor:'pointer'}}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fees + Tech */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}>
            <div>
              <label style={LB}>Service Call Fee ($)</label>
              <input className="rfI" type="number" min="0" step="0.01" value={form.serviceFee} onChange={e=>setForm(p=>({...p,serviceFee:e.target.value}))}
                style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',textAlign:'right'}}/>
            </div>
            <div>
              <label style={LB}>Authorization Limit ($)</label>
              <input className="rfI" type="number" min="0" step="0.01" value={form.authLimit} onChange={e=>setForm(p=>({...p,authLimit:e.target.value}))}
                style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',textAlign:'right'}}/>
            </div>
            <div>
              <label style={LB}>Assign Technician</label>
              <select value={form.assignedTechId} onChange={e=>setForm(p=>({...p,assignedTechId:e.target.value}))}
                style={{width:'100%',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',background:'#fff'}}>
                <option value="">— Unassigned —</option>
                {techs.map(t=><option key={t.id||t.name} value={t.id||t.name}>{t.name}</option>)}
              </select>
            </div>
          </div>

          {/* Issue */}
          <div style={{marginBottom:14}}>
            <label style={LB}>Issue / Symptoms</label>
            <textarea className="rfI" value={form.issueSymptoms} onChange={e=>setForm(p=>({...p,issueSymptoms:e.target.value}))} rows={3}
              placeholder="Describe the issue or symptoms…"
              style={{width:'100%',boxSizing:'border-box',border:'1px solid #e5e7eb',borderRadius:7,padding:'10px 12px',fontSize:13.5,color:'#374151',resize:'vertical'}}/>
          </div>

          {/* Preferred dates */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            <div>
              <label style={LB}>Preferred Date 1</label>
              <input type="date" className="rfI" value={form.preferredDate1} onChange={e=>setForm(p=>({...p,preferredDate1:e.target.value}))}
                style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151'}}/>
            </div>
            <div>
              <label style={LB}>Preferred Date 2</label>
              <input type="date" className="rfI" value={form.preferredDate2} onChange={e=>setForm(p=>({...p,preferredDate2:e.target.value}))}
                style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151'}}/>
            </div>
          </div>

          {/* Arrival time */}
          <div style={{marginBottom:20}}>
            <label style={LB}>Preferred Arrival Time</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {[{val:'any_time',label:'Any Time'},{val:'morning',label:'Morning (8am–12pm)'},{val:'afternoon',label:'Afternoon (12pm–5pm)'},{val:'evening',label:'Evening (5pm–8pm)'},{val:'emergency',label:'Emergency'}].map(opt=>(
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

          {/* Scope */}
          <div style={{marginBottom:14}}>
            <label style={LB}>Scope — From Office</label>
            <textarea className="rfI" value={form.scopeFromOffice} onChange={e=>setForm(p=>({...p,scopeFromOffice:e.target.value}))} rows={3}
              placeholder="Scope of work as defined by office…"
              style={{width:'100%',boxSizing:'border-box',border:'1px solid #e5e7eb',borderRadius:7,padding:'10px 12px',fontSize:13.5,color:'#374151',resize:'vertical'}}/>
          </div>
          <div style={{marginBottom:20}}>
            <label style={LB}>Scope — Field Supervisor</label>
            <textarea className="rfI" value={form.scopeFieldSupervisor} onChange={e=>setForm(p=>({...p,scopeFieldSupervisor:e.target.value}))} rows={3}
              placeholder="Scope as determined on-site…"
              style={{width:'100%',boxSizing:'border-box',border:'1px solid #e5e7eb',borderRadius:7,padding:'10px 12px',fontSize:13.5,color:'#374151',resize:'vertical'}}/>
          </div>

          {/* Claim number */}
          <div style={{marginBottom:20}}>
            <label style={LB}>Claim Number</label>
            <input className="rfI" value={form.claimTrackingId} onChange={e=>setForm(p=>({...p,claimTrackingId:e.target.value}))}
              placeholder="e.g. CLM-2024-00123"
              style={{width:'100%',maxWidth:320,boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',fontFamily:'monospace'}}/>
          </div>

          {/* Accepted by */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
            <div>
              <label style={LB}>Accepted By — Representative</label>
              <input className="rfI" value={form.jobAcceptedByRep} onChange={e=>setForm(p=>({...p,jobAcceptedByRep:e.target.value}))}
                placeholder="Rep / staff name"
                style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151'}}/>
            </div>
            <div>
              <label style={LB}>Accepted By — Company</label>
              <input className="rfI" value={form.jobAcceptedByCompany} onChange={e=>setForm(p=>({...p,jobAcceptedByCompany:e.target.value}))}
                placeholder="Company / contractor"
                style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151'}}/>
            </div>
          </div>

          {/* Claim detail fields */}
          <div style={{marginBottom:20}}>
            <label style={LB}>Claim Details</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {form.claimFields.map((val,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:12,fontWeight:700,color:'#9ca3af',width:18,flexShrink:0,textAlign:'right'}}>{i+1}.</span>
                  <input className="rfI" value={val} onChange={e=>{const arr=[...form.claimFields];arr[i]=e.target.value;setForm(p=>({...p,claimFields:arr}))}}
                    placeholder={`Field ${i+1}`}
                    style={{flex:1,height:36,border:'1px solid #e5e7eb',borderRadius:7,padding:'0 10px',fontSize:13,color:'#374151'}}/>
                </div>
              ))}
            </div>
          </div>

          {/* Upload images */}
          <div style={{marginBottom:20}}>
            <label style={LB}>Upload Images</label>
            <input ref={imgInputRef} type="file" accept="image/*" multiple style={{display:'none'}}
              onChange={e=>{
                const files=Array.from(e.target.files)
                Promise.all(files.map(f=>new Promise(res=>{const r=new FileReader();r.onload=ev=>res({name:f.name,url:ev.target.result});r.readAsDataURL(f)})))
                  .then(imgs=>setForm(p=>({...p,uploadedImages:[...p.uploadedImages,...imgs]})))
                e.target.value=''
              }}/>
            <div onClick={()=>imgInputRef.current?.click()}
              style={{border:'2px dashed #d1d5db',borderRadius:10,padding:'28px 20px',textAlign:'center',cursor:'pointer',background:'#f9fafb'}}>
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
                      style={{position:'absolute',top:-6,right:-6,width:20,height:20,borderRadius:'50%',background:'#ef4444',color:'#fff',border:'none',cursor:'pointer',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* On-site assessment */}
          <div style={{marginBottom:14}}>
            <label style={LB}>On-Site Assessment</label>
            <textarea className="rfI" value={form.onSiteAssessment} onChange={e=>setForm(p=>({...p,onSiteAssessment:e.target.value}))} rows={4}
              placeholder="Record findings from on-site visit…"
              style={{width:'100%',boxSizing:'border-box',border:'1px solid #e5e7eb',borderRadius:7,padding:'10px 12px',fontSize:13.5,color:'#374151',resize:'vertical'}}/>
          </div>

          {/* Internal notes */}
          <div>
            <label style={LB}>Internal Notes</label>
            <textarea className="rfI" value={form.internalNotes} onChange={e=>setForm(p=>({...p,internalNotes:e.target.value}))} rows={3}
              placeholder="Internal notes for staff…"
              style={{width:'100%',boxSizing:'border-box',border:'1px solid #e5e7eb',borderRadius:7,padding:'10px 12px',fontSize:13.5,color:'#374151',resize:'vertical'}}/>
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:'16px 24px',borderTop:'1px solid #f0f1f3',display:'flex',justifyContent:'flex-end',gap:10,background:'#f9fafb',borderRadius:'0 0 12px 12px'}}>
          <button onClick={onClose} style={{height:40,padding:'0 20px',background:'#fff',color:'#374151',border:'1px solid #e5e7eb',borderRadius:8,fontSize:14,fontWeight:500,cursor:'pointer'}}>Cancel</button>
          <button onClick={submit} disabled={submitting}
            style={{height:40,padding:'0 24px',background:'#16a34a',color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer',opacity:submitting?0.6:1}}>
            {submitting?'Saving…':'Save Request'}
          </button>
        </div>
      </div>
    </div>
  )
}
