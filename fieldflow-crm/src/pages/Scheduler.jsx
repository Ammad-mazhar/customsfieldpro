import { useState, useRef, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import { useAuth } from '../auth/AuthContext'
import { getSettings, getJobs, saveJobs } from '../data/store'
import { getTechColor, buildTechColorCache } from '../utils/techColors'
import SchedulerJobPopup, { calculatePopupPosition } from '../components/SchedulerJobPopup'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '../utils/useIsMobile'
import { logActivity, ACTIONS } from '../utils/activityLog'
import { normalizeStatus } from '../data/jobStatuses'
import QuickNote from '../components/QuickNote'
import TechNotes from '../components/TechNotes'

// ── Helpers ───────────────────────────────────────────────────────────────────
function deriveTechs(settingsTechs) {
  buildTechColorCache()
  return settingsTechs.map(t => {
    const col = getTechColor(t.id)
    return {
      ...t,
      full:       t.name,
      role:       t.specialty,
      status:     'available',
      initials:   t.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
      color:      t.color ?? col.hex,
      colorLight: t.colorLight ?? col.light,
    }
  })
}

function fmtHour(h) {
  if (h === 0)  return '12 AM'
  if (h < 12)   return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

// ── Map markers ───────────────────────────────────────────────────────────────
function makeJobPin(initials, color, isScheduled) {
  const label = initials || '?'
  const c     = isScheduled ? color : '#9CA3AF'
  return L.divIcon({
    className: '',
    html: `<div style="background:${c};color:white;width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><span style="transform:rotate(45deg);font-size:11px;font-weight:700;font-family:-apple-system,sans-serif;letter-spacing:-0.3px">${label}</span></div>`,
    iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -36],
  })
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

// ── Scheduler notes helpers ───────────────────────────────────────────────────
const SCHED_NOTES_KEY = 'fieldflow_scheduler_notes'

function loadSchedulerNotes() {
  try { return JSON.parse(localStorage.getItem(SCHED_NOTES_KEY) || '{}') } catch { return {} }
}
function saveSchedulerNotes(notes) {
  localStorage.setItem(SCHED_NOTES_KEY, JSON.stringify(notes))
}
function upsertSchedulerNote(key, note) {
  const all = loadSchedulerNotes()
  all[key] = { ...note, updatedAt: Date.now() }
  saveSchedulerNotes(all)
  return all
}
function deleteSchedulerNote(key) {
  const all = loadSchedulerNotes()
  delete all[key]
  saveSchedulerNotes(all)
  return all
}
function slotKey(dateStr, hour) { return `slot_${dateStr}_${hour}:00` }
function dayKey(dateStr)         { return `day_${dateStr}` }
function techDayKey(dateStr, techId) { return `tech_${dateStr}_${techId}` }

function fmtDateStr(d) { return d.toISOString().split('T')[0] }

const NOTE_COLORS = { yellow: '#f59e0b', blue: '#3b82f6', green: '#22c55e', red: '#ef4444', gray: '#6b7280' }

function isNoteVisible(note, user, isAdmin) {
  if (!note) return false
  const vis = note.visibleTo || 'everyone'
  if (vis === 'all' || vis === 'everyone') return true
  if (vis === 'office' || vis === 'office_only') return isAdmin || user?.role !== 'technician'
  if (vis === 'this_tech') return isAdmin || user?.technicianId === note.techId || user?.id === note.techId
  return true
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MAP_CENTER  = [38.895, -77.385]
const START_H     = 7
const END_H       = 19
const SLOT_H      = 58          // kept for mobile vertical calendar
const SLOT_W      = 76          // px per hour — horizontal Gantt
const ROW_H       = 68          // px per tech row in Gantt
const HOURS       = Array.from({ length: END_H - START_H }, (_, i) => i + START_H)
const STATUS_COLORS = { 'on-job': '#f59e0b', available: '#22c55e', off: '#9ca3af' }
const MAINT_COLOR = '#9333ea'

const DEMO_JOBS = [
  { id: 'JOB-1055', client: 'Kim',      type: 'Furnace Tune-Up',  address: '55 Maple Dr, Herndon, VA',       lat: 38.9696, lng: -77.3861, techIds: ['moore'],          startHour: 8,  endHour: 10, notes: [] },
  { id: 'JOB-1057', client: 'Patel',    type: 'Water Heater',     address: '88 Elm Ave, Fairfax, VA',        lat: 38.8462, lng: -77.3064, techIds: ['torres'],         startHour: 8,  endHour: 11, notes: [] },
  { id: 'JOB-1058', client: 'Rivera',   type: 'AC Replacement',   address: '124 Oak St, Centreville, VA',    lat: 38.8404, lng: -77.4291, techIds: ['moore'],          startHour: 10, endHour: 14, notes: [{ id: 'n1', type: 'office', authorName: 'Admin', authorInitials: 'A', text: 'Client has a dog — call before entering backyard.', isPinned: true, createdAt: Date.now() - 3600000 }] },
  { id: 'JOB-1056', client: 'Thompson', type: 'Panel Upgrade',    address: '310 Pine Rd, Reston, VA',        lat: 38.9580, lng: -77.3570, techIds: ['singh'],          startHour: 13, endHour: 16, notes: [] },
  { id: 'JOB-1059', client: 'Johnson',  type: 'AC Inspection',    address: '44 Willow Way, Centreville, VA', lat: 38.8350, lng: -77.4350, techIds: ['moore', 'torres'], startHour: 14, endHour: 16, notes: [] },
]

// ── Optimize Route button ─────────────────────────────────────────────────────
function OptimizeRouteButton() {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate('/route-optimizer')}
      style={{ height: 36, padding: '0 14px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h3l3-9 6 18 3-9h3"/></svg>
      Optimize Routes
    </button>
  )
}

// ── Fix 3: Horizontal Tech Strip ──────────────────────────────────────────────
function TechStrip({ techs, jobs, selectedTechId, setSelectedTechId, canSwitchTechs }) {
  const nowH = new Date().getHours()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, overflowX: 'auto', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      {canSwitchTechs && (
        <button onClick={() => setSelectedTechId(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 20, border: `2px solid ${selectedTechId === null ? '#2563eb' : '#e8e9ec'}`, background: selectedTechId === null ? '#eff6ff' : '#fff', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>ALL</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: selectedTechId === null ? '#2563eb' : '#374151', whiteSpace: 'nowrap' }}>All Techs</span>
        </button>
      )}
      <div style={{ width: 1, height: 40, background: '#e8e9ec', flexShrink: 0 }} />
      {techs.map(t => {
        const jobCount  = jobs.filter(j => j.techIds.includes(t.id)).length
        const hoursToday = jobs.filter(j => j.techIds.includes(t.id)).reduce((s, j) => s + (j.endHour - j.startHour), 0)
        const isActive  = selectedTechId === t.id
        const isOnJob   = jobs.some(j => j.techIds.includes(t.id) && j.startHour <= nowH && j.endHour > nowH)
        const statusColor = isOnJob ? '#f59e0b' : '#22c55e'
        return (
          <button key={t.id}
            onClick={() => canSwitchTechs && setSelectedTechId(isActive ? null : t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', borderRadius: 20, border: `2px solid ${isActive ? t.color : '#e8e9ec'}`, background: isActive ? (t.colorLight ?? t.color + '12') : '#fff', cursor: canSwitchTechs ? 'pointer' : 'default', flexShrink: 0, transition: 'all 0.15s' }}>
            <div style={{ position: 'relative', width: 34, height: 34, flexShrink: 0 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{t.initials}</div>
              <span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: statusColor, border: '2px solid #fff' }} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? t.color : '#1a1d23', whiteSpace: 'nowrap' }}>{t.name}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 2, alignItems: 'center' }}>
                <span style={{ fontSize: 10.5, color: '#6b7280', background: '#f3f4f6', padding: '1px 6px', borderRadius: 8, fontWeight: 600, whiteSpace: 'nowrap' }}>{t.role}</span>
                <span style={{ fontSize: 10.5, color: '#9ca3af', whiteSpace: 'nowrap' }}>{jobCount} jobs · {hoursToday}h</span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Fix 4: Job Slide-out Panel with Notes ────────────────────────────────────
function JobSlideOut({ job, techs, isAdmin, user, onClose, onAddNote, onNavigate }) {
  const tech = techs.find(t => t.id === job.techIds?.[0])

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 370, background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.14)', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f1f3', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, background: '#fafafa' }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#9ca3af', marginBottom: 2 }}>{job.id}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1d23' }}>{job.client || job.clientName}</div>
          <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 2 }}>{job.type}</div>
        </div>
        <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e8e9ec', background: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#6b7280' }}>×</button>
      </div>

      {/* Job meta */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid #f0f1f3', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {job.address && (
          <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2" style={{ marginTop: 2, flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{job.address}</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {job.startHour != null && (
            <span style={{ fontSize: 12, color: '#374151' }}>
              <span style={{ color: '#9ca3af' }}>Time: </span>
              <strong>{fmtHour(job.startHour)} – {fmtHour(job.endHour)}</strong>
            </span>
          )}
          {tech && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: tech.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 7, fontWeight: 700 }}>{tech.initials}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{tech.name}</span>
            </span>
          )}
        </div>
      </div>

      {/* Enhanced Notes panel */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        <TechNotes entityId={job.id} entityType="job" user={user} isAdmin={isAdmin} />
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f1f3', display: 'flex', gap: 8 }}>
        <button onClick={() => onNavigate(job.id)}
          style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid #e8e9ec', background: '#f9fafb', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>View Job →</button>
      </div>
    </div>
  )
}

