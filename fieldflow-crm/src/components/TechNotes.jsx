// TechNotes.jsx — Tabbed notes panel for jobs/service calls
// Supports 4 note types with role-based visibility/editability

import { useState, useEffect } from 'react'

// ── Note type definitions ─────────────────────────────────────────────────────
export const NOTE_TYPES = [
  {
    key: 'office_to_tech',
    label: 'Office → Tech',
    description: 'Instructions from office to technician',
    bgColor: '#FEF9C3',
    borderColor: '#EAB308',
    textColor: '#92400E',
    icon: '📋',
    visibleTo: ['admin', 'staff', 'technician'],
    editableBy: ['admin', 'staff'],
  },
  {
    key: 'tech_to_office',
    label: 'Tech → Office',
    description: 'Field notes from technician to office',
    bgColor: '#ECFDF5',
    borderColor: '#10B981',
    textColor: '#065F46',
    icon: '🔧',
    visibleTo: ['admin', 'staff'],
    editableBy: ['technician'],
  },
  {
    key: 'office_internal',
    label: 'Office Internal',
    description: 'Internal office notes — techs cannot see',
    bgColor: '#EFF6FF',
    borderColor: '#3B82F6',
    textColor: '#1D4ED8',
    icon: '🏢',
    visibleTo: ['admin', 'staff'],
    editableBy: ['admin', 'staff'],
  },
  {
    key: 'tech_private',
    label: 'Tech Private',
    description: 'Personal tech notes — office cannot see',
    bgColor: '#F5F3FF',
    borderColor: '#8B5CF6',
    textColor: '#5B21B6',
    icon: '🔒',
    visibleTo: ['technician'],
    editableBy: ['technician'],
  },
]

// ── Storage helpers ───────────────────────────────────────────────────────────
const NOTES_KEY = 'customsfieldpro_job_notes'
const READ_KEY  = uid => `customsfieldpro_notes_read_${uid}`

function loadAllNotes() {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}') } catch { return {} }
}
function saveAllNotes(all) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(all))
}
function loadNotes(entityId) {
  return loadAllNotes()[entityId] || []
}
function saveNotes(entityId, notes) {
  const all = loadAllNotes()
  all[entityId] = notes
  saveAllNotes(all)
}

function loadRead(userId) {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY(userId)) || '[]')) } catch { return new Set() }
}
function markRead(userId, noteIds) {
  const set = loadRead(userId)
  noteIds.forEach(id => set.add(id))
  localStorage.setItem(READ_KEY(userId), JSON.stringify([...set]))
}

function timeAgo(ts) {
  const diff = Date.now() - ts
  if (diff < 60_000)     return 'just now'
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 86_400_000 * 2) return 'yesterday'
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function userRole(user, isAdmin) {
  if (isAdmin) return 'admin'
  if (user?.role === 'staff' || user?.role === 'technician') return user.role
  return 'staff'
}

