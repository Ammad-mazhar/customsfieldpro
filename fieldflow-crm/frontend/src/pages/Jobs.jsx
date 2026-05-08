import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getJobs as storeGetJobs, saveJobs, saveJob,
  getClients as storeGetClients,
  saveInvoice, getInvoices, getSettings,
} from '../data/store'
import * as jobsApi from '../api/jobs'
import * as clientsApi from '../api/clients'
import { useApiData } from '../api/hooks'
import { useAuth } from '../auth/AuthContext'
import { logActivity, ACTIONS } from '../utils/activityLog'
import { createNotification, notifyAdmins, NOTIF_TYPES } from '../utils/notifications'
import { sendJobAssignedEmail, sendJobCompletionEmail } from '../utils/emailService'
import { useIsMobile } from '../utils/useIsMobile'
import JobCompletion from '../components/JobCompletion'
import AIEstimator from '../components/AIEstimator'
import { isAIEnabled } from '../utils/aiEstimator'

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
    jobNumber: `JOB-${Date.now()}`,
    title: '', type: '', description: '', internalNotes: '',
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
  const { data: allJobs, setData: setAllJobs, loading: jobsLoading, error: jobsError } = useApiData(jobsApi.getJobs, storeGetJobs)
  const { data: clients } = useApiData(clientsApi.getClients, storeGetClients)
  // Filter: admins + staff with view_all_jobs see everything; others see own jobs only
  const jobs = (isAdmin || hasPermission('view_all_jobs'))
    ? allJobs
    : allJobs.filter(j => j.technicianId === user?.technicianId)
  function setJobs(newArr) { setAllJobs(newArr) }
  const [settings]            = useState(() => getSettings())
  const [techs]               = useState(() => settings.technicians)
  const [tab, setTab]         = useState('all')
  const [selId, setSelId]     = useState(null)
  const [statusF, setStatusF] = useState('All')
  const [typeF, setTypeF]     = useState('All')
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

  const sel = jobs.find(j => j.id === selId)

  const tabs = [
    { id: 'all',    label: isAdmin ? 'All Jobs' : 'My Jobs' },
    { id: 'detail', label: sel ? `Job Detail (${sel.id})` : 'Job Detail', enabled: !!sel },
    ...((isAdmin || hasPermission('create_jobs')) ? [{ id: 'create', label: 'Create Job' }] : []),
  ]

  function openCreate() { setForm(blankForm()); setErrs({}); setErrList([]); setTab('create') }

  // Keyboard shortcut: Ctrl+N opens create form; Escape closes modals
  useEffect(() => {
    const flag = sessionStorage.getItem('fieldflow_open_new')
    if (flag === 'job') { sessionStorage.removeItem('fieldflow_open_new'); openCreate() }
    function onEscape() { setShowAIEstimator(false); setShowCompletion(false) }
    window.addEventListener('fieldflow:escape', onEscape)
    return () => window.removeEventListener('fieldflow:escape', onEscape)
  }, [])

  function open(id) {
    const j = jobs.find(x => x.id === id)
    setSelId(id); setPendingStatus(j?.status || ''); setPendingPriority(j?.priority || 'Normal'); setTab('detail')
  }

  function flash(msg, type = 'success') {
    setBanner(msg); setBannerType(type); setTimeout(() => setBanner(''), 3500)
  }

  function updateJobs(newArr) {
    setJobs(newArr)
    saveJobs(newArr)
  }

  const visible = jobs.filter(j =>
    (statusF === 'All' || j.status === statusF) &&
    (typeF === 'All' || j.type === typeF)
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

  function submitCreate() {
    const { e, list } = validate()
    if (list.length > 0) { setErrs(e); setErrList(list); return }
    setErrList([])
    const c = clients.find(x => String(x.id) === form.clientId)
    const validItems = form.lineItems.filter(li => li.description.trim())
    const sub = validItems.reduce((s, li) => s + li.total, 0)
    const tax = sub * (form.taxRate / 100)
    const newJob = {
      id: form.jobNumber,
      clientId: Number(form.clientId), clientName: c?.name || '',
      clientPhone: form.clientPhone, clientEmail: c?.email || '', clientAddress: form.clientAddress,
      type: form.type, title: form.title, description: form.description,
      internalNotes: form.internalNotes, notes: form.internalNotes,
      techName: form.techName, technicianId: form.technicianId || '', status: form.status, priority: form.priority,
      date: form.startDate, time: form.startTime, endTime: form.endTime,
      duration: form.duration, recurrence: form.recurrence,
      equipment: form.equipment, equipBrand: form.equipBrand,
      equipModel: form.equipModel, equipSerial: form.equipSerial,
      warrantyStatus: form.warrantyStatus, lastServiceDate: form.lastServiceDate,
      lineItems: validItems, subtotal: sub, taxRate: form.taxRate, total: sub + tax,
      completionNotes: form.completionNotes,
    }
    jobsApi.createJob(newJob).catch(() => {})
    const updated = saveJob(newJob)
    setJobs(updated); setForm(blankForm()); setErrs({}); setErrList([]); setTab('all')
    logActivity(ACTIONS.JOB_CREATED, 'Jobs', newJob.id, `${newJob.id} – ${newJob.clientName}`, `Job created: ${newJob.title}.`)
    // Notify the assigned technician/staff
    if (newJob.technicianId) {
      const users = (() => { try { return JSON.parse(localStorage.getItem('fieldflow_users') || '[]') } catch { return [] } })()
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
    jobsApi.updateJob(sel.id, { status: pendingStatus, priority: pendingPriority }).catch(() => {})
    const newArr = jobs.map(j => j.id === sel.id ? { ...j, status: pendingStatus, priority: pendingPriority } : j)
    updateJobs(newArr)
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
    const hasInvoice = existingInvoices.some(inv => inv.jobRef === sel.id || inv.jobId === sel.id)
    if (!hasInvoice) {
      const newInv = {
        id: `INV-${Date.now()}`,
        clientId: sel.clientId, clientName: sel.clientName, clientPhone: sel.clientPhone,
        clientEmail: sel.clientEmail, clientAddress: sel.clientAddress, jobRef: sel.id,
        issued: new Date().toISOString().split('T')[0], due: '', status: 'Draft',
        lineItems: (sel.lineItems || []).map(li => ({ ...li, id: Date.now() + Math.random() })),
        subtotal: sel.subtotal ?? sel.total, taxRate: sel.taxRate || 0, total: sel.total,
        notes: `Auto-generated from completed ${sel.id}`,
      }
      saveInvoice(newInv)
      logActivity(ACTIONS.INVOICE_CREATED, 'Invoices', newInv.id, `${newInv.id} – ${newInv.clientName}`, `Invoice auto-generated from completed ${sel.id}.`)
      setInvToast({ id: newInv.id, clientName: newInv.clientName })
      setTimeout(() => setInvToast(null), 8000)
    }
  }

  function convertToInvoice(j) {
    const newInv = {
      id: `INV-${Date.now()}`,
      clientId: j.clientId, clientName: j.clientName, clientPhone: j.clientPhone,
      clientEmail: j.clientEmail, clientAddress: j.clientAddress, jobRef: j.id,
      issued: new Date().toISOString().split('T')[0], due: '', status: 'Draft',
      lineItems: j.lineItems.map(li => ({ ...li, id: Date.now() + Math.random() })),
      subtotal: j.subtotal ?? j.total, taxRate: j.taxRate || 0, total: j.total,
      notes: `Auto-filled from ${j.id}`,
    }
    saveInvoice(newInv)
    logActivity(ACTIONS.INVOICE_CREATED, 'Invoices', newInv.id, `${newInv.id} – ${newInv.clientName}`, `Invoice created from ${j.id}.`)
    navigate('/invoices')
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {jobsLoading && <div style={{fontSize:12.5,color:'#9ca3af',display:'flex',alignItems:'center',gap:6}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{animation:'spin 0.8s linear infinite'}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Syncing with server…</div>}
      {jobsError && <div style={{background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',borderRadius:8,padding:'8px 14px',fontSize:13}}>API unavailable — showing cached data</div>}
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
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {STATUSES.map(s => (
                    <button key={s} onClick={() => setStatusF(s)}
                      style={{ height: 32, padding: '0 12px', border: `1px solid ${statusF === s ? '#bfdbfe' : '#e8e9ec'}`, borderRadius: 7, fontSize: 12.5, fontWeight: 500, color: statusF === s ? '#2563eb' : '#6b7280', background: statusF === s ? '#eff6ff' : '#fff', cursor: 'pointer' }}>
                      {s}
                    </button>
                  ))}
                </div>
                <select value={typeF} onChange={e => setTypeF(e.target.value)}
                  style={{ height: 32, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 10px', fontSize: 12.5, color: '#374151', background: '#fff' }}>
                  <option value="All">All Types</option>
                  {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
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
                      {['Job #', 'Client', 'Type', 'Title', 'Priority', 'Technician', 'Status', 'Total', 'Date'].map(h => (
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
                        <td style={{ padding: '11px 14px', fontWeight: 600, color: '#1a1d23', fontSize: 13.5, whiteSpace: 'nowrap' }}>{j.clientName}</td>
                        <td style={{ padding: '11px 14px', fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>{j.type}</td>
                        <td style={{ padding: '11px 14px', fontSize: 13.5, color: '#374151', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</td>
                        <td style={{ padding: '11px 14px' }}>{j.priority ? <PriorityBadge priority={j.priority} /> : <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>}</td>
                        <td style={{ padding: '11px 14px', fontSize: 13.5, color: '#374151', whiteSpace: 'nowrap' }}>{j.techName}</td>
                        <td style={{ padding: '11px 14px' }}><Bdg label={j.status} map={SC} /></td>
                        <td style={{ padding: '11px 14px', fontSize: 13.5, fontWeight: 700, color: '#1a1d23', whiteSpace: 'nowrap' }}>${(j.total || 0).toLocaleString()}</td>
                        <td style={{ padding: '11px 14px', fontSize: 12.5, color: '#9ca3af', whiteSpace: 'nowrap' }}>{j.date}</td>
                      </tr>
                    ))}
                    {!visible.length && <tr><td colSpan={9}><div style={{ textAlign: 'center', padding: '48px 24px' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                <div style={CS}>
                  <p style={CT}>Client</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 6px' }}>{sel.clientName}</p>
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
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {errs.clientId && <p style={ET}>Required</p>}
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
                  <input
                    value={form.clientAddress}
                    onChange={e => set('clientAddress', e.target.value)}
                    placeholder="Auto-filled from client, editable"
                    style={inpStyle('clientAddress')}
                  />
                </div>
              </div>

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
              </div>

              {/* Scheduling */}
              <div style={{ ...CS, marginBottom: 16 }}>
                <SectionHead title="Scheduling" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={LB}>Assigned Technician<Req /></label>
                    <select value={form.techName} onChange={e => {
                        const tech = techs.find(t => t.name === e.target.value)
                        setForm(p => ({ ...p, techName: e.target.value, technicianId: tech?.id || '' }))
                        setErrs(p => ({ ...p, techName: undefined }))
                      }} style={selStyle('techName')}>
                      <option value="">— Select technician —</option>
                      {techs.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
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
    </div>
  )
}

const CS = { background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }
const CT = { fontSize: 11.5, fontWeight: 700, color: '#9ca3af', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }
const LB = { display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }
const ET = { fontSize: 11, color: '#dc2626', margin: '4px 0 0' }
