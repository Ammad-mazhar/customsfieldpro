import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getJobs, saveJobs, saveJob, getClients, saveInvoice, getInvoices, getSettings, saveQuote, getQuotes, clientDisplayName } from '../data/store'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/apiClient'
import { api } from '../services/api'
import { getNextNumber, peekNextNumber, formatJobNumber, formatInvoiceNumber, formatQuoteNumber } from '../utils/numberGenerator'
import { useAuth } from '../auth/AuthContext'
import { logActivity, ACTIONS } from '../utils/activityLog'
import { createNotification, notifyAdmins, NOTIF_TYPES } from '../utils/notifications'
import { sendJobAssignedEmail, sendJobCompletionEmail } from '../utils/emailService'
import { useIsMobile } from '../utils/useIsMobile'
import { JOB_STATUSES as PIPELINE_STATUSES, getStatusDef, normalizeStatus, statusLabel } from '../data/jobStatuses'
import DiagnosisReport from '../components/DiagnosisReport'
import PartsRequired from '../components/PartsRequired'
import PartsReceived from '../components/PartsReceived'
import JobCompletion from '../components/JobCompletion'
import QuickNote from '../components/QuickNote'
import FilterDropdown from '../components/FilterDropdown'
import AIEstimator from '../components/AIEstimator'
import { isAIEnabled } from '../utils/aiEstimator'
import AddressAutocomplete from '../components/AddressAutocomplete'
import { findClosestTechnician, getTechLocationsArray } from '../utils/routeOptimizer'
import { triggerReviewRequest } from '../utils/reviewRequests'
import { getTechColor } from '../utils/techColors'

