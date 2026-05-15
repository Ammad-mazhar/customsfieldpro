import { useState, useEffect } from 'react'
import { getClients, saveClients, deleteClient as storeDeleteClient, generateClientId, getSettings } from '../data/store'
import { useAuth } from '../auth/AuthContext'
import { api } from '../services/api'
import { logActivity, ACTIONS } from '../utils/activityLog'
import AddressAutocomplete from '../components/AddressAutocomplete'
import FilterDropdown from '../components/FilterDropdown'
import { getReviewRequestsForClient, triggerReviewRequest } from '../utils/reviewRequests'

const TYPE_C = { Residential:{bg:'#eff6ff',color:'#2563eb'}, Commercial:{bg:'#fef3c7',color:'#d97706'}, Municipal:{bg:'#f0fdf4',color:'#16a34a'} }
const JOB_SC = { 'In Progress':{bg:'#eff6ff',color:'#2563eb'}, Scheduled:{bg:'#ecfeff',color:'#0891b2'}, Completed:{bg:'#f0fdf4',color:'#16a34a'}, Cancelled:{bg:'#fef2f2',color:'#dc2626'} }
const INV_SC = { Paid:{bg:'#f0fdf4',color:'#16a34a'}, Overdue:{bg:'#fef2f2',color:'#dc2626'}, Draft:{bg:'#f3f4f6',color:'#6b7280'}, Sent:{bg:'#eff6ff',color:'#2563eb'} }

