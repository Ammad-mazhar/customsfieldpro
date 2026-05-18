import { useState } from 'react'
import {
  getClients as storeGetClients,
  saveClients as storeSaveClients,
  deleteClient as storeDeleteClient,
} from '../data/store'
import * as clientsApi from '../api/clients'
import { useApiData } from '../api/hooks'
import { useAuth } from '../auth/AuthContext'
import { logActivity, ACTIONS } from '../utils/activityLog'

const TYPE_C = { Residential:{bg:'#eff6ff',color:'#2563eb'}, Commercial:{bg:'#fef3c7',color:'#d97706'}, Municipal:{bg:'#f0fdf4',color:'#16a34a'} }
const JOB_SC = { 'In Progress':{bg:'#eff6ff',color:'#2563eb'}, Scheduled:{bg:'#ecfeff',color:'#0891b2'}, Completed:{bg:'#f0fdf4',color:'#16a34a'}, Cancelled:{bg:'#fef2f2',color:'#dc2626'} }
const INV_SC = { Paid:{bg:'#f0fdf4',color:'#16a34a'}, Overdue:{bg:'#fef2f2',color:'#dc2626'}, Draft:{bg:'#f3f4f6',color:'#6b7280'}, Sent:{bg:'#eff6ff',color:'#2563eb'} }

const BLANK = { firstName:'', lastName:'', phone:'', email:'', address:'', city:'', state:'VA', zip:'', type:'Residential', notes:'' }

function Bdg({ label, map }) {
  const c = map[label] ?? {bg:'#f3f4f6',color:'#6b7280'}
  return <span style={{display:'inline-block',fontSize:12,fontWeight:600,padding:'3px 9px',borderRadius:20,background:c.bg,color:c.color}}>{label}</span>
}

