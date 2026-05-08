import { useState, useRef, useCallback, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import { useAuth } from '../auth/AuthContext'
import { getSettings, getJobs, saveJobs } from '../data/store'
import { useIsMobile } from '../utils/useIsMobile'
import { logActivity, ACTIONS } from '../utils/activityLog'

// ── Helpers ───────────────────────────────────────────────────────────────────
function deriveTechs(settingsTechs) {
  return settingsTechs.map(t => ({
    ...t,
    full:     t.name,
    role:     t.specialty,
    status:   'available',
    initials: t.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
  }))
}

function fmtHour(h) {
  if (h === 0)  return '12 AM'
  if (h < 12)   return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

function makePin(color, label, selected) {
  const border = selected ? '3px solid #1a1d23' : '2.5px solid #fff'
  return L.divIcon({
    className: '',
    html: `<div style="width:32px;height:32px;background:${color};border-radius:50%;border:${border};box-shadow:0 2px 10px rgba(0,0,0,0.32);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:9.5px;font-family:-apple-system,sans-serif;letter-spacing:-0.3px">${label}</div>`,
    iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -20],
  })
}

// ── Tech location helpers ─────────────────────────────────────────────────────
const TECH_LOC_KEY = 'fieldflow_tech_locations'

function getTechLocations() {
  try { return JSON.parse(localStorage.getItem(TECH_LOC_KEY) || '{}') } catch { return {} }
}

function saveTechLocation(techId, lat, lng, status = 'available') {
  const all = getTechLocations()
  all[techId] = { lat, lng, updatedAt: Date.now(), status }
  localStorage.setItem(TECH_LOC_KEY, JSON.stringify(all))
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function driveMins(lat1, lng1, lat2, lng2) {
  return Math.max(1, Math.round(haversine(lat1, lng1, lat2, lng2) * 1.4 / 30 * 60))
}

function makeTechPin(color, initials, isOnJob) {
  const pulse = isOnJob
    ? `<div style="position:absolute;inset:-5px;border-radius:50%;border:2px solid ${color};opacity:0.6;animation:techPulse 1.8s ease-out infinite"></div>`
    : ''
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:36px;height:36px">${pulse}<div style="position:absolute;inset:0;background:${color};border-radius:50%;border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:10px;font-family:-apple-system,sans-serif">${initials}</div></div>`,
    iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -22],
  })
}

function makeNumberPin(num, color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;background:${color};border-radius:50%;border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:10px;font-family:-apple-system,sans-serif">${num}</div>`,
    iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -14],
  })
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MAP_CENTER  = [38.895, -77.385]
const START_H     = 7
const END_H       = 19
const SLOT_H      = 58
const HOURS       = Array.from({ length: END_H - START_H }, (_, i) => i + START_H)
const STATUS_COLORS = { 'on-job': '#f59e0b', available: '#22c55e', off: '#9ca3af' }

const MAINT_COLOR = '#9333ea'  // purple for maintenance jobs

// ── Demo scheduled jobs (calendar-local state) ─────────────────────────────
const DEMO_JOBS = [
  { id: 'JOB-1055', client: 'Kim',      type: 'Furnace Tune-Up',  address: '55 Maple Dr, Herndon, VA',    lat: 38.9696, lng: -77.3861, techIds: ['moore'],  startHour: 8,  endHour: 10 },
  { id: 'JOB-1057', client: 'Patel',    type: 'Water Heater',     address: '88 Elm Ave, Fairfax, VA',     lat: 38.8462, lng: -77.3064, techIds: ['torres'], startHour: 8,  endHour: 11 },
  { id: 'JOB-1058', client: 'Rivera',   type: 'AC Replacement',   address: '124 Oak St, Centreville, VA', lat: 38.8404, lng: -77.4291, techIds: ['moore'],  startHour: 10, endHour: 14 },
  { id: 'JOB-1056', client: 'Thompson', type: 'Panel Upgrade',    address: '310 Pine Rd, Reston, VA',     lat: 38.9580, lng: -77.3570, techIds: ['singh'],  startHour: 13, endHour: 16 },
  { id: 'JOB-1059', client: 'Johnson',  type: 'AC Inspection',    address: '44 Willow Way, Centreville, VA', lat: 38.8350, lng: -77.4350, techIds: ['moore', 'torres'], startHour: 14, endHour: 16 },
]

