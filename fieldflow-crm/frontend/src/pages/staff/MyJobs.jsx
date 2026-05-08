import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getJobs, saveJobs, saveInvoice, getInvoices, getSettings } from '../../data/store'
import { useAuth } from '../../auth/AuthContext'
import { logActivity, ACTIONS } from '../../utils/activityLog'
import { createNotification, notifyAdmins, NOTIF_TYPES } from '../../utils/notifications'
import JobCompletion from '../../components/JobCompletion'
import TimeTracker from '../../components/TimeTracker'

// ── Service icons ─────────────────────────────────────────────────────────────
const SERVICE_ICONS = {
  HVAC: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" strokeLinecap="round"/>
    </svg>
  ),
  Plumbing: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Electrical: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  'Appliance Repair': (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
}

const SVC_COLORS = {
  HVAC:             '#2563eb',
  Plumbing:         '#16a34a',
  Electrical:       '#d97706',
  'Appliance Repair': '#9333ea',
  Furnace:          '#ea580c',
  Drain:            '#0891b2',
}

const STATUS_STYLES = {
  'New':         { bg: '#f0f9ff', color: '#0369a1' },
  'In Progress': { bg: '#eff6ff', color: '#2563eb' },
  'Scheduled':   { bg: '#ecfeff', color: '#0891b2' },
  'On Hold':     { bg: '#fefce8', color: '#ca8a04' },
  'Completed':   { bg: '#f0fdf4', color: '#16a34a' },
  'Cancelled':   { bg: '#fef2f2', color: '#dc2626' },
}

const PRIORITY_STYLES = {
  Low:    { bg: '#f3f4f6', color: '#6b7280' },
  Normal: { bg: '#eff6ff', color: '#2563eb' },
  High:   { bg: '#fffbeb', color: '#d97706' },
  Urgent: { bg: '#fef2f2', color: '#dc2626' },
}

function Bdg({ label, map }) {
  const c = (map ?? STATUS_STYLES)[label] ?? { bg: '#f3f4f6', color: '#6b7280' }
  return <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: c.bg, color: c.color }}>{label}</span>
}

