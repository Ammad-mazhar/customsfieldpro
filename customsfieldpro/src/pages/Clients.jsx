import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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

const WORK_STATUS_C = {
  'New':         {bg:'#eff6ff',color:'#2563eb'},
  'Open':        {bg:'#eff6ff',color:'#2563eb'},
  'Converted':   {bg:'#f0fdf4',color:'#16a34a'},
  'Draft':       {bg:'#f3f4f6',color:'#6b7280'},
  'Sent':        {bg:'#eff6ff',color:'#2563eb'},
  'Approved':    {bg:'#f0fdf4',color:'#16a34a'},
  'Declined':    {bg:'#fef2f2',color:'#dc2626'},
  'Paid':        {bg:'#f0fdf4',color:'#16a34a'},
  'Overdue':     {bg:'#fef2f2',color:'#dc2626'},
  'Scheduled':   {bg:'#ecfeff',color:'#0891b2'},
  'In Progress': {bg:'#eff6ff',color:'#2563eb'},
  'Completed':   {bg:'#f0fdf4',color:'#16a34a'},
  'Cancelled':   {bg:'#fef2f2',color:'#dc2626'},
  'On Hold':     {bg:'#fefce8',color:'#ca8a04'},
}

const TYPE_META = {
  requests: { label:'REQ', bg:'#eff6ff', color:'#2563eb', route:'/requests' },
  quotes:   { label:'QT',  bg:'#faf5ff', color:'#7c3aed', route:'/quotes'   },
  jobs:     { label:'JOB', bg:'#f0fdf4', color:'#16a34a', route:'/jobs'     },
  invoices: { label:'INV', bg:'#fff7ed', color:'#ea580c', route:'/invoices' },
}

function getItemDisplay(item, type) {
  const d = new Date(item.created_at)
  const date = isNaN(d) ? '—' : d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
  const rawStatus = item.status || ''
  const status = rawStatus === 'new' ? 'New' : rawStatus === 'converted' ? 'Converted' : rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)
  const amount = item.total != null ? `$${parseFloat(item.total).toLocaleString()}` : item.subtotal != null ? `$${parseFloat(item.subtotal).toLocaleString()}` : null
  const title = item.title || item.service_type || item.job_number || (item.id ? `#${String(item.id).slice(-6).toUpperCase()}` : '—')
  const subtitle = (type === 'requests' && item.description) ? item.description.slice(0, 70) : ''
  const numTag = item.job_number || item.invoice_number || item.quote_number || (item.id ? String(item.id).slice(-6).toUpperCase() : '—')
  return { date, status, amount, title, subtitle, numTag }
}

