import { useState, useMemo } from 'react'
import {
  getMaintenancePlans, saveMaintenancePlan, deleteMaintenancePlan,
  getClients, getSettings, saveJobs, getJobs, saveJob,
} from '../data/store'
import { logActivity, ACTIONS } from '../utils/activityLog'
import { generateCompletionReport } from '../utils/generateCompletionReport'

// ── Constants ─────────────────────────────────────────────────────────────────
const FREQUENCIES  = ['Weekly', 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual']
const SERVICE_TYPES = ['HVAC', 'Plumbing', 'Electrical', 'Appliance Repair']
const EQUIPMENT_TYPES = [
  'Microwave', 'Refrigerator', 'Oven', 'Stove & Cooktop',
  'Dryer', 'Washer', 'Dishwasher', 'HVAC & Furnace',
  'Garbage Disposal', 'Water Heater',
]
const DAYS_OF_WEEK  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIME_SLOTS    = ['Morning (8am–12pm)', 'Afternoon (12pm–5pm)', 'Evening (5pm–8pm)']
const TIME_MAP      = { 'Morning (8am–12pm)': '08:00', 'Afternoon (12pm–5pm)': '12:00', 'Evening (5pm–8pm)': '17:00' }
const PLAN_STATUSES = ['Active', 'Paused', 'Expired']

const SC = {
  Active:  { bg: '#f0fdf4', color: '#16a34a' },
  Paused:  { bg: '#fffbeb', color: '#d97706' },
  Expired: { bg: '#f3f4f6', color: '#6b7280' },
}

const SERVICE_COLORS = {
  HVAC:             { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  Plumbing:         { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  Electrical:       { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  'Appliance Repair': { bg: '#fdf4ff', color: '#9333ea', border: '#e9d5ff' },
}
function svcColor(type) {
  return SERVICE_COLORS[type] ?? { bg: '#f3f4f6', color: '#6b7280', border: '#e8e9ec' }
}

function blankForm() {
  return {
    clientId: '', planName: '', serviceType: '', equipment: [],
    frequency: 'Monthly', startDate: '', endDate: '', noEndDate: true,
    preferredDay: 'Monday', preferredTime: 'Morning (8am–12pm)',
    technicianId: '', techName: '', pricePerVisit: '', notes: '',
    status: 'Active',
  }
}

// ── Recurrence engine — returns array of ISO date strings in next 90 days ─────
function getUpcomingDates(plan, windowDays = 90) {
  const today    = new Date(); today.setHours(0,0,0,0)
  const end      = new Date(today); end.setDate(end.getDate() + windowDays)
  const planEnd  = plan.noEndDate ? null : plan.endDate ? new Date(plan.endDate) : null
  const cutoff   = planEnd && planEnd < end ? planEnd : end

  // start from the later of today or plan startDate
  let cursor = plan.startDate ? new Date(plan.startDate) : new Date(today)
  cursor.setHours(0,0,0,0)
  if (cursor < today) {
    // Advance cursor to first occurrence >= today
    const freqDays = { Weekly: 7, Monthly: 30, Quarterly: 91, 'Semi-Annual': 182, Annual: 365 }[plan.frequency] || 30
    while (cursor < today) {
      if (plan.frequency === 'Monthly') {
        cursor.setMonth(cursor.getMonth() + 1)
      } else if (plan.frequency === 'Quarterly') {
        cursor.setMonth(cursor.getMonth() + 3)
      } else if (plan.frequency === 'Semi-Annual') {
        cursor.setMonth(cursor.getMonth() + 6)
      } else if (plan.frequency === 'Annual') {
        cursor.setFullYear(cursor.getFullYear() + 1)
      } else {
        cursor.setDate(cursor.getDate() + freqDays)
      }
    }
  }

  const dates = []
  let safetyLimit = 200
  while (cursor <= cutoff && safetyLimit-- > 0) {
    dates.push(cursor.toISOString().split('T')[0])
    if (plan.frequency === 'Weekly') {
      cursor = new Date(cursor); cursor.setDate(cursor.getDate() + 7)
    } else if (plan.frequency === 'Monthly') {
      cursor = new Date(cursor); cursor.setMonth(cursor.getMonth() + 1)
    } else if (plan.frequency === 'Quarterly') {
      cursor = new Date(cursor); cursor.setMonth(cursor.getMonth() + 3)
    } else if (plan.frequency === 'Semi-Annual') {
      cursor = new Date(cursor); cursor.setMonth(cursor.getMonth() + 6)
    } else if (plan.frequency === 'Annual') {
      cursor = new Date(cursor); cursor.setFullYear(cursor.getFullYear() + 1)
    }
  }
  return dates
}

// ── Next due date for a plan ───────────────────────────────────────────────────
function nextDue(plan) {
  const dates = getUpcomingDates(plan, 400)
  if (!dates.length) return '—'
  return new Date(dates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Reusable UI pieces ────────────────────────────────────────────────────────
function LabeledField({ label, required, error, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
        {label}{required && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <p style={{ fontSize: 11.5, color: '#dc2626', margin: '3px 0 0' }}>{error}</p>}
    </div>
  )
}

const inp = (err) => ({
  width: '100%', boxSizing: 'border-box', height: 36, padding: '0 10px',
  border: `1px solid ${err ? '#dc2626' : '#e8e9ec'}`, borderRadius: 7,
  fontSize: 13, color: '#374151', outline: 'none', background: '#fff',
})

const sel = (err) => ({ ...inp(err), appearance: 'auto' })

function Bdg({ label, map = SC }) {
  const c = map[label] ?? { bg: '#f3f4f6', color: '#6b7280' }
  return (
    <span style={{ display: 'inline-block', fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: c.bg, color: c.color }}>
      {label}
    </span>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', ...style }}>
      {children}
    </div>
  )
}

// ── Generate Jobs Preview Modal ───────────────────────────────────────────────
function GenerateModal({ plan, onClose, onConfirm }) {
  const dates      = getUpcomingDates(plan, 90)
  const timeStr    = TIME_MAP[plan.preferredTime] || '08:00'

  const preview = dates.map(d => ({
    date: d,
    label: new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    time: timeStr,
  }))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(10,15,30,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 540, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', animation: 'modalIn 0.15s ease' }}>
        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f0f1f3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1a1d23', margin: 0 }}>Generate Jobs Preview</h3>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>{plan.planName} — {plan.clientName}</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #e8e9ec', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 16 }}>×</button>
        </div>

        {/* Summary */}
        <div style={{ padding: '14px 22px', background: preview.length > 0 ? '#f0fdf4' : '#fef2f2', borderBottom: '1px solid #f0f1f3' }}>
          {preview.length > 0 ? (
            <p style={{ fontSize: 13.5, color: '#15803d', fontWeight: 600, margin: 0 }}>
              ✓ {preview.length} job{preview.length !== 1 ? 's' : ''} will be created for the next 90 days
              <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 8, fontSize: 12 }}>
                ({plan.frequency} · ${Number(plan.pricePerVisit || 0).toLocaleString()} per visit)
              </span>
            </p>
          ) : (
            <p style={{ fontSize: 13.5, color: '#dc2626', fontWeight: 600, margin: 0 }}>
              No upcoming dates in the next 90 days for this plan.
            </p>
          )}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {preview.length === 0 && (
            <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 32 }}>Nothing to generate.</p>
          )}
          {preview.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 22px', borderBottom: i < preview.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1d23', margin: 0 }}>{p.label}</p>
                <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '1px 0 0' }}>{plan.serviceType} · {plan.preferredTime} · {plan.techName || 'Unassigned'}</p>
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>${Number(plan.pricePerVisit || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid #f0f1f3', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid #e8e9ec', background: '#fff', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(preview)} disabled={preview.length === 0}
            style={{ padding: '8px 20px', borderRadius: 7, border: 'none', background: preview.length > 0 ? '#16a34a' : '#d1d5db', color: '#fff', fontSize: 13, fontWeight: 600, cursor: preview.length > 0 ? 'pointer' : 'default' }}>
            Create {preview.length} Job{preview.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
      <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.97) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Maintenance() {
  const [plans, setPlans]         = useState(() => getMaintenancePlans())
  const clients                   = useMemo(() => getClients(), [])
  const settings                  = useMemo(() => getSettings(), [])
  const techs                     = settings.technicians || []

  const [tab, setTab]             = useState('plans')
  const [form, setForm]           = useState(blankForm)
  const [errs, setErrs]           = useState({})
  const [editId, setEditId]       = useState(null)
  const [banner, setBanner]       = useState('')
  const [bannerType, setBannerType] = useState('success')

  // Filter state
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterService, setFilterService] = useState('All')

  // Tab 2 — Upcoming
  const [skipModal, setSkipModal] = useState(null) // { plan, date }
  const [skipReason, setSkipReason] = useState('')
  const [scheduleModal, setScheduleModal] = useState(null) // { plan, date }
  const [schedTime, setSchedTime] = useState('09:00')
  const [schedTechId, setSchedTechId] = useState('')

  // Tab 3 — History filters
  const [histClient, setHistClient]   = useState('')
  const [histTech, setHistTech]       = useState('')
  const [histFrom, setHistFrom]       = useState('')
  const [histTo, setHistTo]           = useState('')

  // Generate preview modal
  const [genPlan, setGenPlan]     = useState(null)

  // ── Upcoming maintenance: next 30 days, grouped by date ───────────────────
  const upcomingByDate = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0)
    const end   = new Date(today); end.setDate(end.getDate() + 30)
    const activePlans = plans.filter(p => p.status === 'Active')
    const entries = []
    activePlans.forEach(plan => {
      const dates = getUpcomingDates(plan, 30)
      dates.forEach(d => entries.push({ plan, date: d }))
    })
    // sort by date
    entries.sort((a, b) => a.date.localeCompare(b.date))
    // group by date
    const groups = {}
    entries.forEach(e => {
      if (!groups[e.date]) groups[e.date] = []
      groups[e.date].push(e)
    })
    return Object.entries(groups)
  }, [plans])

  // ── History: completed maintenance jobs ────────────────────────────────────
  const historyJobs = useMemo(() => {
    const jobs = getJobs()
    return jobs.filter(j =>
      j.maintenancePlanId &&
      j.status === 'Completed' &&
      (!histClient || j.clientName?.toLowerCase().includes(histClient.toLowerCase())) &&
      (!histTech   || (j.techName || '').toLowerCase().includes(histTech.toLowerCase())) &&
      (!histFrom   || j.startDate >= histFrom) &&
      (!histTo     || j.startDate <= histTo)
    ).sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
  }, [plans, histClient, histTech, histFrom, histTo])

  function flash(msg, type = 'success') {
    setBanner(msg); setBannerType(type); setTimeout(() => setBanner(''), 4000)
  }

  function set(f, v) {
    setForm(p => ({ ...p, [f]: v }))
    setErrs(p => ({ ...p, [f]: undefined }))
  }

  function toggleEquipment(item) {
    setForm(p => ({
      ...p,
      equipment: p.equipment.includes(item)
        ? p.equipment.filter(x => x !== item)
        : [...p.equipment, item],
    }))
  }

  function handleClientChange(clientId) {
    const c = clients.find(x => String(x.id) === clientId)
    setForm(p => ({ ...p, clientId, clientName: c?.name || '' }))
    setErrs(p => ({ ...p, clientId: undefined }))
  }

  function handleTechChange(techId) {
    const t = techs.find(x => x.id === techId)
    setForm(p => ({ ...p, technicianId: techId, techName: t?.name || '' }))
  }

  function validate() {
    const e = {}
    if (!form.clientId)    e.clientId   = 'Required'
    if (!form.planName.trim()) e.planName = 'Required'
    if (!form.serviceType) e.serviceType = 'Required'
    if (!form.startDate)   e.startDate  = 'Required'
    if (!form.pricePerVisit && form.pricePerVisit !== 0) e.pricePerVisit = 'Required'
    setErrs(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const plan = {
      ...form,
      id:         editId || `PLAN-${Date.now()}`,
      clientName: clients.find(c => String(c.id) === form.clientId)?.name || '',
      createdAt:  editId ? (plans.find(p => p.id === editId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    }
    saveMaintenancePlan(plan)
    const refreshed = getMaintenancePlans()
    setPlans(refreshed)
    logActivity(
      editId ? ACTIONS.JOB_UPDATED : ACTIONS.JOB_CREATED,
      'Maintenance', plan.id, plan.planName,
      editId ? `Plan updated for ${plan.clientName}.` : `New maintenance plan created for ${plan.clientName}.`
    )
    flash(editId ? 'Plan updated.' : 'Plan created.')
    setForm(blankForm()); setEditId(null); setErrs({}); setTab('plans')
  }

  function handleEdit(plan) {
    setForm({ ...blankForm(), ...plan })
    setEditId(plan.id)
    setTab('create')
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this maintenance plan?')) return
    deleteMaintenancePlan(id)
    setPlans(getMaintenancePlans())
    flash('Plan deleted.', 'error')
  }

  function toggleStatus(plan) {
    const next = { ...plan, status: plan.status === 'Active' ? 'Paused' : 'Active' }
    saveMaintenancePlan(next)
    setPlans(getMaintenancePlans())
  }

  function handleSkipConfirm() {
    if (!skipModal) return
    const { plan, date } = skipModal
    // Create a cancelled job to mark this occurrence as skipped
    const skippedJob = {
      id: `JOB-${Date.now()}`,
      clientId: plan.clientId, clientName: plan.clientName,
      type: plan.serviceType, title: plan.planName,
      techName: plan.techName || '', technicianId: plan.technicianId || '',
      startDate: date, status: 'Cancelled',
      maintenancePlanId: plan.id,
      notes: `Skipped: ${skipReason || 'No reason provided'}`,
      lineItems: [], subtotal: 0, taxRate: 0, total: 0,
      completionNotes: '', priority: 'Normal',
      jobNumber: `JOB-${Date.now()}`,
    }
    const jobs = getJobs()
    saveJobs([...jobs, skippedJob])
    logActivity(ACTIONS.JOB_UPDATED, 'Maintenance', plan.id, plan.planName, `Skipped occurrence on ${date}: ${skipReason}`)
    setSkipModal(null); setSkipReason('')
    flash(`Occurrence on ${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} skipped.`, 'error')
  }

  function handleScheduleConfirm() {
    if (!scheduleModal) return
    const { plan, date } = scheduleModal
    const price = Number(plan.pricePerVisit || 0)
    const t = techs.find(x => x.id === schedTechId)
    const newJob = {
      id: `JOB-${Date.now()}`,
      clientId: plan.clientId, clientName: plan.clientName,
      clientPhone: clients.find(c => String(c.id) === plan.clientId)?.phone || '',
      clientEmail: clients.find(c => String(c.id) === plan.clientId)?.email || '',
      clientAddress: (() => { const c = clients.find(x => String(x.id) === plan.clientId); return c ? [c.address, c.city, c.state].filter(Boolean).join(', ') : '' })(),
      type: plan.serviceType, title: plan.planName,
      techName: t?.name || plan.techName || '', technicianId: schedTechId || plan.technicianId || '',
      startDate: date, time: schedTime, status: 'Scheduled', priority: 'Normal',
      maintenancePlanId: plan.id,
      lineItems: price > 0 ? [{ id: Date.now(), description: plan.planName, qty: 1, unit: price, total: price }] : [],
      subtotal: price, taxRate: 0, total: price,
      completionNotes: '', notes: `Scheduled from maintenance plan: ${plan.planName}`,
      jobNumber: `JOB-${Date.now()}`,
    }
    const jobs = getJobs()
    saveJobs([...jobs, newJob])
    logActivity(ACTIONS.JOB_CREATED, 'Jobs', newJob.id, `${newJob.id} – ${newJob.clientName}`, `Scheduled from maintenance plan ${plan.id}.`)
    setScheduleModal(null); setSchedTime('09:00'); setSchedTechId('')
    flash(`Job scheduled for ${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`)
  }

  function handleGenerateConfirm(previews, plan) {
    const existing = getJobs()
    const newJobs  = previews.map(p => {
      const price = Number(plan.pricePerVisit || 0)
      return {
        id:           `JOB-${Date.now()}-${Math.floor(Math.random()*9999)}`,
        clientId:     plan.clientId,
        clientName:   plan.clientName,
        clientPhone:  clients.find(c => String(c.id) === plan.clientId)?.phone || '',
        clientEmail:  clients.find(c => String(c.id) === plan.clientId)?.email || '',
        clientAddress: (() => { const c = clients.find(x => String(x.id) === plan.clientId); return c ? [c.address, c.city, c.state].filter(Boolean).join(', ') : '' })(),
        type:         plan.serviceType,
        title:        plan.planName,
        description:  `Recurring maintenance — ${plan.frequency} plan. ${plan.notes || ''}`.trim(),
        techName:     plan.techName || '',
        technicianId: plan.technicianId || '',
        startDate:    p.date,
        time:         p.time,
        duration:     '',
        recurrence:   plan.frequency,
        equipment:    plan.equipment,
        status:       'Scheduled',
        priority:     'Normal',
        maintenancePlanId: plan.id,
        lineItems:    price > 0
          ? [{ id: Date.now() + Math.random(), description: plan.planName, qty: 1, unit: price, total: price }]
          : [],
        subtotal: price, taxRate: 0, total: price,
        completionNotes: '',
        notes: `Generated from maintenance plan: ${plan.planName}`,
        jobNumber: `JOB-${Date.now()}`,
        warrantyStatus: 'Unknown',
      }
    })
    saveJobs([...existing, ...newJobs])
    newJobs.forEach(j => logActivity(ACTIONS.JOB_CREATED, 'Jobs', j.id, `${j.id} – ${j.clientName}`, `Auto-generated from maintenance plan ${plan.id}.`))
    setGenPlan(null)
    flash(`${newJobs.length} job${newJobs.length !== 1 ? 's' : ''} created successfully.`)
  }

  // Filtered plans
  const visiblePlans = plans.filter(p =>
    (filterStatus === 'All' || p.status === filterStatus) &&
    (filterService === 'All' || p.serviceType === filterService)
  )

  const TABS = [
    { id: 'plans',    label: 'Maintenance Plans' },
    { id: 'upcoming', label: 'Upcoming (30 days)' },
    { id: 'history',  label: 'History' },
    { id: 'create',   label: editId ? 'Edit Plan' : 'Create Plan' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {banner && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 600,
          background: bannerType === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${bannerType === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: bannerType === 'success' ? '#16a34a' : '#dc2626',
        }}>
          {bannerType === 'success' ? '✓' : '⚠'} {banner}
        </div>
      )}

      <Card style={{ padding: 0 }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e8e9ec' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'plans') { setEditId(null); setForm(blankForm()); setErrs({}) } }}
              style={{
                padding: '11px 22px', fontSize: 13.5, fontWeight: tab === t.id ? 700 : 500,
                color: tab === t.id ? '#2563eb' : '#6b7280', background: 'none', border: 'none',
                borderBottom: `2px solid ${tab === t.id ? '#2563eb' : 'transparent'}`,
                cursor: 'pointer', marginBottom: -1,
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 24 }}>

          {/* ══ PLANS LIST ═══════════════════════════════════════════════════ */}
          {tab === 'plans' && (
            <div>
              {/* Filters + New button */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['All', ...PLAN_STATUSES].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      style={{ height: 30, padding: '0 12px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: `1px solid ${filterStatus === s ? '#bfdbfe' : '#e8e9ec'}`, background: filterStatus === s ? '#eff6ff' : '#fff', color: filterStatus === s ? '#2563eb' : '#6b7280' }}>
                      {s}
                    </button>
                  ))}
                </div>
                <select value={filterService} onChange={e => setFilterService(e.target.value)}
                  style={{ height: 30, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 8px', fontSize: 12, color: '#374151', background: '#fff' }}>
                  <option value="All">All Services</option>
                  {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
                </select>
                <button onClick={() => { setTab('create'); setEditId(null); setForm(blankForm()); setErrs({}) }}
                  style={{ height: 34, padding: '0 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>
                  + New Plan
                </button>
              </div>

              <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>{visiblePlans.length} plan{visiblePlans.length !== 1 ? 's' : ''}</p>

              {visiblePlans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
                  <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
                  </svg>
                  <p style={{ fontSize: 14, margin: 0 }}>No maintenance plans yet.</p>
                  <button onClick={() => setTab('create')} style={{ marginTop: 12, padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Create First Plan
                  </button>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                    <thead>
                      <tr>
                        {['Client', 'Plan Name', 'Service', 'Frequency', 'Next Due', 'Technician', 'Price/Visit', 'Status', 'Actions'].map(h => (
                          <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.4px', padding: '8px 12px', borderBottom: '1px solid #f0f1f3', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePlans.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f8f9fa' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '11px 12px', fontWeight: 600, color: '#1a1d23', whiteSpace: 'nowrap' }}>{p.clientName}</td>
                          <td style={{ padding: '11px 12px', color: '#374151', maxWidth: 180 }}>
                            <p style={{ margin: 0, fontWeight: 600 }}>{p.planName}</p>
                            {p.equipment?.length > 0 && (
                              <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#9ca3af' }}>{p.equipment.slice(0, 2).join(', ')}{p.equipment.length > 2 ? ` +${p.equipment.length - 2}` : ''}</p>
                            )}
                          </td>
                          <td style={{ padding: '11px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{p.serviceType}</td>
                          <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#eff6ff', color: '#2563eb' }}>{p.frequency}</span>
                          </td>
                          <td style={{ padding: '11px 12px', color: '#374151', whiteSpace: 'nowrap', fontSize: 13 }}>{p.status === 'Active' ? nextDue(p) : '—'}</td>
                          <td style={{ padding: '11px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{p.techName || <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>Unassigned</span>}</td>
                          <td style={{ padding: '11px 12px', fontWeight: 600, color: '#1a1d23' }}>${Number(p.pricePerVisit || 0).toLocaleString()}</td>
                          <td style={{ padding: '11px 12px' }}><Bdg label={p.status} /></td>
                          <td style={{ padding: '11px 12px' }}>
                            <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'nowrap' }}>
                              {/* Generate Jobs */}
                              {p.status === 'Active' && (
                                <button onClick={() => setGenPlan(p)}
                                  style={{ height: 28, padding: '0 10px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                  Generate Jobs
                                </button>
                              )}
                              {/* Edit */}
                              <button onClick={() => handleEdit(p)}
                                style={{ height: 28, padding: '0 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                Edit
                              </button>
                              {/* Pause / Resume */}
                              <button onClick={() => toggleStatus(p)}
                                style={{ height: 28, padding: '0 10px', background: p.status === 'Active' ? '#fffbeb' : '#f0fdf4', color: p.status === 'Active' ? '#d97706' : '#16a34a', border: `1px solid ${p.status === 'Active' ? '#fde68a' : '#bbf7d0'}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                {p.status === 'Active' ? 'Pause' : 'Resume'}
                              </button>
                              {/* Delete */}
                              <button onClick={() => handleDelete(p.id)}
                                style={{ height: 28, width: 28, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                ×
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══ CREATE / EDIT PLAN ══════════════════════════════════════════ */}
          {tab === 'create' && (
            <div style={{ maxWidth: 760 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1d23', margin: '0 0 20px' }}>
                {editId ? 'Edit Maintenance Plan' : 'Create Maintenance Plan'}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* ── Client & Plan Name ── */}
                <Card>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1d23', margin: '0 0 14px', letterSpacing: '-0.1px' }}>Plan Information</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <LabeledField label="Client" required error={errs.clientId}>
                      <select value={form.clientId} onChange={e => handleClientChange(e.target.value)} style={sel(errs.clientId)}>
                        <option value="">— Select client —</option>
                        {clients.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                      </select>
                    </LabeledField>

                    <LabeledField label="Plan Name" required error={errs.planName}>
                      <input
                        value={form.planName}
                        onChange={e => set('planName', e.target.value)}
                        placeholder="e.g. Annual HVAC Maintenance"
                        style={inp(errs.planName)}
                      />
                    </LabeledField>

                    <LabeledField label="Service Type" required error={errs.serviceType}>
                      <select value={form.serviceType} onChange={e => set('serviceType', e.target.value)} style={sel(errs.serviceType)}>
                        <option value="">— Select type —</option>
                        {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </LabeledField>

                    <LabeledField label="Price Per Visit" required error={errs.pricePerVisit}>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 13 }}>$</span>
                        <input
                          type="number" min="0"
                          value={form.pricePerVisit}
                          onChange={e => set('pricePerVisit', e.target.value)}
                          placeholder="0.00"
                          style={{ ...inp(errs.pricePerVisit), paddingLeft: 22 }}
                        />
                      </div>
                    </LabeledField>
                  </div>
                </Card>

                {/* ── Equipment ── */}
                <Card>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1d23', margin: '0 0 12px' }}>Equipment Covered</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {EQUIPMENT_TYPES.map(item => {
                      const on = form.equipment.includes(item)
                      return (
                        <button key={item} type="button" onClick={() => toggleEquipment(item)}
                          style={{ height: 30, padding: '0 12px', borderRadius: 20, border: `1px solid ${on ? '#bfdbfe' : '#e8e9ec'}`, background: on ? '#eff6ff' : '#fff', color: on ? '#2563eb' : '#6b7280', fontSize: 12.5, fontWeight: on ? 600 : 400, cursor: 'pointer', transition: 'all 0.12s' }}>
                          {on ? '✓ ' : ''}{item}
                        </button>
                      )
                    })}
                  </div>
                </Card>

                {/* ── Recurrence ── */}
                <Card>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1d23', margin: '0 0 14px' }}>Recurrence Schedule</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <LabeledField label="Frequency" required>
                      <select value={form.frequency} onChange={e => set('frequency', e.target.value)} style={sel()}>
                        {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                      </select>
                    </LabeledField>

                    <LabeledField label="Start Date" required error={errs.startDate}>
                      <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} style={inp(errs.startDate)} />
                    </LabeledField>

                    <div>
                      <LabeledField label="End Date">
                        <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} disabled={form.noEndDate} style={{ ...inp(), opacity: form.noEndDate ? 0.5 : 1 }} />
                      </LabeledField>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.noEndDate} onChange={e => setForm(p => ({ ...p, noEndDate: e.target.checked, endDate: e.target.checked ? '' : p.endDate }))} />
                        <span style={{ fontSize: 12.5, color: '#6b7280' }}>No end date (ongoing)</span>
                      </label>
                    </div>

                    {(form.frequency === 'Weekly' || form.frequency === 'Monthly') && (
                      <LabeledField label="Preferred Day of Week">
                        <select value={form.preferredDay} onChange={e => set('preferredDay', e.target.value)} style={sel()}>
                          {DAYS_OF_WEEK.map(d => <option key={d}>{d}</option>)}
                        </select>
                      </LabeledField>
                    )}

                    <LabeledField label="Preferred Time of Day">
                      <select value={form.preferredTime} onChange={e => set('preferredTime', e.target.value)} style={sel()}>
                        {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </LabeledField>
                  </div>
                </Card>

                {/* ── Technician ── */}
                <Card>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1d23', margin: '0 0 14px' }}>Assignment</p>
                  <div style={{ maxWidth: 340 }}>
                    <LabeledField label="Assigned Technician">
                      <select value={form.technicianId} onChange={e => handleTechChange(e.target.value)} style={sel()}>
                        <option value="">— Unassigned —</option>
                        {techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </LabeledField>
                  </div>
                </Card>

                {/* ── Notes ── */}
                <Card>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1d23', margin: '0 0 10px' }}>Notes / Special Instructions</p>
                  <textarea
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                    placeholder="Access instructions, client preferences, equipment quirks…"
                    rows={3}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #e8e9ec', borderRadius: 7, fontSize: 13, color: '#374151', resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.6 }}
                  />
                </Card>

                {/* ── Status (edit only) ── */}
                {editId && (
                  <Card>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1d23', margin: '0 0 10px' }}>Plan Status</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {PLAN_STATUSES.map(s => (
                        <button key={s} type="button" onClick={() => set('status', s)}
                          style={{ height: 32, padding: '0 14px', borderRadius: 20, border: `1px solid ${form.status === s ? '#bfdbfe' : '#e8e9ec'}`, background: form.status === s ? '#eff6ff' : '#fff', color: form.status === s ? '#2563eb' : '#6b7280', fontSize: 12.5, fontWeight: form.status === s ? 700 : 400, cursor: 'pointer' }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </Card>
                )}

                {/* ── Actions ── */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                  <button onClick={() => { setTab('plans'); setEditId(null); setForm(blankForm()); setErrs({}) }}
                    style={{ padding: '9px 20px', borderRadius: 7, border: '1px solid #e8e9ec', background: '#fff', fontSize: 13.5, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={handleSave}
                    style={{ padding: '9px 24px', borderRadius: 7, border: 'none', background: '#2563eb', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                    {editId ? 'Save Changes' : 'Create Plan'}
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ══ UPCOMING ═════════════════════════════════════════════════════ */}
          {tab === 'upcoming' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Upcoming Maintenance</h3>
                  <p style={{ fontSize: 12.5, color: '#9ca3af', margin: '3px 0 0' }}>Next 30 days — active plans only</p>
                </div>
                {/* Color legend */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {Object.entries(SERVICE_COLORS).map(([svc, c]) => (
                    <div key={svc} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color, display: 'inline-block' }} />
                      <span style={{ fontSize: 11.5, color: '#6b7280' }}>{svc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {upcomingByDate.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
                  <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth="1.5" style={{ marginBottom: 12 }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>
                  <p style={{ fontSize: 14, margin: 0 }}>No upcoming maintenance in the next 30 days.</p>
                  <p style={{ fontSize: 12.5, color: '#c4c9d4', margin: '6px 0 0' }}>Create active maintenance plans to see upcoming visits here.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {upcomingByDate.map(([date, entries]) => {
                    const d         = new Date(date)
                    const isToday   = date === new Date().toISOString().split('T')[0]
                    const dayLabel  = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                    return (
                      <div key={date}>
                        {/* Date header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 10, background: isToday ? '#2563eb' : '#f3f4f6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: isToday ? '#bfdbfe' : '#9ca3af', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                              {d.toLocaleDateString('en-US', { weekday: 'short' })}
                            </span>
                            <span style={{ fontSize: 18, fontWeight: 800, color: isToday ? '#fff' : '#1a1d23', lineHeight: 1.2 }}>
                              {d.getDate()}
                            </span>
                          </div>
                          <div>
                            <p style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1d23', margin: 0 }}>{dayLabel}</p>
                            {isToday && <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '1px 7px', borderRadius: 20 }}>TODAY</span>}
                          </div>
                          <div style={{ flex: 1, height: 1, background: '#f0f1f3', marginLeft: 8 }} />
                          <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>{entries.length} visit{entries.length !== 1 ? 's' : ''}</span>
                        </div>

                        {/* Entries */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 54 }}>
                          {entries.map(({ plan }, i) => {
                            const c = svcColor(plan.serviceType)
                            return (
                              <div key={`${plan.id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, border: `1px solid ${c.border}`, background: c.bg }}>
                                {/* Service color bar */}
                                <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: c.color, flexShrink: 0 }} />

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1d23', margin: 0 }}>{plan.clientName}</p>
                                  <p style={{ fontSize: 12.5, color: '#6b7280', margin: '2px 0 0' }}>
                                    {plan.planName}
                                    <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: '#fff', color: c.color, border: `1px solid ${c.border}` }}>{plan.serviceType}</span>
                                  </p>
                                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '3px 0 0' }}>
                                    {plan.techName ? `Technician: ${plan.techName}` : 'No technician assigned'} · {plan.preferredTime}
                                  </p>
                                </div>

                                {/* Price */}
                                <span style={{ fontSize: 13, fontWeight: 700, color: c.color, flexShrink: 0 }}>
                                  ${Number(plan.pricePerVisit || 0).toLocaleString()}
                                </span>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                  <button onClick={() => { setScheduleModal({ plan, date }); setSchedTechId(plan.technicianId || '') }}
                                    style={{ height: 30, padding: '0 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                    Schedule
                                  </button>
                                  <button onClick={() => { setSkipModal({ plan, date }); setSkipReason('') }}
                                    style={{ height: 30, padding: '0 12px', background: '#fff', color: '#6b7280', border: '1px solid #e8e9ec', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                                    Skip
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ HISTORY ══════════════════════════════════════════════════════ */}
          {tab === 'history' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1d23', margin: '0 0 16px' }}>Maintenance History</h3>

              {/* Filters */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text" placeholder="Filter by client…" value={histClient} onChange={e => setHistClient(e.target.value)}
                  style={{ height: 34, padding: '0 10px', border: '1px solid #e8e9ec', borderRadius: 7, fontSize: 13, color: '#374151', outline: 'none', width: 160 }}
                />
                <input
                  type="text" placeholder="Filter by technician…" value={histTech} onChange={e => setHistTech(e.target.value)}
                  style={{ height: 34, padding: '0 10px', border: '1px solid #e8e9ec', borderRadius: 7, fontSize: 13, color: '#374151', outline: 'none', width: 180 }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>From</span>
                  <input type="date" value={histFrom} onChange={e => setHistFrom(e.target.value)}
                    style={{ height: 34, padding: '0 8px', border: '1px solid #e8e9ec', borderRadius: 7, fontSize: 13, color: '#374151', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>To</span>
                  <input type="date" value={histTo} onChange={e => setHistTo(e.target.value)}
                    style={{ height: 34, padding: '0 8px', border: '1px solid #e8e9ec', borderRadius: 7, fontSize: 13, color: '#374151', outline: 'none' }} />
                </div>
                {(histClient || histTech || histFrom || histTo) && (
                  <button onClick={() => { setHistClient(''); setHistTech(''); setHistFrom(''); setHistTo('') }}
                    style={{ height: 34, padding: '0 12px', border: '1px solid #e8e9ec', borderRadius: 7, fontSize: 12.5, color: '#6b7280', background: '#fff', cursor: 'pointer' }}>
                    Clear
                  </button>
                )}
                <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 'auto' }}>{historyJobs.length} completed visit{historyJobs.length !== 1 ? 's' : ''}</span>
              </div>

              {historyJobs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
                  <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth="1.5" style={{ marginBottom: 10 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <p style={{ fontSize: 14, margin: 0 }}>No completed maintenance visits found.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                    <thead>
                      <tr>
                        {['Date', 'Client', 'Plan', 'Technician', 'Status', 'Completion Report'].map(h => (
                          <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.4px', padding: '8px 12px', borderBottom: '1px solid #f0f1f3', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {historyJobs.map(j => {
                        const plan = plans.find(p => p.id === j.maintenancePlanId)
                        return (
                          <tr key={j.id} style={{ borderBottom: '1px solid #f8f9fa' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '11px 12px', color: '#374151', whiteSpace: 'nowrap' }}>
                              {j.startDate ? new Date(j.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </td>
                            <td style={{ padding: '11px 12px', fontWeight: 600, color: '#1a1d23' }}>{j.clientName}</td>
                            <td style={{ padding: '11px 12px', color: '#6b7280' }}>
                              {plan?.planName || j.title || '—'}
                              {j.type && (
                                <span style={{ marginLeft: 7, fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 20, ...svcColor(j.type) }}>
                                  {j.type}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '11px 12px', color: '#6b7280' }}>{j.techName || '—'}</td>
                            <td style={{ padding: '11px 12px' }}>
                              <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: '#f0fdf4', color: '#16a34a' }}>Completed</span>
                            </td>
                            <td style={{ padding: '11px 12px' }}>
                              {(j.completionNotes || j.clientSignature || j.afterPhotos?.length > 0) ? (
                                <button
                                  onClick={() => generateCompletionReport(j, j)}
                                  style={{ height: 28, padding: '0 12px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                  PDF
                                </button>
                              ) : (
                                <span style={{ fontSize: 12, color: '#d1d5db', fontStyle: 'italic' }}>No report</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </Card>

      {/* Generate Jobs Modal */}
      {genPlan && (
        <GenerateModal
          plan={genPlan}
          onClose={() => setGenPlan(null)}
          onConfirm={(previews) => handleGenerateConfirm(previews, genPlan)}
        />
      )}

      {/* Skip Modal */}
      {skipModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(10,15,30,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => e.target === e.currentTarget && setSkipModal(null)}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 420, padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 6px' }}>Skip This Occurrence</h3>
            <p style={{ fontSize: 12.5, color: '#9ca3af', margin: '0 0 18px' }}>
              {skipModal.plan.planName} — {new Date(skipModal.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Reason (optional)</label>
            <textarea
              value={skipReason}
              onChange={e => setSkipReason(e.target.value)}
              placeholder="e.g. Client requested reschedule, technician unavailable…"
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #e8e9ec', borderRadius: 8, fontSize: 13, color: '#374151', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setSkipModal(null)} style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid #e8e9ec', background: '#fff', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSkipConfirm} style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Skip Occurrence</button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(10,15,30,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => e.target === e.currentTarget && setScheduleModal(null)}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 420, padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 6px' }}>Schedule Visit</h3>
            <p style={{ fontSize: 12.5, color: '#9ca3af', margin: '0 0 18px' }}>
              {scheduleModal.plan.planName} — {new Date(scheduleModal.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Time</label>
                <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)}
                  style={{ width: '100%', height: 36, padding: '0 10px', border: '1px solid #e8e9ec', borderRadius: 7, fontSize: 13, color: '#374151', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Assign Technician</label>
                <select value={schedTechId} onChange={e => setSchedTechId(e.target.value)}
                  style={{ width: '100%', height: 36, padding: '0 10px', border: '1px solid #e8e9ec', borderRadius: 7, fontSize: 13, color: '#374151', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="">— Keep plan default ({scheduleModal.plan.techName || 'Unassigned'}) —</option>
                  {techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setScheduleModal(null)} style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid #e8e9ec', background: '#fff', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleScheduleConfirm} style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Schedule Job</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
