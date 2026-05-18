import { useEffect } from 'react'
import { getTechColor } from '../utils/techColors'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(val) {
  if (!val) return 'Not set'
  // Handles "2026-04-01", Date objects, or timestamps
  const d = new Date(val)
  if (isNaN(d.getTime())) return String(val)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  if (isNaN(h)) return timeStr
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${hr}:${String(m || 0).padStart(2, '0')} ${ampm}`
}

export function calculatePopupPosition(e, popupWidth = 360, popupHeight = 340) {
  const rect = e.currentTarget?.getBoundingClientRect?.() ?? e.target?.getBoundingClientRect?.() ?? { top: 0, bottom: 0, left: 0, right: 0 }
  const vw = window.innerWidth
  const vh = window.innerHeight
  const scrollY = window.scrollY

  let top  = rect.bottom + scrollY + 8
  let left = rect.left

  if (left + popupWidth > vw - 20) left = rect.right - popupWidth
  if (left < 20) left = 20
  if (top + popupHeight > vh + scrollY - 20) top = rect.top + scrollY - popupHeight - 8

  return { top, left }
}

// ── TechPill ──────────────────────────────────────────────────────────────────
function TechPill({ name, techId }) {
  const { hex, light } = getTechColor(techId)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: light, color: hex, fontSize: 11.5, fontWeight: 600,
      padding: '4px 10px', borderRadius: 99, marginRight: 6, marginBottom: 4,
      border: `1px solid ${hex}30`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: hex, flexShrink: 0 }} />
      {name}
    </span>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SchedulerJobPopup({ job, position, techs = [], onClose, onEdit, onViewDetails }) {
  // Close on Escape
  useEffect(() => {
    function handler(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (!e.target.closest('.scheduler-popup')) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const assignedTechs = job.techIds?.length
    ? techs.filter(t => job.techIds.includes(t.id))
    : job.techName
      ? [{ id: job.technicianId, name: job.techName }]
      : []

  const startDate  = job.date || job.startDate || job.scheduledStart
  const endDate    = job.endDate || job.date || job.scheduledEnd
  const startTime  = job.time || job.startTime || ''
  const endTime    = job.endTime || ''
  const clientName = job.clientName || job.client || 'Unknown Client'
  const jobId      = job.id || ''
  const title      = job.title || `${job.type || 'Job'} — ${clientName}`
  const description = job.description || job.notes || job.internalNotes || ''

  const startLabel = startDate ? `${formatDate(startDate)}${startTime ? '  ' + formatTime(startTime) : ''}` : 'Not set'
  const endLabel   = endDate   ? `${formatDate(endDate)}${endTime ? '  ' + formatTime(endTime) : ''}` : 'Not set'

  return (
    <>
      {/* Backdrop: invisible, catches outside clicks via useEffect */}
      <div className="scheduler-popup" style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 9999,
        width: 360,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        animation: 'popupFadeIn 140ms ease-out',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <style>{`
          @keyframes popupFadeIn {
            from { opacity: 0; transform: translateY(-6px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0)  scale(1); }
          }
        `}</style>

        {/* Header */}
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #F1F5F9', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, width: 24, height: 24, borderRadius: 6, border: '1px solid #e8e9ec', background: '#f9fafb', color: '#9ca3af', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>×</button>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 24px 0 0', lineHeight: 1.4 }}>{title}</p>
          <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>
            {clientName}
            {jobId && <span style={{ color: '#94A3B8' }}> · {jobId}</span>}
          </p>
        </div>

        {/* Details */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
          <p style={{ fontSize: 11.5, fontWeight: 700, color: '#16A34A', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Details</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: '0 0 4px' }}>
            {clientName}{jobId && <span style={{ color: '#94A3B8', fontWeight: 400 }}> — {jobId}</span>}
          </p>
          {description ? (
            <p style={{ fontSize: 12.5, color: '#475569', margin: 0, lineHeight: 1.55, maxHeight: 60, overflow: 'hidden' }}>{description}</p>
          ) : job.type && (
            <p style={{ fontSize: 12.5, color: '#94A3B8', margin: 0 }}>{job.type}{job.specialty ? ` — ${job.specialty}` : ''}</p>
          )}
        </div>

        {/* Team */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
          <p style={{ fontSize: 11.5, fontWeight: 700, color: '#0F172A', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Team</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {assignedTechs.length > 0
              ? assignedTechs.map(t => <TechPill key={t.id} name={t.name} techId={t.id} />)
              : <span style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>Unassigned</span>
            }
          </div>
        </div>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '12px 16px', borderBottom: '1px solid #F1F5F9', gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Starts</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0 }}>{startLabel}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Ends</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0 }}>{endLabel}</p>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <button onClick={onEdit}
            style={{ padding: '13px 0', background: '#fff', border: 'none', borderRight: '1px solid #F1F5F9', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'background 120ms' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
            Edit
          </button>
          <button onClick={onViewDetails}
            style={{ padding: '13px 0', background: '#16A34A', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 120ms' }}
            onMouseEnter={e => e.currentTarget.style.background = '#15803D'}
            onMouseLeave={e => e.currentTarget.style.background = '#16A34A'}>
            View Details
          </button>
        </div>
      </div>
    </>
  )
}