// ── Add/Edit Note Modal ───────────────────────────────────────────────────────
function NoteModal({ note, onSave, onClose, role, techId }) {
  const allowedTypes = NOTE_TYPES.filter(nt => nt.editableBy.includes(role))
  const [form, setForm] = useState(() => {
    if (note) return { ...note }
    return {
      type: allowedTypes[0]?.key || 'office_to_tech',
      text: '',
      isPinned: false,
      priority: 'normal',
      attachTo: 'job',
    }
  })
  const isEdit = !!note?.id

  const typeObj = NOTE_TYPES.find(t => t.key === form.type)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(2px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a1d23' }}>{isEdit ? 'Edit Note' : 'Add Note'}</h3>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e8e9ec', background: '#f9fafb', cursor: 'pointer', fontSize: 18, color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Note type selector */}
        {!isEdit && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Note Type</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {allowedTypes.map(nt => (
                <button key={nt.key} onClick={() => setForm(f => ({ ...f, type: nt.key }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: `2px solid ${form.type === nt.key ? nt.borderColor : '#e8e9ec'}`, background: form.type === nt.key ? nt.bgColor : '#fff', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: form.type === nt.key ? nt.textColor : '#6b7280', transition: 'all 0.15s' }}>
                  <span>{nt.icon}</span>
                  {nt.label}
                </button>
              ))}
            </div>
            {typeObj && <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 6 }}>{typeObj.description}</div>}
          </div>
        )}

        {/* Text */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Note</div>
          <textarea
            value={form.text}
            onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (form.text.trim()) onSave(form) } }}
            placeholder="Write your note… (Ctrl+Enter to save)"
            rows={5} autoFocus
            style={{ width: '100%', border: `2px solid ${typeObj?.borderColor || '#e8e9ec'}`, borderRadius: 8, padding: '10px 12px', fontSize: 13.5, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6, background: typeObj?.bgColor || '#fff', color: '#1a1d23' }}
          />
        </div>

        {/* Options */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13.5, fontWeight: 500, color: '#374151' }}>
            <input type="checkbox" checked={form.isPinned} onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))} style={{ width: 15, height: 15, accentColor: '#2563eb' }} />
            📌 Pin this note
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#6b7280' }}>Priority:</span>
            {['normal', 'important', 'urgent'].map(p => (
              <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))}
                style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${form.priority === p ? (p === 'urgent' ? '#dc2626' : p === 'important' ? '#d97706' : '#2563eb') : '#e8e9ec'}`, background: form.priority === p ? (p === 'urgent' ? '#fef2f2' : p === 'important' ? '#fffbeb' : '#eff6ff') : '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: form.priority === p ? (p === 'urgent' ? '#dc2626' : p === 'important' ? '#d97706' : '#2563eb') : '#6b7280', textTransform: 'capitalize' }}>
                {p === 'urgent' ? '🔴 ' : p === 'important' ? '🟡 ' : ''}{p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #f0f1f3', paddingTop: 14 }}>
          <button onClick={onClose} style={{ height: 38, padding: '0 18px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => form.text.trim() && onSave(form)}
            style={{ height: 38, padding: '0 20px', background: typeObj?.borderColor || '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', opacity: form.text.trim() ? 1 : 0.5 }}>
            {isEdit ? 'Save Changes' : 'Add Note'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Single Note Card ──────────────────────────────────────────────────────────
function NoteCard({ note, onEdit, onDelete, onPin, canEdit, isUnread }) {
  const nt  = NOTE_TYPES.find(t => t.key === note.type) || NOTE_TYPES[0]
  const [expanded, setExpanded] = useState(true)
  const isUrgent = note.priority === 'urgent'

  return (
    <div style={{ borderRadius: 9, border: `1px solid ${nt.borderColor}`, borderLeft: isUrgent ? '4px solid #dc2626' : `4px solid ${nt.borderColor}`, background: nt.bgColor, marginBottom: 10, overflow: 'hidden', boxShadow: isUnread ? '0 0 0 2px #fbbf24' : 'none', transition: 'box-shadow 0.2s' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px 6px', flexWrap: 'wrap' }}>
        {note.isPinned && <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '1px 6px', borderRadius: 6 }}>📌 PINNED</span>}
        <span style={{ fontSize: 10.5, fontWeight: 700, color: nt.textColor, background: nt.borderColor + '20', padding: '2px 7px', borderRadius: 6 }}>{nt.icon} {nt.label}</span>
        {isUrgent && <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fef2f2', padding: '1px 6px', borderRadius: 6 }}>🔴 URGENT</span>}
        {note.priority === 'important' && <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706', background: '#fffbeb', padding: '1px 6px', borderRadius: 6 }}>🟡 IMPORTANT</span>}
        {isUnread && <span style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', background: '#dbeafe', padding: '1px 6px', borderRadius: 6 }}>NEW</span>}
        <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>
          {note.authorName} · {timeAgo(note.createdAt)}
        </span>
      </div>

      {/* Text */}
      <div style={{ padding: '4px 12px 10px', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <p style={{ fontSize: 13.5, color: '#1a1d23', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap', overflow: expanded ? 'visible' : 'hidden', display: expanded ? 'block' : '-webkit-box', WebkitLineClamp: expanded ? 'unset' : 3, WebkitBoxOrient: 'vertical' }}>{note.text}</p>
      </div>

      {/* Actions */}
      {canEdit && (
        <div style={{ display: 'flex', gap: 6, padding: '6px 12px', borderTop: '1px solid ' + nt.borderColor + '40', background: 'rgba(255,255,255,0.4)', justifyContent: 'flex-end' }}>
          <button onClick={() => onPin(note.id)}
            style={{ height: 26, padding: '0 8px', border: '1px solid #e8e9ec', borderRadius: 6, background: note.isPinned ? '#fef3c7' : '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: note.isPinned ? '#92400e' : '#6b7280' }}>
            {note.isPinned ? 'Unpin' : 'Pin'}
          </button>
          <button onClick={() => onEdit(note)}
            style={{ height: 26, padding: '0 8px', border: '1px solid #e8e9ec', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#374151' }}>Edit</button>
          <button onClick={() => onDelete(note.id)}
            style={{ height: 26, padding: '0 8px', border: '1px solid #fecaca', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#dc2626' }}>🗑</button>
        </div>
      )}
    </div>
  )
}

// ── Main TechNotes Component ──────────────────────────────────────────────────
export default function TechNotes({ entityId, entityType = 'job', user, isAdmin = false, compact = false }) {
  const role = userRole(user, isAdmin)
  const userId = user?.id || 'unknown'

  const [notes,   setNotes]   = useState(() => loadNotes(entityId))
  const [tab,     setTab]     = useState('all')
  const [modal,   setModal]   = useState(null)  // null | 'new' | noteObj
  const [readSet, setReadSet] = useState(() => loadRead(userId))

  // Persist whenever notes change
  useEffect(() => { saveNotes(entityId, notes) }, [notes, entityId])

  // Mark newly visible notes as read
  useEffect(() => {
    const visible = notes.filter(n => NOTE_TYPES.find(nt => nt.key === n.type)?.visibleTo.includes(role))
    const unread = visible.filter(n => !readSet.has(n.id)).map(n => n.id)
    if (unread.length) {
      markRead(userId, unread)
      setReadSet(loadRead(userId))
    }
  }, [notes, role, userId])

  // Filter notes by role visibility + tab
  const visibleNotes = notes
    .filter(n => {
      const nt = NOTE_TYPES.find(t => t.key === n.type)
      if (!nt) return false
      if (!nt.visibleTo.includes(role)) return false
      // tech_private only visible to the specific technician
      if (n.type === 'tech_private' && n.authorId !== userId) return false
      return true
    })
    .filter(n => {
      if (tab === 'all') return true
      return n.type === tab
    })
    .sort((a, b) => {
      if (b.isPinned !== a.isPinned) return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)
      return b.createdAt - a.createdAt
    })

  // Count per tab
  const counts = {}
  NOTE_TYPES.forEach(nt => {
    if (!nt.visibleTo.includes(role)) return
    counts[nt.key] = notes.filter(n => {
      if (n.type !== nt.key) return false
      if (!NOTE_TYPES.find(t => t.key === n.type)?.visibleTo.includes(role)) return false
      if (n.type === 'tech_private' && n.authorId !== userId) return false
      return true
    }).length
  })
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0)

  const unreadCount = visibleNotes.filter(n => !readSet.has(n.id)).length

  function handleSave(form) {
    if (form.id) {
      setNotes(prev => prev.map(n => n.id === form.id ? { ...n, ...form, updatedAt: Date.now() } : n))
    } else {
      const newNote = {
        ...form,
        id: `jnote-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        entityId,
        entityType,
        authorId: userId,
        authorName: user?.name || 'Unknown',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      setNotes(prev => [newNote, ...prev])
    }
    setModal(null)
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this note?')) return
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  function handlePin(id) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n))
  }

  const visibleTabs = NOTE_TYPES.filter(nt => nt.visibleTo.includes(role))

  if (compact) {
    // Compact view for hover cards / sidebars
    return (
      <div>
        {visibleNotes.slice(0, 3).map(n => {
          const nt = NOTE_TYPES.find(t => t.key === n.type) || NOTE_TYPES[0]
          return (
            <div key={n.id} style={{ borderRadius: 6, border: `1px solid ${nt.borderColor}`, borderLeft: `3px solid ${nt.borderColor}`, background: nt.bgColor, padding: '6px 10px', marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: nt.textColor, marginBottom: 3 }}>{nt.icon} {nt.label}</div>
              <p style={{ fontSize: 12.5, color: '#374151', margin: 0, lineHeight: 1.5 }}>{n.text}</p>
            </div>
          )
        })}
        {visibleNotes.length > 3 && <div style={{ fontSize: 11.5, color: '#9ca3af', textAlign: 'center' }}>+{visibleNotes.length - 3} more notes</div>}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f0f1f3', background: '#fafafa' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, background: totalCount > 0 ? '#eff6ff' : '#f3f4f6', color: totalCount > 0 ? '#2563eb' : '#9ca3af', padding: '1px 7px', borderRadius: 10 }}>{totalCount}</span>
          {unreadCount > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 8 }}>{unreadCount} new</span>}
        </div>
        <button onClick={() => setModal('new')}
          style={{ height: 32, padding: '0 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Add Note
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #f0f1f3', background: '#fafafa', overflowX: 'auto' }}>
        <button onClick={() => setTab('all')}
          style={{ padding: '9px 14px', border: 'none', background: 'none', borderBottom: tab === 'all' ? '2px solid #2563eb' : '2px solid transparent', fontSize: 12.5, fontWeight: tab === 'all' ? 700 : 500, color: tab === 'all' ? '#2563eb' : '#9ca3af', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
          All Notes
          <span style={{ fontSize: 11, fontWeight: 700, background: tab === 'all' ? '#dbeafe' : '#f3f4f6', color: tab === 'all' ? '#2563eb' : '#9ca3af', padding: '0 5px', borderRadius: 8 }}>{totalCount}</span>
        </button>
        {visibleTabs.map(nt => {
          const cnt = counts[nt.key] || 0
          return (
            <button key={nt.key} onClick={() => setTab(nt.key)}
              style={{ padding: '9px 14px', border: 'none', background: 'none', borderBottom: tab === nt.key ? `2px solid ${nt.borderColor}` : '2px solid transparent', fontSize: 12.5, fontWeight: tab === nt.key ? 700 : 500, color: tab === nt.key ? nt.textColor : '#9ca3af', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
              {nt.icon} {nt.label.replace(' → ', '→')}
              {cnt > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: tab === nt.key ? nt.bgColor : '#f3f4f6', color: tab === nt.key ? nt.textColor : '#9ca3af', padding: '0 5px', borderRadius: 8, border: tab === nt.key ? `1px solid ${nt.borderColor}` : 'none' }}>{cnt}</span>}
            </button>
          )
        })}
      </div>

      {/* Notes list */}
      <div style={{ padding: '12px 14px', maxHeight: 500, overflowY: 'auto' }}>
        {visibleNotes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0', color: '#c4c9d4' }}>
            <p style={{ fontSize: 13, margin: 0, fontWeight: 600 }}>No notes yet</p>
            <p style={{ fontSize: 12, margin: '4px 0 0', color: '#d1d5db' }}>Click "Add Note" to get started</p>
          </div>
        ) : (
          visibleNotes.map(note => {
            const nt = NOTE_TYPES.find(t => t.key === note.type) || NOTE_TYPES[0]
            const canEdit = nt.editableBy.includes(role) || (note.authorId === userId)
            return (
              <NoteCard key={note.id} note={note}
                onEdit={n => setModal(n)}
                onDelete={handleDelete}
                onPin={handlePin}
                canEdit={canEdit}
                isUnread={!readSet.has(note.id)}
              />
            )
          })
        )}
      </div>

      {/* Modal */}
      {modal && (
        <NoteModal
          note={modal === 'new' ? null : modal}
          role={role}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ── Export helpers ────────────────────────────────────────────────────────────
export function getJobNotes(entityId) {
  return loadNotes(entityId)
}
export function getUnreadJobNotesCount(userId) {
  const all  = loadAllNotes()
  const read = loadRead(userId)
  let count  = 0
  Object.values(all).forEach(notes =>
    notes.forEach(n => { if (!read.has(n.id)) count++ })
  )
  return count
}
export function getJobNotesSummary(entityId, role, userId) {
  return loadNotes(entityId).filter(n => {
    const nt = NOTE_TYPES.find(t => t.key === n.type)
    if (!nt) return false
    if (!nt.visibleTo.includes(role)) return false
    if (n.type === 'tech_private' && n.authorId !== userId) return false
    return true
  })
}