// ── DnD: Draggable job block ──────────────────────────────────────────────────
function DraggableJob({ job, tech, slotH, isSelected, onClick, showRecurring, showMaint, driveFromPrev }) {
  const isRecurring  = !!job.recurrence && job.recurrence !== 'One-time'
  const isMaint      = !!job.maintenancePlanId
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `scheduled::${job.id}::${tech.id}`,
    data: { job, fromTechId: tech.id, fromSlot: 'scheduled' },
  })

  if (isMaint && !showMaint) return null
  if (isRecurring && !isMaint && !showRecurring) return null

  const top    = (job.startHour - START_H) * slotH
  const height = (job.endHour - job.startHour) * slotH
  const tall   = height >= slotH * 2
  const color  = isMaint ? MAINT_COLOR : tech.color
  const borderStyle = isRecurring || isMaint ? '3px dashed' : '3px solid'

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      title={`${job.id} · ${job.client || job.clientName} · ${job.type}`}
      style={{
        position: 'absolute', left: 2, right: 2,
        top: top + 2, height: height - 4,
        background: color + '1a',
        borderLeft: `${borderStyle} ${color}`,
        borderRadius: 5, padding: '4px 5px',
        overflow: 'hidden', cursor: 'grab',
        outline: isSelected ? `2px solid ${color}` : 'none',
        outlineOffset: -2,
        opacity: isDragging ? 0.4 : 1,
        transition: 'opacity 0.1s',
        userSelect: 'none',
      }}
    >
      <div style={{ fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color }}>
        {(isRecurring || isMaint) && (
          <span style={{ marginRight: 3, fontSize: 9 }} title={isMaint ? 'Maintenance plan' : 'Recurring'}>↻</span>
        )}
        {job.client || job.clientName}
      </div>
      {tall && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.type}</div>}
      {height >= slotH * 2.5 && <div style={{ fontSize: 9.5, color: '#9ca3af', marginTop: 2 }}>{fmtHour(job.startHour)} – {fmtHour(job.endHour)}</div>}
      {driveFromPrev > 0 && height >= slotH && (
        <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          ~{driveFromPrev} min drive
        </div>
      )}
    </div>
  )
}