function fmtTime(time) {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`
}

// ── Bottom Nav ────────────────────────────────────────────────────────────────
function BottomNav({ active }) {
  const navigate = useNavigate()
  const items = [
    {
      id: 'jobs', label: 'My Jobs', to: '/my-jobs',
      icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
      id: 'schedule', label: 'Schedule', to: '/scheduler',
      icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round"/><line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round"/></svg>,
    },
    {
      id: 'profile', label: 'Profile', to: '/profile',
      icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20v-1a8 8 0 0 1 16 0v1" strokeLinecap="round"/></svg>,
    },
  ]

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: '#fff', borderTop: '1px solid #e8e9ec',
      display: 'flex', alignItems: 'center',
      boxShadow: '0 -2px 16px rgba(0,0,0,0.08)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {items.map(item => (
        <button key={item.id} onClick={() => navigate(item.to)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '10px 0', background: 'none', border: 'none',
            cursor: 'pointer', color: active === item.id ? '#2563eb' : '#9ca3af',
            transition: 'color 0.15s',
          }}>
          {item.icon}
          <span style={{ fontSize: 10.5, fontWeight: active === item.id ? 700 : 500, marginTop: 3 }}>
            {item.label}
          </span>
        </button>
      ))}
    </nav>
  )
}

// ── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({ job, onStart, onComplete, onUpdate, user, onTimeEntry }) {
  const svcColor = SVC_COLORS[job.type] ?? '#6b7280'
  const icon     = SERVICE_ICONS[job.type]

  return (
    <div style={{
      background: '#fff', borderRadius: 14, overflow: 'hidden',
      border: '1px solid #e8e9ec', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      marginBottom: 12,
    }}>
      {/* Colored top strip */}
      <div style={{ height: 4, background: svcColor }} />

      {/* Header */}
      <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#9ca3af', background: '#f3f4f6', padding: '2px 7px', borderRadius: 4 }}>{job.id}</span>
          {job.priority && job.priority !== 'Normal' && <Bdg label={job.priority} map={PRIORITY_STYLES} />}
        </div>
        <Bdg label={job.status} map={STATUS_STYLES} />
      </div>

      {/* Client & address */}
      <div style={{ padding: '0 16px 10px' }}>
        <p style={{ fontSize: 20, fontWeight: 800, color: '#1a1d23', margin: '0 0 4px', lineHeight: 1.2 }}>{job.clientName}</p>
        {job.clientAddress && (
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="10" r="3"/></svg>
            {job.clientAddress}
          </p>
        )}
      </div>

      {/* Service + description */}
      <div style={{ padding: '8px 16px', background: '#f8faff', display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid #f0f1f3', borderBottom: '1px solid #f0f1f3' }}>
        <span style={{ color: svcColor, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1d23', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title || job.type}</p>
          {job.description && <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.description}</p>}
        </div>
      </div>

      {/* Time + duration + equipment */}
      <div style={{ padding: '10px 16px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {job.startDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>
            <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
              {new Date(job.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {job.time ? ` · ${fmtTime(job.time)}` : ''}
            </span>
          </div>
        )}
        {job.duration && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14" strokeLinecap="round"/></svg>
            <span style={{ fontSize: 13, color: '#374151' }}>{job.duration}</span>
          </div>
        )}
        {job.equipment?.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize: 12.5, color: '#6b7280' }}>{job.equipment.slice(0, 2).join(', ')}{job.equipment.length > 2 ? ` +${job.equipment.length - 2}` : ''}</span>
          </div>
        )}
        {job.total > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#1a1d23' }}>${job.total.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Time Tracker — shown for in-progress and scheduled jobs */}
      {(job.status === 'In Progress' || job.status === 'Scheduled') && user && (
        <div style={{ padding: '0 16px 12px' }}>
          <TimeTracker
            job={job}
            technicianId={user.technicianId || user.id}
            technicianName={user.name}
            laborRate={75}
            onEntryAdded={onTimeEntry}
          />
        </div>
      )}

      {/* Action bar */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid #f0f1f3', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {/* Navigate */}
        {job.clientAddress && (
          <a href={`https://maps.google.com/?q=${encodeURIComponent(job.clientAddress)}`} target="_blank" rel="noreferrer"
            style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none', minWidth: 80 }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Navigate
          </a>
        )}

        {/* Call */}
        {job.clientPhone && (
          <a href={`tel:${job.clientPhone}`}
            style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none', minWidth: 80 }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.08 6.08l.91-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round"/></svg>
            Call
          </a>
        )}

        {/* Status actions */}
        {(job.status === 'New' || job.status === 'Scheduled') && (
          <button onClick={() => onStart(job.id)}
            style={{ flex: 1, height: 44, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', minWidth: 80 }}>
            Start Job
          </button>
        )}
        {job.status === 'In Progress' && (
          <button onClick={() => onComplete(job)}
            style={{ flex: 1, height: 44, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 80 }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Complete Job
          </button>
        )}
      </div>
    </div>
  )
}

// ── Today Summary ─────────────────────────────────────────────────────────────
function TodaySummary({ todayJobs }) {
  const today = new Date().toISOString().split('T')[0]
  const count  = todayJobs.length
  const next   = todayJobs.find(j => j.status !== 'Completed' && j.status !== 'Cancelled')
  const earnings = todayJobs
    .filter(j => j.status === 'Completed')
    .reduce((s, j) => s + (j.total || 0), 0)

  return (
    <div style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)', borderRadius: 16, padding: '20px 20px 18px', color: '#fff', marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#bfdbfe', letterSpacing: '0.5px', margin: '0 0 14px', textTransform: 'uppercase' }}>
        Today — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 14px' }}>
          <p style={{ fontSize: 28, fontWeight: 800, margin: 0, lineHeight: 1 }}>{count}</p>
          <p style={{ fontSize: 12, color: '#bfdbfe', margin: '4px 0 0' }}>Jobs Today</p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 14px' }}>
          <p style={{ fontSize: 15, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
            {next ? (next.time ? fmtTime(next.time) : 'TBD') : 'Done'}
          </p>
          <p style={{ fontSize: 11.5, color: '#bfdbfe', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {next ? next.clientName : 'All done!'}
          </p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 14px' }}>
          <p style={{ fontSize: 18, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>${earnings.toLocaleString()}</p>
          <p style={{ fontSize: 12, color: '#bfdbfe', margin: '4px 0 0' }}>Earned</p>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
const FILTER_TABS = ['All', 'Today', 'Upcoming', 'In Progress', 'Completed']

export default function MyJobs() {
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const [jobs, setJobs]           = useState(() => getJobs())
  const [filter, setFilter]       = useState('All')
  const [completingJob, setCompletingJob] = useState(null)
  const [invToast, setInvToast]   = useState('')  // "INV-xxx"

  const today = new Date().toISOString().split('T')[0]

  // Filter to this user's jobs
  const myJobs = useMemo(() => {
    return jobs.filter(j =>
      !j.status || (j.status !== 'Cancelled')
    ).filter(j =>
      // Match by technicianId or techName
      !user?.technicianId || j.technicianId === user.technicianId || j.techName === user.name
    )
  }, [jobs, user])

  const todayJobs = useMemo(() =>
    myJobs.filter(j => j.startDate === today),
    [myJobs, today]
  )

  const visibleJobs = useMemo(() => {
    if (filter === 'All')         return myJobs.filter(j => j.status !== 'Completed')
    if (filter === 'Today')       return todayJobs
    if (filter === 'Upcoming')    return myJobs.filter(j => j.startDate && j.startDate > today && j.status !== 'Completed')
    if (filter === 'In Progress') return myJobs.filter(j => j.status === 'In Progress')
    if (filter === 'Completed')   return myJobs.filter(j => j.status === 'Completed')
    return myJobs
  }, [myJobs, filter, todayJobs, today])

  function refreshJobs() { setJobs(getJobs()) }

  function handleStart(jobId) {
    const all = getJobs()
    const updated = all.map(j => j.id === jobId ? { ...j, status: 'In Progress', startedAt: new Date().toISOString() } : j)
    saveJobs(updated)
    logActivity(ACTIONS.JOB_STATUS_UPDATED, 'Jobs', jobId, jobId, 'Status changed to In Progress by staff.')
    refreshJobs()
  }

  function handleComplete(completionData) {
    if (!completingJob) return
    const all = getJobs()
    const updatedJob = { ...completingJob, ...completionData }
    const updated = all.map(j => j.id === completingJob.id ? updatedJob : j)
    saveJobs(updated)
    logActivity(ACTIONS.JOB_STATUS_UPDATED, 'Jobs', completingJob.id, completingJob.id, 'Job completed via mobile workflow.')
    notifyAdmins(NOTIF_TYPES.JOB_COMPLETED, 'Job Completed', `${completingJob.id} completed by ${completingJob.techName} — ${completingJob.clientName}.`, 'Jobs', completingJob.id)

    // Auto-create invoice if none exists
    const existingInvoices = getInvoices()
    const hasInvoice = existingInvoices.some(inv => inv.jobRef === completingJob.id || inv.jobId === completingJob.id)
    let newInvId = ''
    if (!hasInvoice) {
      newInvId = `INV-${Date.now()}`
      const newInv = {
        id: newInvId,
        clientId: completingJob.clientId, clientName: completingJob.clientName,
        clientPhone: completingJob.clientPhone, clientEmail: completingJob.clientEmail,
        clientAddress: completingJob.clientAddress, jobRef: completingJob.id,
        issued: new Date().toISOString().split('T')[0], due: '', status: 'Draft',
        lineItems: (completingJob.lineItems || []).map(li => ({ ...li, id: Date.now() + Math.random() })),
        subtotal: completingJob.subtotal ?? completingJob.total,
        taxRate: completingJob.taxRate || 0, total: completingJob.total,
        notes: `Auto-generated from completed ${completingJob.id}`,
      }
      saveInvoice(newInv)
      logActivity(ACTIONS.INVOICE_CREATED, 'Invoices', newInvId, `${newInvId} – ${completingJob.clientName}`, `Invoice auto-generated from ${completingJob.id}.`)
      setInvToast(newInvId)
      setTimeout(() => setInvToast(''), 8000)
    }

    setCompletingJob(null)
    refreshJobs()
  }

  return (
    <div style={{ paddingBottom: 80, minHeight: '100vh', background: '#f4f5f8' }}>
      {/* Invoice creation toast */}
      {invToast && (
        <div style={{
          position: 'fixed', top: 16, left: 16, right: 16, zIndex: 9999,
          background: '#1a1d23', color: '#fff', padding: '12px 16px', borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: 12,
          animation: 'toastIn 0.25s ease',
        }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>Invoice <strong>{invToast}</strong> created as draft</span>
          <button onClick={() => navigate('/invoices')}
            style={{ padding: '6px 12px', background: '#2563eb', border: 'none', borderRadius: 7, color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Review →
          </button>
          <button onClick={() => setInvToast('')} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 18, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '16px 16px 0' }}>
        <TodaySummary todayJobs={todayJobs} />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', overflowX: 'auto' }}>
        {FILTER_TABS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              height: 34, padding: '0 14px', borderRadius: 20, border: `1px solid ${filter === f ? '#bfdbfe' : '#e8e9ec'}`,
              background: filter === f ? '#2563eb' : '#fff', color: filter === f ? '#fff' : '#6b7280',
              fontSize: 13, fontWeight: filter === f ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
            {f}
            {f === 'In Progress' && myJobs.filter(j => j.status === 'In Progress').length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.3)', padding: '1px 5px', borderRadius: 10 }}>
                {myJobs.filter(j => j.status === 'In Progress').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Job cards */}
      <div style={{ padding: '0 16px' }}>
        {visibleJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth="1.3" style={{ marginBottom: 12 }}>
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p style={{ fontSize: 15, margin: 0 }}>No jobs in this view.</p>
          </div>
        ) : (
          visibleJobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onStart={handleStart}
              onComplete={j => setCompletingJob(j)}
              user={user}
              onTimeEntry={refreshJobs}
            />
          ))
        )}
      </div>

      {/* Job Completion Modal */}
      {completingJob && (
        <JobCompletion
          job={completingJob}
          onClose={() => setCompletingJob(null)}
          onComplete={handleComplete}
        />
      )}

      {/* Bottom Nav */}
      <BottomNav active="jobs" />

      <style>{`
        @keyframes toastIn { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  )
}