// ── Closest Tech Button ───────────────────────────────────────────────────────
function ClosestTechButton({ jobAddress, techs, onSelect }) {
  const [result, setResult] = useState(null)
  const [open, setOpen]     = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleFind() {
    setLoading(true)
    const locs = getTechLocationsArray()
    // Map locs to techs by id
    const techsWithLoc = techs.map(t => {
      const loc = locs.find(l => l.id === t.id)
      return loc ? { ...t, lat: loc.lat, lng: loc.lng } : null
    }).filter(Boolean)

    if (!techsWithLoc.length) {
      setResult({ error: 'No technician locations available. Technicians must have the Scheduler page open to share their location.' })
      setOpen(true)
      setLoading(false)
      return
    }

    // We need lat/lng for the job address — for now use the first tech as reference
    // In practice you'd geocode jobAddress; here we compare tech-to-tech distances
    // or use the mock data from customsfieldpro_tech_locations
    const closest = findClosestTechnician(techsWithLoc[0], techsWithLoc.slice(1).concat([techsWithLoc[0]]))
    // Actually find closest tech to job — use first available tech location as approximation
    // Real implementation would geocode jobAddress first
    const sorted = techsWithLoc.map(t => ({
      ...t,
      dist: Math.sqrt(Math.pow(t.lat - (techsWithLoc[0].lat || 38.84), 2) + Math.pow(t.lng - (techsWithLoc[0].lng || -77.43), 2))
    })).sort((a, b) => a.dist - b.dist)

    setResult({ tech: sorted[0], allTechs: techsWithLoc })
    setOpen(true)
    setLoading(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={handleFind}
        disabled={loading}
        title="Find closest available technician"
        style={{
          height: 38, width: 38, flexShrink: 0, border: '1px solid #bfdbfe', borderRadius: 7,
          background: '#eff6ff', color: '#2563eb', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        {loading
          ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          : <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3" strokeLinecap="round"/></svg>
        }
      </button>
      {open && result && (
        <div style={{
          position: 'absolute', top: 42, right: 0, zIndex: 200, background: '#fff',
          border: '1px solid #e8e9ec', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          padding: 16, minWidth: 240,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Closest Technician</p>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
          {result.error ? (
            <p style={{ fontSize: 12.5, color: '#dc2626', margin: 0 }}>{result.error}</p>
          ) : (
            <>
              {result.allTechs.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f1f3' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.color || '#2563eb', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#374151', fontWeight: t.id === result.tech?.id ? 700 : 400 }}>{t.name}</span>
                    {t.id === result.tech?.id && <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>Closest</span>}
                  </div>
                  <button
                    onClick={() => { onSelect(t); setOpen(false) }}
                    style={{ fontSize: 12, padding: '3px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Assign
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SC = {
  'New':         { bg: '#f0f9ff', color: '#0369a1' },
  'In Progress': { bg: '#eff6ff', color: '#2563eb' },
  'Scheduled':   { bg: '#ecfeff', color: '#0891b2' },
  'On Hold':     { bg: '#fefce8', color: '#ca8a04' },
  'Completed':   { bg: '#f0fdf4', color: '#16a34a' },
  'Cancelled':   { bg: '#fef2f2', color: '#dc2626' },
}
const STATUSES      = ['All', 'New', 'In Progress', 'Scheduled', 'On Hold', 'Completed', 'Cancelled']
const JOB_STATUSES  = ['New', 'Scheduled', 'In Progress', 'On Hold', 'Completed', 'Cancelled']
const JOB_TYPES     = ['HVAC', 'Plumbing', 'Electrical', 'Appliance Repair']
const RECURRENCES   = ['One-time', 'Daily', 'Weekly', 'Monthly']
const WARRANTIES    = ['Under Warranty', 'Out of Warranty', 'Unknown']
const PRIORITIES    = ['Low', 'Normal', 'High', 'Urgent']
const EQUIPMENT_TYPES = [
  'Microwave', 'Refrigerator', 'Oven', 'Stove & Cooktop',
  'Dryer', 'Washer', 'Dishwasher', 'HVAC & Furnace',
  'Garbage Disposal', 'Water Heater',
]

function blankForm() {
  return {
    clientId: '', clientAddress: '', clientPhone: '',
    jobNumber: formatJobNumber(peekNextNumber('jobs')),
    linkedRequestId: '', linkedQuoteId: '',
    title: '', type: '', description: '', internalNotes: '', claimNumber: '',
    techName: '', technicianId: '', startDate: '', startTime: '', endTime: '', duration: '', recurrence: 'One-time',
    equipment: [], equipBrand: '', equipModel: '', equipSerial: '',
    warrantyStatus: 'Unknown', lastServiceDate: '',
    lineItems: [{ id: Date.now(), description: '', qty: 1, unit: 0, total: 0 }],
    taxRate: 0,
    status: 'New', priority: 'Normal', completionNotes: '',
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

function Bdg({ label, map }) {
  const c = map[label] ?? { bg: '#f3f4f6', color: '#6b7280' }
  return <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: c.bg, color: c.color }}>{label}</span>
}

function PriorityBadge({ priority }) {
  const colors = { Low: ['#f3f4f6','#6b7280'], Normal: ['#eff6ff','#2563eb'], High: ['#fffbeb','#d97706'], Urgent: ['#fef2f2','#dc2626'] }
  const [bg, color] = colors[priority] || ['#f3f4f6', '#6b7280']
  return <span style={{ display: 'inline-block', fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: bg, color }}>{priority}</span>
}

function Tabs({ tabs, active, onSelect }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid #e8e9ec', flexShrink: 0 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => t.enabled !== false && onSelect(t.id)}
          style={{ padding: '11px 20px', fontSize: 13.5, fontWeight: active === t.id ? 600 : 500,
            color: active === t.id ? '#2563eb' : t.enabled === false ? '#c4c9d4' : '#6b7280',
            background: 'none', border: 'none', borderBottom: `2px solid ${active === t.id ? '#2563eb' : 'transparent'}`,
            cursor: t.enabled === false ? 'default' : 'pointer', marginBottom: -1, whiteSpace: 'nowrap' }}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

function SectionHead({ title }) {
  return <p style={{ fontSize: 11.5, fontWeight: 700, color: '#9ca3af', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: '1px solid #f0f1f3', paddingBottom: 10 }}>{title}</p>
}

function Req() { return <span style={{ color: '#dc2626' }}> *</span> }

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Jobs() {
  const navigate = useNavigate()
  const { user, isAdmin, hasPermission } = useAuth()
  const isMobile = useIsMobile()
  const [allJobs, setAllJobs] = useState(() => getJobs())
  // Filter: admins + staff with view_all_jobs see everything; others see own jobs only
  const jobs = (isAdmin || hasPermission('view_all_jobs'))
    ? allJobs
    : allJobs.filter(j => j.technicianId === user?.technicianId)
  function setJobs(newArr) { setAllJobs(newArr) }
  const [clients, setClients] = useState(() => getClients())
  const [settings]            = useState(() => getSettings())
  const [techs]               = useState(() => settings.technicians)
  const [tab, setTab]         = useState('all')
  const [selId, setSelId]     = useState(null)
  const [statusF, setStatusF]   = useState('All')
  const [typeF, setTypeF]       = useState('All')
  const [priorityF, setPriorityF] = useState('All')
  const [form, setForm]       = useState(blankForm)
  const [errs, setErrs]       = useState({})
  const [errList, setErrList] = useState([])
  const [banner, setBanner]   = useState('')
  const [bannerType, setBannerType] = useState('success')
  const [pendingStatus, setPendingStatus]   = useState('')
  const [pendingPriority, setPendingPriority] = useState('')
  const [showCompletion, setShowCompletion] = useState(false)
  const [showAIEstimator, setShowAIEstimator] = useState(false)
  const [invToast, setInvToast]             = useState(null)   // { id, clientName }
  const [showDiagnosis, setShowDiagnosis]   = useState(false)
  const [showPartsRequired, setShowPartsRequired] = useState(false)
  const [showPartsReceived, setShowPartsReceived] = useState(false)
  const [showOverride, setShowOverride]     = useState(false)
  const [overrideStatus, setOverrideStatus] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [newClientForm, setNewClientForm]   = useState({ firstName: '', lastName: '', email: '', phone: '', address: '' })
  const [linkedRequests, setLinkedRequests] = useState([])
  const [linkedQuotes, setLinkedQuotes]     = useState([])

  useEffect(() => {
    apiGet('/api/jobs').then(data => {
      if (Array.isArray(data)) { setAllJobs(data); saveJobs(data) }
    }).catch(() => {})
    api.getClients().then(res => {
      const list = res?.data || res || []
      if (Array.isArray(list) && list.length > 0) setClients(list)
    }).catch(() => {})
    api.getRequests().then(res => {
      setLinkedRequests((res?.data || []).map(r => ({
        id: r.id,
        clientId: r.client_id || '',
        type: r.service_type || '',
        description: r.description || '',
        clientName: r.clients ? [r.clients.first_name, r.clients.last_name].filter(Boolean).join(' ') || r.clients.email || '' : '',
        status: r.status || '',
      })))
    }).catch(() => {})
    api.getQuotes().then(res => {
      setLinkedQuotes((res?.data || []).map(q => ({
        id: q.id,
        clientId: q.client_id || '',
        type: q.title || '',
        description: q.description || '',
      })))
    }).catch(() => {})
  }, [])

  const sel = jobs.find(j => j.id === selId)

  const tabs = [
    { id: 'all',    label: isAdmin ? 'All Jobs' : 'My Jobs' },
    { id: 'detail', label: sel ? `Job Detail (${sel.id})` : 'Job Detail', enabled: !!sel },
    ...((isAdmin || hasPermission('create_jobs')) ? [{ id: 'create', label: 'Create Job' }] : []),
  ]

  function openCreate() { setForm(blankForm()); setErrs({}); setErrList([]); setTab('create') }

  // Keyboard shortcut: Ctrl+N opens create form; Escape closes modals
  useEffect(() => {
    const flag = sessionStorage.getItem('customsfieldpro_open_new')
    if (flag === 'job') { sessionStorage.removeItem('customsfieldpro_open_new'); openCreate() }
    function onEscape() { setShowAIEstimator(false); setShowCompletion(false) }
    window.addEventListener('customsfieldpro:escape', onEscape)
    return () => window.removeEventListener('customsfieldpro:escape', onEscape)
  }, [])

  function open(id) {
    const j = jobs.find(x => x.id === id)
    setSelId(id); setPendingStatus(j?.status || ''); setPendingPriority(j?.priority || 'Normal'); setTab('detail')
  }

  function flash(msg, type = 'success') {
    setBanner(msg); setBannerType(type); setTimeout(() => setBanner(''), 3500)
  }

  function updateJobs(newArr) { setJobs(newArr); saveJobs(newArr) }

  const visible = jobs.filter(j =>
    (statusF === 'All' || j.status === statusF) &&
    (typeF === 'All' || j.type === typeF) &&
    (priorityF === 'All' || (j.priority || 'Normal') === priorityF)
  )

  // ── Form helpers ───────────────────────────────────────────────────────────
  function set(f, v) { setForm(p => ({ ...p, [f]: v })); setErrs(p => ({ ...p, [f]: undefined })) }

  function inpStyle(f) {
    return { width: '100%', boxSizing: 'border-box', height: 38, border: `1px solid ${errs[f] ? '#dc2626' : '#e8e9ec'}`, borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#374151', outline: 'none', background: '#fff' }
  }

  function selStyle(f) {
    return { width: '100%', height: 38, border: `1px solid ${errs[f] ? '#dc2626' : '#e8e9ec'}`, borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#374151', background: '#fff' }
  }

  function handleClientChange(clientId) {
    if (clientId === '__new__') {
      setForm(p => ({ ...p, clientId: '__new__', clientAddress: '', clientPhone: '' }))
      setErrs(p => ({ ...p, clientId: undefined }))
      return
    }
    const c = clients.find(x => String(x.id) === clientId)
    setForm(p => ({
      ...p, clientId,
      clientAddress: c ? [c.address, c.city, c.state].filter(Boolean).join(', ') : '',
      clientPhone: c?.phone || '',
    }))
    setErrs(p => ({ ...p, clientId: undefined }))
  }

  function handleTimeChange(f, v) {
    setForm(p => {
      const updated = { ...p, [f]: v }
      updated.duration = calcDuration(
        f === 'startTime' ? v : p.startTime,
        f === 'endTime'   ? v : p.endTime
      )
      return updated
    })
    setErrs(p => ({ ...p, [f]: undefined, endTime: undefined }))
  }

  function toggleEquipment(item) {
    setForm(p => ({
      ...p,
      equipment: p.equipment.includes(item) ? p.equipment.filter(e => e !== item) : [...p.equipment, item],
    }))
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

  function addLineItem() {
    setForm(p => ({ ...p, lineItems: [...p.lineItems, { id: Date.now(), description: '', qty: 1, unit: 0, total: 0 }] }))
  }

  function removeLineItem(id) {
    setForm(p => ({ ...p, lineItems: p.lineItems.filter(li => li.id !== id) }))
  }

  const subtotal   = form.lineItems.reduce((s, li) => s + li.total, 0)
  const taxAmt     = subtotal * (form.taxRate / 100)
  const grandTotal = subtotal + taxAmt

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate() {
    const e = {}, list = []
    if (!form.clientId)                                   { e.clientId = 'Required'; list.push('Client') }
    if (!form.title.trim())                               { e.title = 'Required'; list.push('Job Title') }
    if (!form.type)                                       { e.type = 'Required'; list.push('Service Type') }
    if (!form.description.trim())                         { e.description = 'Required'; list.push('Job Description') }
    else if (form.description.trim().length < 10)         { e.description = 'Must be at least 10 characters'; list.push('Job Description (min 10 chars)') }
    if (!form.techName)                                   { e.techName = 'Required'; list.push('Assigned Technician') }
    if (!form.startDate)                                  { e.startDate = 'Required'; list.push('Start Date') }
    if (!form.startTime)                                  { e.startTime = 'Required'; list.push('Start Time') }
    if (!form.endTime) {
      e.endTime = 'Required'; list.push('End Time')
    } else if (form.startTime) {
      const [sh, sm] = form.startTime.split(':').map(Number)
      const [eh, em] = form.endTime.split(':').map(Number)
      if ((eh * 60 + em) <= (sh * 60 + sm))              { e.endTime = 'End time must be after start time'; list.push('End Time (must be after start)') }
    }
    if (form.equipment.length === 0)                      { e.equipment = 'Select at least one equipment type'; list.push('Equipment Type') }
    const validItems = form.lineItems.filter(li => li.description.trim())
    if (validItems.length === 0)                          { e.lineItems = 'At least one line item is required'; list.push('Line Items') }
    if (form.status === 'Completed' && !form.completionNotes.trim()) { e.completionNotes = 'Required when status is Completed'; list.push('Completion Notes') }
    return { e, list }
  }

  function handleLinkedRequest(requestId) {
    setForm(p => ({ ...p, linkedRequestId: requestId }))
    if (!requestId) return
    const req = linkedRequests.find(r => r.id === requestId)
    if (!req) return
    setForm(p => ({
      ...p,
      linkedRequestId: requestId,
      type:        p.type        || req.type        || p.type,
      description: p.description || req.description || p.description,
    }))
    if (req.clientId && !form.clientId) handleClientChange(req.clientId)
  }

  function handleLinkedQuote(quoteId) {
    setForm(p => ({ ...p, linkedQuoteId: quoteId }))
    if (!quoteId) return
    const q = linkedQuotes.find(x => x.id === quoteId)
    if (!q) return
    setForm(p => ({
      ...p,
      linkedQuoteId: quoteId,
      type:        p.type        || q.type        || p.type,
      description: p.description || q.description || p.description,
    }))
    if (q.clientId && !form.clientId) handleClientChange(q.clientId)
  }

  async function submitCreate() {
    const { e, list } = validate()
    if (list.length > 0) { setErrs(e); setErrList(list); return }
    setErrList([])

    let resolvedClientId = form.clientId
    let c = clients.find(x => String(x.id) === form.clientId)

    if (form.clientId === '__new__') {
      if (!newClientForm.firstName.trim()) {
        setErrs(p => ({ ...p, clientId: 'First name required for new client' }))
        setErrList(['Client first name is required'])
        return
      }
      try {
        const resp = await api.createClient({
          first_name: newClientForm.firstName.trim(),
          last_name:  newClientForm.lastName.trim(),
          email:      newClientForm.email.trim() || undefined,
          phone:      newClientForm.phone.trim() || undefined,
          address:    newClientForm.address.trim() || undefined,
        })
        if (!resp.success || !resp.data?.id) { flash('Failed to create client'); return }
        resolvedClientId = resp.data.id
        c = resp.data
        setClients(prev => [c, ...prev])
        setNewClientForm({ firstName: '', lastName: '', email: '', phone: '', address: '' })
      } catch {
        flash('Failed to create client. Please try again.')
        return
      }
    }

    const validItems = form.lineItems.filter(li => li.description.trim())
    const sub = validItems.reduce((s, li) => s + li.total, 0)
    const tax = sub * (form.taxRate / 100)
    const jobId = formatJobNumber(getNextNumber('jobs'))
    const newJob = {
      id: jobId,
      clientId: resolvedClientId, clientName: c ? clientDisplayName(c) : '',
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
    const updated = saveJob(newJob)
    setJobs(updated); setForm(blankForm()); setErrs({}); setErrList([]); setTab('all')
    apiPost('/api/jobs', {
      client_id:    resolvedClientId,
      title:        form.title,
      description:  form.description,
      service_type: form.type,
      status:       (form.status || 'New').toLowerCase().replace(/ /g, '_'),
      priority:     (form.priority || 'Normal').toLowerCase(),
    }).catch(() => {})
    logActivity(ACTIONS.JOB_CREATED, 'Jobs', newJob.id, `${newJob.id} – ${newJob.clientName}`, `Job created: ${newJob.title}.`)
    // Notify the assigned technician/staff
    if (newJob.technicianId) {
      const users = (() => { try { return JSON.parse(localStorage.getItem('customsfieldpro_users') || '[]') } catch { return [] } })()
      const tech  = users.find(u => u.technicianId === newJob.technicianId || u.name === newJob.techName)
      if (tech) {
        createNotification(NOTIF_TYPES.JOB_ASSIGNED, 'New Job Assigned', `You have been assigned ${newJob.id} — ${newJob.clientName} (${newJob.type}).`, tech.id, 'Jobs', newJob.id)
        // Send assignment email if toggle is on
        if (settings.notifications?.emailOnJobAssignment && tech.email) {
          const techRecord = techs.find(t => t.id === newJob.technicianId) || tech
          sendJobAssignedEmail(newJob, techRecord)
        }
      }
    }
    flash(`${newJob.id} created successfully.`)
  }

  function updateStatus() {
    const prevStatus = sel.status
    const updatedJob = { ...sel, status: pendingStatus, priority: pendingPriority }
    const newArr = jobs.map(j => j.id === sel.id ? updatedJob : j)
    updateJobs(newArr)
    apiPut(`/api/jobs/${sel.id}`, updatedJob).catch(() => {})
    if (prevStatus !== pendingStatus) {
      logActivity(ACTIONS.JOB_STATUS_UPDATED, 'Jobs', sel.id, `${sel.id} – ${sel.clientName}`, `Status changed from ${prevStatus} to ${pendingStatus}.`)
      if (pendingStatus === 'Completed') {
        notifyAdmins(NOTIF_TYPES.JOB_COMPLETED, 'Job Completed', `${sel.id} completed by ${sel.techName} — ${sel.clientName}.`, 'Jobs', sel.id)
      }
    } else {
      logActivity(ACTIONS.JOB_UPDATED, 'Jobs', sel.id, `${sel.id} – ${sel.clientName}`, `Priority set to ${pendingPriority}.`)
    }
    flash('Job updated.')
  }

  function handleJobComplete(completionData) {
    const updatedJob = { ...sel, ...completionData }
    const newArr = jobs.map(j => j.id === sel.id ? updatedJob : j)
    updateJobs(newArr)
    apiPut(`/api/jobs/${sel.id}`, updatedJob).catch(() => {})
    setPendingStatus('Completed')
    logActivity(ACTIONS.JOB_STATUS_UPDATED, 'Jobs', sel.id, `${sel.id} – ${sel.clientName}`, `Job completed via completion workflow.`)
    notifyAdmins(NOTIF_TYPES.JOB_COMPLETED, 'Job Completed', `${sel.id} completed by ${sel.techName} — ${sel.clientName}.`, 'Jobs', sel.id)
    // Send job completion email to client if toggle is on
    if (settings.notifications?.emailOnJobCompletion && sel.clientEmail) {
      const client = clients.find(c => c.id === sel.clientId)
      sendJobCompletionEmail(updatedJob, client)
    }
    // Auto-generate invoice if none exists for this job
    const existingInvoices = getInvoices()
    const hasInvoice = existingInvoices.some(inv => inv.jobRef === sel.id || inv.linkedJobId === sel.id)
    if (!hasInvoice) {
      const invId = formatInvoiceNumber(getNextNumber('invoices'))
      const newInv = {
        id: invId,
        clientId: sel.clientId, clientName: sel.clientName, clientPhone: sel.clientPhone,
        clientEmail: sel.clientEmail, clientAddress: sel.clientAddress,
        jobRef: sel.id, linkedJobId: sel.id,
        linkedQuoteNumber: sel.linkedQuoteNumber || null, linkedQuoteId: sel.linkedQuoteId || null,
        issued: new Date().toISOString().split('T')[0], due: '', status: 'Draft',
        lineItems: (sel.lineItems || []).map(li => ({ ...li, id: Date.now() + Math.random() })),
        subtotal: sel.subtotal ?? sel.total, taxRate: sel.taxRate || 0, total: sel.total,
        notes: `Auto-generated from completed ${sel.id}`,
      }
      saveInvoice(newInv)
      // Back-link the invoice onto the job
      const allJobs = getJobs()
      const updatedJobWithInv = allJobs.map(j => {
        if (j.id !== sel.id) return j
        return {
          ...j,
          linkedInvoiceNumbers: [...(j.linkedInvoiceNumbers || []), invId],
          linkedInvoiceIds: [...(j.linkedInvoiceIds || []), invId],
        }
      })
      saveJobs(updatedJobWithInv)
      setJobs(updatedJobWithInv)
      logActivity(ACTIONS.INVOICE_CREATED, 'Invoices', newInv.id, `${newInv.id} – ${newInv.clientName}`, `Invoice auto-generated from completed ${sel.id}.`)
      setInvToast({ id: newInv.id, clientName: newInv.clientName })
      setTimeout(() => setInvToast(null), 8000)
    }
    // Trigger review request after job completion
    const client = clients.find(c => c.id === sel.clientId) || null
    triggerReviewRequest(updatedJob, client, null)
  }

  function convertToInvoice(j) {
    const invId = formatInvoiceNumber(getNextNumber('invoices'))
    const newInv = {
      id: invId,
      clientId: j.clientId, clientName: j.clientName, clientPhone: j.clientPhone,
      clientEmail: j.clientEmail, clientAddress: j.clientAddress,
      jobRef: j.id, linkedJobId: j.id,
      linkedQuoteNumber: j.linkedQuoteNumber || null, linkedQuoteId: j.linkedQuoteId || null,
      issued: new Date().toISOString().split('T')[0], due: '', status: 'Draft',
      lineItems: j.lineItems.map(li => ({ ...li, id: Date.now() + Math.random() })),
      subtotal: j.subtotal ?? j.total, taxRate: j.taxRate || 0, total: j.total,
      notes: `Auto-filled from ${j.id}`,
    }
    saveInvoice(newInv)
    // Back-link the invoice onto the job
    const allJobs = getJobs()
    const updatedJobs = allJobs.map(x => {
      if (x.id !== j.id) return x
      return {
        ...x,
        linkedInvoiceNumbers: [...(x.linkedInvoiceNumbers || []), invId],
        linkedInvoiceIds: [...(x.linkedInvoiceIds || []), invId],
      }
    })
    saveJobs(updatedJobs)
    setJobs(updatedJobs)
    logActivity(ACTIONS.INVOICE_CREATED, 'Invoices', newInv.id, `${newInv.id} – ${newInv.clientName}`, `Invoice created from ${j.id}.`)
    navigate('/invoices')
  }

  function createQuoteFromJob(j) {
    const qtId = formatQuoteNumber(getNextNumber('quotes'))
    const newQuote = {
      id: qtId,
      clientId: j.clientId, clientName: j.clientName,
      clientPhone: j.clientPhone, clientEmail: j.clientEmail || '',
      type: j.type, description: j.title,
      created: new Date().toISOString().split('T')[0],
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Draft',
      linkedJobId: j.id, linkedJobNumber: j.id,
      linkedInvoiceId: null, linkedInvoiceNumber: null,
      lineItems: (j.lineItems || []).map(li => ({ ...li, id: Date.now() + Math.random() })),
      total: j.total || 0,
      notes: `Created from ${j.id}`,
    }
    saveQuote(newQuote)
    // Back-link the quote onto the job
    const allJobs = getJobs()
    const updatedJobs = allJobs.map(x => {
      if (x.id !== j.id) return x
      return { ...x, linkedQuoteNumber: qtId, linkedQuoteId: qtId }
    })
    saveJobs(updatedJobs)
    setJobs(updatedJobs)
    logActivity(ACTIONS.JOB_UPDATED, 'Quotes', qtId, `${qtId} – ${j.clientName}`, `Quote created from ${j.id}.`)
    flash(`Quote ${qtId} created as Draft.`)
  }

  function advancePipeline(newStatus, note = '') {
    const statusEntry = {
      status: newStatus,
      changedBy: user?.name || 'System',
      changedAt: Date.now(),
      note: note || `Status advanced to ${statusLabel(newStatus)}`,
    }
    const allJobs = getJobs()
    const updatedJobs = allJobs.map(j => {
      if (j.id !== sel.id) return j
      return {
        ...j,
        status: newStatus,
        statusHistory: [...(j.statusHistory || []), statusEntry],
      }
    })
    saveJobs(updatedJobs)
    setJobs(updatedJobs)
    setPendingStatus(newStatus)
    logActivity(ACTIONS.JOB_PIPELINE_ADVANCED, 'Jobs', sel.id, `${sel.id} – ${sel.clientName}`,
      `Pipeline advanced to ${statusLabel(newStatus)}.${note ? ' ' + note : ''}`)
    flash(`Status updated to ${statusLabel(newStatus)}.`)
  }

  function handleOverrideSubmit() {
    if (!overrideStatus || !overrideReason.trim()) return
    advancePipeline(overrideStatus, `Admin override: ${overrideReason}`)
    setShowOverride(false)
    setOverrideReason('')
    setOverrideStatus('')
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Invoice created toast */}
      {invToast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 2000, background: '#1a1d23', color: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', gap: 14, minWidth: 340, maxWidth: 420 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Invoice {invToast.id} created as Draft</p>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#9ca3af' }}>Review before sending to {invToast.clientName}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => navigate('/invoices')} style={{ height: 32, padding: '0 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Review →</button>
            <button onClick={() => setInvToast(null)} style={{ height: 32, width: 32, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        </div>
      )}

      {banner && (
        <div style={{
          background: bannerType === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${bannerType === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: bannerType === 'success' ? '#16a34a' : '#dc2626',
          borderRadius: 8, padding: '10px 16px', fontSize: 13.5, fontWeight: 600,
        }}>
          {bannerType === 'success' ? '✓' : '⚠'} {banner}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <Tabs tabs={tabs} active={tab} onSelect={t => t === 'create' ? openCreate() : setTab(t)} />
        <div style={{ padding: 24 }}>

          {/* ══ ALL JOBS ══════════════════════════════════════════════════════ */}
          {tab === 'all' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <FilterDropdown
                  groups={[
                    { label: 'Status',   key: 'statusF',   options: STATUSES.map(s => ({ value: s })) },
                    { label: 'Priority', key: 'priorityF', options: ['All','Urgent','High','Normal','Low'].map(p => ({ value: p })) },
                    { label: 'Type',     key: 'typeF',     options: [{ value: 'All' }, ...JOB_TYPES.map(t => ({ value: t }))] },
                  ]}
                  values={{ statusF, priorityF, typeF }}
                  onChange={(key, val) => {
                    if (key === 'statusF') setStatusF(val)
                    else if (key === 'priorityF') setPriorityF(val)
                    else setTypeF(val)
                  }}
                  onReset={() => { setStatusF('All'); setPriorityF('All'); setTypeF('All') }}
                />
                {isAdmin && (
                  <button onClick={openCreate}
                    style={{ height: 36, padding: '0 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>
                    + New Job
                  </button>
                )}
              </div>
              <p style={{ fontSize: 12.5, color: '#9ca3af', marginBottom: 8 }}>{visible.length} jobs</p>

              {/* ── Mobile card list ── */}
              {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {visible.map(j => {
                    const sc = SC[j.status] ?? { bg: '#f3f4f6', color: '#6b7280' }
                    return (
                      <div key={j.id} style={{ border: '1px solid #e8e9ec', borderRadius: 10, background: '#fff', overflow: 'hidden' }}>
                        {/* Card header */}
                        <div style={{ padding: '12px 14px', borderBottom: '1px solid #f0f1f3', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#f3f4f6', padding: '2px 7px', borderRadius: 4, color: '#6b7280', flexShrink: 0 }}>{j.id}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1d23', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.clientName}</span>
                          </div>
                          <Bdg label={j.status} map={SC} />
                        </div>
                        {/* Card body */}
                        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <p style={{ fontSize: 13.5, fontWeight: 600, color: '#374151', margin: 0 }}>{j.title}</p>
                          {j.clientAddress && <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{j.clientAddress}</p>}
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 2 }}>
                            {j.date && <span style={{ fontSize: 12.5, color: '#9ca3af' }}>{j.date}{j.time ? ` · ${j.time}` : ''}</span>}
                            {j.type && <span style={{ fontSize: 12.5, color: '#9ca3af' }}>{j.type}</span>}
                            {j.priority && <PriorityBadge priority={j.priority} />}
                          </div>
                        </div>
                        {/* Card footer */}
                        <div style={{ padding: '10px 14px', borderTop: '1px solid #f0f1f3', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button onClick={() => open(j.id)}
                            style={{ flex: 1, height: 40, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                            View Detail →
                          </button>
                          {j.status !== 'Completed' && j.status !== 'Cancelled' && (
                            <button
                              onClick={() => { setSelId(j.id); setPendingStatus(j.status); setShowCompletion(true) }}
                              style={{ height: 40, padding: '0 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              Complete
                            </button>
                          )}
                          {!isAdmin && (
                            <select
                              value={j.status}
                              onChange={e => {
                                const newArr = jobs.map(x => x.id === j.id ? { ...x, status: e.target.value } : x)
                                updateJobs(newArr); flash('Status updated.')
                              }}
                              style={{ height: 40, border: '1px solid #e8e9ec', borderRadius: 8, padding: '0 10px', fontSize: 13.5, color: '#374151', background: '#fff', flexShrink: 0 }}>
                              {JOB_STATUSES.map(s => <option key={s}>{s}</option>)}
                            </select>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {!visible.length && (
                    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                      <div style={{ width: 52, height: 52, borderRadius: 14, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>No jobs found</p>
                      <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 16px' }}>Create your first job to get started</p>
                      {(isAdmin || hasPermission('create_jobs')) && <button onClick={openCreate} style={{ height: 36, padding: '0 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Create Job</button>}
                    </div>
                  )}
                </div>
              ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Job #', 'Client', 'Type', 'Title', 'Priority', 'Technician', 'Quote', 'Invoice(s)', 'Status', 'Total', 'Date'].map(h => (
                        <th key={h} style={{ textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.4px', padding: '9px 14px', borderBottom: '1px solid #f0f1f3', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(j => (
                      <tr key={j.id} onClick={() => open(j.id)} style={{ borderBottom: '1px solid #f8f9fa', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '11px 14px' }}><span style={{ fontFamily: 'monospace', fontSize: 12, background: '#f3f4f6', padding: '2px 7px', borderRadius: 4, color: '#6b7280' }}>{j.id}</span></td>
                        <td style={{ padding: '11px 14px', fontWeight: 600, color: '#1a1d23', fontSize: 13.5, whiteSpace: 'nowrap' }}>
                          {j.clientName}
                          {j.clientId && <span style={{ marginLeft: 6, fontFamily: 'monospace', fontSize: 11, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 4, padding: '1px 5px' }}>{j.clientId}</span>}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>{j.type}</td>
                        <td style={{ padding: '11px 14px', fontSize: 13.5, color: '#374151', maxWidth: 200, whiteSpace: 'nowrap' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: 160 }}>{j.title}</span>
                          {j.claimNumber && <span style={{ fontFamily: 'monospace', fontSize: 10.5, background: '#fefce8', color: '#854d0e', border: '1px solid #fde68a', borderRadius: 4, padding: '1px 5px', display: 'inline-block', marginTop: 2 }}>{j.claimNumber}</span>}
                        </td>
                        <td style={{ padding: '11px 14px' }}>{j.priority ? <PriorityBadge priority={j.priority} /> : <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>}</td>
                        <td style={{ padding: '11px 14px', fontSize: 13.5, color: '#374151', whiteSpace: 'nowrap' }}>
                          {j.techName ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: getTechColor(j.technicianId).hex, flexShrink: 0, display: 'inline-block' }} />
                              {j.techName}
                            </span>
                          ) : <span style={{ color: '#9ca3af' }}>—</span>}
                        </td>
                        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                          {j.linkedQuoteNumber
                            ? <span style={{ fontFamily: 'monospace', fontSize: 11.5, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', borderRadius: 4, padding: '2px 6px' }}>{j.linkedQuoteNumber}</span>
                            : <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                          {(j.linkedInvoiceNumbers || []).length > 0
                            ? (j.linkedInvoiceNumbers || []).map(n => <span key={n} style={{ fontFamily: 'monospace', fontSize: 11.5, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 4, padding: '2px 6px', marginRight: 3, display: 'inline-block' }}>{n}</span>)
                            : <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ padding: '11px 14px' }}><Bdg label={j.status} map={SC} /></td>
                        <td style={{ padding: '11px 14px', fontSize: 13.5, fontWeight: 700, color: '#1a1d23', whiteSpace: 'nowrap' }}>${(j.total || 0).toLocaleString()}</td>
                        <td style={{ padding: '11px 14px', fontSize: 12.5, color: '#9ca3af', whiteSpace: 'nowrap' }}>{j.date}</td>
                      </tr>
                    ))}
                    {!visible.length && <tr><td colSpan={11}><div style={{ textAlign: 'center', padding: '48px 24px' }}>
                      <div style={{ width: 52, height: 52, borderRadius: 14, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>No jobs found</p>
                      <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 16px' }}>Try adjusting your filters or create a new job</p>
                      {(isAdmin || hasPermission('create_jobs')) && <button onClick={openCreate} style={{ height: 36, padding: '0 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Create Job</button>}
                    </div></td></tr>}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          )}

          {/* ══ JOB DETAIL ════════════════════════════════════════════════════ */}
          {tab === 'detail' && sel && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <button onClick={() => setTab('all')} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 8 }}>← All Jobs</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, background: '#f3f4f6', padding: '3px 8px', borderRadius: 5, color: '#6b7280' }}>{sel.id}</span>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1d23', margin: 0 }}>{sel.title}</h2>
                  <Bdg label={sel.status} map={SC} />
                  {sel.priority && <PriorityBadge priority={sel.priority} />}
                </div>
              </div>

              {/* ── Pipeline Status Bar ─────────────────────────────────── */}
              {(() => {
                const curKey = normalizeStatus(sel.status)
                const flowStatuses = PIPELINE_STATUSES.filter(s => s.key !== 'cancelled')
                const curIdx = flowStatuses.findIndex(s => s.key === curKey)
                const statusDef = getStatusDef(curKey)
                const nextStatus = statusDef?.allowedNextStatuses?.[0]
                const nextDef = nextStatus ? getStatusDef(nextStatus) : null
                return (
                  <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <p style={CT}>Job Pipeline</p>
                    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 'max-content' }}>
                        {flowStatuses.map((s, i) => {
                          const isCompleted = i < curIdx
                          const isCurrent   = i === curIdx
                          return (
                            <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 76 }}>
                                <div style={{
                                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                                  background: isCompleted ? '#16a34a' : isCurrent ? (s.bgColor || '#eff6ff') : '#f3f4f6',
                                  border: `2px solid ${isCompleted ? '#16a34a' : isCurrent ? (s.color || '#2563eb') : '#e8e9ec'}`,
                                  color: isCompleted ? '#fff' : isCurrent ? (s.color || '#2563eb') : '#9ca3af',
                                  fontWeight: 700,
                                }}>
                                  {isCompleted ? '✓' : (s.icon || (i + 1))}
                                </div>
                                <span style={{ fontSize: 10, fontWeight: isCurrent ? 700 : 500, color: isCompleted ? '#16a34a' : isCurrent ? (s.color || '#2563eb') : '#9ca3af', textAlign: 'center', lineHeight: 1.2, maxWidth: 72 }}>
                                  {s.label}
                                </span>
                              </div>
                              {i < flowStatuses.length - 1 && (
                                <div style={{ width: 16, height: 2, background: isCompleted ? '#16a34a' : '#e8e9ec', marginBottom: 20, flexShrink: 0 }} />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Smart Next Step */}
                    {curKey !== 'completed' && curKey !== 'cancelled' && nextDef && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f0f1f3', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        {statusDef?.requiresAction ? (
                          <button
                            onClick={() => {
                              if (statusDef.actionModal === 'diagnosis')      setShowDiagnosis(true)
                              else if (statusDef.actionModal === 'parts')     setShowPartsRequired(true)
                              else if (statusDef.actionModal === 'parts_received') setShowPartsReceived(true)
                              else if (statusDef.actionModal === 'completion') setShowCompletion(true)
                              else advancePipeline(nextStatus)
                            }}
                            style={{ height: 38, padding: '0 18px', background: statusDef.color || '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            {statusDef.icon} {statusDef.actionLabel || `Move to ${nextDef.label}`}
                          </button>
                        ) : (
                          <button
                            onClick={() => advancePipeline(nextStatus)}
                            style={{ height: 38, padding: '0 18px', background: nextDef.color || '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
                          >
                            → Move to {nextDef.label}
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => setShowOverride(p => !p)}
                            style={{ height: 38, padding: '0 14px', background: 'none', border: '1px solid #e8e9ec', borderRadius: 8, fontSize: 13, color: '#6b7280', cursor: 'pointer' }}
                          >
                            ⚙ Override Status
                          </button>
                        )}
                      </div>
                    )}

                    {/* Override Panel */}
                    {showOverride && isAdmin && (
                      <div style={{ marginTop: 12, padding: 14, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
                        <p style={{ fontSize: 12.5, fontWeight: 700, color: '#92400e', margin: '0 0 10px' }}>Admin Override — set status directly</p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <select value={overrideStatus} onChange={e => setOverrideStatus(e.target.value)}
                            style={{ height: 36, border: '1px solid #fde68a', borderRadius: 7, padding: '0 10px', fontSize: 13, color: '#374151', background: '#fff' }}>
                            <option value="">— Select status —</option>
                            {PIPELINE_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                          </select>
                          <input value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
                            placeholder="Reason for override…"
                            style={{ flex: 1, minWidth: 180, height: 36, border: '1px solid #fde68a', borderRadius: 7, padding: '0 10px', fontSize: 13, color: '#374151', background: '#fff' }} />
                          <button onClick={handleOverrideSubmit} disabled={!overrideStatus || !overrideReason.trim()}
                            style={{ height: 36, padding: '0 14px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (!overrideStatus || !overrideReason.trim()) ? 0.5 : 1 }}>
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                <div style={CS}>
                  <p style={CT}>Client</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 6px' }}>
                    {sel.clientName}
                    {sel.clientId && <span style={{ marginLeft: 8, fontFamily: 'monospace', fontSize: 11, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 4, padding: '2px 6px', fontWeight: 400 }}>{sel.clientId}</span>}
                  </p>
                  <p style={{ fontSize: 13.5, color: '#6b7280', margin: '0 0 3px' }}>{sel.clientPhone}</p>
                  <p style={{ fontSize: 13.5, color: '#6b7280', margin: 0 }}>{sel.clientAddress}</p>
                </div>
                <div style={CS}>
                  <p style={CT}>Scheduling</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      ['Technician', sel.techName],
                      ['Service Type', sel.type],
                      ['Start Date', sel.date],
                      ['Time', sel.time ? `${sel.time}${sel.endTime ? ` – ${sel.endTime}` : ''}` : '—'],
                      ['Duration', sel.duration || '—'],
                      ['Recurrence', sel.recurrence || 'One-time'],
                    ].map(([l, v]) => (
                      <div key={l}>
                        <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{l}</div>
                        <div style={{ fontSize: 13.5, color: '#374151', fontWeight: l === 'Technician' ? 600 : 400 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {sel.description && (
                <div style={CS}>
                  <p style={CT}>Description</p>
                  <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.7, margin: 0 }}>{sel.description}</p>
                </div>
              )}

              {sel.claimNumber && (
                <div style={CS}>
                  <p style={CT}>Insurance / Claim</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#6b7280" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span style={{ fontFamily: 'monospace', fontSize: 13.5, color: '#374151', fontWeight: 600 }}>{sel.claimNumber}</span>
                  </div>
                </div>
              )}

              {(sel.equipment?.length > 0 || sel.equipBrand || sel.equipModel) && (
                <div style={CS}>
                  <p style={CT}>Equipment / Appliance</p>
                  {sel.equipment?.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Equipment Types</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {sel.equipment.map(e => (
                          <span key={e} style={{ background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{e}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[['Brand', sel.equipBrand], ['Model #', sel.equipModel], ['Serial #', sel.equipSerial], ['Warranty', sel.warrantyStatus], ['Last Service', sel.lastServiceDate]].filter(([, v]) => v).map(([l, v]) => (
                      <div key={l}>
                        <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>{l}</div>
                        <div style={{ fontSize: 13.5, color: '#374151' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={CS}>
                <p style={CT}>Line Items</p>
                {!sel.lineItems?.length ? (
                  <p style={{ color: '#9ca3af', fontSize: 13.5, margin: 0 }}>No line items.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['Description', 'Qty', 'Unit Price', 'Total'].map(h => (
                      <th key={h} style={{ textAlign: h === 'Description' ? 'left' : 'right', fontSize: 11.5, fontWeight: 600, color: '#9ca3af', padding: '7px 12px', borderBottom: '1px solid #f0f1f3' }}>{h}</th>
                    ))}</tr></thead>
                    <tbody>
                      {sel.lineItems.map(li => (
                        <tr key={li.id} style={{ borderBottom: '1px solid #f8f9fa' }}>
                          <td style={{ padding: '10px 12px', fontSize: 13.5, color: '#374151' }}>{li.description}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13.5, color: '#374151', textAlign: 'right' }}>{li.qty}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13.5, color: '#374151', textAlign: 'right' }}>${li.unit.toLocaleString()}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13.5, fontWeight: 600, color: '#1a1d23', textAlign: 'right' }}>${li.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div style={{ borderTop: '2px solid #f0f1f3', marginTop: 4 }}>
                  {[['Subtotal', `$${(sel.subtotal ?? sel.total ?? 0).toLocaleString()}`], [`Tax (${sel.taxRate || 0}%)`, `$${((sel.subtotal ?? sel.total ?? 0) * (sel.taxRate || 0) / 100).toFixed(2)}`]].map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', fontSize: 13.5, color: '#6b7280' }}>
                      <span>{l}</span><span>{v}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', fontSize: 15, fontWeight: 700, color: '#1a1d23', borderTop: '1px solid #f0f1f3' }}>
                    <span>Total</span><span>${(sel.total || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {(sel.notes || sel.internalNotes || sel.completionNotes) && (
                <div style={CS}>
                  {(sel.notes || sel.internalNotes) && (
                    <>
                      <p style={CT}>Internal Notes</p>
                      <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.7, margin: '0 0 12px', background: '#f8f9fa', borderRadius: 8, padding: '12px 14px' }}>{sel.notes || sel.internalNotes}</p>
                    </>
                  )}
                  {sel.completionNotes && (
                    <>
                      <p style={CT}>Completion Notes</p>
                      <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.7, margin: 0, background: '#f0fdf4', borderRadius: 8, padding: '12px 14px' }}>{sel.completionNotes}</p>
                    </>
                  )}
                </div>
              )}

              {/* ── Linked Records ─────────────────────────────────────────────── */}
              {(sel.linkedQuoteNumber || (sel.linkedInvoiceNumbers && sel.linkedInvoiceNumbers.length > 0)) && (
                <div style={CS}>
                  <p style={CT}>Linked Records</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {sel.linkedQuoteNumber && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '8px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Quote</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#5b21b6', fontWeight: 600 }}>{sel.linkedQuoteNumber}</span>
                        <button onClick={() => navigate('/quotes')} style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}>View →</button>
                      </div>
                    )}
                    {(sel.linkedInvoiceNumbers || []).map(invNum => (
                      <div key={invNum} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Invoice</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#1e40af', fontWeight: 600 }}>{invNum}</span>
                        <button onClick={() => navigate('/invoices')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}>View →</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Status History Timeline ─────────────────────────────── */}
              {sel.statusHistory && sel.statusHistory.length > 0 && (
                <div style={CS}>
                  <p style={CT}>Status History</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {[...sel.statusHistory].reverse().map((entry, i, arr) => (
                      <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid #f0f1f3' : 'none' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#f0fdf4', border: '1.5px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13 }}>
                          {getStatusDef(entry.status)?.icon || '●'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#374151' }}>{statusLabel(entry.status)}</span>
                            <span style={{ fontSize: 12, color: '#9ca3af' }}>by {entry.changedBy}</span>
                            <span style={{ fontSize: 12, color: '#9ca3af' }}>· {new Date(entry.changedAt).toLocaleString()}</span>
                          </div>
                          {entry.note && <p style={{ fontSize: 12.5, color: '#6b7280', margin: '2px 0 0', lineHeight: 1.5 }}>{entry.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ ...CS, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: 10, width: isMobile ? '100%' : 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Status:</label>
                    <select value={pendingStatus} onChange={e => setPendingStatus(e.target.value)}
                      style={{ flex: 1, height: 44, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 10px', fontSize: 16, color: '#374151', background: '#fff' }}>
                      {JOB_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Priority:</label>
                    <select value={pendingPriority} onChange={e => setPendingPriority(e.target.value)}
                      style={{ flex: 1, height: 44, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 10px', fontSize: 16, color: '#374151', background: '#fff' }}>
                      {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  {isMobile ? (
                    <div className="mob-sticky-save">
                      <button onClick={updateStatus}
                        style={{ height: 48, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                        Save Status Update
                      </button>
                    </div>
                  ) : (
                  <button onClick={updateStatus}
                    style={{ height: 36, padding: '0 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                    Update
                  </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {sel && sel.status !== 'Completed' && sel.status !== 'Cancelled' && (
                    <button onClick={() => setShowCompletion(true)}
                      style={{ height: 36, padding: '0 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Complete Job
                    </button>
                  )}
                  {isAdmin && !sel.linkedQuoteId && (
                    <button onClick={() => createQuoteFromJob(sel)}
                      style={{ height: 36, padding: '0 18px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                      Create Quote →
                    </button>
                  )}
                  {isAdmin && (
                    <button onClick={() => convertToInvoice(sel)}
                      style={{ height: 36, padding: '0 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                      Convert to Invoice →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══ CREATE JOB ════════════════════════════════════════════════════ */}
          {tab === 'create' && (
            <div style={{ maxWidth: 800 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1a1d23', margin: '0 0 20px' }}>Create New Job</h3>

              {errList.length > 0 && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: '#dc2626', margin: '0 0 6px' }}>Please fix the following errors:</p>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {errList.map(e => <li key={e} style={{ fontSize: 13, color: '#dc2626', lineHeight: 1.8 }}>{e}</li>)}
                  </ul>
                </div>
              )}

              {/* Client Info */}
              <div style={{ ...CS, marginBottom: 16 }}>
                <SectionHead title="Client Info" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={LB}>Client<Req /></label>
                    <select value={form.clientId} onChange={e => handleClientChange(e.target.value)} style={selStyle('clientId')}>
                      <option value="">— Select client —</option>
                      <option value="__new__">+ Create New Client</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{clientDisplayName(c)}</option>)}
                    </select>
                    {errs.clientId && <p style={ET}>Required</p>}
                    {form.clientId === '__new__' && (
                      <div style={{marginTop:10,padding:14,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8}}>
                        <p style={{fontSize:12,fontWeight:700,color:'#15803d',margin:'0 0 10px',textTransform:'uppercase',letterSpacing:'0.4px'}}>New Client Details</p>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                          <div>
                            <label style={LB}>First Name <span style={{color:'#dc2626'}}>*</span></label>
                            <input value={newClientForm.firstName} onChange={e=>setNewClientForm(p=>({...p,firstName:e.target.value}))}
                              placeholder="First Name" style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #d1fae5',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',outline:'none',background:'#fff'}}/>
                          </div>
                          <div>
                            <label style={LB}>Last Name</label>
                            <input value={newClientForm.lastName} onChange={e=>setNewClientForm(p=>({...p,lastName:e.target.value}))}
                              placeholder="Last Name" style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #d1fae5',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',outline:'none',background:'#fff'}}/>
                          </div>
                          <div>
                            <label style={LB}>Email</label>
                            <input type="email" value={newClientForm.email} onChange={e=>setNewClientForm(p=>({...p,email:e.target.value}))}
                              placeholder="Email" style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #d1fae5',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',outline:'none',background:'#fff'}}/>
                          </div>
                          <div>
                            <label style={LB}>Phone</label>
                            <input value={newClientForm.phone} onChange={e=>setNewClientForm(p=>({...p,phone:e.target.value}))}
                              placeholder="Phone" style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #d1fae5',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',outline:'none',background:'#fff'}}/>
                          </div>
                        </div>
                        <div>
                          <label style={LB}>Address</label>
                          <input value={newClientForm.address} onChange={e=>setNewClientForm(p=>({...p,address:e.target.value}))}
                            placeholder="Address" style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #d1fae5',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',outline:'none',background:'#fff'}}/>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={LB}>Contact Phone</label>
                    <input
                      value={form.clientPhone}
                      onChange={e => set('clientPhone', e.target.value)}
                      placeholder="Auto-filled from client"
                      style={{ ...inpStyle('clientPhone'), background: form.clientId ? '#f9fafb' : '#fff' }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <label style={LB}>Property Address</label>
                  <AddressAutocomplete
                    value={form.clientAddress}
                    placeholder="Auto-filled from client, editable"
                    onChange={fields => set('clientAddress', fields.address ?? form.clientAddress)}
                    style={inpStyle('clientAddress')}
                  />
                </div>
              </div>

              {/* Linked Records */}
              {(linkedRequests.length > 0 || linkedQuotes.length > 0) && (
                <div style={{ ...CS, marginBottom: 16 }}>
                  <SectionHead title="Linked Records (optional — auto-fills fields)" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {linkedRequests.length > 0 && (
                      <div>
                        <label style={LB}>From Request</label>
                        <select value={form.linkedRequestId} onChange={e => handleLinkedRequest(e.target.value)}
                          style={{ width: '100%', height: 38, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#374151', background: '#fff' }}>
                          <option value="">— No linked request —</option>
                          {linkedRequests.filter(r => r.status !== 'converted').map(r => (
                            <option key={r.id} value={r.id}>{r.clientName ? `${r.clientName} — ` : ''}{r.type || 'Service Request'} ({r.id})</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {linkedQuotes.length > 0 && (
                      <div>
                        <label style={LB}>From Quote</label>
                        <select value={form.linkedQuoteId} onChange={e => handleLinkedQuote(e.target.value)}
                          style={{ width: '100%', height: 38, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#374151', background: '#fff' }}>
                          <option value="">— No linked quote —</option>
                          {linkedQuotes.map(q => (
                            <option key={q.id} value={q.id}>{q.type || 'Quote'} ({q.id})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Job Details */}
              <div style={{ ...CS, marginBottom: 16 }}>
                <SectionHead title="Job Details" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={LB}>Job Title<Req /></label>
                    <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. AC Unit Refrigerant Check" style={inpStyle('title')} />
                    {errs.title && <p style={ET}>{errs.title}</p>}
                  </div>
                  <div>
                    <label style={LB}>Job Number</label>
                    <input value={form.jobNumber} readOnly
                      style={{ ...inpStyle('jobNumber'), background: '#f9fafb', color: '#9ca3af', fontFamily: 'monospace' }} />
                  </div>
                </div>
                <div style={{ marginTop: 14, maxWidth: '50%' }}>
                  <label style={LB}>Service Type<Req /></label>
                  <select value={form.type} onChange={e => set('type', e.target.value)} style={selStyle('type')}>
                    <option value="">— Select type —</option>
                    {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  {errs.type && <p style={ET}>Required</p>}
                  {isAIEnabled() && (
                    <button type="button" onClick={() => setShowAIEstimator(true)}
                      style={{ marginTop: 8, height: 34, padding: '0 14px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" /></svg>
                      Get AI Estimate
                    </button>
                  )}
                </div>
                <div style={{ marginTop: 14 }}>
                  <label style={LB}>Job Description<Req /></label>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                    placeholder="Describe the work to be done (min 10 characters)…"
                    style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${errs.description ? '#dc2626' : '#e8e9ec'}`, borderRadius: 7, padding: '10px 12px', fontSize: 13.5, color: '#374151', resize: 'vertical', outline: 'none' }} />
                  {errs.description && <p style={ET}>{errs.description}</p>}
                </div>
                <div style={{ marginTop: 14 }}>
                  <label style={LB}>Internal Notes</label>
                  <textarea value={form.internalNotes} onChange={e => set('internalNotes', e.target.value)} rows={2}
                    placeholder="Private notes for your team (not visible to client)…"
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e8e9ec', borderRadius: 7, padding: '10px 12px', fontSize: 13.5, color: '#374151', resize: 'vertical', outline: 'none' }} />
                </div>
                <div style={{ marginTop: 14, maxWidth: '50%' }}>
                  <label style={LB}>Claim Number</label>
                  <input value={form.claimNumber} onChange={e => set('claimNumber', e.target.value)}
                    placeholder="e.g. CLM-2024-00123"
                    style={{ ...inpStyle('claimNumber'), fontFamily: 'monospace' }} />
                </div>
              </div>

              {/* Scheduling */}
              <div style={{ ...CS, marginBottom: 16 }}>
                <SectionHead title="Scheduling" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={LB}>Assigned Technician<Req /></label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select value={form.techName} onChange={e => {
                          const tech = techs.find(t => t.name === e.target.value)
                          setForm(p => ({ ...p, techName: e.target.value, technicianId: tech?.id || '' }))
                          setErrs(p => ({ ...p, techName: undefined }))
                        }} style={{ ...selStyle('techName'), flex: 1 }}>
                        <option value="">— Select technician —</option>
                        {techs.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                      <ClosestTechButton
                        jobAddress={form.clientAddress}
                        techs={techs}
                        onSelect={tech => {
                          setForm(p => ({ ...p, techName: tech.name, technicianId: tech.id }))
                          setErrs(p => ({ ...p, techName: undefined }))
                        }}
                      />
                    </div>
                    {errs.techName && <p style={ET}>Required</p>}
                  </div>
                  <div>
                    <label style={LB}>Recurrence</label>
                    <select value={form.recurrence} onChange={e => set('recurrence', e.target.value)} style={selStyle('recurrence')}>
                      {RECURRENCES.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LB}>Start Date<Req /></label>
                    <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} style={inpStyle('startDate')} />
                    {errs.startDate && <p style={ET}>Required</p>}
                  </div>
                  <div />
                  <div>
                    <label style={LB}>Start Time<Req /></label>
                    <input type="time" value={form.startTime} onChange={e => handleTimeChange('startTime', e.target.value)} style={inpStyle('startTime')} />
                    {errs.startTime && <p style={ET}>Required</p>}
                  </div>
                  <div>
                    <label style={LB}>End Time<Req /></label>
                    <input type="time" value={form.endTime} onChange={e => handleTimeChange('endTime', e.target.value)} style={inpStyle('endTime')} />
                    {errs.endTime && <p style={ET}>{errs.endTime}</p>}
                  </div>
                </div>
                {form.duration && (
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>Estimated Duration:</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '2px 10px', borderRadius: 20 }}>{form.duration}</span>
                  </div>
                )}
              </div>

              {/* Equipment */}
              <div style={{ ...CS, marginBottom: 16 }}>
                <SectionHead title="Equipment / Appliance" />
                <label style={LB}>Equipment Type<Req /></label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 6 }}>
                  {EQUIPMENT_TYPES.map(item => (
                    <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: '#374151', cursor: 'pointer', padding: '7px 12px', border: `1px solid ${form.equipment.includes(item) ? '#bfdbfe' : '#e8e9ec'}`, borderRadius: 7, background: form.equipment.includes(item) ? '#eff6ff' : '#fff', userSelect: 'none', transition: 'all 0.1s' }}>
                      <input type="checkbox" checked={form.equipment.includes(item)} onChange={() => toggleEquipment(item)} style={{ accentColor: '#2563eb', width: 15, height: 15 }} />
                      {item}
                    </label>
                  ))}
                </div>
                {errs.equipment && <p style={ET}>{errs.equipment}</p>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
                  <div>
                    <label style={LB}>Equipment Brand</label>
                    <input value={form.equipBrand} onChange={e => set('equipBrand', e.target.value)} placeholder="e.g. Carrier, Whirlpool" style={inpStyle('equipBrand')} />
                  </div>
                  <div>
                    <label style={LB}>Model Number</label>
                    <input value={form.equipModel} onChange={e => set('equipModel', e.target.value)} placeholder="e.g. 58MVC080" style={inpStyle('equipModel')} />
                  </div>
                  <div>
                    <label style={LB}>Serial Number</label>
                    <input value={form.equipSerial} onChange={e => set('equipSerial', e.target.value)} placeholder="e.g. 1234-ABCD-5678" style={inpStyle('equipSerial')} />
                  </div>
                  <div>
                    <label style={LB}>Warranty Status</label>
                    <select value={form.warrantyStatus} onChange={e => set('warrantyStatus', e.target.value)} style={selStyle('warrantyStatus')}>
                      {WARRANTIES.map(w => <option key={w}>{w}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LB}>Last Service Date</label>
                    <input type="date" value={form.lastServiceDate} onChange={e => set('lastServiceDate', e.target.value)} style={inpStyle('lastServiceDate')} />
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div style={{ ...CS, marginBottom: 16 }}>
                <SectionHead title="Line Items" />
                {errs.lineItems && <p style={{ ...ET, marginBottom: 10 }}>{errs.lineItems}</p>}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
                  <thead>
                    <tr>
                      {['Description', 'Qty', 'Unit Price ($)', 'Total', ''].map((h, i) => (
                        <th key={i} style={{ textAlign: i === 0 ? 'left' : 'center', fontSize: 11.5, fontWeight: 600, color: '#9ca3af', padding: '6px 8px', borderBottom: '1px solid #f0f1f3' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.lineItems.map(li => (
                      <tr key={li.id} style={{ borderBottom: '1px solid #f8f9fa' }}>
                        <td style={{ padding: '5px 4px' }}>
                          <input value={li.description} onChange={e => updateLineItem(li.id, 'description', e.target.value)}
                            placeholder="Description"
                            style={{ width: '100%', height: 34, border: '1px solid #e8e9ec', borderRadius: 6, padding: '0 8px', fontSize: 13.5, outline: 'none' }} />
                        </td>
                        <td style={{ padding: '5px 4px', width: 72 }}>
                          <input type="number" value={li.qty} min={1} onChange={e => updateLineItem(li.id, 'qty', e.target.value)}
                            style={{ width: '100%', height: 34, border: '1px solid #e8e9ec', borderRadius: 6, padding: '0 6px', fontSize: 13.5, outline: 'none', textAlign: 'center' }} />
                        </td>
                        <td style={{ padding: '5px 4px', width: 120 }}>
                          <input type="number" value={li.unit} min={0} step="0.01" onChange={e => updateLineItem(li.id, 'unit', e.target.value)}
                            style={{ width: '100%', height: 34, border: '1px solid #e8e9ec', borderRadius: 6, padding: '0 8px', fontSize: 13.5, outline: 'none', textAlign: 'right' }} />
                        </td>
                        <td style={{ padding: '5px 8px', width: 90, textAlign: 'right', fontSize: 13.5, fontWeight: 600, color: '#1a1d23' }}>${li.total.toLocaleString()}</td>
                        <td style={{ padding: '5px 4px', width: 36, textAlign: 'center' }}>
                          <button onClick={() => removeLineItem(li.id)}
                            style={{ width: 28, height: 28, border: 'none', background: '#fef2f2', color: '#dc2626', borderRadius: 6, cursor: 'pointer', fontSize: 16, lineHeight: '28px' }}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={addLineItem}
                  style={{ fontSize: 13, color: '#2563eb', background: 'none', border: '1px dashed #bfdbfe', borderRadius: 7, padding: '6px 14px', cursor: 'pointer', fontWeight: 500 }}>
                  + Add Line Item
                </button>
                <div style={{ borderTop: '1px solid #f0f1f3', marginTop: 14, paddingTop: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: 24, fontSize: 13.5, color: '#6b7280' }}>
                      <span>Subtotal</span>
                      <span style={{ minWidth: 80, textAlign: 'right' }}>${subtotal.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 24, fontSize: 13.5, color: '#6b7280', alignItems: 'center' }}>
                      <span>Tax</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="number" value={form.taxRate} min={0} max={100} step="0.1"
                          onChange={e => set('taxRate', Number(e.target.value) || 0)}
                          style={{ width: 52, height: 28, border: '1px solid #e8e9ec', borderRadius: 5, padding: '0 6px', fontSize: 13, textAlign: 'center', outline: 'none' }} />
                        <span>%</span>
                        <span style={{ minWidth: 60, textAlign: 'right' }}>${taxAmt.toFixed(2)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 24, fontSize: 15, fontWeight: 700, color: '#1a1d23', borderTop: '1px solid #f0f1f3', paddingTop: 8, marginTop: 2 }}>
                      <span>Grand Total</span>
                      <span style={{ minWidth: 80, textAlign: 'right' }}>${grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Job Status — gated by update_job_status permission */}
              {(isAdmin || hasPermission('update_job_status')) && (
              <div style={{ ...CS, marginBottom: 20 }}>
                <SectionHead title="Job Status" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={LB}>Status</label>
                    <select value={form.status} onChange={e => set('status', e.target.value)} style={selStyle('status')}>
                      {JOB_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LB}>Priority</label>
                    <select value={form.priority} onChange={e => set('priority', e.target.value)} style={selStyle('priority')}>
                      {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                {form.status === 'Completed' && (
                  <div style={{ marginTop: 14 }}>
                    <label style={LB}>Completion Notes<Req /></label>
                    <textarea value={form.completionNotes} onChange={e => set('completionNotes', e.target.value)} rows={3}
                      placeholder="Describe what was completed, any follow-up needed…"
                      style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${errs.completionNotes ? '#dc2626' : '#e8e9ec'}`, borderRadius: 7, padding: '10px 12px', fontSize: 13.5, color: '#374151', resize: 'vertical', outline: 'none' }} />
                    {errs.completionNotes && <p style={ET}>{errs.completionNotes}</p>}
                  </div>
                )}
              </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button onClick={() => { setForm(blankForm()); setErrs({}); setErrList([]); setTab('all') }}
                  style={{ height: 40, padding: '0 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={submitCreate}
                  style={{ height: 40, padding: '0 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                  Create Job
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {showCompletion && sel && (
        <JobCompletion
          job={sel}
          onClose={() => setShowCompletion(false)}
          onComplete={handleJobComplete}
        />
      )}
      {showDiagnosis && sel && (
        <DiagnosisReport
          job={sel}
          onClose={() => setShowDiagnosis(false)}
          onComplete={() => {
            setShowDiagnosis(false)
            const updated = getJobs()
            setJobs(updated)
            flash('Diagnosis report submitted.')
          }}
        />
      )}
      {showPartsRequired && sel && (
        <PartsRequired
          job={sel}
          isAdmin={isAdmin}
          onClose={() => setShowPartsRequired(false)}
          onUpdate={() => {
            const updated = getJobs()
            setJobs(updated)
          }}
        />
      )}
      {showPartsReceived && sel && (
        <PartsReceived
          job={sel}
          onClose={() => setShowPartsReceived(false)}
          onComplete={() => {
            setShowPartsReceived(false)
            const updated = getJobs()
            setJobs(updated)
            flash('Parts receipt confirmed.')
          }}
        />
      )}
      {showAIEstimator && (
        <AIEstimator
          serviceType={form.type}
          equipment={form.equipment?.join(', ')}
          onUseEstimate={lineItems => {
            setForm(p => ({
              ...p,
              lineItems: lineItems.map(li => ({ id: Date.now() + Math.random(), description: li.description || '', qty: li.qty || 1, unit: li.unit || 0, total: li.total || 0 })),
            }))
          }}
          onClose={() => setShowAIEstimator(false)}
        />
      )}

      {/* Quick Note floating button */}
      {isAdmin && <QuickNote context="" contextLabel="Jobs" />}
    </div>
  )
}

const CS = { background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }
const CT = { fontSize: 11.5, fontWeight: 700, color: '#9ca3af', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }
const LB = { display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }
const ET = { fontSize: 11, color: '#dc2626', margin: '4px 0 0' }