export default function Clients() {
  const { isAdmin, hasPermission } = useAuth()
  const navigate = useNavigate()
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
  const [workTab,        setWorkTab]         = useState('requests')
  const [workItems,      setWorkItems]       = useState({ requests: null, quotes: null, jobs: null, invoices: null })
  const [workLoading,    setWorkLoading]     = useState(false)
  const [showCreateForm, setShowCreateForm]  = useState(false)
  const [workForms,      setWorkForms]       = useState({
    requests: { service_type: 'HVAC Service', description: '', priority: 'normal' },
    quotes:   { title: '', notes: '', valid_until: '' },
    jobs:     { title: '', service_type: '', description: '', priority: 'Normal' },
    invoices: { notes: '' },
  })
  const [workSubmitting, setWorkSubmitting]  = useState(false)
  const [workMsg,        setWorkMsg]         = useState({ type: '', text: '' })

  useEffect(() => { loadClients() }, [])

  useEffect(() => {
    if (!sel) return
    setWorkItems({ requests: null, quotes: null, jobs: null, invoices: null })
    setWorkTab('requests')
    setShowCreateForm(false)
  }, [sel?.id])

  useEffect(() => {
    if (!sel || tab !== 'detail') return
    loadWorkItems(workTab, sel.id)
  }, [workTab, sel?.id, tab])

  async function loadClients() {
    try {
      setLoading(true)
      const response = await api.getClients()
      const clientsData = response.data || []
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
      saveClients(mappedClients)
    } catch (error) {
      console.error('Error loading clients:', error)
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

  async function loadWorkItems(type, clientId) {
    if (!clientId) return
    setWorkLoading(true)
    try {
      const methods = { requests: 'getRequests', quotes: 'getQuotes', jobs: 'getJobs', invoices: 'getInvoices' }
      const result = await api[methods[type]]()
      const all = result?.data || []
      const filtered = all.filter(item => item.client_id === clientId || item.clientId === clientId)
      setWorkItems(prev => ({ ...prev, [type]: filtered }))
    } catch { /* silent */ } finally {
      setWorkLoading(false)
    }
  }

  async function submitWorkItem() {
    if (workSubmitting || !sel) return
    setWorkSubmitting(true)
    setWorkMsg({ type: '', text: '' })
    try {
      const f = workForms[workTab]
      if (workTab === 'requests') {
        if (!f.description.trim()) { setWorkMsg({ type: 'error', text: 'Description is required' }); return }
        await api.createRequest({ client_id: sel.id, service_type: f.service_type, description: f.description, priority: f.priority })
      } else if (workTab === 'quotes') {
        if (!f.title.trim()) { setWorkMsg({ type: 'error', text: 'Title is required' }); return }
        await api.createQuote({ client_id: sel.id, title: f.title, notes: f.notes || null, valid_until: f.valid_until || null, subtotal: 0, tax_rate: 0, line_items: [] })
      } else if (workTab === 'jobs') {
        if (!f.title.trim() || !f.service_type) { setWorkMsg({ type: 'error', text: 'Title and service type are required' }); return }
        await api.createJob({ client_id: sel.id, title: f.title, service_type: f.service_type, description: f.description || '', priority: f.priority.toLowerCase(), status: 'new' })
      } else if (workTab === 'invoices') {
        await api.createInvoice({ client_id: sel.id, notes: f.notes || null, subtotal: 0, tax_rate: 0, line_items: [] })
      }
      const label = workTab === 'requests' ? 'Request' : workTab === 'quotes' ? 'Quote' : workTab === 'jobs' ? 'Job' : 'Invoice'
      setShowCreateForm(false)
      setWorkMsg({ type: 'success', text: `${label} created successfully` })
      setTimeout(() => setWorkMsg({ type: '', text: '' }), 3000)
      const blank = {
        requests: { service_type: 'HVAC Service', description: '', priority: 'normal' },
        quotes:   { title: '', notes: '', valid_until: '' },
        jobs:     { title: '', service_type: '', description: '', priority: 'Normal' },
        invoices: { notes: '' },
      }
      setWorkForms(prev => ({ ...prev, [workTab]: blank[workTab] }))
      await loadWorkItems(workTab, sel.id)
    } catch {
      setWorkMsg({ type: 'error', text: 'Failed to create. Please try again.' })
    } finally {
      setWorkSubmitting(false)
    }
  }

  function flash(msg) { setBanner(msg); setTimeout(()=>setBanner(''),3000) }

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    const clientStatus = (c.balance > 0) ? 'Open' : 'Converted'
    const clientPriority = c.priority || 'Normal'
    return (!q || c.name.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q) || c.address?.toLowerCase().includes(q))
      && (typeF==='All' || c.type===typeF || c.client_type===typeF)
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
        client_type: form.type?.toLowerCase(),
        property_type: form.propertyType,
        notes: form.notes.trim(),
        lead_source: form.leadSource,
      }
      const response = await api.createClient(clientData)
      if (response.success && response.data) {
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
      await api.updateClient(sel.id, { notes: noteDraft })
      setClients(prev => prev.map(c => c.id === sel.id ? {...c, notes: noteDraft} : c))
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

          {/* DETAIL */}
          {tab==='detail'&&sel&&(
            <div style={{display:'flex',flexDirection:'column',gap:20}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                <div>
                  <button onClick={()=>setTab('all')} style={{background:'none',border:'none',color:'#6b7280',fontSize:13,cursor:'pointer',padding:0,marginBottom:8}}>← All Clients</button>
                  <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                    <h2 style={{fontSize:22,fontWeight:700,color:'#1a1d23',margin:0}}>{sel.name}</h2>
                    <span style={{fontSize:12,fontWeight:700,fontFamily:'monospace',background:'#f0f9ff',color:'#0369a1',padding:'3px 10px',borderRadius:6,border:'1px solid #bae6fd',letterSpacing:'0.4px'}}>{sel.id}</span>
                    <Bdg label={sel.type || sel.client_type || 'Residential'} map={TYPE_C}/>
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
                  {[['Phone',sel.phone],['Email',sel.email],['Address',`${sel.address || ''}, ${sel.city || ''}, ${sel.state || ''} ${sel.zip || ''}`]].map(([l,v])=>(
                    <div key={l} style={{display:'flex',gap:12,marginBottom:10}}>
                      <span style={{fontSize:12,color:'#9ca3af',fontWeight:500,width:60,flexShrink:0,paddingTop:1}}>{l}</span>
                      <span style={{fontSize:13.5,color:'#374151'}}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={C}>
                  <p style={CT}>Property Details</p>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                    {[['Sq Ft',sel.property?.sqft?sel.property.sqft.toLocaleString():'—'],['Year Built',sel.property?.year||'—'],['Stories',sel.property?.stories||'—']].map(([l,v])=>(
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
                {!sel.equipment?.length?<p style={{color:'#9ca3af',fontSize:13.5,margin:0}}>No equipment on file.</p>:(
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead><tr>{['Equipment Type','Brand','Model','Installed','Next Service'].map(h=>(
                      <th key={h} style={{textAlign:'left',fontSize:11.5,fontWeight:600,color:'#9ca3af',padding:'7px 12px',borderBottom:'1px solid #f0f1f3'}}>{h}</th>
                    ))}</tr></thead>
                    <tbody>{sel.equipment.map((eq,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid #f8f9fa'}}>
                        <td style={TD}><strong>{eq.type}</strong></td>
                        <td style={TD}>{eq.brand}</td>
                        <td style={{...TD,fontFamily:'monospace',fontSize:12.5}}>{eq.model}</td>
                        <td style={TD}>{eq.install_date || eq.installed}</td>
                        <td style={{...TD,color:'#16a34a',fontWeight:600}}>{eq.next_service || eq.nextService}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:16}}>
                <div style={C}>
                  <p style={CT}>Job History</p>
                  {!sel.jobs?.length?<p style={{color:'#9ca3af',fontSize:13.5,margin:0}}>No jobs on record.</p>:(
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead><tr>{['Job #','Type','Status','Date'].map(h=>(
                        <th key={h} style={{textAlign:'left',fontSize:11.5,fontWeight:600,color:'#9ca3af',padding:'7px 12px',borderBottom:'1px solid #f0f1f3'}}>{h}</th>
                      ))}</tr></thead>
                      <tbody>{sel.jobs.map(j=>(
                        <tr key={j.id} style={{borderBottom:'1px solid #f8f9fa'}}>
                          <td style={TD}><span style={{fontFamily:'monospace',fontSize:12,background:'#f3f4f6',padding:'2px 6px',borderRadius:4}}>{j.id}</span></td>
                          <td style={TD}>{j.type}</td>
                          <td style={TD}><Bdg label={j.status} map={JOB_SC}/></td>
                          <td style={{...TD,color:'#9ca3af'}}>{j.date || j.scheduled_date}</td>
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
                  {!sel.invoices?.length?<p style={{color:'#9ca3af',fontSize:13,margin:0}}>No invoices.</p>:sel.invoices.map(inv=>(
                    <div key={inv.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #f8f9fa',gap:6}}>
                      <span style={{fontFamily:'monospace',fontSize:12,color:'#6b7280'}}>{inv.id}</span>
                      <span style={{fontSize:13,fontWeight:600,color:'#1a1d23'}}>{inv.amount || inv.total}</span>
                      <Bdg label={inv.status} map={INV_SC}/>
                    </div>
                  ))}
                </div>
              </div>

              <div style={C}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <p style={{...CT,marginBottom:0}}>Notes</p>
                  {canEdit && (!editNote
                    ?<button onClick={()=>{setNoteDraft(sel.notes||'');setEditNote(true)}} style={{fontSize:12.5,color:'#2563eb',background:'none',border:'none',cursor:'pointer',fontWeight:500}}>Edit Notes</button>
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

              {/* ── Work Overview ───────────────────────────────────────── */}
              <div style={{background:'#fff',border:'1px solid #e8e9ec',borderRadius:10,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',overflow:'hidden'}}>

                {/* Header */}
                <div style={{padding:'14px 20px',borderBottom:'1px solid #f0f1f3',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                  <p style={{...CT,margin:0}}>Work Overview</p>
                  <button
                    onClick={()=>setShowCreateForm(p=>!p)}
                    style={{height:32,padding:'0 14px',background:showCreateForm?'#f3f4f6':'#2563eb',color:showCreateForm?'#374151':'#fff',border:'none',borderRadius:7,fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
                    {showCreateForm ? '✕ Cancel' : `+ New ${workTab.slice(0,-1).charAt(0).toUpperCase()+workTab.slice(0,-1).slice(1)}`}
                  </button>
                </div>

                {/* Tabs */}
                <div style={{display:'flex',borderBottom:'1px solid #e8e9ec',padding:'0 4px'}}>
                  {[
                    {id:'requests',label:'Requests'},
                    {id:'quotes',  label:'Quotes'},
                    {id:'jobs',    label:'Jobs'},
                    {id:'invoices',label:'Invoices'},
                  ].map(t=>(
                    <button key={t.id}
                      onClick={()=>{setWorkTab(t.id);setShowCreateForm(false)}}
                      style={{padding:'10px 16px',fontSize:13,fontWeight:workTab===t.id?600:500,
                        color:workTab===t.id?'#2563eb':'#6b7280',background:'none',border:'none',
                        borderBottom:`2px solid ${workTab===t.id?'#2563eb':'transparent'}`,
                        cursor:'pointer',marginBottom:-1,display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap'}}>
                      {t.label}
                      {workItems[t.id]!==null&&(
                        <span style={{fontSize:11,fontWeight:700,padding:'1px 6px',borderRadius:10,
                          background:workTab===t.id?'#eff6ff':'#f3f4f6',
                          color:workTab===t.id?'#2563eb':'#9ca3af'}}>
                          {workItems[t.id].length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Flash message */}
                {workMsg.text&&(
                  <div style={{margin:'12px 20px 0',background:workMsg.type==='error'?'#fef2f2':'#f0fdf4',
                    border:`1px solid ${workMsg.type==='error'?'#fecaca':'#bbf7d0'}`,
                    color:workMsg.type==='error'?'#dc2626':'#16a34a',
                    borderRadius:8,padding:'9px 14px',fontSize:13,fontWeight:600}}>
                    {workMsg.text}
                  </div>
                )}

                {/* Inline create forms */}
                {showCreateForm&&(
                  <div style={{margin:'14px 20px',padding:16,background:'#f8f9fa',border:'1px solid #e8e9ec',borderRadius:9}}>
                    <p style={{fontSize:12.5,fontWeight:700,color:'#374151',margin:'0 0 12px',textTransform:'uppercase',letterSpacing:'0.4px'}}>
                      New {workTab.slice(0,-1).charAt(0).toUpperCase()+workTab.slice(0,-1).slice(1)}
                    </p>

                    {workTab==='requests'&&(<>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                        <div>
                          <label style={{fontSize:12,fontWeight:600,color:'#6b7280',display:'block',marginBottom:4}}>Service Type</label>
                          <select value={workForms.requests.service_type}
                            onChange={e=>setWorkForms(p=>({...p,requests:{...p.requests,service_type:e.target.value}}))}
                            style={{width:'100%',height:36,border:'1px solid #e8e9ec',borderRadius:7,padding:'0 10px',fontSize:13.5,color:'#374151',background:'#fff'}}>
                            {['HVAC Service','Plumbing','Electrical','Appliance Repair','Roofing','Landscaping','Cleaning','Inspection','Other'].map(s=><option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{fontSize:12,fontWeight:600,color:'#6b7280',display:'block',marginBottom:4}}>Priority</label>
                          <select value={workForms.requests.priority}
                            onChange={e=>setWorkForms(p=>({...p,requests:{...p.requests,priority:e.target.value}}))}
                            style={{width:'100%',height:36,border:'1px solid #e8e9ec',borderRadius:7,padding:'0 10px',fontSize:13.5,color:'#374151',background:'#fff'}}>
                            {['normal','urgent','low'].map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{marginBottom:10}}>
                        <label style={{fontSize:12,fontWeight:600,color:'#6b7280',display:'block',marginBottom:4}}>Description <span style={{color:'#dc2626'}}>*</span></label>
                        <textarea value={workForms.requests.description}
                          onChange={e=>setWorkForms(p=>({...p,requests:{...p.requests,description:e.target.value}}))}
                          placeholder="Describe the service request…" rows={3}
                          style={{width:'100%',boxSizing:'border-box',border:'1px solid #e8e9ec',borderRadius:7,padding:'8px 12px',fontSize:13.5,color:'#374151',resize:'vertical',outline:'none'}}/>
                      </div>
                    </>)}

                    {workTab==='quotes'&&(<>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                        <div>
                          <label style={{fontSize:12,fontWeight:600,color:'#6b7280',display:'block',marginBottom:4}}>Title <span style={{color:'#dc2626'}}>*</span></label>
                          <input value={workForms.quotes.title}
                            onChange={e=>setWorkForms(p=>({...p,quotes:{...p.quotes,title:e.target.value}}))}
                            placeholder="e.g. AC Tune-Up"
                            style={{width:'100%',boxSizing:'border-box',height:36,border:'1px solid #e8e9ec',borderRadius:7,padding:'0 10px',fontSize:13.5,color:'#374151',outline:'none'}}/>
                        </div>
                        <div>
                          <label style={{fontSize:12,fontWeight:600,color:'#6b7280',display:'block',marginBottom:4}}>Valid Until</label>
                          <input type="date" value={workForms.quotes.valid_until}
                            onChange={e=>setWorkForms(p=>({...p,quotes:{...p.quotes,valid_until:e.target.value}}))}
                            style={{width:'100%',boxSizing:'border-box',height:36,border:'1px solid #e8e9ec',borderRadius:7,padding:'0 10px',fontSize:13.5,color:'#374151',outline:'none'}}/>
                        </div>
                      </div>
                      <div style={{marginBottom:10}}>
                        <label style={{fontSize:12,fontWeight:600,color:'#6b7280',display:'block',marginBottom:4}}>Notes</label>
                        <textarea value={workForms.quotes.notes}
                          onChange={e=>setWorkForms(p=>({...p,quotes:{...p.quotes,notes:e.target.value}}))}
                          placeholder="Additional details…" rows={2}
                          style={{width:'100%',boxSizing:'border-box',border:'1px solid #e8e9ec',borderRadius:7,padding:'8px 12px',fontSize:13.5,color:'#374151',resize:'vertical',outline:'none'}}/>
                      </div>
                    </>)}

                    {workTab==='jobs'&&(<>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                        <div>
                          <label style={{fontSize:12,fontWeight:600,color:'#6b7280',display:'block',marginBottom:4}}>Job Title <span style={{color:'#dc2626'}}>*</span></label>
                          <input value={workForms.jobs.title}
                            onChange={e=>setWorkForms(p=>({...p,jobs:{...p.jobs,title:e.target.value}}))}
                            placeholder="e.g. AC Inspection"
                            style={{width:'100%',boxSizing:'border-box',height:36,border:'1px solid #e8e9ec',borderRadius:7,padding:'0 10px',fontSize:13.5,color:'#374151',outline:'none'}}/>
                        </div>
                        <div>
                          <label style={{fontSize:12,fontWeight:600,color:'#6b7280',display:'block',marginBottom:4}}>Service Type <span style={{color:'#dc2626'}}>*</span></label>
                          <select value={workForms.jobs.service_type}
                            onChange={e=>setWorkForms(p=>({...p,jobs:{...p.jobs,service_type:e.target.value}}))}
                            style={{width:'100%',height:36,border:'1px solid #e8e9ec',borderRadius:7,padding:'0 10px',fontSize:13.5,color:'#374151',background:'#fff'}}>
                            <option value="">— Select —</option>
                            {['HVAC','Plumbing','Electrical','Appliance Repair'].map(s=><option key={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                        <div>
                          <label style={{fontSize:12,fontWeight:600,color:'#6b7280',display:'block',marginBottom:4}}>Description</label>
                          <textarea value={workForms.jobs.description}
                            onChange={e=>setWorkForms(p=>({...p,jobs:{...p.jobs,description:e.target.value}}))}
                            placeholder="Job details…" rows={2}
                            style={{width:'100%',boxSizing:'border-box',border:'1px solid #e8e9ec',borderRadius:7,padding:'8px 12px',fontSize:13.5,color:'#374151',resize:'vertical',outline:'none'}}/>
                        </div>
                        <div>
                          <label style={{fontSize:12,fontWeight:600,color:'#6b7280',display:'block',marginBottom:4}}>Priority</label>
                          <select value={workForms.jobs.priority}
                            onChange={e=>setWorkForms(p=>({...p,jobs:{...p.jobs,priority:e.target.value}}))}
                            style={{width:'100%',height:36,border:'1px solid #e8e9ec',borderRadius:7,padding:'0 10px',fontSize:13.5,color:'#374151',background:'#fff'}}>
                            {['Normal','Urgent','Low'].map(p=><option key={p}>{p}</option>)}
                          </select>
                        </div>
                      </div>
                    </>)}

                    {workTab==='invoices'&&(
                      <div style={{marginBottom:10}}>
                        <label style={{fontSize:12,fontWeight:600,color:'#6b7280',display:'block',marginBottom:4}}>Notes</label>
                        <textarea value={workForms.invoices.notes}
                          onChange={e=>setWorkForms(p=>({...p,invoices:{...p.invoices,notes:e.target.value}}))}
                          placeholder="Invoice notes…" rows={2}
                          style={{width:'100%',boxSizing:'border-box',border:'1px solid #e8e9ec',borderRadius:7,padding:'8px 12px',fontSize:13.5,color:'#374151',resize:'vertical',outline:'none'}}/>
                      </div>
                    )}

                    <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:4}}>
                      <button onClick={()=>setShowCreateForm(false)}
                        style={{height:34,padding:'0 14px',background:'#fff',color:'#374151',border:'1px solid #e8e9ec',borderRadius:7,fontSize:13,fontWeight:500,cursor:'pointer'}}>
                        Cancel
                      </button>
                      <button onClick={submitWorkItem} disabled={workSubmitting}
                        style={{height:34,padding:'0 18px',background:'#2563eb',color:'#fff',border:'none',borderRadius:7,fontSize:13,fontWeight:600,cursor:'pointer',opacity:workSubmitting?0.6:1}}>
                        {workSubmitting?'Creating…':`Create ${workTab.slice(0,-1).charAt(0).toUpperCase()+workTab.slice(0,-1).slice(1)}`}
                      </button>
                    </div>
                  </div>
                )}

                {/* Table */}
                {workLoading ? (
                  <div style={{textAlign:'center',padding:'28px 0',color:'#9ca3af',fontSize:13}}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display:'block',margin:'0 auto 8px',animation:'spin 1s linear infinite'}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Loading…
                  </div>
                ) : workItems[workTab] !== null && workItems[workTab].length > 0 ? (
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead>
                        <tr style={{background:'#f8f9fa'}}>
                          {['Type','Title / Description','Date','Status','Amount',''].map(h=>(
                            <th key={h} style={{textAlign:'left',fontSize:11.5,fontWeight:600,color:'#9ca3af',letterSpacing:'0.4px',padding:'9px 14px',borderBottom:'1px solid #f0f1f3',whiteSpace:'nowrap'}}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {workItems[workTab].map((item,i)=>{
                          const d = getItemDisplay(item, workTab)
                          const meta = TYPE_META[workTab]
                          const sc = WORK_STATUS_C[d.status] ?? {bg:'#f3f4f6',color:'#6b7280'}
                          return (
                            <tr key={item.id||i}
                              onMouseEnter={e=>e.currentTarget.style.background='#fafbff'}
                              onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                              style={{borderBottom:'1px solid #f8f9fa',cursor:'default'}}>
                              <td style={{padding:'11px 14px',whiteSpace:'nowrap'}}>
                                <span style={{fontSize:11,fontWeight:700,padding:'2px 7px',borderRadius:5,background:meta.bg,color:meta.color,letterSpacing:'0.3px'}}>
                                  {meta.label}
                                </span>
                              </td>
                              <td style={{padding:'11px 14px',maxWidth:260}}>
                                <p style={{fontSize:13.5,fontWeight:600,color:'#1a1d23',margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                                  {d.numTag&&<span style={{fontFamily:'monospace',fontSize:11,color:'#9ca3af',marginRight:6}}>{d.numTag}</span>}
                                  {d.title}
                                </p>
                                {d.subtitle&&<p style={{fontSize:11.5,color:'#9ca3af',margin:'2px 0 0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{d.subtitle}</p>}
                              </td>
                              <td style={{padding:'11px 14px',fontSize:12.5,color:'#9ca3af',whiteSpace:'nowrap'}}>{d.date}</td>
                              <td style={{padding:'11px 14px',whiteSpace:'nowrap'}}>
                                <span style={{display:'inline-block',fontSize:12,fontWeight:600,padding:'2px 9px',borderRadius:20,background:sc.bg,color:sc.color}}>
                                  {d.status}
                                </span>
                              </td>
                              <td style={{padding:'11px 14px',fontSize:13.5,fontWeight:d.amount?600:400,color:d.amount?'#1a1d23':'#d1d5db',whiteSpace:'nowrap'}}>
                                {d.amount || '—'}
                              </td>
                              <td style={{padding:'11px 14px',whiteSpace:'nowrap'}}>
                                <button
                                  onClick={()=>navigate(meta.route)}
                                  style={{fontSize:12,color:'#2563eb',background:'#eff6ff',border:'none',borderRadius:6,padding:'3px 10px',cursor:'pointer',fontWeight:500}}>
                                  View →
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : workItems[workTab] !== null ? (
                  <div style={{textAlign:'center',padding:'36px 24px',color:'#9ca3af'}}>
                    <div style={{width:44,height:44,borderRadius:12,background:'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                    </div>
                    <p style={{fontSize:13.5,fontWeight:600,color:'#374151',margin:'0 0 4px'}}>No {workTab} yet</p>
                    <p style={{fontSize:13,color:'#9ca3af',margin:'0 0 14px'}}>Click "+ New" above to create one for this client.</p>
                    <button onClick={()=>setShowCreateForm(true)}
                      style={{height:32,padding:'0 16px',background:'#2563eb',color:'#fff',border:'none',borderRadius:7,fontSize:13,fontWeight:600,cursor:'pointer'}}>
                      + New {workTab.slice(0,-1).charAt(0).toUpperCase()+workTab.slice(0,-1).slice(1)}
                    </button>
                  </div>
                ) : null}
              </div>

              {/* ── Google Reviews card ─────────────────────────────────── */}
              {(() => {
                const rrs = getReviewRequestsForClient(sel.id)
                const last = rrs[0] || null
                return (
                  <div style={C}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                      <p style={{...CT,marginBottom:0}}>Google Reviews</p>
                      <button onClick={()=>{setReviewModal(true);setReviewSent(false)}}
                        style={{fontSize:12,fontWeight:600,color:'#fff',background:'#2563eb',border:'none',borderRadius:6,padding:'4px 12px',cursor:'pointer'}}>
                        Send Request
                      </button>
                    </div>
                    {last ? (
                      <div style={{background:'#f8faff',border:'1px solid #dbeafe',borderRadius:8,padding:'12px 14px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                          <div>
                            <p style={{fontSize:12,fontWeight:700,color:'#9ca3af',margin:'0 0 3px',textTransform:'uppercase',letterSpacing:'0.4px'}}>Last Request</p>
                            <p style={{fontSize:13.5,fontWeight:600,color:'#1a1d23',margin:0}}>
                              {new Date(last.sentAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                            </p>
                          </div>
                          <span style={{padding:'2px 10px',borderRadius:20,fontSize:12,fontWeight:600,
                            background: last.status==='clicked' ? '#f0fdf4' : '#eff6ff',
                            color: last.status==='clicked' ? '#16a34a' : '#2563eb'}}>
                            {last.status==='clicked' ? '✓ Clicked' : 'Sent'}
                          </span>
                        </div>
                        <p style={{fontSize:12,color:'#9ca3af',margin:'8px 0 0'}}>
                          {rrs.length} total request{rrs.length!==1?'s':''} sent · via {last.channel?.toUpperCase()}
                        </p>
                      </div>
                    ) : (
                      <p style={{fontSize:13.5,color:'#9ca3af',margin:0}}>No review requests sent yet.</p>
                    )}
                    {sel.reviewOptedOut && (
                      <p style={{fontSize:12,color:'#dc2626',margin:'8px 0 0',fontWeight:600}}>⚠ Client has opted out of review requests.</p>
                    )}
                  </div>
                )
              })()}

              {/* ── Send Review Modal ───────────────────────────────────── */}
              {reviewModal && (
                <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000}}>
                  <div style={{background:'#fff',borderRadius:14,padding:'28px 28px 24px',width:420,maxWidth:'92vw',boxShadow:'0 8px 32px rgba(0,0,0,0.18)'}}>
                    <p style={{fontSize:16,fontWeight:700,color:'#1a1d23',margin:'0 0 4px'}}>Send Google Review Request</p>
                    <p style={{fontSize:13,color:'#9ca3af',margin:'0 0 18px'}}>
                      A review request will be sent to {sel.first_name || sel.name} via SMS{sel.email?' and Email':''}.
                    </p>
                    {reviewSent ? (
                      <div style={{textAlign:'center',padding:'20px 0',color:'#16a34a',fontSize:15,fontWeight:600}}>✓ Review request sent!</div>
                    ) : (
                      <>
                        <div style={{background:'#f8faff',border:'1px solid #dbeafe',borderRadius:8,padding:'12px 14px',marginBottom:18,fontSize:13,color:'#374151',lineHeight:1.6}}>
                          <strong>To:</strong> {sel.name}<br/>
                          {sel.phone && <><strong>SMS:</strong> {sel.phone}<br/></>}
                          {sel.email && <><strong>Email:</strong> {sel.email}<br/></>}
                        </div>
                        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                          <button onClick={()=>setReviewModal(false)}
                            style={{height:36,padding:'0 16px',background:'#f3f4f6',border:'none',borderRadius:8,fontSize:13.5,cursor:'pointer'}}>Cancel</button>
                          <button onClick={()=>{
                            triggerReviewRequest(
                              {id:'manual',clientId:sel.id,clientName:sel.name,clientPhone:sel.phone,clientEmail:sel.email,status:'Completed'},
                              sel, null
                            )
                            setReviewSent(true)
                            setTimeout(()=>setReviewModal(false),2000)
                          }}
                            style={{height:36,padding:'0 18px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:'pointer'}}>
                            Send Now
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ADD */}
          {tab==='add'&&(
            <div style={{maxWidth:800,margin:'0 auto',background:'#fff'}}>
              <style>{`
                .jInp:focus,.jSel:focus{border-color:#16a34a!important;box-shadow:0 0 0 3px rgba(22,163,74,0.12)!important;outline:none!important}
                .jCollBtn{display:flex;align-items:center;justify-content:space-between;width:100%;padding:12px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;text-align:left}
                .jCollBtn:hover{background:#f3f4f6}
              `}</style>

              {/* ── Section 1: Primary Contact Details ─────────────────── */}
              <div style={{display:'flex',gap:40}}>
                <div style={{width:200,flexShrink:0,paddingTop:2}}>
                  <div style={{fontSize:15,fontWeight:700,color:'#111827',marginBottom:8}}>Primary contact details</div>
                  <div style={{fontSize:13,color:'#6b7280',lineHeight:1.6}}>
                    Provide the main point of contact to ensure smooth communication and reliable client records.
                  </div>
                </div>

                <div style={{flex:1,display:'flex',flexDirection:'column',gap:12}}>
                  <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                    <select value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}
                      className="jSel"
                      style={{width:120,flexShrink:0,height:40,border:'1px solid #d1d5db',borderRadius:6,padding:'0 8px',fontSize:14,color:form.title?'#111827':'#9ca3af',background:'#fff',outline:'none'}}>
                      <option value="">No title</option>
                      {['Mr','Mrs','Ms','Miss','Dr','Prof'].map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                    <div style={{flex:1}}>
                      <input className="jInp" placeholder="First name"
                        value={form.firstName}
                        onChange={e=>{setForm(p=>({...p,firstName:e.target.value}));if(errs.firstName)setErrs(p=>({...p,firstName:undefined}))}}
                        style={{width:'100%',boxSizing:'border-box',height:40,border:`1px solid ${errs.firstName?'#dc2626':'#d1d5db'}`,borderRadius:6,padding:'0 12px',fontSize:14,color:'#111827',outline:'none',background:'#fff'}}/>
                      {errs.firstName&&<p style={{fontSize:12,color:'#dc2626',margin:'4px 0 0'}}>{errs.firstName}</p>}
                    </div>
                    <div style={{flex:1}}>
                      <input className="jInp" placeholder="Last name"
                        value={form.lastName} onChange={e=>setForm(p=>({...p,lastName:e.target.value}))}
                        style={{width:'100%',boxSizing:'border-box',height:40,border:'1px solid #d1d5db',borderRadius:6,padding:'0 12px',fontSize:14,color:'#111827',outline:'none',background:'#fff'}}/>
                    </div>
                  </div>

                  <input className="jInp" placeholder="Company name"
                    value={form.companyName}
                    onChange={e=>{setForm(p=>({...p,companyName:e.target.value}));if(errs.firstName)setErrs(p=>({...p,firstName:undefined}))}}
                    style={{width:'100%',boxSizing:'border-box',height:40,border:'1px solid #d1d5db',borderRadius:6,padding:'0 12px',fontSize:14,color:'#111827',outline:'none',background:'#fff'}}/>

                  <div style={{fontSize:14,fontWeight:700,color:'#111827',marginTop:6}}>Communication</div>

                  <div>
                    <input className="jInp" placeholder="Phone number" type="tel"
                      value={form.phone}
                      onChange={e=>{setForm(p=>({...p,phone:e.target.value}));if(errs.phone)setErrs(p=>({...p,phone:undefined}))}}
                      style={{width:'100%',boxSizing:'border-box',height:40,border:`1px solid ${errs.phone?'#dc2626':'#d1d5db'}`,borderRadius:6,padding:'0 12px',fontSize:14,color:'#111827',outline:'none',background:'#fff'}}/>
                    {errs.phone&&<p style={{fontSize:12,color:'#dc2626',margin:'4px 0 0'}}>{errs.phone}</p>}
                  </div>

                  <div>
                    <input className="jInp" placeholder="Email" type="email"
                      value={form.email}
                      onChange={e=>{setForm(p=>({...p,email:e.target.value}));if(errs.email)setErrs(p=>({...p,email:undefined}))}}
                      style={{width:'100%',boxSizing:'border-box',height:40,border:`1px solid ${errs.email?'#dc2626':'#d1d5db'}`,borderRadius:6,padding:'0 12px',fontSize:14,color:'#111827',outline:'none',background:'#fff'}}/>
                    {errs.email&&<p style={{fontSize:12,color:'#dc2626',margin:'4px 0 0'}}>{errs.email}</p>}
                  </div>

                  <div style={{fontSize:14,fontWeight:700,color:'#111827',marginTop:6}}>Lead information</div>

                  <select className="jSel" value={form.leadSource} onChange={e=>setForm(p=>({...p,leadSource:e.target.value}))}
                    style={{width:'100%',height:40,border:'1px solid #d1d5db',borderRadius:6,padding:'0 12px',fontSize:14,color:form.leadSource?'#111827':'#9ca3af',background:'#fff',outline:'none'}}>
                    <option value="">Lead source</option>
                    {['Website','Phone call','Referral','Walk-in','Social media','Google','Other'].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>

                  <button className="jCollBtn" onClick={()=>setAddlOpen(o=>!o)} style={{marginTop:4}}>
                    <span style={{fontSize:14,fontWeight:600,color:'#374151'}}>Additional client details</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{transform:addlOpen?'rotate(180deg)':'none',transition:'transform 0.2s',flexShrink:0}}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  {addlOpen&&(
                    <div style={{border:'1px solid #e5e7eb',borderTop:'none',borderRadius:'0 0 6px 6px',padding:16,display:'flex',flexDirection:'column',gap:14,marginTop:-12}}>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:'#6b7280',marginBottom:8}}>Client type</div>
                        <div style={{display:'flex',border:'1px solid #d1d5db',borderRadius:6,overflow:'hidden'}}>
                          {['Residential','Commercial'].map(t=>(
                            <button key={t} onClick={()=>setForm(p=>({...p,type:t}))}
                              style={{flex:1,padding:'9px 0',fontSize:13.5,fontWeight:500,border:'none',cursor:'pointer',
                                background:form.type===t?'#16a34a':'#fff',color:form.type===t?'#fff':'#374151'}}>
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:'#6b7280',marginBottom:5}}>Date of birth <span style={{fontWeight:400,color:'#9ca3af'}}>(optional)</span></div>
                        <input className="jInp" type="date" value={form.dob} onChange={e=>setForm(p=>({...p,dob:e.target.value}))}
                          style={{width:'100%',boxSizing:'border-box',height:40,border:'1px solid #d1d5db',borderRadius:6,padding:'0 12px',fontSize:14,color:'#111827',outline:'none',background:'#fff'}}/>
                      </div>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:'#6b7280',marginBottom:5}}>Notes</div>
                        <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={3}
                          placeholder="Internal notes, preferences, access codes…"
                          className="jInp"
                          style={{width:'100%',boxSizing:'border-box',border:'1px solid #d1d5db',borderRadius:6,padding:'10px 12px',fontSize:14,color:'#111827',resize:'vertical',outline:'none',background:'#fff',height:'auto'}}/>
                      </div>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:'#6b7280',marginBottom:5}}>Tags</div>
                        <div style={{display:'flex',gap:8}}>
                          <input className="jInp" placeholder="Add a tag" value={tagInput} onChange={e=>setTagInput(e.target.value)}
                            onKeyDown={e=>{if(e.key==='Enter'&&tagInput.trim()){setForm(p=>({...p,tags:[...(p.tags||[]),tagInput.trim()]}));setTagInput('')}}}
                            style={{flex:1,height:40,border:'1px solid #d1d5db',borderRadius:6,padding:'0 12px',fontSize:14,color:'#111827',outline:'none',background:'#fff'}}/>
                          <button onClick={()=>{if(tagInput.trim()){setForm(p=>({...p,tags:[...(p.tags||[]),tagInput.trim()]}));setTagInput('')}}}
                            style={{height:40,padding:'0 16px',background:'#f3f4f6',border:'1px solid #d1d5db',borderRadius:6,fontSize:13.5,color:'#374151',cursor:'pointer',fontWeight:500}}>Add</button>
                        </div>
                        {(form.tags||[]).length>0&&(
                          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}>
                            {(form.tags||[]).map((tag,i)=>(
                              <span key={i} style={{display:'flex',alignItems:'center',gap:4,background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0',borderRadius:20,padding:'3px 10px',fontSize:12.5,fontWeight:500}}>
                                {tag}
                                <button onClick={()=>setForm(p=>({...p,tags:p.tags.filter((_,j)=>j!==i)}))}
                                  style={{background:'none',border:'none',color:'#16a34a',cursor:'pointer',fontSize:14,lineHeight:1,padding:0,marginLeft:2}}>×</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <button className="jCollBtn" onClick={()=>setAddContactsOpen(o=>!o)}>
                    <span style={{fontSize:14,fontWeight:600,color:'#374151'}}>Additional contacts</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{transform:addContactsOpen?'rotate(180deg)':'none',transition:'transform 0.2s',flexShrink:0}}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  {addContactsOpen&&(
                    <div style={{border:'1px solid #e5e7eb',borderTop:'none',borderRadius:'0 0 6px 6px',padding:16,display:'flex',flexDirection:'column',gap:14,marginTop:-12}}>
                      {addlContacts.map((c,i)=>(
                        <div key={i} style={{padding:14,background:'#f9fafb',borderRadius:6,border:'1px solid #e5e7eb',display:'flex',flexDirection:'column',gap:10}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            <span style={{fontSize:13.5,fontWeight:600,color:'#374151'}}>Contact {i+1}</span>
                            <button onClick={()=>setAddlContacts(p=>p.filter((_,j)=>j!==i))} style={{fontSize:12,color:'#dc2626',background:'none',border:'none',cursor:'pointer',fontWeight:600}}>Remove</button>
                          </div>
                          <div style={{display:'flex',gap:10}}>
                            <select value={c.title} onChange={e=>setAddlContacts(p=>p.map((x,j)=>j===i?{...x,title:e.target.value}:x))}
                              className="jSel" style={{width:110,height:40,border:'1px solid #d1d5db',borderRadius:6,padding:'0 8px',fontSize:13.5,background:'#fff',outline:'none',flexShrink:0}}>
                              {['No title','Mr','Mrs','Ms','Miss','Dr','Prof'].map(t=><option key={t}>{t}</option>)}
                            </select>
                            <input placeholder="First name" value={c.firstName} onChange={e=>setAddlContacts(p=>p.map((x,j)=>j===i?{...x,firstName:e.target.value}:x))}
                              className="jInp" style={{flex:1,height:40,border:'1px solid #d1d5db',borderRadius:6,padding:'0 12px',fontSize:13.5,outline:'none',background:'#fff',boxSizing:'border-box'}}/>
                            <input placeholder="Last name" value={c.lastName} onChange={e=>setAddlContacts(p=>p.map((x,j)=>j===i?{...x,lastName:e.target.value}:x))}
                              className="jInp" style={{flex:1,height:40,border:'1px solid #d1d5db',borderRadius:6,padding:'0 12px',fontSize:13.5,outline:'none',background:'#fff',boxSizing:'border-box'}}/>
                          </div>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                            <input placeholder="Phone" value={c.phone} onChange={e=>setAddlContacts(p=>p.map((x,j)=>j===i?{...x,phone:e.target.value}:x))}
                              className="jInp" style={{width:'100%',boxSizing:'border-box',height:40,border:'1px solid #d1d5db',borderRadius:6,padding:'0 12px',fontSize:13.5,outline:'none',background:'#fff'}}/>
                            <input placeholder="Email" value={c.email} onChange={e=>setAddlContacts(p=>p.map((x,j)=>j===i?{...x,email:e.target.value}:x))}
                              className="jInp" style={{width:'100%',boxSizing:'border-box',height:40,border:'1px solid #d1d5db',borderRadius:6,padding:'0 12px',fontSize:13.5,outline:'none',background:'#fff'}}/>
                          </div>
                          <input placeholder="Relationship (e.g. Spouse, Manager)" value={c.relationship} onChange={e=>setAddlContacts(p=>p.map((x,j)=>j===i?{...x,relationship:e.target.value}:x))}
                            className="jInp" style={{width:'100%',boxSizing:'border-box',height:40,border:'1px solid #d1d5db',borderRadius:6,padding:'0 12px',fontSize:13.5,outline:'none',background:'#fff'}}/>
                        </div>
                      ))}
                      <button onClick={()=>setAddlContacts(p=>[...p,{title:'',firstName:'',lastName:'',phone:'',email:'',relationship:''}])}
                        style={{height:38,border:'1px dashed #d1d5db',background:'#fff',borderRadius:6,fontSize:13.5,color:'#374151',cursor:'pointer',fontWeight:500}}>
                        + {addlContacts.length===0?'Add contact':'Add another contact'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{height:1,background:'#e5e7eb',margin:'32px 0'}}/>

              {/* ── Section 2: Property Address ────────────────────────── */}
              <div style={{display:'flex',gap:40}}>
                <div style={{width:200,flexShrink:0,paddingTop:2}}>
                  <div style={{fontSize:15,fontWeight:700,color:'#111827',marginBottom:8}}>Property address</div>
                  <div style={{fontSize:13,color:'#6b7280',lineHeight:1.6}}>
                    Enter the primary service address, billing address, or any additional locations where services may take place.
                  </div>
                  <button style={{marginTop:16,height:34,padding:'0 12px',background:'#fff',color:'#16a34a',border:'1px solid #16a34a',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
                    + Add Another Address
                  </button>
                </div>

                <div style={{flex:1,display:'flex',flexDirection:'column',gap:12}}>
                  <AddressAutocomplete
                    value={form.address}
                    error={!!errs.address}
                    placeholder="Street 1"
                    onChange={fields=>setForm(p=>({
                      ...p,
                      ...(fields.address!==undefined?{address:fields.address}:{}),
                      ...(fields.city ?{city:fields.city}  :{}),
                      ...(fields.state?{state:fields.state}:{}),
                      ...(fields.zip  ?{zip:fields.zip}    :{}),
                      ...(fields.lat  ?{lat:fields.lat}    :{}),
                      ...(fields.lng  ?{lng:fields.lng}    :{}),
                    }))}
                  />

                  <input className="jInp" placeholder="Street 2 (optional)"
                    value={form.street2} onChange={e=>setForm(p=>({...p,street2:e.target.value}))}
                    style={{width:'100%',boxSizing:'border-box',height:40,border:'1px solid #d1d5db',borderRadius:6,padding:'0 12px',fontSize:14,color:'#111827',outline:'none',background:'#fff'}}/>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <input className="jInp" placeholder="City"
                      value={form.city} onChange={e=>setForm(p=>({...p,city:e.target.value}))}
                      style={{width:'100%',boxSizing:'border-box',height:40,border:'1px solid #d1d5db',borderRadius:6,padding:'0 12px',fontSize:14,color:'#111827',outline:'none',background:'#fff'}}/>
                    <input className="jInp" placeholder="State"
                      value={form.state} onChange={e=>setForm(p=>({...p,state:e.target.value}))}
                      style={{width:'100%',boxSizing:'border-box',height:40,border:'1px solid #d1d5db',borderRadius:6,padding:'0 12px',fontSize:14,color:'#111827',outline:'none',background:'#fff'}}/>
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div>
                      <input className="jInp" placeholder="ZIP code"
                        value={form.zip}
                        onChange={e=>{setForm(p=>({...p,zip:e.target.value}));if(errs.zip)setErrs(p=>({...p,zip:undefined}))}}
                        style={{width:'100%',boxSizing:'border-box',height:40,border:`1px solid ${errs.zip?'#dc2626':'#d1d5db'}`,borderRadius:6,padding:'0 12px',fontSize:14,color:'#111827',outline:'none',background:'#fff'}}/>
                      {errs.zip&&<p style={{fontSize:12,color:'#dc2626',margin:'4px 0 0'}}>{errs.zip}</p>}
                    </div>
                    <select className="jSel" value={form.country} onChange={e=>setForm(p=>({...p,country:e.target.value}))}
                      style={{width:'100%',height:40,border:'1px solid #d1d5db',borderRadius:6,padding:'0 12px',fontSize:14,color:form.country?'#111827':'#9ca3af',background:'#fff',outline:'none'}}>
                      <option value="">Select a country</option>
                      {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <select className="jSel"
                    style={{width:'100%',height:40,border:'1px solid #d1d5db',borderRadius:6,padding:'0 12px',fontSize:14,color:'#9ca3af',background:'#fff',outline:'none'}}>
                    <option>No tax rate created</option>
                  </select>

                  <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',fontSize:14,color:'#374151',userSelect:'none'}}>
                    <input type="checkbox" checked={form.billingAddressSame} onChange={e=>setForm(p=>({...p,billingAddressSame:e.target.checked}))}
                      style={{width:16,height:16,accentColor:'#16a34a',cursor:'pointer',flexShrink:0}}/>
                    Billing address is the same as property address
                  </label>

                  <button className="jCollBtn" onClick={()=>setPropDetailsOpen(o=>!o)} style={{marginTop:4}}>
                    <span style={{fontSize:14,fontWeight:600,color:'#374151'}}>Property details</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{transform:propDetailsOpen?'rotate(180deg)':'none',transition:'transform 0.2s',flexShrink:0}}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  {propDetailsOpen&&(
                    <div style={{border:'1px solid #e5e7eb',borderTop:'none',borderRadius:'0 0 6px 6px',padding:16,display:'flex',flexDirection:'column',gap:14,marginTop:-12}}>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:'#6b7280',marginBottom:8}}>Property type</div>
                        <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                          {['Single family','Condo','Apartment','Commercial','Other'].map(t=>(
                            <button key={t} onClick={()=>setForm(p=>({...p,propertyType:t}))}
                              style={{height:34,padding:'0 14px',border:`1px solid ${form.propertyType===t?'#16a34a':'#d1d5db'}`,borderRadius:6,fontSize:13.5,fontWeight:500,cursor:'pointer',
                                background:form.propertyType===t?'#f0fdf4':'#fff',color:form.propertyType===t?'#16a34a':'#374151'}}>
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:'#6b7280',marginBottom:8}}>Property size</div>
                        <div style={{display:'flex',border:'1px solid #d1d5db',borderRadius:6,overflow:'hidden'}}>
                          {['Small','Medium','Large'].map(s=>(
                            <button key={s} onClick={()=>setForm(p=>({...p,propertySize:s}))}
                              style={{flex:1,padding:'9px 0',fontSize:13.5,fontWeight:500,border:'none',cursor:'pointer',
                                background:form.propertySize===s?'#16a34a':'#fff',color:form.propertySize===s?'#fff':'#374151'}}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:'#6b7280',marginBottom:5}}>Year built</div>
                        <input className="jInp" placeholder="e.g. 1995" type="number" value={form.yearBuilt} onChange={e=>setForm(p=>({...p,yearBuilt:e.target.value}))}
                          style={{width:'100%',boxSizing:'border-box',height:40,border:'1px solid #d1d5db',borderRadius:6,padding:'0 12px',fontSize:14,color:'#111827',outline:'none',background:'#fff'}}/>
                      </div>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:'#6b7280',marginBottom:5}}>Access notes</div>
                        <textarea value={form.accessNotes} onChange={e=>setForm(p=>({...p,accessNotes:e.target.value}))} rows={2}
                          placeholder="Gate codes, parking info, dogs, key lockbox…"
                          className="jInp"
                          style={{width:'100%',boxSizing:'border-box',border:'1px solid #d1d5db',borderRadius:6,padding:'10px 12px',fontSize:14,color:'#111827',resize:'vertical',outline:'none',background:'#fff',height:'auto'}}/>
                      </div>
                    </div>
                  )}

                  <button className="jCollBtn" onClick={()=>setPropContactsOpen(o=>!o)}>
                    <span style={{fontSize:14,fontWeight:600,color:'#374151'}}>Property contacts</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{transform:propContactsOpen?'rotate(180deg)':'none',transition:'transform 0.2s',flexShrink:0}}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  {propContactsOpen&&(
                    <div style={{border:'1px solid #e5e7eb',borderTop:'none',borderRadius:'0 0 6px 6px',padding:16,display:'flex',flexDirection:'column',gap:12,marginTop:-12}}>
                      <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',fontSize:14,color:'#374151',userSelect:'none'}}>
                        <input type="checkbox" checked={!!form.hasDiffPropertyContact} onChange={e=>setForm(p=>({...p,hasDiffPropertyContact:e.target.checked}))}
                          style={{width:16,height:16,accentColor:'#16a34a',cursor:'pointer',flexShrink:0}}/>
                        Property contact is different from primary contact
                      </label>
                      {form.hasDiffPropertyContact&&(
                        <div style={{display:'flex',flexDirection:'column',gap:12,paddingTop:4}}>
                          <input className="jInp" placeholder="Contact name"
                            value={form.propContactName} onChange={e=>setForm(p=>({...p,propContactName:e.target.value}))}
                            style={{width:'100%',boxSizing:'border-box',height:40,border:'1px solid #d1d5db',borderRadius:6,padding:'0 12px',fontSize:14,color:'#111827',outline:'none',background:'#fff'}}/>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                            <input className="jInp" placeholder="Phone"
                              value={form.propContactPhone} onChange={e=>setForm(p=>({...p,propContactPhone:e.target.value}))}
                              style={{width:'100%',boxSizing:'border-box',height:40,border:'1px solid #d1d5db',borderRadius:6,padding:'0 12px',fontSize:14,color:'#111827',outline:'none',background:'#fff'}}/>
                            <input className="jInp" placeholder="Email"
                              value={form.propContactEmail} onChange={e=>setForm(p=>({...p,propContactEmail:e.target.value}))}
                              style={{width:'100%',boxSizing:'border-box',height:40,border:'1px solid #d1d5db',borderRadius:6,padding:'0 12px',fontSize:14,color:'#111827',outline:'none',background:'#fff'}}/>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Bottom Action Bar ── */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:10,marginTop:40,paddingTop:20,borderTop:'1px solid #e5e7eb'}}>
                <button onClick={()=>{resetAddForm();setTab('all')}}
                  style={{height:40,padding:'0 20px',background:'none',border:'none',color:'#374151',fontSize:14,fontWeight:500,cursor:'pointer'}}>
                  Cancel
                </button>
                <button onClick={()=>submit(true)}
                  style={{height:40,padding:'0 20px',background:'#fff',color:'#16a34a',border:'1px solid #16a34a',borderRadius:7,fontSize:14,fontWeight:600,cursor:'pointer'}}>
                  Save and Create Another
                </button>
                <button onClick={()=>submit(false)}
                  style={{height:40,padding:'0 24px',background:'#16a34a',color:'#fff',border:'none',borderRadius:7,fontSize:14,fontWeight:600,cursor:'pointer'}}>
                  Save client
                </button>
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