function Tabs({ tabs, active, onSelect }) {
  return (
    <div style={{display:'flex',borderBottom:'1px solid #e8e9ec',flexShrink:0}}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => t.enabled!==false && onSelect(t.id)}
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

export default function Clients() {
  const { isAdmin, hasPermission } = useAuth()
  const canCreate = isAdmin || hasPermission('create_clients')
  const canEdit   = isAdmin || hasPermission('edit_clients')
  const { data: clients, setData: setClients, loading: clientsLoading, error: clientsError } = useApiData(clientsApi.getClients, storeGetClients)
  const [tab,setTab]               = useState('all')
  const [selId,setSelId]           = useState(null)
  const [search,setSearch]         = useState('')
  const [typeF,setTypeF]           = useState('All')
  const [form,setForm]             = useState(BLANK)
  const [errs,setErrs]             = useState({})
  const [editNote,setEditNote]     = useState(false)
  const [noteDraft,setNoteDraft]   = useState('')
  const [banner,setBanner]         = useState('')
  const [portalCopied,setPortalCopied] = useState(false)

  const sel = clients.find(c => c.id === selId)

  const tabs = [
    {id:'all',   label:'All Clients'},
    {id:'detail',label: sel ? `Client Detail (${sel.name})` : 'Client Detail', enabled:!!sel},
    {id:'add',   label:'Add Client'},
  ]

  function open(id) { setSelId(id); setTab('detail'); setEditNote(false) }

  function flash(msg) { setBanner(msg); setTimeout(()=>setBanner(''),3000) }

  function update(newArr) { setClients(newArr); storeSaveClients(newArr) }

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return (!q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q) || c.address.toLowerCase().includes(q))
      && (typeF==='All' || c.type===typeF)
  })

  function validate() {
    const e={}
    ;['firstName','lastName','phone','address','city','zip'].forEach(f => { if(!form[f].trim()) e[f]='Required' })
    return e
  }

  function submit() {
    const e = validate()
    if (Object.keys(e).length) { setErrs(e); return }
    const newClient = {
      ...form,
      id: Date.now(),
      name: `${form.firstName} ${form.lastName}`,
      balance: 0,
      since: new Date().toLocaleDateString('en-US',{month:'short',year:'numeric'}),
      property: {sqft:0,year:0,stories:1},
      equipment: [],
      jobs: [],
      invoices: [],
    }
    clientsApi.createClient(newClient).catch(() => {})
    update([...clients, newClient])
    logActivity(ACTIONS.CLIENT_CREATED, 'Clients', String(newClient.id), newClient.name, `New client added: ${newClient.name}.`)
    setForm(BLANK); setErrs({}); setTab('all'); flash('Client added successfully.')
  }

  function copyPortalLink() {
    const url = `${window.location.origin}/portal/${sel.id}`
    navigator.clipboard.writeText(url).then(() => {
      setPortalCopied(true)
      setTimeout(() => setPortalCopied(false), 2500)
    })
  }

  function saveNotes() {
    const newArr = clients.map(c => c.id===sel.id ? {...c, notes:noteDraft} : c)
    clientsApi.updateClient(sel.id, { notes: noteDraft }).catch(() => {})
    update(newArr)
    logActivity(ACTIONS.CLIENT_UPDATED, 'Clients', String(sel.id), sel.name, 'Client notes updated.')
    setEditNote(false)
  }

  function handleDelete() {
    if (!window.confirm(`Delete ${sel.name}? This cannot be undone.`)) return
    logActivity(ACTIONS.CLIENT_DELETED, 'Clients', String(sel.id), sel.name, `Client "${sel.name}" deleted.`)
    clientsApi.deleteClient(sel.id).catch(() => {})
    const newArr = storeDeleteClient(sel.id)
    setClients(newArr)
    setSelId(null)
    setTab('all')
    flash('Client deleted.')
  }

  function inpProps(f) {
    return {
      style:{width:'100%',boxSizing:'border-box',height:38,border:`1px solid ${errs[f]?'#dc2626':'#e8e9ec'}`,borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',outline:'none'},
      value:form[f],
      onChange:e=>{setForm(p=>({...p,[f]:e.target.value}));setErrs(p=>({...p,[f]:undefined}))}
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {banner&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',color:'#16a34a',borderRadius:8,padding:'10px 16px',fontSize:13.5,fontWeight:600}}>✓ {banner}</div>}
      {clientsLoading&&<div style={{fontSize:12.5,color:'#9ca3af',padding:'4px 0',display:'flex',alignItems:'center',gap:6}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{animation:'spin 0.8s linear infinite'}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Syncing with server…</div>}
      {clientsError&&<div style={{background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',borderRadius:8,padding:'8px 14px',fontSize:13,display:'flex',alignItems:'center',gap:8}}><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/></svg>API unavailable — showing cached data</div>}

      <div style={{background:'#fff',border:'1px solid #e8e9ec',borderRadius:10,boxShadow:'0 1px 3px rgba(0,0,0,0.05)',overflow:'hidden'}}>
        <Tabs tabs={tabs} active={tab} onSelect={setTab}/>
        <div style={{padding:24}}>

          {/* ALL */}
          {tab==='all'&&(
            <div>
              <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
                <div style={{position:'relative',flex:1,minWidth:200,maxWidth:320}}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)'}}>
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round"/>
                  </svg>
                  <input placeholder="Search clients…" value={search} onChange={e=>setSearch(e.target.value)}
                    style={{width:'100%',boxSizing:'border-box',height:36,paddingLeft:32,paddingRight:12,border:'1px solid #e8e9ec',borderRadius:8,fontSize:13.5,color:'#374151',outline:'none'}}/>
                </div>
                <select value={typeF} onChange={e=>setTypeF(e.target.value)}
                  style={{height:36,border:'1px solid #e8e9ec',borderRadius:8,padding:'0 12px',fontSize:13.5,color:'#374151',background:'#fff'}}>
                  {['All','Residential','Commercial','Municipal'].map(t=><option key={t}>{t}</option>)}
                </select>
                {canCreate && <button onClick={()=>setTab('add')} style={{height:36,padding:'0 16px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:'pointer'}}>+ Add Client</button>}
              </div>
              <p style={{fontSize:12.5,color:'#9ca3af',marginBottom:8}}>{filtered.length} clients</p>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>{['Name','Phone','Email','Address','Type','Balance',''].map(h=>(
                    <th key={h} style={{textAlign:'left',fontSize:11.5,fontWeight:600,color:'#9ca3af',letterSpacing:'0.4px',padding:'9px 14px',borderBottom:'1px solid #f0f1f3',whiteSpace:'nowrap'}}>{h}</th>
                  ))}</tr></thead>
                  <tbody>
                    {filtered.map(c=>(
                      <tr key={c.id} onClick={()=>open(c.id)} style={{borderBottom:'1px solid #f8f9fa',cursor:'pointer'}}
                        onMouseEnter={e=>e.currentTarget.style.background='#fafbff'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{padding:'12px 14px',fontWeight:600,color:'#1a1d23',fontSize:13.5,whiteSpace:'nowrap'}}>{c.name}</td>
                        <td style={{padding:'12px 14px',fontSize:13.5,color:'#374151',whiteSpace:'nowrap'}}>{c.phone}</td>
                        <td style={{padding:'12px 14px',fontSize:13,color:'#6b7280'}}>{c.email}</td>
                        <td style={{padding:'12px 14px',fontSize:13,color:'#6b7280',whiteSpace:'nowrap'}}>{c.address}, {c.city}</td>
                        <td style={{padding:'12px 14px'}}><Bdg label={c.type} map={TYPE_C}/></td>
                        <td style={{padding:'12px 14px',fontSize:13.5,fontWeight:600,color:c.balance>0?'#dc2626':'#9ca3af',whiteSpace:'nowrap'}}>{c.balance>0?`$${c.balance.toLocaleString()}`:'—'}</td>
                        <td style={{padding:'12px 14px'}}>
                          <button onClick={e=>{e.stopPropagation();open(c.id)}} style={{fontSize:12.5,fontWeight:500,color:'#2563eb',background:'#eff6ff',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>View</button>
                        </td>
                      </tr>
                    ))}
                    {!filtered.length&&<tr><td colSpan={7}><div style={{textAlign:'center',padding:'48px 24px'}}>
                      <div style={{width:52,height:52,borderRadius:14,background:'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      </div>
                      <p style={{fontSize:14,fontWeight:600,color:'#374151',margin:'0 0 6px'}}>No clients found</p>
                      <p style={{fontSize:13,color:'#9ca3af',margin:'0 0 16px'}}>Add your first client to get started</p>
                      <button onClick={()=>setTab('add')} style={{height:36,padding:'0 16px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>+ Add Client</button>
                    </div></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DETAIL */}
          {tab==='detail'&&sel&&(
            <div style={{display:'flex',flexDirection:'column',gap:20}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                <div>
                  <button onClick={()=>setTab('all')} style={{background:'none',border:'none',color:'#6b7280',fontSize:13,cursor:'pointer',padding:0,marginBottom:8}}>← All Clients</button>
                  <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                    <h2 style={{fontSize:22,fontWeight:700,color:'#1a1d23',margin:0}}>{sel.name}</h2>
                    <Bdg label={sel.type} map={TYPE_C}/>
                  </div>
                  <p style={{fontSize:13,color:'#9ca3af',margin:'4px 0 0'}}>Client since {sel.since}</p>
                </div>
                <div style={{display:'flex',gap:8,flexShrink:0}}>
                  <button onClick={copyPortalLink}
                    style={{height:36,padding:'0 14px',background:portalCopied?'#f0fdf4':'#f8f9fa',color:portalCopied?'#16a34a':'#374151',border:`1px solid ${portalCopied?'#bbf7d0':'#e8e9ec'}`,borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer',transition:'all 0.2s'}}>
                    {portalCopied?'✓ Copied!':'🔗 Copy Portal Link'}
                  </button>
                  {canEdit && (
                    <button onClick={handleDelete}
                      style={{height:36,padding:'0 16px',background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer'}}>
                      Delete Client
                    </button>
                  )}
                </div>
              </div>

              {/* Portal link URL box */}
              <div style={{background:'#f8f9fa',border:'1px solid #e8e9ec',borderRadius:8,padding:'10px 14px',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                <span style={{fontSize:11.5,fontWeight:700,color:'#9ca3af',letterSpacing:'0.5px',textTransform:'uppercase',flexShrink:0}}>Client Portal</span>
                <code style={{fontSize:12.5,color:'#2563eb',background:'#eff6ff',padding:'3px 10px',borderRadius:5,flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {window.location.origin}/portal/{sel.id}
                </code>
                <button onClick={copyPortalLink}
                  style={{height:28,padding:'0 12px',background:portalCopied?'#f0fdf4':'#fff',color:portalCopied?'#16a34a':'#6b7280',border:'1px solid #e8e9ec',borderRadius:6,fontSize:12,fontWeight:500,cursor:'pointer',flexShrink:0}}>
                  {portalCopied?'Copied!':'Copy'}
                </button>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                <div style={C}>
                  <p style={CT}>Contact Information</p>
                  {[['Phone',sel.phone],['Email',sel.email],['Address',`${sel.address}, ${sel.city}, ${sel.state} ${sel.zip}`]].map(([l,v])=>(
                    <div key={l} style={{display:'flex',gap:12,marginBottom:10}}>
                      <span style={{fontSize:12,color:'#9ca3af',fontWeight:500,width:60,flexShrink:0,paddingTop:1}}>{l}</span>
                      <span style={{fontSize:13.5,color:'#374151'}}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={C}>
                  <p style={CT}>Property Details</p>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                    {[['Sq Ft',sel.property.sqft?sel.property.sqft.toLocaleString():'—'],['Year Built',sel.property.year||'—'],['Stories',sel.property.stories||'—']].map(([l,v])=>(
                      <div key={l} style={{textAlign:'center',background:'#f8f9fa',borderRadius:8,padding:'14px 8px'}}>
                        <div style={{fontSize:20,fontWeight:700,color:'#1a1d23'}}>{v}</div>
                        <div style={{fontSize:11,color:'#9ca3af',marginTop:3}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={C}>
                <p style={CT}>Equipment On File</p>
                {sel.equipment.length===0?<p style={{color:'#9ca3af',fontSize:13.5,margin:0}}>No equipment on file.</p>:(
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead><tr>{['Equipment Type','Brand','Model','Installed','Next Service'].map(h=>(
                      <th key={h} style={{textAlign:'left',fontSize:11.5,fontWeight:600,color:'#9ca3af',padding:'7px 12px',borderBottom:'1px solid #f0f1f3'}}>{h}</th>
                    ))}</tr></thead>
                    <tbody>{sel.equipment.map((eq,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid #f8f9fa'}}>
                        <td style={TD}><strong>{eq.type}</strong></td>
                        <td style={TD}>{eq.brand}</td>
                        <td style={{...TD,fontFamily:'monospace',fontSize:12.5}}>{eq.model}</td>
                        <td style={TD}>{eq.installed}</td>
                        <td style={{...TD,color:'#16a34a',fontWeight:600}}>{eq.nextService}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:16}}>
                <div style={C}>
                  <p style={CT}>Job History</p>
                  {sel.jobs.length===0?<p style={{color:'#9ca3af',fontSize:13.5,margin:0}}>No jobs on record.</p>:(
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead><tr>{['Job #','Type','Status','Date'].map(h=>(
                        <th key={h} style={{textAlign:'left',fontSize:11.5,fontWeight:600,color:'#9ca3af',padding:'7px 12px',borderBottom:'1px solid #f0f1f3'}}>{h}</th>
                      ))}</tr></thead>
                      <tbody>{sel.jobs.map(j=>(
                        <tr key={j.id} style={{borderBottom:'1px solid #f8f9fa'}}>
                          <td style={TD}><span style={{fontFamily:'monospace',fontSize:12,background:'#f3f4f6',padding:'2px 6px',borderRadius:4}}>{j.id}</span></td>
                          <td style={TD}>{j.type}</td>
                          <td style={TD}><Bdg label={j.status} map={JOB_SC}/></td>
                          <td style={{...TD,color:'#9ca3af'}}>{j.date}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
                <div style={C}>
                  <p style={CT}>Balance</p>
                  <div style={{background:sel.balance>0?'#fef2f2':'#f8f9fa',border:`1px solid ${sel.balance>0?'#fecaca':'#f0f1f3'}`,borderRadius:8,padding:'16px',textAlign:'center',marginBottom:14}}>
                    <div style={{fontSize:28,fontWeight:700,color:sel.balance>0?'#dc2626':'#9ca3af'}}>{sel.balance>0?`$${sel.balance.toLocaleString()}`:'$0.00'}</div>
                    <div style={{fontSize:12,color:'#9ca3af',marginTop:4}}>{sel.balance>0?'Outstanding':'No balance due'}</div>
                  </div>
                  <p style={{fontSize:11.5,fontWeight:700,color:'#9ca3af',marginBottom:8,letterSpacing:'0.5px'}}>INVOICES</p>
                  {sel.invoices.length===0?<p style={{color:'#9ca3af',fontSize:13,margin:0}}>No invoices.</p>:sel.invoices.map(inv=>(
                    <div key={inv.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #f8f9fa',gap:6}}>
                      <span style={{fontFamily:'monospace',fontSize:12,color:'#6b7280'}}>{inv.id}</span>
                      <span style={{fontSize:13,fontWeight:600,color:'#1a1d23'}}>{inv.amount}</span>
                      <Bdg label={inv.status} map={INV_SC}/>
                    </div>
                  ))}
                </div>
              </div>

              <div style={C}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <p style={{...CT,marginBottom:0}}>Notes</p>
                  {canEdit && (!editNote
                    ?<button onClick={()=>{setNoteDraft(sel.notes);setEditNote(true)}} style={{fontSize:12.5,color:'#2563eb',background:'none',border:'none',cursor:'pointer',fontWeight:500}}>Edit Notes</button>
                    :<div style={{display:'flex',gap:8}}>
                        <button onClick={saveNotes} style={{fontSize:12.5,fontWeight:600,color:'#fff',background:'#2563eb',border:'none',borderRadius:6,padding:'4px 12px',cursor:'pointer'}}>Save</button>
                        <button onClick={()=>setEditNote(false)} style={{fontSize:12.5,color:'#6b7280',background:'none',border:'1px solid #e8e9ec',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>Cancel</button>
                      </div>
                  )}
                </div>
                {editNote
                  ?<textarea value={noteDraft} onChange={e=>setNoteDraft(e.target.value)} rows={4}
                      style={{width:'100%',boxSizing:'border-box',border:'1px solid #e8e9ec',borderRadius:7,padding:'10px 12px',fontSize:13.5,color:'#374151',resize:'vertical',outline:'none'}}/>
                  :<p style={{fontSize:13.5,color:sel.notes?'#374151':'#9ca3af',lineHeight:1.7,margin:0}}>{sel.notes||'No notes for this client.'}</p>}
              </div>
            </div>
          )}

          {/* ADD */}
          {tab==='add'&&(
            <div style={{maxWidth:680}}>
              <h3 style={{fontSize:17,fontWeight:700,color:'#1a1d23',margin:'0 0 20px'}}>Add New Client</h3>
              <div style={C}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                  {[['firstName','First Name'],['lastName','Last Name']].map(([f,l])=>(
                    <div key={f}>
                      <label style={LB}>{l} <span style={{color:'#dc2626'}}>*</span></label>
                      <input {...inpProps(f)}/>
                      {errs[f]&&<p style={ET}>{errs[f]}</p>}
                    </div>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:14}}>
                  <div>
                    <label style={LB}>Phone <span style={{color:'#dc2626'}}>*</span></label>
                    <input {...inpProps('phone')}/>
                    {errs.phone&&<p style={ET}>{errs.phone}</p>}
                  </div>
                  <div>
                    <label style={LB}>Email</label>
                    <input {...inpProps('email')}/>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:14}}>
                  <div>
                    <label style={LB}>Street Address <span style={{color:'#dc2626'}}>*</span></label>
                    <input {...inpProps('address')}/>
                    {errs.address&&<p style={ET}>{errs.address}</p>}
                  </div>
                  <div>
                    <label style={LB}>City <span style={{color:'#dc2626'}}>*</span></label>
                    <input {...inpProps('city')}/>
                    {errs.city&&<p style={ET}>{errs.city}</p>}
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'80px 1fr 1fr',gap:14,marginTop:14}}>
                  <div>
                    <label style={LB}>State</label>
                    <input {...inpProps('state')}/>
                  </div>
                  <div>
                    <label style={LB}>ZIP <span style={{color:'#dc2626'}}>*</span></label>
                    <input {...inpProps('zip')}/>
                    {errs.zip&&<p style={ET}>{errs.zip}</p>}
                  </div>
                  <div>
                    <label style={LB}>Property Type</label>
                    <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}
                      style={{width:'100%',height:38,border:'1px solid #e8e9ec',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',background:'#fff'}}>
                      {['Residential','Commercial','Municipal'].map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{marginTop:14}}>
                  <label style={LB}>Notes</label>
                  <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={3}
                    placeholder="Internal notes, preferences, access codes…"
                    style={{width:'100%',boxSizing:'border-box',border:'1px solid #e8e9ec',borderRadius:7,padding:'10px 12px',fontSize:13.5,color:'#374151',resize:'vertical',outline:'none'}}/>
                </div>
                <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20,paddingTop:16,borderTop:'1px solid #f0f1f3'}}>
                  <button onClick={()=>{setForm(BLANK);setErrs({});setTab('all')}}
                    style={{height:38,padding:'0 18px',background:'#f3f4f6',color:'#374151',border:'none',borderRadius:8,fontSize:13.5,fontWeight:500,cursor:'pointer'}}>Cancel</button>
                  <button onClick={submit}
                    style={{height:38,padding:'0 20px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:'pointer'}}>Save Client</button>
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
const TD = {padding:'10px 12px',fontSize:13.5,color:'#374151'}
const LB = {display:'block',fontSize:12,fontWeight:600,color:'#6b7280',marginBottom:5}
const ET = {fontSize:11,color:'#dc2626',margin:'4px 0 0'}