// ── DnD: Droppable time slot ──────────────────────────────────────────────────
function DroppableSlot({ techId, hour, slotH }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot::${techId}::${hour}` })
  return (
    <div
      ref={setNodeRef}
      style={{
        height: slotH,
        borderBottom: '1px solid #f3f4f6',
        background: isOver ? '#eff6ff' : 'transparent',
        transition: 'background 0.1s',
      }}
    />
  )
}

// ── DnD: Draggable unscheduled job (from panel) ───────────────────────────────
function DraggableUnscheduled({ job }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `unscheduled::${job.id}`,
    data: { job, fromSlot: 'unscheduled' },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        padding: '10px 12px', borderRadius: 8, border: '1px solid #e8e9ec',
        background: '#fff', cursor: 'grab', opacity: isDragging ? 0.4 : 1,
        marginBottom: 8, userSelect: 'none',
      }}
    >
      <p style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1d23', margin: 0 }}>{job.id}</p>
      <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{job.client || job.clientName} · {job.type}</p>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: '#1a1d23', color: '#fff', padding: '10px 20px', borderRadius: 10,
      fontSize: 13.5, fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', gap: 10, animation: 'toastIn 0.2s ease',
    }}>
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
      {msg}
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </div>
  )
}

// ── Occurrence edit modal ─────────────────────────────────────────────────────
function OccurrenceModal({ job, onClose, onEditThis, onEditAll }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(10,15,30,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 360, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 6px' }}>Edit Recurring Job</h3>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>{job.id} — {job.client || job.clientName}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={onEditThis}
            style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #bfdbfe', background: '#eff6ff', fontSize: 13.5, fontWeight: 600, color: '#2563eb', cursor: 'pointer', textAlign: 'left' }}>
            Edit this occurrence only
            <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0', fontWeight: 400 }}>Only changes this specific date</p>
          </button>
          <button onClick={onEditAll}
            style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #e8e9ec', background: '#f9fafb', fontSize: 13.5, fontWeight: 600, color: '#374151', cursor: 'pointer', textAlign: 'left' }}>
            Edit all future occurrences
            <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0', fontWeight: 400 }}>Updates this and all future visits</p>
          </button>
        </div>
        <button onClick={onClose} style={{ marginTop: 14, width: '100%', padding: '9px', borderRadius: 8, border: '1px solid #e8e9ec', background: '#fff', fontSize: 13, color: '#374151', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Scheduler() {
  const { user, isAdmin, hasPermission } = useAuth()
  const canSwitchTechs = isAdmin || hasPermission('view_all_technicians_map')
  const isMobile = useIsMobile()
  const slotH = isMobile ? 72 : SLOT_H

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const [techs,           setTechs]           = useState(() => deriveTechs(getSettings().technicians))
  const [selectedTechId,  setSelectedTechId]  = useState(() => isAdmin ? null : (user?.technicianId ?? null))
  const [selectedJobId,   setSelectedJobId]   = useState(null)
  const [jobs,            setJobs]            = useState(DEMO_JOBS)
  const [unscheduled,     setUnscheduled]     = useState(() => {
    const allJobs = getJobs()
    return allJobs
      .filter(j => !j.startDate && j.status !== 'Completed' && j.status !== 'Cancelled')
      .slice(0, 10)
      .map(j => ({ ...j, client: j.clientName }))
  })
  const [showModal,       setShowModal]       = useState(false)
  const [currentDate,     setCurrentDate]     = useState(new Date('2026-04-01'))
  const [form,            setForm]            = useState({ jobId: '', techIds: [], startTime: '09:00', endTime: '11:00' })
  const [mobileView,      setMobileView]      = useState('calendar')
  const [showRecurring,   setShowRecurring]   = useState(true)
  const [showMaint,       setShowMaint]       = useState(true)
  const [unschedOpen,     setUnschedOpen]     = useState(true)
  const [toast,           setToast]           = useState('')
  const [activeId,        setActiveId]        = useState(null)
  const [occModal,        setOccModal]        = useState(null) // { job }
  const [techLocations,   setTechLocations]   = useState(getTechLocations)
  const toastTimer = useRef(null)

  // Staff: update own GPS location every 30s while page is open
  useEffect(() => {
    if (isAdmin || !user) return
    const techId = user.technicianId || user.id
    const myJobs = jobs.filter(j => j.techIds?.includes(techId))
    const currentJob = myJobs.find(j => j.startHour <= new Date().getHours() && j.endHour > new Date().getHours())
    const status = currentJob ? 'on-job' : 'available'

    function update() {
      navigator.geolocation?.getCurrentPosition(pos => {
        saveTechLocation(techId, pos.coords.latitude, pos.coords.longitude, status)
        setTechLocations(getTechLocations())
      }, () => {
        // No GPS — use job location as fallback if on a job
        if (currentJob?.lat) {
          saveTechLocation(techId, currentJob.lat, currentJob.lng, status)
          setTechLocations(getTechLocations())
        }
      })
    }
    update()
    const interval = setInterval(update, 30_000)
    return () => clearInterval(interval)
  }, [isAdmin, user, jobs])

  // Admin: refresh tech locations from localStorage every 10s
  useEffect(() => {
    if (!isAdmin) return
    const interval = setInterval(() => setTechLocations(getTechLocations()), 10_000)
    return () => clearInterval(interval)
  }, [isAdmin])

  // ── Derived ─────────────────────────────────────────────────────────────────
  const visibleTechs = selectedTechId ? techs.filter(t => t.id === selectedTechId) : techs
  const visibleJobs  = selectedTechId ? jobs.filter(j => j.techIds.includes(selectedTechId)) : jobs

  function showToast(msg) {
    clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(''), 3000)
  }

  const dateLabel = currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
  function shiftDate(n) { setCurrentDate(d => { const nd = new Date(d); nd.setDate(nd.getDate() + n); return nd }) }

  function clickJob(job) {
    const isRecurring = !!job.recurrence && job.recurrence !== 'One-time'
    const isMaint     = !!job.maintenancePlanId
    if (isRecurring || isMaint) {
      setOccModal({ job })
    } else {
      setSelectedJobId(prev => prev === job.id ? null : job.id)
    }
  }

  // ── DnD handlers ────────────────────────────────────────────────────────────
  function handleDragStart({ active }) { setActiveId(active.id) }

  function handleDragEnd({ active, over }) {
    setActiveId(null)
    if (!over) return

    const [dropType, techId, hourStr] = over.id.split('::')
    if (dropType !== 'slot') return

    const newHour = parseInt(hourStr, 10)
    const { job, fromTechId, fromSlot } = active.data.current

    if (fromSlot === 'unscheduled') {
      // Move from unscheduled panel to calendar
      const dur = 2
      const newJob = {
        ...job,
        techIds:   [techId],
        startHour: newHour,
        endHour:   Math.min(newHour + dur, END_H),
        client:    job.clientName || job.client,
      }
      setJobs(prev => [...prev, newJob])
      setUnscheduled(prev => prev.filter(j => j.id !== job.id))
      showToast(`${job.id} scheduled at ${fmtHour(newHour)} with ${techs.find(t => t.id === techId)?.name || techId}`)
      logActivity(ACTIONS.JOB_UPDATED, 'Scheduler', job.id, job.id, `Scheduled via drag to ${fmtHour(newHour)}.`)
      return
    }

    // Move scheduled job to new slot/tech
    const dur = job.endHour - job.startHour
    setJobs(prev => prev.map(j => {
      if (j.id !== job.id) return j
      const newTechIds = techId === fromTechId ? j.techIds : [techId]
      return { ...j, startHour: newHour, endHour: Math.min(newHour + dur, END_H), techIds: newTechIds }
    }))
    showToast(`Job rescheduled to ${fmtHour(newHour)} with ${techs.find(t => t.id === techId)?.name || techId}`)
    logActivity(ACTIONS.JOB_UPDATED, 'Scheduler', job.id, job.id, `Rescheduled to ${fmtHour(newHour)} via drag.`)
  }

  // ── Assign modal ─────────────────────────────────────────────────────────────
  function handleAssign() {
    const job = unscheduled.find(j => j.id === form.jobId)
    if (!job || !form.techIds.length) return
    const [sh, sm] = form.startTime.split(':').map(Number)
    const [eh]     = form.endTime.split(':').map(Number)
    const startHour = sh + (sm >= 30 ? 0.5 : 0)
    setJobs(prev => [...prev, { ...job, techIds: [...form.techIds], startHour: Math.floor(startHour), endHour: eh }])
    setUnscheduled(prev => prev.filter(j => j.id !== form.jobId))
    setForm({ jobId: '', techIds: [], startTime: '09:00', endTime: '11:00' })
    setShowModal(false)
    showToast(`${job.id} assigned successfully.`)
  }

  function toggleModalTech(id) {
    setForm(f => ({ ...f, techIds: f.techIds.includes(id) ? f.techIds.filter(x => x !== id) : [...f.techIds, id] }))
  }

  const canAssign = !!form.jobId && form.techIds.length > 0

  // ── Active drag item ─────────────────────────────────────────────────────────
  const activeDragJob = activeId ? (() => {
    const parts = activeId.split('::')
    if (parts[0] === 'scheduled') return jobs.find(j => j.id === parts[1])
    if (parts[0] === 'unscheduled') return unscheduled.find(j => j.id === parts[1])
    return null
  })() : null

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={s.root}>

        {/* ── Top action bar ─────────────────────────────────────────────── */}
        <div style={s.topBar}>
          <div style={s.dateNav}>
            <button style={s.navBtn} onClick={() => shiftDate(-1)}>&#8592;</button>
            <span style={{ ...s.dateLabel, minWidth: isMobile ? 'auto' : 240, fontSize: isMobile ? 13 : undefined }}>{dateLabel}</span>
            <button style={s.navBtn} onClick={() => shiftDate(1)}>&#8594;</button>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Toggles */}
            {!isMobile && (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#6b7280', cursor: 'pointer', padding: '5px 10px', border: `1px solid ${showRecurring ? '#bfdbfe' : '#e8e9ec'}`, borderRadius: 7, background: showRecurring ? '#eff6ff' : '#fff', userSelect: 'none' }}>
                  <input type="checkbox" checked={showRecurring} onChange={e => setShowRecurring(e.target.checked)} style={{ margin: 0 }} />
                  <span style={{ fontWeight: 600, color: showRecurring ? '#2563eb' : '#6b7280' }}>↻ Recurring Jobs</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#6b7280', cursor: 'pointer', padding: '5px 10px', border: `1px solid ${showMaint ? '#e9d5ff' : '#e8e9ec'}`, borderRadius: 7, background: showMaint ? '#fdf4ff' : '#fff', userSelect: 'none' }}>
                  <input type="checkbox" checked={showMaint} onChange={e => setShowMaint(e.target.checked)} style={{ margin: 0 }} />
                  <span style={{ fontWeight: 600, color: showMaint ? '#9333ea' : '#6b7280' }}>Maintenance Plans</span>
                </label>
              </>
            )}
            {isMobile && (
              <div style={{ display: 'flex', border: '1px solid #e8e9ec', borderRadius: 8, overflow: 'hidden' }}>
                <button onClick={() => setMobileView('calendar')} style={{ height: 36, padding: '0 14px', background: mobileView === 'calendar' ? '#2563eb' : '#fff', color: mobileView === 'calendar' ? '#fff' : '#6b7280', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Calendar</button>
                <button onClick={() => setMobileView('map')} style={{ height: 36, padding: '0 14px', background: mobileView === 'map' ? '#2563eb' : '#fff', color: mobileView === 'map' ? '#fff' : '#6b7280', border: 'none', borderLeft: '1px solid #e8e9ec', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Map</button>
              </div>
            )}
            {isAdmin && (
              <button style={s.assignBtn} onClick={() => setShowModal(true)}>+ Assign Job</button>
            )}
          </div>
        </div>

        {/* ── Panels ─────────────────────────────────────────────────────── */}
        <div style={s.panels}>

          {/* Tech panel */}
          <div style={{ ...s.techPanel, display: isMobile && mobileView === 'map' ? 'none' : undefined }}>
            <p style={s.panelLabel}>Technicians</p>
            {canSwitchTechs && (
              <button style={{ ...s.techRow, ...(selectedTechId === null ? s.techRowActive : {}), ...(selectedTechId === null ? { borderLeftColor: '#2563eb' } : {}) }}
                onClick={() => setSelectedTechId(null)}>
                <div style={{ ...s.avatar, background: '#6b7280', fontSize: 10 }}>ALL</div>
                <div style={s.techMeta}><div style={s.techName}>All Technicians</div><div style={s.techSub}>{techs.length} technicians</div></div>
              </button>
            )}
            <div style={s.divider} />
            {techs.map(t => {
              const jobCount = jobs.filter(j => j.techIds.includes(t.id)).length
              const isActive = selectedTechId === t.id
              return (
                <button key={t.id}
                  style={{ ...s.techRow, ...(isActive ? s.techRowActive : {}), ...(isActive ? { borderLeftColor: t.color } : {}), ...((!canSwitchTechs && !isActive) ? { opacity: 0.45, cursor: 'default' } : {}) }}
                  onClick={() => canSwitchTechs && setSelectedTechId(isActive ? null : t.id)}>
                  <div style={{ ...s.avatar, background: t.color }}>
                    {t.initials}<span style={{ ...s.statusDot, background: STATUS_COLORS[t.status] }} />
                  </div>
                  <div style={s.techMeta}><div style={s.techName}>{t.name}</div><div style={s.techSub}>{t.role}</div></div>
                  {jobCount > 0 && <span style={{ ...s.jobBadge, background: t.color + '20', color: t.color }}>{jobCount}</span>}
                </button>
              )
            })}

            {/* Legend */}
            <div style={s.legend}>
              {Object.entries({ 'On Job': '#f59e0b', 'Available': '#22c55e', 'Off': '#9ca3af' }).map(([lbl, col]) => (
                <div key={lbl} style={s.legendRow}><span style={{ ...s.legendDot, background: col }} /><span style={s.legendLabel}>{lbl}</span></div>
              ))}
              <div style={{ height: 1, background: '#f0f1f3', margin: '4px 0' }} />
              <div style={s.legendRow}><span style={{ ...s.legendDot, background: '#2563eb', borderRadius: 2, width: 16, height: 3 }} /><span style={s.legendLabel}>Recurring (dashed)</span></div>
              <div style={s.legendRow}><span style={{ ...s.legendDot, background: MAINT_COLOR, borderRadius: 2, width: 16, height: 3 }} /><span style={s.legendLabel}>Maintenance</span></div>
            </div>
          </div>

          {/* Map panel */}
          <div style={{ ...s.mapPanel, display: isMobile && mobileView !== 'map' ? 'none' : undefined }}>
            <MapContainer center={MAP_CENTER} zoom={12} style={{ width: '100%', height: '100%' }} zoomControl>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />

              {/* Job pins */}
              {visibleJobs.map(job => {
                if (!job.lat) return null
                const primaryTech = techs.find(t => t.id === job.techIds[0])
                const isSelected  = selectedJobId === job.id
                const pinColor    = isSelected ? '#111827' : (primaryTech?.color ?? '#6b7280')
                const pinLabel    = job.id.replace('JOB-', '')
                return (
                  <Marker key={job.id} position={[job.lat, job.lng]} icon={makePin(pinColor, pinLabel, isSelected)}
                    eventHandlers={{ click: () => setSelectedJobId(prev => prev === job.id ? null : job.id) }}>
                    <Popup>
                      <div style={s.popup}>
                        <div style={s.popupId}>{job.id}</div>
                        <div style={s.popupClient}>{job.client || job.clientName}</div>
                        <div style={s.popupType}>{job.type}</div>
                        <div style={s.popupAddr}>{job.address}</div>
                        <div style={s.popupTime}>{fmtHour(job.startHour)} – {fmtHour(job.endHour)}</div>
                        <div style={s.popupTechs}>
                          {job.techIds.map(tid => {
                            const t = techs.find(x => x.id === tid)
                            return <span key={tid} style={{ ...s.popupTechTag, background: t?.color + '20', color: t?.color }}>{t?.name}</span>
                          })}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}

              {/* Route polyline + numbered stops for selected tech */}
              {selectedTechId && (() => {
                const tech     = techs.find(t => t.id === selectedTechId)
                const route    = jobs.filter(j => j.techIds.includes(selectedTechId) && j.lat).sort((a, b) => a.startHour - b.startHour)
                const techLoc  = techLocations[selectedTechId]
                if (!route.length) return null
                const positions = route.map(j => [j.lat, j.lng])
                return (
                  <>
                    {/* Route polyline */}
                    <Polyline positions={positions} pathOptions={{ color: tech?.color ?? '#2563eb', weight: 2.5, opacity: 0.65 }} />
                    {/* Numbered stop markers */}
                    {route.map((job, idx) => (
                      <Marker key={`stop-${job.id}`} position={[job.lat, job.lng]} icon={makeNumberPin(idx + 1, tech?.color ?? '#2563eb')} />
                    ))}
                    {/* Dashed line from tech location to next job */}
                    {techLoc && route[0] && (
                      <Polyline
                        positions={[[techLoc.lat, techLoc.lng], [route[0].lat, route[0].lng]]}
                        pathOptions={{ color: tech?.color ?? '#6b7280', weight: 2, opacity: 0.7, dashArray: '6 6' }}
                      />
                    )}
                  </>
                )
              })()}

              {/* Technician current location markers */}
              {isAdmin && techs.map(tech => {
                const loc = techLocations[tech.id]
                if (!loc || Date.now() - loc.updatedAt > 5 * 60_000) return null // stale after 5 min
                const isOnJob = loc.status === 'on-job'
                const techJobsNow = jobs.filter(j => j.techIds.includes(tech.id) && j.startHour <= new Date().getHours() && j.endHour > new Date().getHours())
                const currentJob  = techJobsNow[0]
                const minsAgo     = Math.floor((Date.now() - loc.updatedAt) / 60_000)
                return (
                  <Marker key={`tech-${tech.id}`} position={[loc.lat, loc.lng]} icon={makeTechPin(tech.color, tech.initials, isOnJob)}>
                    <Popup>
                      <div style={s.popup}>
                        <div style={{ ...s.popupClient, color: tech.color }}>{tech.name}</div>
                        <div style={{ ...s.popupType, display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: isOnJob ? '#f59e0b' : '#22c55e', display: 'inline-block' }} />
                          {isOnJob ? 'On Job' : 'Available'}
                        </div>
                        {currentJob && <div style={s.popupAddr}>{currentJob.id} — {currentJob.client || currentJob.clientName}</div>}
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Updated {minsAgo === 0 ? 'just now' : `${minsAgo}m ago`}</div>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}

              <style>{`@keyframes techPulse{0%{transform:scale(1);opacity:0.6}70%{transform:scale(1.6);opacity:0}100%{transform:scale(1.6);opacity:0}}`}</style>
            </MapContainer>
            {selectedJobId && !selectedTechId && (() => {
              const job = jobs.find(j => j.id === selectedJobId)
              if (!job) return null
              const tech = techs.find(t => t.id === job.techIds[0])
              return (
                <div style={s.mapOverlay}>
                  <span style={{ ...s.overlayBadge, background: tech?.color + '20', color: tech?.color }}>{job.id}</span>
                  <span style={s.overlayClient}>{job.client || job.clientName} — {job.type}</span>
                  <button style={s.overlayClear} onClick={() => setSelectedJobId(null)}>×</button>
                </div>
              )
            })()}
            {selectedTechId && (() => {
              const tech   = techs.find(t => t.id === selectedTechId)
              const route  = jobs.filter(j => j.techIds.includes(selectedTechId) && j.lat).sort((a, b) => a.startHour - b.startHour)
              if (!route.length) return null
              let totalMiles = 0
              for (let i = 1; i < route.length; i++) {
                totalMiles += haversine(route[i-1].lat, route[i-1].lng, route[i].lat, route[i].lng)
              }
              const totalMins = Math.round(totalMiles * 1.4 / 30 * 60)
              return (
                <div style={{ ...s.mapOverlay, flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: tech?.color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1d23', flex: 1 }}>{tech?.name} — Day Route</span>
                    <button style={s.overlayClear} onClick={() => setSelectedTechId(null)}>×</button>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11.5, color: '#6b7280' }}>
                    <span>{route.length} stops</span>
                    <span>~{totalMiles.toFixed(1)} mi total</span>
                    <span>~{totalMins} min drive time</span>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Calendar panel */}
          <div style={{ ...s.calPanel, display: isMobile && mobileView !== 'calendar' ? 'none' : undefined, width: isMobile ? '100%' : undefined, flexShrink: isMobile ? 1 : 0 }}>
            {/* Column headers */}
            <div style={{ ...s.calHead, gridTemplateColumns: `46px repeat(${visibleTechs.length}, 1fr)` }}>
              <div style={s.calHeadGutter} />
              {visibleTechs.map(t => (
                <div key={t.id} style={s.calHeadCell}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ ...s.calHeadName, color: t.color }}>{t.initials}</span>
                </div>
              ))}
            </div>

            {/* Grid */}
            <div style={s.calBody}>
              <div style={{ display: 'flex', height: HOURS.length * slotH }}>
                {/* Time labels */}
                <div style={s.timeCol}>
                  {HOURS.map(h => <div key={h} style={{ ...s.timeCell, height: slotH }}>{fmtHour(h)}</div>)}
                </div>

                {/* Tech columns */}
                {visibleTechs.map(tech => {
                  const techJobs = jobs.filter(j => j.techIds.includes(tech.id))
                  const sorted   = [...techJobs].sort((a, b) => a.startHour - b.startHour)
                  return (
                    <div key={tech.id} style={s.techCalCol}>
                      {/* Droppable hour slots */}
                      {HOURS.map(h => <DroppableSlot key={h} techId={tech.id} hour={h} slotH={slotH} />)}

                      {/* Job blocks */}
                      {techJobs.map(job => {
                        const sortedIdx = sorted.findIndex(j => j.id === job.id)
                        const prev      = sortedIdx > 0 ? sorted[sortedIdx - 1] : null
                        const driveFromPrev = (prev?.lat && job.lat)
                          ? driveMins(prev.lat, prev.lng, job.lat, job.lng)
                          : 0
                        return (
                          <DraggableJob
                            key={`${job.id}-${tech.id}`}
                            job={job} tech={tech} slotH={slotH}
                            isSelected={selectedJobId === job.id}
                            onClick={() => clickJob(job)}
                            showRecurring={showRecurring}
                            showMaint={showMaint}
                            driveFromPrev={driveFromPrev}
                          />
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Unscheduled jobs panel */}
          {!isMobile && (
            <div style={{ ...s.unschedPanel, width: unschedOpen ? 200 : 32 }}>
              <button onClick={() => setUnschedOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 10px 10px 12px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', borderBottom: '1px solid #f0f1f3' }}>
                {unschedOpen ? (
                  <>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.6px', textTransform: 'uppercase' }}>Unscheduled</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: unscheduled.length > 0 ? '#fee2e2' : '#f3f4f6', color: unscheduled.length > 0 ? '#dc2626' : '#9ca3af' }}>
                      {unscheduled.length}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.5px' }}>
                    UNSCHED {unscheduled.length > 0 ? `(${unscheduled.length})` : ''}
                  </span>
                )}
              </button>
              {unschedOpen && (
                <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
                  {unscheduled.length === 0 ? (
                    <p style={{ fontSize: 12, color: '#c4c9d4', textAlign: 'center', padding: '20px 0', margin: 0 }}>All jobs scheduled</p>
                  ) : (
                    unscheduled.map(job => <DraggableUnscheduled key={job.id} job={job} />)
                  )}
                  <p style={{ fontSize: 11, color: '#d1d5db', textAlign: 'center', margin: '8px 0 0', lineHeight: 1.5 }}>
                    Drag onto calendar to schedule
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Drag overlay ────────────────────────────────────────────────── */}
        <DragOverlay>
          {activeDragJob && (
            <div style={{ padding: '6px 10px', background: '#1a1d23', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', pointerEvents: 'none' }}>
              {activeDragJob.id} · {activeDragJob.client || activeDragJob.clientName}
            </div>
          )}
        </DragOverlay>

        {/* ── Assign modal ─────────────────────────────────────────────────── */}
        {showModal && (
          <div style={s.overlay} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
            <div style={s.modal}>
              <div style={s.modalHead}>
                <div><h3 style={s.modalTitle}>Assign Job</h3><p style={s.modalSub}>Assign an open job to one or more technicians</p></div>
                <button style={s.closeBtn} onClick={() => setShowModal(false)}>×</button>
              </div>
              <div style={s.fg}>
                <label style={s.fl}>Select Job</label>
                {unscheduled.length === 0 ? <p style={s.noJobs}>All jobs have been assigned.</p> : (
                  <select style={s.sel} value={form.jobId} onChange={e => setForm(f => ({ ...f, jobId: e.target.value }))}>
                    <option value="">— Choose an unassigned job —</option>
                    {unscheduled.map(j => <option key={j.id} value={j.id}>{j.id} · {j.client || j.clientName} · {j.type}</option>)}
                  </select>
                )}
              </div>
              <div style={s.fg}>
                <label style={s.fl}>Assign Technician(s)</label>
                <div style={s.checkList}>
                  {techs.map(t => {
                    const checked = form.techIds.includes(t.id)
                    return (
                      <label key={t.id} style={{ ...s.checkRow, background: checked ? t.color + '0d' : '#f9fafb' }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleModalTech(t.id)} style={{ accentColor: t.color, width: 15, height: 15, flexShrink: 0 }} />
                        <div style={{ ...s.checkAvatar, background: t.color }}>{t.initials}</div>
                        <div><div style={s.checkName}>{t.full}</div><div style={s.checkRole}>{t.role}</div></div>
                        {checked && <span style={{ ...s.checkMark, color: t.color }}>✓</span>}
                      </label>
                    )
                  })}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={s.fg}><label style={s.fl}>Start Time</label><input style={s.inp} type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></div>
                <div style={s.fg}><label style={s.fl}>End Time</label><input style={s.inp} type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} /></div>
              </div>
              <div style={s.modalFoot}>
                <button style={s.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                <button style={{ ...s.confirmBtn, opacity: canAssign ? 1 : 0.45, cursor: canAssign ? 'pointer' : 'not-allowed' }} disabled={!canAssign} onClick={handleAssign}>Assign Job →</button>
              </div>
            </div>
          </div>
        )}

        {/* Recurring occurrence modal */}
        {occModal && (
          <OccurrenceModal
            job={occModal.job}
            onClose={() => setOccModal(null)}
            onEditThis={() => { setSelectedJobId(occModal.job.id); setOccModal(null) }}
            onEditAll={() => { setSelectedJobId(occModal.job.id); setOccModal(null) }}
          />
        )}

        {/* Toast */}
        {toast && <Toast msg={toast} />}
      </div>
    </DndContext>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  root:    { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 116px)', gap: 12, overflow: 'hidden' },
  panels:  { flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', border: '1px solid #e8e9ec', borderRadius: 10, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  topBar:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0, flexWrap: 'wrap' },
  dateNav: { display: 'flex', alignItems: 'center', gap: 10 },
  navBtn:  { height: 34, padding: '0 12px', border: '1px solid #e8e9ec', borderRadius: 7, fontSize: 15, fontWeight: 500, color: '#374151', background: '#fff', cursor: 'pointer' },
  dateLabel: { fontSize: 15, fontWeight: 700, color: '#1a1d23', minWidth: 240, textAlign: 'center' },
  assignBtn: { height: 36, padding: '0 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' },
  techPanel:   { width: 200, flexShrink: 0, borderRight: '1px solid #e8e9ec', overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  panelLabel:  { fontSize: 10.5, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.7px', textTransform: 'uppercase', padding: '12px 14px 6px', margin: 0 },
  techRow:     { display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px 10px 11px', background: 'none', border: 'none', borderLeft: '3px solid transparent', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'background 0.1s' },
  techRowActive: { background: '#f8faff' },
  avatar:      { width: 36, height: 36, borderRadius: '50%', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', letterSpacing: '-0.3px' },
  statusDot:   { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', border: '1.5px solid #fff' },
  techMeta:    { flex: 1, minWidth: 0 },
  techName:    { fontSize: 13, fontWeight: 600, color: '#1a1d23', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  techSub:     { fontSize: 11.5, color: '#9ca3af', marginTop: 1 },
  jobBadge:    { fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10, flexShrink: 0 },
  divider:     { height: 1, background: '#f0f1f3', margin: '6px 0' },
  legend:      { padding: '12px 14px', marginTop: 'auto', borderTop: '1px solid #f0f1f3', display: 'flex', flexDirection: 'column', gap: 6 },
  legendRow:   { display: 'flex', alignItems: 'center', gap: 7 },
  legendDot:   { width: 9, height: 9, borderRadius: '50%', flexShrink: 0 },
  legendLabel: { fontSize: 11.5, color: '#9ca3af' },
  mapPanel:    { flex: 1, position: 'relative', overflow: 'hidden' },
  mapOverlay:  { position: 'absolute', top: 10, left: 10, zIndex: 900, background: '#fff', border: '1px solid #e8e9ec', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: 13, fontWeight: 500, color: '#374151' },
  overlayBadge: { fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10 },
  overlayClient: { fontSize: 13, fontWeight: 600, color: '#1a1d23' },
  overlayClear: { background: 'none', border: 'none', fontSize: 18, color: '#9ca3af', cursor: 'pointer', lineHeight: 1, padding: '0 2px' },
  popup:       { padding: '2px 0', minWidth: 160 },
  popupId:     { fontFamily: 'ui-monospace,Consolas,monospace', fontSize: 10.5, color: '#9ca3af', marginBottom: 4 },
  popupClient: { fontSize: 15, fontWeight: 700, color: '#1a1d23', marginBottom: 2 },
  popupType:   { fontSize: 12.5, color: '#6b7280' },
  popupAddr:   { fontSize: 11.5, color: '#9ca3af', marginTop: 3 },
  popupTime:   { fontSize: 12.5, fontWeight: 600, color: '#2563eb', marginTop: 5 },
  popupTechs:  { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  popupTechTag: { fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 10 },
  calPanel:    { width: 320, flexShrink: 0, borderLeft: '1px solid #e8e9ec', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  calHead:     { display: 'grid', borderBottom: '2px solid #e8e9ec', flexShrink: 0 },
  calHeadGutter: { borderRight: '1px solid #f0f1f3' },
  calHeadCell: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '9px 4px', borderLeft: '1px solid #f0f1f3' },
  calHeadName: { fontSize: 12, fontWeight: 700, letterSpacing: '-0.2px' },
  calBody:     { flex: 1, overflowY: 'auto', overflowX: 'hidden' },
  timeCol:     { width: 46, flexShrink: 0 },
  timeCell:    { height: SLOT_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 7, paddingTop: 5, fontSize: 10, color: '#b0b8c8', fontWeight: 500, borderBottom: '1px solid #f3f4f6', boxSizing: 'border-box', whiteSpace: 'nowrap' },
  techCalCol:  { flex: 1, position: 'relative', borderLeft: '1px solid #f0f1f3', minWidth: 0 },
  unschedPanel: { borderLeft: '1px solid #e8e9ec', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden', transition: 'width 0.2s ease', background: '#fafafa' },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(2px)' },
  modal:       { background: '#fff', borderRadius: 14, padding: '28px 28px 24px', width: 460, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' },
  modalHead:   { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 },
  modalTitle:  { fontSize: 18, fontWeight: 700, color: '#1a1d23', margin: 0 },
  modalSub:    { fontSize: 13, color: '#9ca3af', margin: '3px 0 0' },
  closeBtn:    { width: 30, height: 30, borderRadius: 7, border: '1px solid #e8e9ec', background: '#f9fafb', fontSize: 20, color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 },
  fg:          { marginBottom: 18 },
  fl:          { display: 'block', fontSize: 11.5, fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 7 },
  sel:         { width: '100%', height: 40, border: '1px solid #e8e9ec', borderRadius: 8, padding: '0 12px', fontSize: 13.5, color: '#374151', background: '#fff', outline: 'none', boxSizing: 'border-box' },
  inp:         { width: '100%', height: 40, border: '1px solid #e8e9ec', borderRadius: 8, padding: '0 12px', fontSize: 13.5, color: '#374151', outline: 'none', boxSizing: 'border-box' },
  noJobs:      { fontSize: 13.5, color: '#9ca3af', margin: 0 },
  checkList:   { display: 'flex', flexDirection: 'column', gap: 6 },
  checkRow:    { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', border: '1px solid #f0f1f3', transition: 'background 0.1s' },
  checkAvatar: { width: 30, height: 30, borderRadius: '50%', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkName:   { fontSize: 13.5, fontWeight: 600, color: '#1a1d23' },
  checkRole:   { fontSize: 11.5, color: '#9ca3af', marginTop: 1 },
  checkMark:   { marginLeft: 'auto', fontSize: 15, fontWeight: 700 },
  modalFoot:   { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6, paddingTop: 18, borderTop: '1px solid #f0f1f3' },
  cancelBtn:   { height: 40, padding: '0 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' },
  confirmBtn:  { height: 40, padding: '0 22px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' },
}