// ── DnD: Draggable job block ──────────────────────────────────────────────────
function DraggableJob({ job, tech, slotH, isSelected, onClick, showRecurring, showMaint, driveFromPrev }) {
  const isRecurring = !!job.recurrence && job.recurrence !== 'One-time'
  const isMaint     = !!job.maintenancePlanId
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `scheduled::${job.id}::${tech.id}`,
    data: { job, fromTechId: tech.id, fromSlot: 'scheduled' },
  })
  if (isMaint && !showMaint) return null
  if (isRecurring && !isMaint && !showRecurring) return null

  const top    = (job.startHour - START_H) * slotH
  const height = (job.endHour - job.startHour) * slotH
  const tall   = height >= slotH * 2
  const color      = isMaint ? MAINT_COLOR : tech.color
  const colorLight = isMaint ? MAINT_COLOR + '15' : (tech.colorLight ?? color + '1a')
  const borderStyle = isRecurring || isMaint ? '3px dashed' : '3px solid'
  const hasNotes = (job.notes || []).length > 0

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} onClick={onClick}
      title={`${job.id} · ${job.client || job.clientName} · ${job.type}`}
      style={{ position: 'absolute', left: 2, right: 2, top: top + 2, height: height - 4, background: colorLight, borderLeft: `${borderStyle} ${color}`, borderRadius: 5, padding: '4px 5px', overflow: 'hidden', cursor: 'grab', outline: isSelected ? `2px solid ${color}` : 'none', outlineOffset: -2, opacity: isDragging ? 0.4 : 1, transition: 'opacity 0.1s', userSelect: 'none' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color, display: 'flex', alignItems: 'center', gap: 3 }}>
        {(isRecurring || isMaint) && <span style={{ fontSize: 9 }} title={isMaint ? 'Maintenance' : 'Recurring'}>↻</span>}
        {job.client || job.clientName}
        {hasNotes && <span style={{ fontSize: 8, background: '#fef3c7', color: '#92400e', padding: '0 3px', borderRadius: 3, flexShrink: 0, fontWeight: 700 }}>note</span>}
      </div>
      {tall && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.type}</div>}
      {height >= slotH * 2.5 && <div style={{ fontSize: 9.5, color: '#9ca3af', marginTop: 2 }}>{fmtHour(job.startHour)} – {fmtHour(job.endHour)}</div>}
      {driveFromPrev > 0 && height >= slotH && (
        <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>~{driveFromPrev} min drive</div>
      )}
    </div>
  )
}

// ── DnD: Droppable time slot ──────────────────────────────────────────────────
function DroppableSlot({ techId, hour, slotH }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot::${techId}::${hour}` })
  return (
    <div ref={setNodeRef}
      style={{ height: slotH, borderBottom: '1px solid #f3f4f6', background: isOver ? '#eff6ff' : 'transparent', transition: 'background 0.1s' }} />
  )
}

// ── DnD: Horizontal Gantt — droppable hour column ────────────────────────────
function DroppableSlotH({ techId, hour }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot::${techId}::${hour}` })
  return (
    <div ref={setNodeRef}
      style={{ width: SLOT_W, height: '100%', flexShrink: 0, borderRight: '1px solid #f3f4f6', background: isOver ? '#eff6ff' : 'transparent', transition: 'background 0.1s', boxSizing: 'border-box' }} />
  )
}

// ── DnD: Horizontal Gantt — draggable job block ───────────────────────────────
function DraggableJobH({ job, tech, isSelected, onClick, showRecurring, showMaint }) {
  const isRecurring = !!job.recurrence && job.recurrence !== 'One-time'
  const isMaint     = !!job.maintenancePlanId
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `scheduled::${job.id}::${tech.id}`,
    data: { job, fromTechId: tech.id, fromSlot: 'scheduled' },
  })
  if (isMaint && !showMaint) return null
  if (isRecurring && !isMaint && !showRecurring) return null

  const left       = (job.startHour - START_H) * SLOT_W
  const width      = (job.endHour - job.startHour) * SLOT_W
  const color      = isMaint ? MAINT_COLOR : tech.color
  const colorLight = isMaint ? MAINT_COLOR + '15' : (tech.colorLight ?? color + '1a')
  const wide       = width >= SLOT_W * 1.5
  const hasNotes   = (job.notes || []).length > 0

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} onClick={onClick}
      title={`${job.id} · ${job.client || job.clientName} · ${job.type}`}
      style={{
        position: 'absolute', left: left + 2, width: width - 4, top: 5, bottom: 5,
        background: colorLight, borderTop: `3px solid ${color}`, borderRadius: 5,
        padding: '3px 6px', overflow: 'hidden', cursor: 'grab',
        outline: isSelected ? `2px solid ${color}` : 'none', outlineOffset: -2,
        opacity: isDragging ? 0.4 : 1, userSelect: 'none',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1,
      }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 3 }}>
        {(isRecurring || isMaint) && <span style={{ fontSize: 9 }}>↻</span>}
        {job.client || job.clientName}
        {hasNotes && <span style={{ fontSize: 8, background: '#fef3c7', color: '#92400e', padding: '0 3px', borderRadius: 3, flexShrink: 0, fontWeight: 700 }}>note</span>}
      </div>
      {wide && <div style={{ fontSize: 9.5, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.type}</div>}
    </div>
  )
}