const BLANK = {
  title:'', firstName:'', lastName:'', companyName:'',
  phone:'', email:'', leadSource:'',
  address:'', street2:'', city:'', state:'VA', zip:'', country:'United States',
  type:'Residential', notes:'', dob:'', tags:[],
  billingAddressSame:true, propertyType:'', propertySize:'', yearBuilt:'', accessNotes:'',
  hasDiffPropertyContact:false, propContactName:'', propContactPhone:'', propContactEmail:'',
}
const COUNTRIES = ['United States','Canada','United Kingdom','Australia','Mexico','India','Germany','France','Brazil','Japan','Other']

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
  const [clients,setClients]       = useState([])
  const [loading,setLoading]       = useState(true)
  const [tab,setTab]               = useState('all')
  const [selId,setSelId]           = useState(null)
  const [search,setSearch]         = useState('')
  const [typeF,setTypeF]           = useState('All')
  const [statusF,setStatusF]       = useState('All')
  const [priorityF,setPriorityF]   = useState('All')
  const [form,setForm]             = useState(BLANK)
  const [errs,setErrs]             = useState({})
  const [editNote,setEditNote]     = useState(false)
  const [noteDraft,setNoteDraft]   = useState('')
  const [banner,setBanner]         = useState('')
  const [portalCopied,setPortalCopied] = useState(false)
  const [reviewModal,setReviewModal]   = useState(false)
  const [reviewSent,setReviewSent]     = useState(false)
  const [addlOpen,        setAddlOpen]        = useState(false)
  const [addContactsOpen, setAddContactsOpen] = useState(false)
  const [propDetailsOpen, setPropDetailsOpen] = useState(false)
  const [propContactsOpen,setPropContactsOpen]= useState(false)
  const [tagInput,        setTagInput]        = useState('')
  const [addlContacts,    setAddlContacts]    = useState([])

  // Load clients from backend on mount
  useEffect(() => {
    loadClients()
  }, [])

  async function loadClients() {
    try {
      setLoading(true)
      const response = await api.getClients()
      const clientsData = response.data || []
      
      // Map backend structure to frontend structure
      const mappedClients = clientsData.map(c => ({
        ...c,
        name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.company_name || 'Unnamed Client',
        balance: c.balance || 0,
        since: c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A',
        property: c.property || { sqft: 0, year: 0, stories: 1 },
        equipment: c.equipment || [],
        jobs: c.jobs || [],
        invoices: c.invoices || [],
      }))
      
      setClients(mappedClients)
      saveClients(mappedClients) // Sync to localStorage as backup
    } catch (error) {
      console.error('Error loading clients:', error)
      // Fallback to localStorage if API fails
      setClients(getClients())
    } finally {
      setLoading(false)
    }
  }

  const sel = clients.find(c => c.id === selId)

  const tabs = [
    {id:'all',   label:'All Clients'},
    {id:'detail',label: sel ? `Client Detail (${sel.name})` : 'Client Detail', enabled:!!sel},
    {id:'add',   label:'Add Client'},
  ]

  function open(id) { setSelId(id); setTab('detail'); setEditNote(false) }

  function flash(msg) { setBanner(msg); setTimeout(()=>setBanner(''),3000) }

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    const clientStatus = (c.balance > 0) ? 'Open' : 'Converted'
    const clientPriority = c.priority || 'Normal'
    return (!q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q) || c.address.toLowerCase().includes(q))
      && (typeF==='All' || c.type===typeF)
      && (statusF==='All' || clientStatus===statusF)
      && (priorityF==='All' || clientPriority===priorityF)
  })

  function validate() {
    const e = {}
    if (!form.firstName.trim() && !form.companyName.trim()) e.firstName = 'Please enter a first name or company name'
    if (form.phone.trim() && !/^[\d\s\-\+\(\)\.]{7,15}$/.test(form.phone.trim())) e.phone = 'Please enter a valid phone number'
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Please enter a valid email address'
    if (form.zip.trim() && !/^\d{5}(-\d{4})?$/.test(form.zip.trim())) e.zip = 'Please enter a valid ZIP code'
    return e
  }

  function resetAddForm() {
    setForm(BLANK); setErrs({})
    setAddlOpen(false); setAddContactsOpen(false); setPropDetailsOpen(false); setPropContactsOpen(false)
    setTagInput(''); setAddlContacts([])
  }

  async function submit(andCreateAnother = false) {
    const e = validate()
    if (Object.keys(e).length) { setErrs(e); return }
    
    const displayName = form.firstName.trim()
      ? `${form.firstName.trim()} ${form.lastName.trim()}`.trim()
      : form.companyName.trim()

    try {
      // Create client via API
      const clientData = {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        company_name: form.companyName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zip: form.zip.trim(),
        country: form.country,
        client_type: form.type,
        property_type: form.propertyType,
        notes: form.notes.trim(),
        lead_source: form.leadSource,
      }

      const response = await api.createClient(clientData)
      
      if (response.success && response.data) {
        // Map response to frontend structure
        const newClient = {
          ...response.data,
          name: displayName,
          balance: 0,
          since: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          property: { sqft: 0, year: parseInt(form.yearBuilt) || 0, stories: 1 },
          equipment: [],
          jobs: [],
          invoices: [],
        }

        setClients(prev => [newClient, ...prev])
        logActivity(ACTIONS.CLIENT_CREATED, 'Clients', String(newClient.id), newClient.name, `New client added: ${newClient.name}.`)
        flash(`Client ${displayName} created`)

        if (andCreateAnother) {
          resetAddForm()
        } else {
          resetAddForm()
          setSelId(newClient.id)
          setTab('detail')
        }
      }
    } catch (error) {
      console.error('Error creating client:', error)
      flash('Error creating client. Please try again.')
    }
  }

  function copyPortalLink() {
    const url = `${window.location.origin}/portal/${sel.id}`
    navigator.clipboard.writeText(url).then(() => {
      setPortalCopied(true)
      setTimeout(() => setPortalCopied(false), 2500)
    })
  }

  async function saveNotes() {
    try {
      const updated = { ...sel, notes: noteDraft }
      await api.updateClient(sel.id, { notes: noteDraft })
      
      setClients(prev => prev.map(c => c.id === sel.id ? updated : c))
      logActivity(ACTIONS.CLIENT_UPDATED, 'Clients', String(sel.id), sel.name, 'Client notes updated.')
      setEditNote(false)
      flash('Notes saved')
    } catch (error) {
      console.error('Error saving notes:', error)
      flash('Error saving notes')
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${sel.name}? This cannot be undone.`)) return
    
    try {
      await api.deleteClient(sel.id)
      setClients(prev => prev.filter(c => c.id !== sel.id))
      logActivity(ACTIONS.CLIENT_DELETED, 'Clients', String(sel.id), sel.name, `Client "${sel.name}" deleted.`)
      setSelId(null)
      setTab('all')
      flash('Client deleted.')
    } catch (error) {
      console.error('Error deleting client:', error)
      flash('Error deleting client')
    }
  }

  function inpProps(f) {
    return {
      style:{width:'100%',boxSizing:'border-box',height:38,border:`1px solid ${errs[f]?'#dc2626':'#e8e9ec'}`,borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',outline:'none'},
      value:form[f],
      onChange:e=>{setForm(p=>({...p,[f]:e.target.value}));setErrs(p=>({...p,[f]:undefined}))}
    }
  }

  if (loading) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'400px'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:16,color:'#6b7280',marginBottom:8}}>Loading clients...</div>
        </div>
      </div>
    )
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
              <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
                <div style={{position:'relative',flex:1,minWidth:200,maxWidth:320}}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)'}}>
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round"/>
                  </svg>
                  <input placeholder="Search clients…" value={search} onChange={e=>setSearch(e.target.value)}
                    style={{width:'100%',boxSizing:'border-box',height:36,paddingLeft:32,paddingRight:12,border:'1px solid #e8e9ec',borderRadius:8,fontSize:13.5,color:'#374151',outline:'none'}}/>
                </div>
                <FilterDropdown
                  groups={[
                    { label: 'Status',   key: 'statusF',   options: ['All','Open','Converted'].map(s => ({ value: s })) },
                    { label: 'Priority', key: 'priorityF', options: ['All','Urgent','Normal','Low'].map(p => ({ value: p })) },
                    { label: 'Type',     key: 'typeF',     options: ['All','Residential','Commercial','Municipal'].map(t => ({ value: t })) },
                  ]}
                  values={{ statusF, priorityF, typeF }}
                  onChange={(key, val) => {
                    if (key === 'statusF') setStatusF(val)
                    else if (key === 'priorityF') setPriorityF(val)
                    else setTypeF(val)
                  }}
                  onReset={() => { setStatusF('All'); setPriorityF('All'); setTypeF('All') }}
                />
                {canCreate && <button onClick={()=>setTab('add')} style={{height:36,padding:'0 16px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:'pointer'}}>+ Add Client</button>}
              </div>
              <p style={{fontSize:12.5,color:'#9ca3af',marginBottom:8}}>{filtered.length} clients</p>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>{['ID','Name','Phone','Email','Address','Type','Balance',''].map(h=>(
                    <th key={h} style={{textAlign:'left',fontSize:11.5,fontWeight:600,color:'#9ca3af',letterSpacing:'0.4px',padding:'9px 14px',borderBottom:'1px solid #f0f1f3',whiteSpace:'nowrap'}}>{h}</th>
                  ))}</tr></thead>
                  <tbody>
                    {filtered.map(c=>(
                      <tr key={c.id} onClick={()=>open(c.id)} style={{borderBottom:'1px solid #f8f9fa',cursor:'pointer'}}
                        onMouseEnter={e=>e.currentTarget.style.background='#fafbff'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{padding:'12px 14px',whiteSpace:'nowrap'}}>
                          <span style={{fontSize:11.5,fontWeight:700,fontFamily:'monospace',background:'#f0f9ff',color:'#0369a1',padding:'3px 8px',borderRadius:5,border:'1px solid #bae6fd',letterSpacing:'0.3px'}}>{c.id}</span>
                        </td>
                        <td style={{padding:'12px 14px',fontWeight:600,color:'#1a1d23',fontSize:13.5,whiteSpace:'nowrap'}}>{c.name}</td>
                        <td style={{padding:'12px 14px',fontSize:13.5,color:'#374151',whiteSpace:'nowrap'}}>{c.phone}</td>
                        <td style={{padding:'12px 14px',fontSize:13,color:'#6b7280'}}>{c.email}</td>
                        <td style={{padding:'12px 14px',fontSize:13,color:'#6b7280',whiteSpace:'nowrap'}}>{c.address}, {c.city}</td>
                        <td style={{padding:'12px 14px'}}><Bdg label={c.type || c.client_type || 'Residential'} map={TYPE_C}/></td>
                        <td style={{padding:'12px 14px',fontSize:13.5,fontWeight:600,color:c.balance>0?'#dc2626':'#9ca3af',whiteSpace:'nowrap'}}>{c.balance>0?`$${c.balance.toLocaleString()}`:'—'}</td>
                        <td style={{padding:'12px 14px'}}>
                          <button onClick={e=>{e.stopPropagation();open(c.id)}} style={{fontSize:12.5,fontWeight:500,color:'#2563eb',background:'#eff6ff',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>View</button>
                        </td>
                      </tr>
                    ))}
                    {!filtered.length&&<tr><td colSpan={8}><div style={{textAlign:'center',padding:'48px 24px'}}>
                      <div style={{width:52,height:52,borderRadius:14,background:'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      </div>
                      <p style={{fontSize:14,fontWeight:600,color:'#374151',margin:'0 0 6px'}}>No clients found</p>
                      <p style={{fontSize:13,color:'#9ca3af',margin:'0 0 16px'}}>Add your first client to get started</p>
                      {canCreate && <button onClick={()=>setTab('add')} style={{height:36,padding:'0 16px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>+ Add Client</button>}
                    </div></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DETAIL - Keep existing detail view as is */}
          {tab==='detail'&&sel&&(
            <div style={{display:'flex',flexDirection:'column',gap:20}}>
              {/* ... Keep all your existing detail view code ... */}
              {/* (The detail view code remains the same) */}
            </div>
          )}

          {/* ADD - Keep existing add form as is */}
          {tab==='add'&&(
            <div style={{maxWidth:800,margin:'0 auto',background:'#fff'}}>
              {/* ... Keep all your existing add form code ... */}
              {/* (The add form code remains the same) */}
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