// ── DnD: Draggable unscheduled job ────────────────────────────────────────────
function DraggableUnscheduled({ job, variant }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `unscheduled::${job.id}`,
    data: { job, fromSlot: 'unscheduled' },
  })
  const isBlocked = variant === 'blocked'
  const isReady   = variant === 'ready'
  const borderColor = isBlocked ? '#e8e9ec' : isReady ? '#bbf7d0' : '#e8e9ec'
  const bg          = isBlocked ? '#f9fafb' : isReady ? '#f0fdf4' : '#fff'

  return (
    <div ref={isBlocked ? undefined : setNodeRef}
      {...(isBlocked ? {} : listeners)}
      {...(isBlocked ? {} : attributes)}
      style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${borderColor}`, background: bg, cursor: isBlocked ? 'default' : 'grab', opacity: isDragging ? 0.4 : isBlocked ? 0.7 : 1, marginBottom: 8, userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <p style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1d23', margin: 0 }}>{job.id}</p>
        {isBlocked && <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', background: '#f3f4f6', padding: '1px 5px', borderRadius: 4 }}>BLOCKED</span>}
        {isReady && <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '1px 5px', borderRadius: 4 }}>READY</span>}
      </div>
      <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{job.client || job.clientName} · {job.type}</p>
      {isBlocked && (() => {
        const ns = normalizeStatus(job.status)
        const label = ns === 'waiting_on_parts' ? '📦 Waiting on parts'
          : ns === 'diagnosis_required' ? '🔍 Needs diagnosis'
          : ns === 'material_required' ? '🔩 Parts required'
          : null
        return label ? <p style={{ fontSize: 11, color: '#ea580c', margin: '3px 0 0', fontWeight: 600 }}>{label}</p> : null
      })()}
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1a1d23', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
      {msg}
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
          <button onClick={onEditThis} style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #bfdbfe', background: '#eff6ff', fontSize: 13.5, fontWeight: 600, color: '#2563eb', cursor: 'pointer', textAlign: 'left' }}>
            Edit this occurrence only
            <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0', fontWeight: 400 }}>Only changes this specific date</p>
          </button>
          <button onClick={onEditAll} style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #e8e9ec', background: '#f9fafb', fontSize: 13.5, fontWeight: 600, color: '#374151', cursor: 'pointer', textAlign: 'left' }}>
            Edit all future occurrences
            <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0', fontWeight: 400 }}>Updates this and all future visits</p>
          </button>
        </div>
        <button onClick={onClose} style={{ marginTop: 14, width: '100%', padding: '9px', borderRadius: 8, border: '1px solid #e8e9ec', background: '#fff', fontSize: 13, color: '#374151', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
      </div>
    </div>
  )
}

// ── Time slot note editor (popover) ──────────────────────────────────────────
function SlotNoteEditor({ dateStr, hour, notes, onSave, onDelete, onClose, user, techs = [] }) {
  const isDay    = hour === '__day__'
  const noteKey  = isDay ? dayKey(dateStr) : slotKey(dateStr, hour)
  const existing = notes[noteKey]
  const [text,      setText]      = useState(existing?.text || '')
  const [type,      setType]      = useState(existing?.type || 'office')
  const [visibleTo, setVisibleTo] = useState(existing?.visibleTo || 'everyone')
  const [techId,    setTechId]    = useState(existing?.techId || '')
  const [color,     setColor]     = useState(existing?.color || 'yellow')
  const dayName  = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })
  const dayShort = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timeLabel = isDay ? dayShort : (hour < 12 ? `${hour}:00am` : hour === 12 ? '12:00pm' : `${hour - 12}:00pm`)

  function save() {
    if (!text.trim()) return
    onSave(noteKey, {
      text: text.trim(), type, color,
      visibleTo,
      techId: visibleTo === 'this_tech' ? techId : null,
      techName: visibleTo === 'this_tech' ? (techs.find(t => t.id === techId)?.name || '') : null,
      createdBy: user?.name || 'Admin',
      createdAt: existing?.createdAt || Date.now(),
    })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.25)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)', background: '#fff', borderRadius: 12, padding: 20, width: 400, boxShadow: '0 12px 40px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1d23' }}>📝 {existing ? 'Edit' : 'Add'} Note — {dayName} {timeLabel}</span>
          <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #e8e9ec', background: '#f9fafb', cursor: 'pointer', fontSize: 16, color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Text */}
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Write your note here…" rows={3} autoFocus
          style={{ width: '100%', border: '1px solid #e8e9ec', borderRadius: 8, padding: '9px 11px', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />

        {/* Type */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Type:</div>
          <div style={{ display: 'flex', gap: 18 }}>
            {[['office', 'Office Note'], ['tech', 'Tech Note'], ['reminder', 'Reminder']].map(([val, lbl]) => (
              <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                <input type="radio" checked={type === val} onChange={() => setType(val)} style={{ accentColor: '#2563eb' }} />
                {lbl}
              </label>
            ))}
          </div>
        </div>

        {/* Visible to */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Visible to:</div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {[['everyone', 'Everyone'], ['office_only', 'Office Only'], ['this_tech', 'This Tech']].map(([val, lbl]) => (
              <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                <input type="radio" checked={visibleTo === val} onChange={() => setVisibleTo(val)} style={{ accentColor: '#2563eb' }} />
                {lbl}
              </label>
            ))}
          </div>
          {visibleTo === 'this_tech' && (
            <select value={techId} onChange={e => setTechId(e.target.value)}
              style={{ marginTop: 8, height: 34, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 10px', fontSize: 12.5, color: '#374151', outline: 'none', width: '100%', boxSizing: 'border-box' }}>
              <option value="">— Select technician —</option>
              {techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
        </div>

        {/* Color */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Color:</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {Object.entries(NOTE_COLORS).map(([key, hex]) => (
              <button key={key} onClick={() => setColor(key)} title={key}
                style={{ width: 24, height: 24, borderRadius: '50%', background: hex, border: color === key ? '3px solid #1a1d23' : '2px solid transparent', cursor: 'pointer', outline: 'none', boxSizing: 'border-box', transition: 'border 0.1s', flexShrink: 0 }} />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f0f1f3', paddingTop: 12 }}>
          {existing && (
            <button onClick={() => { onDelete(noteKey); onClose() }}
              style={{ height: 34, padding: '0 12px', border: '1px solid #fecaca', background: '#fff', color: '#dc2626', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
          )}
          <button onClick={onClose} style={{ height: 34, padding: '0 12px', border: '1px solid #e8e9ec', background: '#f9fafb', color: '#374151', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>Cancel</button>
          <button onClick={save}
            style={{ height: 34, padding: '0 14px', background: text.trim() ? '#2563eb' : '#9ca3af', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default' }}>Save Note</button>
        </div>
      </div>
    </div>
  )
}

// ── Day Notes Panel (right sidebar) ──────────────────────────────────────────
function DayNotesPanel({ dateStr, techs, notes, onAdd, onDelete, open, onToggle, user, isAdmin }) {
  const dayLabel = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const [addingFor, setAddingFor] = useState(null) // null | 'office' | techId
  const [newText,   setNewText]   = useState('')

  const officeNote = notes[dayKey(dateStr)]

  function commitNote() {
    if (!newText.trim()) return
    if (addingFor === 'office') {
      onAdd(dayKey(dateStr), { text: newText.trim(), type: 'office', createdBy: user?.name || 'Admin', createdAt: Date.now() })
    } else {
      onAdd(techDayKey(dateStr, addingFor), { text: newText.trim(), type: 'office_to_tech', techId: addingFor, createdBy: user?.name || 'Admin', createdAt: Date.now() })
    }
    setNewText(''); setAddingFor(null)
  }

  if (!open) {
    return (
      <div style={{ width: 32, borderLeft: '1px solid #e8e9ec', background: '#fafafa', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 12, flexShrink: 0 }}>
        <button onClick={onToggle} title="Day Notes" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#9ca3af', writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.5px', fontWeight: 700, fontSize: 10 }}>DAY NOTES</button>
      </div>
    )
  }

  return (
    <div style={{ width: 220, borderLeft: '1px solid #e8e9ec', background: '#fafafa', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid #e8e9ec', background: '#fff' }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#374151' }}>📋 DAY NOTES</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 10.5, color: '#9ca3af' }}>{dayLabel}</span>
          <button onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9ca3af', padding: '0 2px', lineHeight: 1 }}>‹</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 6px' }}>
        {/* Office / day section */}
        {(isAdmin || user?.role !== 'technician') && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px' }}>🏢 Office</span>
              <button onClick={() => { setAddingFor('office'); setNewText(officeNote?.text || '') }}
                style={{ fontSize: 10, fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>+ Add</button>
            </div>
            {officeNote && isNoteVisible(officeNote, user, isAdmin) ? (
              <div style={{ background: (NOTE_COLORS[officeNote.color] || '#3b82f6') + '12', border: `1px solid ${NOTE_COLORS[officeNote.color] || '#3b82f6'}40`, borderLeft: `3px solid ${NOTE_COLORS[officeNote.color] || '#3b82f6'}`, borderRadius: 7, padding: '7px 9px', fontSize: 12, color: '#1e40af', lineHeight: 1.5 }}>
                <span style={{ fontSize: 10, marginRight: 4 }}>📝</span>{officeNote.text}
                <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
                  <button onClick={() => { setAddingFor('office'); setNewText(officeNote.text) }} style={{ fontSize: 10, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Edit</button>
                  <button onClick={() => onDelete(dayKey(dateStr))} style={{ fontSize: 10, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Delete</button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 11.5, color: '#c4c9d4', margin: 0, fontStyle: 'italic' }}>No office notes today</p>
            )}
          </div>
        )}

        {/* Tech sections */}
        {techs.map(tech => {
          const techNote = notes[techDayKey(dateStr, tech.id)]
          const visible  = isNoteVisible(techNote, user, isAdmin)
          const canSeeSection = isAdmin || user?.role !== 'technician' || user?.technicianId === tech.id || user?.id === tech.id
          if (!canSeeSection) return null
          return (
            <div key={tech.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: tech.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 7, fontWeight: 700 }}>{tech.initials}</div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{tech.name.split(' ')[1] || tech.name}</span>
                </div>
                {(isAdmin || user?.role !== 'technician') && (
                  <button onClick={() => { setAddingFor(tech.id); setNewText(techNote?.text || '') }}
                    style={{ fontSize: 10, fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>+ Add</button>
                )}
              </div>
              {techNote && visible ? (
                <div style={{ background: (NOTE_COLORS[techNote.color] || '#f59e0b') + '12', border: `1px solid ${NOTE_COLORS[techNote.color] || '#f59e0b'}40`, borderLeft: `3px solid ${NOTE_COLORS[techNote.color] || '#f59e0b'}`, borderRadius: 7, padding: '7px 9px', fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
                  <span style={{ fontSize: 10, marginRight: 4 }}>📝</span>{techNote.text}
                  {(isAdmin || user?.role !== 'technician') && (
                    <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
                      <button onClick={() => { setAddingFor(tech.id); setNewText(techNote.text) }} style={{ fontSize: 10, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Edit</button>
                      <button onClick={() => onDelete(techDayKey(dateStr, tech.id))} style={{ fontSize: 10, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Delete</button>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: 11, color: '#d1d5db', margin: 0, fontStyle: 'italic' }}>No notes today</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Inline note editor */}
      {addingFor !== null && (
        <div style={{ padding: '10px 10px', borderTop: '1px solid #e8e9ec', background: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            {addingFor === 'office' ? '🏢 Office note' : `👤 ${techs.find(t => t.id === addingFor)?.name || ''}`}
          </div>
          <textarea value={newText} onChange={e => setNewText(e.target.value)} placeholder="Type note…" rows={2} autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); commitNote() } }}
            style={{ width: '100%', border: '1px solid #e8e9ec', borderRadius: 7, padding: '7px 9px', fontSize: 12.5, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', gap: 6, marginTop: 7, justifyContent: 'flex-end' }}>
            <button onClick={() => { setAddingFor(null); setNewText('') }} style={{ height: 28, padding: '0 10px', border: '1px solid #e8e9ec', background: '#f9fafb', borderRadius: 6, fontSize: 11.5, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Cancel</button>
            <button onClick={commitNote} style={{ height: 28, padding: '0 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', opacity: newText.trim() ? 1 : 0.5 }}>Save</button>
          </div>
        </div>
      )}

      {/* Clear all */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid #e8e9ec' }}>
        <button onClick={() => {
          const dayPrefix = `day_${dateStr}`
          const techPrefix = `tech_${dateStr}`
          const all = loadSchedulerNotes()
          Object.keys(all).forEach(k => { if (k.startsWith(dayPrefix) || k.startsWith(techPrefix)) delete all[k] })
          saveSchedulerNotes(all)
          window.location.reload()  // simple refresh for now
        }} style={{ width: '100%', height: 28, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', borderRadius: 6, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
          Clear all day notes
        </button>
      </div>
    </div>
  )
}

// ── Rich Tech Hover Card ──────────────────────────────────────────────────────
function TechHoverCard({ tech, jobs, techLocations, schedulerNotes, dateStr, onClose, onMessage, navigate }) {
  const loc        = techLocations[tech.id]
  const nowH       = new Date().getHours()
  const minsAgo    = loc ? Math.floor((Date.now() - loc.updatedAt) / 60_000) : null
  const status     = !loc ? 'offline' : minsAgo < 5 ? 'online' : minsAgo < 15 ? 'idle' : 'offline'
  const statusColor = { online: '#22c55e', idle: '#f59e0b', offline: '#9ca3af' }[status]
  const statusLabel = { online: 'ONLINE', idle: 'IDLE', offline: 'OFFLINE' }[status]

  const techJobs  = jobs.filter(j => j.techIds.includes(tech.id)).sort((a, b) => a.startHour - b.startHour)
  const currentJob = techJobs.find(j => j.startHour <= nowH && j.endHour > nowH)
  const doneJobs   = techJobs.filter(j => j.endHour <= nowH)
  const nextJob    = techJobs.find(j => j.startHour > nowH)

  const techNote  = schedulerNotes[techDayKey(dateStr, tech.id)]
  const dayNote   = schedulerNotes[dayKey(dateStr)]

  const totalMiles = (() => {
    const route = techJobs.filter(j => j.lat)
    let m = 0
    for (let i = 1; i < route.length; i++) m += haversine(route[i-1].lat, route[i-1].lng, route[i].lat, route[i].lng)
    return m.toFixed(1)
  })()

  const hoursWorked = doneJobs.reduce((s, j) => s + (j.endHour - j.startHour), 0)
  const efficiency  = techJobs.length ? Math.round((doneJobs.length / techJobs.length) * 100) : 0

  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', width: 310, border: '1px solid #e8e9ec', overflow: 'hidden', animation: 'fadeInCard 0.2s ease' }}
      onMouseLeave={onClose}>
      <style>{`@keyframes fadeInCard{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>

      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', background: statusColor + '10', borderBottom: '1px solid ' + statusColor + '30' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block', flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: statusColor }}>{statusLabel}</span>
        {minsAgo !== null && <span style={{ fontSize: 10.5, color: '#9ca3af', marginLeft: 'auto' }}>Updated {minsAgo === 0 ? 'just now' : `${minsAgo}m ago`}</span>}
      </div>

      {/* Tech info */}
      <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', gap: 11, borderBottom: '1px solid #f0f1f3' }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: tech.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{tech.initials}</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1d23' }}>{tech.name}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{tech.role}</div>
          {tech.phone && <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>📞 {tech.phone}</div>}
        </div>
      </div>

      {/* Current location */}
      {loc && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f1f3', background: '#fafafa' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 }}>📍 Current Location</div>
          <div style={{ fontSize: 12.5, color: '#374151' }}>({loc.lat?.toFixed(4)}, {loc.lng?.toFixed(4)})</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Speed: 0 mph (stationary)</div>
        </div>
      )}

      {/* Current job */}
      {currentJob && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f1f3' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 }}>⚙️ Current Job</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1d23' }}>{currentJob.id} · {currentJob.client || currentJob.clientName}</div>
          <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 2 }}>{currentJob.address}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 600, background: '#fef3c7', color: '#92400e', padding: '2px 7px', borderRadius: 8 }}>In Progress</span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>Started {fmtHour(currentJob.startHour)}</span>
          </div>
        </div>
      )}

      {/* Today's schedule */}
      {techJobs.length > 0 && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f1f3' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 7 }}>📅 Today's Schedule</div>
          {techJobs.map(j => {
            const done  = j.endHour <= nowH
            const isCur = j.startHour <= nowH && j.endHour > nowH
            return (
              <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <span style={{ fontSize: 12 }}>{done ? '✅' : isCur ? '🔧' : '🕐'}</span>
                <span style={{ fontSize: 12, color: done ? '#9ca3af' : isCur ? '#1a1d23' : '#374151', fontWeight: isCur ? 700 : 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {j.id} {j.client || j.clientName}
                </span>
                {isCur && <span style={{ fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>NOW</span>}
                {!isCur && <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>{fmtHour(j.startHour)}</span>}
              </div>
            )
          })}
        </div>
      )}

      {/* Stats */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f1f3', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1d23' }}>{doneJobs.length}/{techJobs.length}</div>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>Jobs</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1d23' }}>{totalMiles}</div>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>Miles</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1d23' }}>{hoursWorked}h</div>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>Hours</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: efficiency >= 80 ? '#16a34a' : '#d97706' }}>{efficiency}%</div>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>On-time</div>
        </div>
      </div>

      {/* Today's notes */}
      {(techNote || dayNote) && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f1f3' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>📋 Today's Notes</div>
          {techNote && <div style={{ fontSize: 12.5, color: '#92400e', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 6, padding: '6px 9px', marginBottom: 6 }}>{techNote.text}</div>}
          {dayNote && <div style={{ fontSize: 12.5, color: '#1e40af', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '6px 9px' }}>{dayNote.text}</div>}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ padding: '10px 14px', display: 'flex', gap: 7 }}>
        {tech.phone && (
          <a href={`tel:${tech.phone}`} style={{ flex: 1, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>📞 Call</a>
        )}
        <button onClick={onMessage} style={{ flex: 1, height: 34, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>💬 Message</button>
        <button onClick={() => navigate('/scheduler')} style={{ flex: 1, height: 34, background: '#f9fafb', color: '#374151', border: '1px solid #e8e9ec', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>📋 Schedule</button>
      </div>
    </div>
  )
}

// ── Rich Job Pin Hover Card ───────────────────────────────────────────────────
function JobPinHoverCard({ job, techs, onClose, onAddNote, navigate }) {
  const tech = techs.find(t => job.techIds?.includes(t.id))
  const latestNote = (job.notes || []).sort((a, b) => b.createdAt - a.createdAt)[0]

  const STATUS_COLOR = { 'In Progress': '#2563eb', 'Completed': '#16a34a', 'Scheduled': '#0891b2', 'New': '#6b7280' }
  const statusColor  = STATUS_COLOR[job.status] || '#9ca3af'
  const isUrgent     = job.priority === 'Urgent'

  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', width: 280, border: '1px solid #e8e9ec', overflow: 'hidden', animation: 'fadeInCard 0.2s ease' }}
      onMouseLeave={onClose}>
      {/* Job header */}
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #f0f1f3' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#9ca3af', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>🔧 {job.id}</span>
          {isUrgent && <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fef2f2', padding: '1px 6px', borderRadius: 6 }}>🔴 URGENT</span>}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1d23' }}>{job.client || job.clientName}</div>
        {job.address && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>📍 {job.address}</div>}
      </div>

      {/* Details */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f1f3', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ fontSize: 12.5, color: '#374151' }}>🔩 {job.type}</div>
        {tech && <div style={{ fontSize: 12.5, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 14, borderRadius: '50%', background: tech.color, display: 'inline-block' }} />
          👤 {tech.name}
        </div>}
        {job.startHour != null && <div style={{ fontSize: 12.5, color: '#374151' }}>🕐 {fmtHour(job.startHour)} – {fmtHour(job.endHour)} ({job.endHour - job.startHour}h)</div>}
      </div>

      {/* Status */}
      <div style={{ padding: '8px 14px', borderBottom: '1px solid #f0f1f3', display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
          <span style={{ fontWeight: 600, color: statusColor }}>{job.status || 'Scheduled'}</span>
        </span>
      </div>

      {/* Latest note */}
      {latestNote && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f1f3' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>📋 Latest Note</div>
          <div style={{ fontSize: 12.5, color: '#374151', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '6px 9px', lineHeight: 1.5 }}>
            "{latestNote.text.slice(0, 100)}{latestNote.text.length > 100 ? '…' : ''}"
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: '10px 14px', display: 'flex', gap: 7 }}>
        <button onClick={() => navigate('/jobs')} style={{ flex: 1, height: 32, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 7, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>View Job</button>
        <button onClick={onAddNote} style={{ flex: 1, height: 32, background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', borderRadius: 7, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>Add Note</button>
        {job.address && (
          <a href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`} target="_blank" rel="noreferrer"
            style={{ flex: 1, height: 32, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 7, fontSize: 11.5, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Navigate</a>
        )}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Scheduler() {
  const { user, isAdmin, hasPermission } = useAuth()
  const canSwitchTechs = isAdmin || hasPermission('view_all_technicians_map')
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const slotH = isMobile ? 72 : SLOT_H
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const [techs,          setTechs]          = useState(() => deriveTechs(getSettings().technicians))
  const [selectedTechId, setSelectedTechId] = useState(() => isAdmin ? null : (user?.technicianId ?? null))
  const [selectedJobId,  setSelectedJobId]  = useState(null)
  const [activePopup,    setActivePopup]    = useState(null)
  const [jobs,           setJobs]           = useState(DEMO_JOBS)
  const [unscheduled,    setUnscheduled]    = useState(() =>
    getJobs()
      .filter(j => !j.startDate && j.status !== 'Completed' && j.status !== 'Cancelled')
      .slice(0, 10)
      .map(j => ({ ...j, client: j.clientName, notes: j.notes || [] }))
  )
  const [showModal,      setShowModal]      = useState(false)
  const [currentDate,    setCurrentDate]    = useState(new Date('2026-04-01'))
  const [form,           setForm]           = useState({ jobId: '', techIds: [], startTime: '09:00', endTime: '11:00' })
  const [mobileView,     setMobileView]     = useState('calendar')
  const [showRecurring,  setShowRecurring]  = useState(true)
  const [showMaint,      setShowMaint]      = useState(true)
  const [unschedOpen,    setUnschedOpen]    = useState(true)
  const [toast,          setToast]          = useState('')
  const [activeId,       setActiveId]       = useState(null)
  const [occModal,       setOccModal]       = useState(null)
  const [techLocations,   setTechLocations]   = useState(getTechLocations)
  const [slideOut,        setSlideOut]        = useState(null)
  const [schedulerNotes,  setSchedulerNotes]  = useState(() => loadSchedulerNotes())
  const [slotNoteEditor,  setSlotNoteEditor]  = useState(null)  // { dateStr, hour }
  const [dayNotesOpen,    setDayNotesOpen]    = useState(true)
  const [techHoverCard,   setTechHoverCard]   = useState(null)  // { tech, x, y }
  const [jobHoverCard,    setJobHoverCard]    = useState(null)   // { job, x, y }
  const toastTimer   = useRef(null)
  const hoverTimerRef = useRef(null)

  function updateSchedulerNote(key, note) {
    const all = upsertSchedulerNote(key, note)
    setSchedulerNotes({ ...all })
  }
  function removeSchedulerNote(key) {
    const all = deleteSchedulerNote(key)
    setSchedulerNotes({ ...all })
  }

  // Staff: GPS update every 30s
  useEffect(() => {
    if (isAdmin || !user) return
    const techId = user.technicianId || user.id
    const nowH = new Date().getHours()
    const currentJob = jobs.find(j => j.techIds?.includes(techId) && j.startHour <= nowH && j.endHour > nowH)
    const status = currentJob ? 'on-job' : 'available'
    function update() {
      navigator.geolocation?.getCurrentPosition(
        pos => { saveTechLocation(techId, pos.coords.latitude, pos.coords.longitude, status); setTechLocations(getTechLocations()) },
        ()  => { if (currentJob?.lat) { saveTechLocation(techId, currentJob.lat, currentJob.lng, status); setTechLocations(getTechLocations()) } }
      )
    }
    update()
    const iv = setInterval(update, 30_000)
    return () => clearInterval(iv)
  }, [isAdmin, user, jobs])

  // Admin: poll locations every 10s
  useEffect(() => {
    if (!isAdmin) return
    const iv = setInterval(() => setTechLocations(getTechLocations()), 10_000)
    return () => clearInterval(iv)
  }, [isAdmin])

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
    if ((!!job.recurrence && job.recurrence !== 'One-time') || !!job.maintenancePlanId) {
      setOccModal({ job })
    } else {
      setSelectedJobId(job.id)
      setSlideOut(prev => prev?.id === job.id ? null : job)
    }
  }

  function handleAddNote(jobId, note) {
    const updater = j => j.id === jobId ? { ...j, notes: [...(j.notes || []), note] } : j
    setJobs(prev => prev.map(updater))
    setSlideOut(prev => prev?.id === jobId ? { ...prev, notes: [...(prev.notes || []), note] } : prev)
    showToast('Note saved')
  }

  // DnD
  function handleDragStart({ active }) { setActiveId(active.id) }
  function handleDragEnd({ active, over }) {
    setActiveId(null)
    if (!over) return
    const [dropType, techId, hourStr] = over.id.split('::')
    if (dropType !== 'slot') return
    const newHour = parseInt(hourStr, 10)
    const { job, fromTechId, fromSlot } = active.data.current

    if (fromSlot === 'unscheduled') {
      const newJob = { ...job, techIds: [techId], startHour: newHour, endHour: Math.min(newHour + 2, END_H), client: job.clientName || job.client }
      setJobs(prev => [...prev, newJob])
      setUnscheduled(prev => prev.filter(j => j.id !== job.id))
      showToast(`${job.id} scheduled at ${fmtHour(newHour)} → ${techs.find(t => t.id === techId)?.name || techId}`)
      logActivity(ACTIONS.JOB_UPDATED, 'Scheduler', job.id, job.id, `Scheduled via drag to ${fmtHour(newHour)}.`)
      // Persist scheduled status to localStorage for ready/parts_received jobs
      const ns = normalizeStatus(job.status)
      if (ns === 'ready_to_schedule' || ns === 'parts_received' || ns === 'ready_for_repair') {
        const allJobs = getJobs()
        const dateStr = currentDate.toISOString().split('T')[0]
        const updated = allJobs.map(j => j.id === job.id ? {
          ...j, status: 'scheduled', date: dateStr,
          statusHistory: [...(j.statusHistory || []), { status: 'scheduled', changedBy: 'Scheduler', changedAt: Date.now(), note: `Scheduled via drag at ${fmtHour(newHour)}` }],
        } : j)
        saveJobs(updated)
      }
      return
    }
    const dur = job.endHour - job.startHour
    setJobs(prev => prev.map(j => {
      if (j.id !== job.id) return j
      return { ...j, startHour: newHour, endHour: Math.min(newHour + dur, END_H), techIds: techId === fromTechId ? j.techIds : [techId] }
    }))
    showToast(`Job rescheduled to ${fmtHour(newHour)} → ${techs.find(t => t.id === techId)?.name || techId}`)
    logActivity(ACTIONS.JOB_UPDATED, 'Scheduler', job.id, job.id, `Rescheduled to ${fmtHour(newHour)} via drag.`)
  }

  function handleAssign() {
    const job = unscheduled.find(j => j.id === form.jobId)
    if (!job || !form.techIds.length) return
    const [sh, sm] = form.startTime.split(':').map(Number)
    const [eh]     = form.endTime.split(':').map(Number)
    setJobs(prev => [...prev, { ...job, techIds: [...form.techIds], startHour: sh + (sm >= 30 ? 0.5 : 0) | 0, endHour: eh }])
    setUnscheduled(prev => prev.filter(j => j.id !== form.jobId))
    setForm({ jobId: '', techIds: [], startTime: '09:00', endTime: '11:00' })
    setShowModal(false)
    showToast(`${job.id} assigned successfully.`)
  }

  function toggleModalTech(id) {
    setForm(f => ({ ...f, techIds: f.techIds.includes(id) ? f.techIds.filter(x => x !== id) : [...f.techIds, id] }))
  }

  const canAssign     = !!form.jobId && form.techIds.length > 0
  const activeDragJob = activeId ? (() => {
    const [type, id] = activeId.split('::')
    return type === 'scheduled' ? jobs.find(j => j.id === id) : unscheduled.find(j => j.id === id)
  })() : null

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={s.root}>

        {/* Top bar */}
        <div style={s.topBar}>
          <div style={s.dateNav}>
            <button style={s.navBtn} onClick={() => shiftDate(-1)}>&#8592;</button>
            <span style={{ ...s.dateLabel, minWidth: isMobile ? 'auto' : 240, fontSize: isMobile ? 13 : undefined }}>{dateLabel}</span>
            <button style={s.navBtn} onClick={() => shiftDate(1)}>&#8594;</button>
            {/* Day-level note pencil */}
            {(() => {
              const dKey    = dayKey(fmtDateStr(currentDate))
              const dayNote = schedulerNotes[dKey]
              const c       = dayNote ? (NOTE_COLORS[dayNote.color] || '#f59e0b') : '#6b7280'
              return (
                <button className="day-note-btn" onClick={() => setSlotNoteEditor({ dateStr: fmtDateStr(currentDate), hour: '__day__' })}
                  title={dayNote ? dayNote.text : 'Add day note'}
                  style={{ position: 'relative', width: 32, height: 32, borderRadius: 8, border: dayNote ? `1.5px solid ${c}` : '1px solid #e8e9ec', background: dayNote ? c + '15' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, gap: 0 }}>
                  <svg className="day-note-pencil" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: dayNote ? 0.9 : undefined }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  {dayNote && <span style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: c, display: 'block' }} />}
                </button>
              )
            })()}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {!isMobile && (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer', padding: '5px 10px', border: `1px solid ${showRecurring ? '#bfdbfe' : '#e8e9ec'}`, borderRadius: 7, background: showRecurring ? '#eff6ff' : '#fff', userSelect: 'none' }}>
                  <input type="checkbox" checked={showRecurring} onChange={e => setShowRecurring(e.target.checked)} style={{ margin: 0 }} />
                  <span style={{ fontWeight: 600, color: showRecurring ? '#2563eb' : '#6b7280' }}>↻ Recurring</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer', padding: '5px 10px', border: `1px solid ${showMaint ? '#e9d5ff' : '#e8e9ec'}`, borderRadius: 7, background: showMaint ? '#fdf4ff' : '#fff', userSelect: 'none' }}>
                  <input type="checkbox" checked={showMaint} onChange={e => setShowMaint(e.target.checked)} style={{ margin: 0 }} />
                  <span style={{ fontWeight: 600, color: showMaint ? '#9333ea' : '#6b7280' }}>Maintenance</span>
                </label>
              </>
            )}
            {isMobile && (
              <div style={{ display: 'flex', border: '1px solid #e8e9ec', borderRadius: 8, overflow: 'hidden' }}>
                <button onClick={() => setMobileView('calendar')} style={{ height: 36, padding: '0 14px', background: mobileView === 'calendar' ? '#2563eb' : '#fff', color: mobileView === 'calendar' ? '#fff' : '#6b7280', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Calendar</button>
                <button onClick={() => setMobileView('map')}      style={{ height: 36, padding: '0 14px', background: mobileView === 'map'      ? '#2563eb' : '#fff', color: mobileView === 'map'      ? '#fff' : '#6b7280', border: 'none', borderLeft: '1px solid #e8e9ec', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Map</button>
              </div>
            )}
            {isAdmin && <><button style={s.assignBtn} onClick={() => setShowModal(true)}>+ Assign Job</button><OptimizeRouteButton /></>}
          </div>
        </div>

        {/* Gantt calendar with technicians + unscheduled panels */}
        {!isMobile && (
          <div style={s.calTop}>
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* Technicians left panel */}
              <div style={s.techPanel}>
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
                <div style={s.legend}>
                  {Object.entries({ 'On Job': '#f59e0b', 'Available': '#22c55e', 'Off': '#9ca3af' }).map(([lbl, col]) => (
                    <div key={lbl} style={s.legendRow}><span style={{ ...s.legendDot, background: col }} /><span style={s.legendLabel}>{lbl}</span></div>
                  ))}
                  <div style={{ height: 1, background: '#f0f1f3', margin: '4px 0' }} />
                  <div style={s.legendRow}><span style={{ ...s.legendDot, background: '#2563eb', borderRadius: 2, width: 16, height: 3 }} /><span style={s.legendLabel}>Recurring (dashed)</span></div>
                  <div style={s.legendRow}><span style={{ ...s.legendDot, background: MAINT_COLOR, borderRadius: 2, width: 16, height: 3 }} /><span style={s.legendLabel}>Maintenance</span></div>
                </div>
              </div>

              {/* Gantt time grid center */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '1px solid #e8e9ec' }}>
                <style>{`
                  .slot-pencil-icon { opacity: 0.15; transition: opacity 0.15s; pointer-events: none; }
                  .slot-hour-cell:hover .slot-pencil-icon { opacity: 1; }
                  .slot-hour-cell:hover { background: #f0f9ff !important; }
                  .day-note-pencil { opacity: 0.2; transition: opacity 0.15s; }
                  .day-note-btn:hover .day-note-pencil { opacity: 1; }
                `}</style>
                {/* Time ruler with slot note indicators */}
                <div style={{ display: 'flex', borderBottom: '2px solid #e8e9ec', flexShrink: 0, background: '#fafafa' }}>
                  <div style={{ width: 6, flexShrink: 0 }} />
                  {HOURS.map(h => {
                    const sKey    = slotKey(fmtDateStr(currentDate), h)
                    const hasNote = !!schedulerNotes[sKey]
                    const noteColor = hasNote ? (NOTE_COLORS[schedulerNotes[sKey]?.color] || '#f59e0b') : null
                    return (
                      <div key={h} className="slot-hour-cell"
                        onClick={() => setSlotNoteEditor({ dateStr: fmtDateStr(currentDate), hour: h })}
                        style={{ width: SLOT_W, flexShrink: 0, padding: '6px 2px 4px', fontSize: 9.5, fontWeight: 600, color: hasNote ? '#d97706' : '#9ca3af', borderLeft: '1px solid #f0f1f3', textAlign: 'center', boxSizing: 'border-box', letterSpacing: '-0.2px', cursor: 'pointer', background: hasNote ? '#fffbeb' : 'transparent', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}
                        title={hasNote ? schedulerNotes[sKey].text : `Add note for ${fmtHour(h)}`}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <svg className="slot-pencil-icon" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={hasNote ? noteColor : '#6b7280'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: hasNote ? 0.8 : undefined }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          {fmtHour(h)}
                        </span>
                        {hasNote
                          ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: noteColor, display: 'inline-block' }} />
                          : <span style={{ width: 6, height: 6, borderRadius: '50%', border: '1px solid #d1d5db', display: 'inline-block' }} />
                        }
                      </div>
                    )
                  })}
                </div>
                {/* Tech rows */}
                <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
                  {/* Slot notes display row */}
                  {(() => {
                    const hasAny = HOURS.some(h => {
                      const n = schedulerNotes[slotKey(fmtDateStr(currentDate), h)]
                      return n && isNoteVisible(n, user, isAdmin)
                    })
                    if (!hasAny) return null
                    return (
                      <div style={{ display: 'flex', height: 22, borderBottom: '1px solid #f0f1f3', background: '#fffdf6', flexShrink: 0, minWidth: HOURS.length * SLOT_W + 6 }}>
                        <div style={{ width: 6, flexShrink: 0 }} />
                        {HOURS.map(h => {
                          const sKey = slotKey(fmtDateStr(currentDate), h)
                          const note = schedulerNotes[sKey]
                          if (!note || !isNoteVisible(note, user, isAdmin)) return <div key={h} style={{ width: SLOT_W, flexShrink: 0, borderRight: '1px solid #f9fafb' }} />
                          const c = NOTE_COLORS[note.color] || '#f59e0b'
                          return (
                            <div key={h} onClick={() => setSlotNoteEditor({ dateStr: fmtDateStr(currentDate), hour: h })}
                              title={note.text}
                              style={{ width: SLOT_W, flexShrink: 0, height: '100%', background: c + '18', borderLeft: `3px solid ${c}`, padding: '2px 5px', cursor: 'pointer', overflow: 'hidden', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <span style={{ fontSize: 8, flexShrink: 0 }}>📝</span>
                              <span style={{ fontSize: 8.5, color: c, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{note.text}</span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                  {visibleTechs.map(tech => {
                    const techJobs = jobs.filter(j => j.techIds.includes(tech.id))
                    return (
                      <div key={tech.id} style={{ position: 'relative', height: ROW_H, display: 'flex', borderBottom: '1px solid #f0f1f3', minWidth: HOURS.length * SLOT_W + 6 }}>
                        <div style={{ width: 6, flexShrink: 0, background: tech.color, opacity: 0.5 }} />
                        {HOURS.map(h => <DroppableSlotH key={h} techId={tech.id} hour={h} />)}
                        {techJobs.map(job => (
                          <DraggableJobH key={`${job.id}-${tech.id}`}
                            job={job} tech={tech}
                            isSelected={selectedJobId === job.id}
                            onClick={(e) => {
                              if ((!!job.recurrence && job.recurrence !== 'One-time') || !!job.maintenancePlanId) {
                                clickJob(job)
                              } else {
                                e.stopPropagation()
                                setActivePopup({ job, position: calculatePopupPosition(e) })
                              }
                            }}
                            showRecurring={showRecurring} showMaint={showMaint}
                          />
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Unscheduled right panel */}
              <div style={{ ...s.unschedPanel, width: unschedOpen ? 200 : 32 }}>
                <button onClick={() => setUnschedOpen(o => !o)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 10px 10px 12px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', borderBottom: '1px solid #f0f1f3' }}>
                  {unschedOpen ? (
                    <><span style={{ fontSize: 10.5, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.6px', textTransform: 'uppercase' }}>Unscheduled</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: unscheduled.length > 0 ? '#fee2e2' : '#f3f4f6', color: unscheduled.length > 0 ? '#dc2626' : '#9ca3af' }}>{unscheduled.length}</span></>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.5px' }}>UNSCHED {unscheduled.length > 0 ? `(${unscheduled.length})` : ''}</span>
                  )}
                </button>
                {unschedOpen && (
                  <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
                    {unscheduled.length === 0
                      ? <p style={{ fontSize: 12, color: '#c4c9d4', textAlign: 'center', padding: '20px 0', margin: 0 }}>All jobs scheduled</p>
                      : (() => {
                          const BLOCKED_STATUSES = ['waiting_on_parts', 'diagnosis_required', 'material_required']
                          const READY_STATUSES   = ['ready_to_schedule', 'parts_received', 'ready_for_repair']
                          const blocked  = unscheduled.filter(j => BLOCKED_STATUSES.includes(normalizeStatus(j.status)))
                          const ready    = unscheduled.filter(j => READY_STATUSES.includes(normalizeStatus(j.status)))
                          const normal   = unscheduled.filter(j => !BLOCKED_STATUSES.includes(normalizeStatus(j.status)) && !READY_STATUSES.includes(normalizeStatus(j.status)))
                          return (
                            <>
                              {ready.length > 0 && (
                                <>
                                  <p style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '0 0 6px' }}>🗓 Ready to Schedule ({ready.length})</p>
                                  {ready.map(job => <DraggableUnscheduled key={job.id} job={job} variant="ready" />)}
                                </>
                              )}
                              {normal.length > 0 && (
                                <>
                                  {ready.length > 0 && <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '8px 0 6px' }}>Other ({normal.length})</p>}
                                  {normal.map(job => <DraggableUnscheduled key={job.id} job={job} />)}
                                </>
                              )}
                              {blocked.length > 0 && (
                                <>
                                  <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '8px 0 6px' }}>⛔ Blocked ({blocked.length})</p>
                                  {blocked.map(job => <DraggableUnscheduled key={job.id} job={job} variant="blocked" />)}
                                </>
                              )}
                            </>
                          )
                        })()
                    }
                    <p style={{ fontSize: 11, color: '#d1d5db', textAlign: 'center', margin: '8px 0 0', lineHeight: 1.5 }}>Drag onto calendar to schedule</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main panels: map + day notes */}
        <div style={s.panels}>

          {/* Map */}
          <div style={{ ...s.mapPanel, display: isMobile && mobileView !== 'map' ? 'none' : undefined }}>
            <MapContainer center={MAP_CENTER} zoom={12} style={{ width: '100%', height: '100%' }} zoomControl>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />

              {/* Scheduled job pins — tech initials in teardrop + rich hover card */}
              {visibleJobs.map(job => {
                if (!job.lat) return null
                const primaryTech = techs.find(t => t.id === job.techIds[0])
                return (
                  <Marker key={job.id} position={[job.lat, job.lng]}
                    icon={makeJobPin(primaryTech?.initials ?? '?', primaryTech?.color ?? '#2563eb', true)}
                    eventHandlers={{
                      click: () => { setSelectedJobId(job.id); setSlideOut(job) },
                      mouseover: (e) => {
                        clearTimeout(hoverTimerRef.current)
                        const pt = e.containerPoint
                        hoverTimerRef.current = setTimeout(() => {
                          setTechHoverCard(null)
                          setJobHoverCard({ job, x: pt.x, y: pt.y })
                        }, 300)
                      },
                      mouseout: () => { clearTimeout(hoverTimerRef.current) },
                    }}>
                    <Popup>
                      <div style={s.popup}>
                        <div style={s.popupId}>{job.id}</div>
                        <div style={s.popupClient}>{job.client || job.clientName}</div>
                        <div style={s.popupType}>{job.type}</div>
                        <div style={s.popupAddr}>{job.address}</div>
                        <div style={s.popupTime}>{fmtHour(job.startHour)} – {fmtHour(job.endHour)}</div>
                        <div style={s.popupTechs}>
                          {job.techIds.map(tid => { const t = techs.find(x => x.id === tid); return <span key={tid} style={{ ...s.popupTechTag, background: t?.color + '20', color: t?.color }}>{t?.name}</span> })}
                        </div>
                        {(job.notes || []).length > 0 && <div style={{ marginTop: 6, fontSize: 11, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 5, padding: '4px 7px' }}>📝 {job.notes.length} note{job.notes.length > 1 ? 's' : ''}</div>}
                      </div>
                    </Popup>
                  </Marker>
                )
              })}

              {/* Unscheduled job pins — gray teardrop, no tech initials */}
              {unscheduled.filter(j => j.lat).map(job => (
                <Marker key={`unsched-${job.id}`} position={[job.lat, job.lng]}
                  icon={makeJobPin('—', '#9CA3AF', false)}
                  eventHandlers={{ click: () => setSlideOut(job) }}>
                  <Popup>
                    <div style={s.popup}>
                      <div style={s.popupId}>{job.id}</div>
                      <div style={s.popupClient}>{job.client || job.clientName}</div>
                      <div style={s.popupType}>{job.type}</div>
                      <div style={s.popupAddr}>{job.address}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 5, fontWeight: 600 }}>⚠ Unscheduled</div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Route + numbered stops for selected tech */}
              {selectedTechId && (() => {
                const tech    = techs.find(t => t.id === selectedTechId)
                const route   = jobs.filter(j => j.techIds.includes(selectedTechId) && j.lat).sort((a, b) => a.startHour - b.startHour)
                const techLoc = techLocations[selectedTechId]
                if (!route.length) return null
                return (
                  <>
                    <Polyline positions={route.map(j => [j.lat, j.lng])} pathOptions={{ color: tech?.color ?? '#2563eb', weight: 2.5, opacity: 0.65 }} />
                    {route.map((job, idx) => <Marker key={`stop-${job.id}`} position={[job.lat, job.lng]} icon={makeNumberPin(idx + 1, tech?.color ?? '#2563eb')} />)}
                    {techLoc && route[0] && <Polyline positions={[[techLoc.lat, techLoc.lng], [route[0].lat, route[0].lng]]} pathOptions={{ color: tech?.color ?? '#6b7280', weight: 2, opacity: 0.7, dashArray: '6 6' }} />}
                  </>
                )
              })()}

              {/* Technician location markers — rich hover card */}
              {isAdmin && techs.map(tech => {
                const loc = techLocations[tech.id]
                if (!loc || Date.now() - loc.updatedAt > 5 * 60_000) return null
                const isOnJob = loc.status === 'on-job'
                return (
                  <Marker key={`tech-${tech.id}`} position={[loc.lat, loc.lng]} icon={makeTechPin(tech.color, tech.initials, isOnJob)}
                    eventHandlers={{
                      mouseover: (e) => {
                        clearTimeout(hoverTimerRef.current)
                        const pt = e.containerPoint
                        hoverTimerRef.current = setTimeout(() => {
                          setJobHoverCard(null)
                          setTechHoverCard({ tech, x: pt.x, y: pt.y })
                        }, 300)
                      },
                      mouseout: () => { clearTimeout(hoverTimerRef.current) },
                      click: () => { setSelectedTechId(prev => prev === tech.id ? null : tech.id) },
                    }}>
                    <Popup>
                      <div style={s.popup}>
                        <div style={{ ...s.popupClient, color: tech.color }}>{tech.name}</div>
                        <div style={{ ...s.popupType, display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: isOnJob ? '#f59e0b' : '#22c55e', display: 'inline-block' }} />
                          {isOnJob ? 'On Job' : 'Available'}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}

              <style>{`@keyframes techPulse{0%{transform:scale(1);opacity:0.6}70%{transform:scale(1.6);opacity:0}100%{transform:scale(1.6);opacity:0}}`}</style>
            </MapContainer>

            {/* Fix 2: Map legend */}
            <div style={{ position: 'absolute', bottom: 28, left: 10, zIndex: 900, background: 'rgba(255,255,255,0.95)', border: '1px solid #e8e9ec', borderRadius: 8, padding: '7px 12px', display: 'flex', gap: 12, alignItems: 'center', fontSize: 11, color: '#374151', boxShadow: '0 2px 8px rgba(0,0,0,0.09)', backdropFilter: 'blur(4px)' }}>
              {[['#2563eb', 'Scheduled'], ['#9CA3AF', 'Unscheduled']].map(([col, lbl]) => (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 11, height: 11, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: col, border: '1.5px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  <span>{lbl}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#22c55e', border: '1.5px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                <span>Technician</span>
              </div>
            </div>

            {/* Tech hover card overlay */}
            {techHoverCard && (
              <div style={{ position: 'absolute', zIndex: 1000, left: Math.min(techHoverCard.x + 10, 'calc(100% - 320px)'), top: Math.max(techHoverCard.y - 60, 10), pointerEvents: 'auto' }}
                onMouseEnter={() => clearTimeout(hoverTimerRef.current)}
                onMouseLeave={() => setTechHoverCard(null)}>
                <TechHoverCard
                  tech={techHoverCard.tech}
                  jobs={jobs}
                  techLocations={techLocations}
                  schedulerNotes={schedulerNotes}
                  dateStr={fmtDateStr(currentDate)}
                  onClose={() => setTechHoverCard(null)}
                  onMessage={() => navigate('/inbox')}
                  navigate={navigate}
                />
              </div>
            )}

            {/* Job pin hover card overlay */}
            {jobHoverCard && (
              <div style={{ position: 'absolute', zIndex: 1000, left: Math.min(jobHoverCard.x + 10, 'calc(100% - 290px)'), top: Math.max(jobHoverCard.y - 60, 10), pointerEvents: 'auto' }}
                onMouseEnter={() => clearTimeout(hoverTimerRef.current)}
                onMouseLeave={() => setJobHoverCard(null)}>
                <JobPinHoverCard
                  job={jobHoverCard.job}
                  techs={techs}
                  onClose={() => setJobHoverCard(null)}
                  onAddNote={() => { setSlideOut(jobHoverCard.job); setJobHoverCard(null) }}
                  navigate={navigate}
                />
              </div>
            )}

            {/* Map overlays */}
            {selectedJobId && !selectedTechId && (() => {
              const job = jobs.find(j => j.id === selectedJobId); if (!job) return null
              const tech = techs.find(t => t.id === job.techIds[0])
              return (
                <div style={s.mapOverlay}>
                  <span style={{ ...s.overlayBadge, background: tech?.color + '20', color: tech?.color }}>{job.id}</span>
                  <span style={s.overlayClient}>{job.client || job.clientName} — {job.type}</span>
                  <button style={s.overlayClear} onClick={() => { setSelectedJobId(null); setSlideOut(null) }}>×</button>
                </div>
              )
            })()}
            {selectedTechId && (() => {
              const tech  = techs.find(t => t.id === selectedTechId)
              const route = jobs.filter(j => j.techIds.includes(selectedTechId) && j.lat).sort((a, b) => a.startHour - b.startHour)
              if (!route.length) return null
              let totalMiles = 0
              for (let i = 1; i < route.length; i++) totalMiles += haversine(route[i-1].lat, route[i-1].lng, route[i].lat, route[i].lng)
              return (
                <div style={{ ...s.mapOverlay, flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: tech?.color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1d23', flex: 1 }}>{tech?.name} — Day Route</span>
                    <button style={s.overlayClear} onClick={() => setSelectedTechId(null)}>×</button>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11.5, color: '#6b7280' }}>
                    <span>{route.length} stops</span>
                    <span>~{totalMiles.toFixed(1)} mi</span>
                    <span>~{Math.round(totalMiles * 1.4 / 30 * 60)} min drive</span>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Day Notes right sidebar */}
          {!isMobile && (
            <DayNotesPanel
              dateStr={fmtDateStr(currentDate)}
              techs={techs}
              notes={schedulerNotes}
              onAdd={updateSchedulerNote}
              onDelete={removeSchedulerNote}
              open={dayNotesOpen}
              onToggle={() => setDayNotesOpen(o => !o)}
              user={user}
              isAdmin={isAdmin}
            />
          )}
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeDragJob && (
            <div style={{ padding: '6px 10px', background: '#1a1d23', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', pointerEvents: 'none' }}>
              {activeDragJob.id} · {activeDragJob.client || activeDragJob.clientName}
            </div>
          )}
        </DragOverlay>

        {/* Assign modal */}
        {showModal && (
          <div style={s.overlay} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
            <div style={s.modal}>
              <div style={s.modalHead}>
                <div><h3 style={s.modalTitle}>Assign Job</h3><p style={s.modalSub}>Assign an open job to one or more technicians</p></div>
                <button style={s.closeBtn} onClick={() => setShowModal(false)}>×</button>
              </div>
              <div style={s.fg}>
                <label style={s.fl}>Select Job</label>
                {unscheduled.length === 0
                  ? <p style={s.noJobs}>All jobs have been assigned.</p>
                  : <select style={s.sel} value={form.jobId} onChange={e => setForm(f => ({ ...f, jobId: e.target.value }))}>
                      <option value="">— Choose an unassigned job —</option>
                      {unscheduled.map(j => <option key={j.id} value={j.id}>{j.id} · {j.client || j.clientName} · {j.type}</option>)}
                    </select>
                }
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

        {occModal && (
          <OccurrenceModal job={occModal.job} onClose={() => setOccModal(null)}
            onEditThis={() => { setSelectedJobId(occModal.job.id); setOccModal(null) }}
            onEditAll={() => { setSelectedJobId(occModal.job.id); setOccModal(null) }} />
        )}

        {/* Fix 4: Job slide-out with notes */}
        {slideOut && (
          <JobSlideOut job={slideOut} techs={techs} isAdmin={isAdmin} user={user}
            onClose={() => { setSlideOut(null); setSelectedJobId(null) }}
            onAddNote={handleAddNote}
            onNavigate={() => navigate('/jobs')} />
        )}

        {toast && <Toast msg={toast} />}

        {/* Slot note editor */}
        {slotNoteEditor && (
          <SlotNoteEditor
            dateStr={slotNoteEditor.dateStr}
            hour={slotNoteEditor.hour}
            notes={schedulerNotes}
            onSave={(key, note) => { updateSchedulerNote(key, note); setSlotNoteEditor(null) }}
            onDelete={(key) => { removeSchedulerNote(key); setSlotNoteEditor(null) }}
            onClose={() => setSlotNoteEditor(null)}
            user={user}
            techs={techs}
          />
        )}

        {/* Quick Note floating button */}
        {isAdmin && <QuickNote context="" contextLabel="Scheduler" />}
      </div>

      {/* Job popup (appears on job block click) */}
      {activePopup && (
        <SchedulerJobPopup
          job={activePopup.job}
          position={activePopup.position}
          techs={techs}
          onClose={() => setActivePopup(null)}
          onEdit={() => { setActivePopup(null); setSelectedJobId(activePopup.job.id); setSlideOut(activePopup.job) }}
          onViewDetails={() => { setActivePopup(null); navigate('/jobs') }}
        />
      )}
    </DndContext>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  root:         { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', gap: 10, overflow: 'hidden' },
  panels:       { flex: 1, minHeight: 520, display: 'flex', overflow: 'hidden', border: '1px solid #e8e9ec', borderRadius: 10, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  topBar:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0, flexWrap: 'wrap' },
  dateNav:      { display: 'flex', alignItems: 'center', gap: 10 },
  navBtn:       { height: 34, padding: '0 12px', border: '1px solid #e8e9ec', borderRadius: 7, fontSize: 15, fontWeight: 500, color: '#374151', background: '#fff', cursor: 'pointer' },
  dateLabel:    { fontSize: 15, fontWeight: 700, color: '#1a1d23', minWidth: 240, textAlign: 'center' },
  assignBtn:    { height: 36, padding: '0 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' },
  techPanel:    { width: 200, flexShrink: 0, borderRight: '1px solid #e8e9ec', overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  panelLabel:   { fontSize: 10.5, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.7px', textTransform: 'uppercase', padding: '12px 14px 6px', margin: 0 },
  techRow:      { display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px 10px 11px', background: 'none', border: 'none', borderLeft: '3px solid transparent', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'background 0.1s' },
  techRowActive:{ background: '#f8faff' },
  avatar:       { width: 36, height: 36, borderRadius: '50%', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', letterSpacing: '-0.3px' },
  statusDot:    { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', border: '1.5px solid #fff' },
  techMeta:     { flex: 1, minWidth: 0 },
  techName:     { fontSize: 13, fontWeight: 600, color: '#1a1d23', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  techSub:      { fontSize: 11.5, color: '#9ca3af', marginTop: 1 },
  jobBadge:     { fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10, flexShrink: 0 },
  divider:      { height: 1, background: '#f0f1f3', margin: '6px 0' },
  legend:       { padding: '12px 14px', marginTop: 'auto', borderTop: '1px solid #f0f1f3', display: 'flex', flexDirection: 'column', gap: 6 },
  legendRow:    { display: 'flex', alignItems: 'center', gap: 7 },
  legendDot:    { width: 9, height: 9, borderRadius: '50%', flexShrink: 0 },
  legendLabel:  { fontSize: 11.5, color: '#9ca3af' },
  mapPanel:     { flex: 1, position: 'relative', overflow: 'hidden' },
  mapOverlay:   { position: 'absolute', top: 10, left: 10, zIndex: 900, background: '#fff', border: '1px solid #e8e9ec', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: 13, fontWeight: 500, color: '#374151' },
  overlayBadge: { fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10 },
  overlayClient:{ fontSize: 13, fontWeight: 600, color: '#1a1d23' },
  overlayClear: { background: 'none', border: 'none', fontSize: 18, color: '#9ca3af', cursor: 'pointer', lineHeight: 1, padding: '0 2px' },
  popup:        { padding: '2px 0', minWidth: 160 },
  popupId:      { fontFamily: 'ui-monospace,Consolas,monospace', fontSize: 10.5, color: '#9ca3af', marginBottom: 4 },
  popupClient:  { fontSize: 15, fontWeight: 700, color: '#1a1d23', marginBottom: 2 },
  popupType:    { fontSize: 12.5, color: '#6b7280' },
  popupAddr:    { fontSize: 11.5, color: '#9ca3af', marginTop: 3 },
  popupTime:    { fontSize: 12.5, fontWeight: 600, color: '#2563eb', marginTop: 5 },
  popupTechs:   { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  popupTechTag: { fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 10 },
  calTop:       { flexShrink: 0, border: '1px solid #e8e9ec', borderRadius: 10, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden', display: 'flex', flexDirection: 'row' },
  unschedPanel: { borderLeft: '1px solid #e8e9ec', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden', transition: 'width 0.2s ease', background: '#fafafa' },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(2px)' },
  modal:        { background: '#fff', borderRadius: 14, padding: '28px 28px 24px', width: 460, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' },
  modalHead:    { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 },
  modalTitle:   { fontSize: 18, fontWeight: 700, color: '#1a1d23', margin: 0 },
  modalSub:     { fontSize: 13, color: '#9ca3af', margin: '3px 0 0' },
  closeBtn:     { width: 30, height: 30, borderRadius: 7, border: '1px solid #e8e9ec', background: '#f9fafb', fontSize: 20, color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 },
  fg:           { marginBottom: 18 },
  fl:           { display: 'block', fontSize: 11.5, fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 7 },
  sel:          { width: '100%', height: 40, border: '1px solid #e8e9ec', borderRadius: 8, padding: '0 12px', fontSize: 13.5, color: '#374151', background: '#fff', outline: 'none', boxSizing: 'border-box' },
  inp:          { width: '100%', height: 40, border: '1px solid #e8e9ec', borderRadius: 8, padding: '0 12px', fontSize: 13.5, color: '#374151', outline: 'none', boxSizing: 'border-box' },
  noJobs:       { fontSize: 13.5, color: '#9ca3af', margin: 0 },
  checkList:    { display: 'flex', flexDirection: 'column', gap: 6 },
  checkRow:     { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', border: '1px solid #f0f1f3', transition: 'background 0.1s' },
  checkAvatar:  { width: 30, height: 30, borderRadius: '50%', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkName:    { fontSize: 13.5, fontWeight: 600, color: '#1a1d23' },
  checkRole:    { fontSize: 11.5, color: '#9ca3af', marginTop: 1 },
  checkMark:    { marginLeft: 'auto', fontSize: 15, fontWeight: 700 },
  modalFoot:    { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6, paddingTop: 18, borderTop: '1px solid #f0f1f3' },
  cancelBtn:    { height: 40, padding: '0 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' },
  confirmBtn:   { height: 40, padding: '0 22px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' },
}
