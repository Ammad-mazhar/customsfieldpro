// StaffNotes.jsx — Notes for technician profiles
// Shows on tech profile page, job assignment tooltips, scheduler hover card

import { useState, useEffect } from 'react'

// ── Tech profile note categories ─────────────────────────────────────────────
export const TECH_NOTE_CATS = [
  { key: 'performance',      label: 'Performance',           icon: '⭐', color: '#d97706', bg: '#fffbeb', border: '#fde68a', adminOnly: true },
  { key: 'scheduling',       label: 'Scheduling',            icon: '📅', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', adminOnly: false },
  { key: 'skills',           label: 'Skills & Certifications', icon: '🎓', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', adminOnly: false },
  { key: 'equipment_auth',   label: 'Equipment Authorization', icon: '🔧', color: '#9333ea', bg: '#faf5ff', border: '#e9d5ff', adminOnly: false },
  { key: 'general',          label: 'General',               icon: '📋', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', adminOnly: false },
]

// ── Storage ───────────────────────────────────────────────────────────────────
const KEY = 'customsfieldpro_tech_profile_notes'

function loadAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
function loadTechNotes(techId) {
  return loadAll()[techId] || []
}
function saveTechNotes(techId, notes) {
  const all = loadAll()
  all[techId] = notes
  localStorage.setItem(KEY, JSON.stringify(all))
}

function timeAgo(ts) {
  const d = Date.now() - ts
  if (d < 60_000)     return 'just now'
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)}m ago`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`
  return `${Math.floor(d / 86_400_000)}d ago`
}

// ── Note Modal ────────────────────────────────────────────────────────────────
function TechNoteModal({ note, onSave, onClose, isAdmin }) {
  const cats = TECH_NOTE_CATS.filter(c => !c.adminOnly || isAdmin)
  const [form, setForm] = useState(note || { category: cats[0]?.key || 'general', text: '', date: new Date().toLocaleDateString('en-CA') })

  const cat = TECH_NOTE_CATS.find(c => c.key === form.category)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(2px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a1d23' }}>{note?.id ? 'Edit Note' : 'Add Tech Note'}</h3>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e8e9ec', background: '#f9fafb', cursor: 'pointer', fontSize: 18, color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Category */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Category</div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {cats.map(c => (
              <button key={c.key} onClick={() => setForm(f => ({ ...f, category: c.key }))}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8, border: `2px solid ${form.category === c.key ? c.border : '#e8e9ec'}`, background: form.category === c.key ? c.bg : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: form.category === c.key ? c.color : '#6b7280' }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Date</div>
          <input type="date" value={form.date || ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            style={{ height: 38, border: '1px solid #e8e9ec', borderRadius: 8, padding: '0 12px', fontSize: 13, color: '#374151', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
        </div>

        {/* Text */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Note</div>
          <textarea
            value={form.text}
            onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
            placeholder={cat ? `${cat.icon} ${cat.label} note…` : 'Write your note…'}
            rows={4} autoFocus
            style={{ width: '100%', border: `2px solid ${cat?.border || '#e8e9ec'}`, borderRadius: 8, padding: '10px 12px', fontSize: 13.5, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6, background: cat?.bg || '#fff' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #f0f1f3', paddingTop: 14 }}>
          <button onClick={onClose} style={{ height: 38, padding: '0 18px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => form.text.trim() && onSave(form)}
            style={{ height: 38, padding: '0 20px', background: cat?.color || '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', opacity: form.text.trim() ? 1 : 0.5 }}>
            {note?.id ? 'Save Changes' : 'Add Note'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main StaffNotes Component ─────────────────────────────────────────────────
export default function StaffNotes({ techId, techName, isAdmin = false, compact = false }) {
  const [notes,  setNotes]  = useState(() => loadTechNotes(techId))
  const [modal,  setModal]  = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => { saveTechNotes(techId, notes) }, [notes, techId])

  const visibleCats = TECH_NOTE_CATS.filter(c => !c.adminOnly || isAdmin)

  const filtered = notes
    .filter(n => !TECH_NOTE_CATS.find(c => c.key === n.category)?.adminOnly || isAdmin)
    .filter(n => filter === 'all' || n.category === filter)
    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))

  function handleSave(form) {
    if (form.id) {
      setNotes(prev => prev.map(n => n.id === form.id ? { ...n, ...form, updatedAt: Date.now() } : n))
    } else {
      setNotes(prev => [{
        ...form,
        id: `tnote-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        techId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }, ...prev])
    }
    setModal(null)
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this note?')) return
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  if (compact) {
    // Used in scheduler hover card / job assignment tooltip
    const schedNotes = notes.filter(n => n.category === 'scheduling').slice(0, 3)
    return (
      <div>
        {schedNotes.length === 0 ? (
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>No scheduling notes</p>
        ) : (
          schedNotes.map(n => {
            const cat = TECH_NOTE_CATS.find(c => c.key === n.category) || TECH_NOTE_CATS[4]
            return (
              <div key={n.id} style={{ borderRadius: 6, border: `1px solid ${cat.border}`, borderLeft: `3px solid ${cat.color}`, background: cat.bg, padding: '6px 10px', marginBottom: 5 }}>
                <p style={{ fontSize: 12.5, color: '#374151', margin: 0 }}>{n.text}</p>
              </div>
            )
          })
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a1d23' }}>
          {techName ? `${techName} — ` : ''}Technician Notes
        </h3>
        <button onClick={() => setModal('new')}
          style={{ height: 34, padding: '0 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
          + Add Note
        </button>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        <button onClick={() => setFilter('all')}
          style={{ padding: '5px 12px', borderRadius: 20, border: `2px solid ${filter === 'all' ? '#2563eb' : '#e8e9ec'}`, background: filter === 'all' ? '#eff6ff' : '#fff', fontSize: 12, fontWeight: 600, color: filter === 'all' ? '#2563eb' : '#6b7280', cursor: 'pointer' }}>
          All ({notes.length})
        </button>
        {visibleCats.map(c => {
          const cnt = notes.filter(n => n.category === c.key).length
          return (
            <button key={c.key} onClick={() => setFilter(c.key)}
              style={{ padding: '5px 12px', borderRadius: 20, border: `2px solid ${filter === c.key ? c.border : '#e8e9ec'}`, background: filter === c.key ? c.bg : '#fff', fontSize: 12, fontWeight: 600, color: filter === c.key ? c.color : '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              {c.icon} {c.label} {cnt > 0 && `(${cnt})`}
            </button>
          )
        })}
      </div>

      {/* Notes by category */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#c4c9d4' }}>
          <p style={{ fontSize: 13, margin: 0, fontWeight: 600 }}>No notes yet</p>
          <p style={{ fontSize: 12, margin: '4px 0 0' }}>Click "+ Add Note" to create one</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visibleCats.filter(c => filter === 'all' || filter === c.key).map(cat => {
            const catNotes = filtered.filter(n => n.category === cat.key)
            if (catNotes.length === 0) return null
            return (
              <div key={cat.key}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{cat.icon}</span> {cat.label}
                  {cat.adminOnly && <span style={{ fontSize: 9.5, background: '#f3f4f6', color: '#9ca3af', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>Admin only</span>}
                </div>
                {catNotes.map(note => (
                  <div key={note.id} style={{ borderRadius: 8, border: `1px solid ${cat.border}`, borderLeft: `3px solid ${cat.color}`, background: cat.bg, padding: '10px 14px', marginBottom: 8, position: 'relative' }}>
                    {note.date && <div style={{ fontSize: 10.5, fontWeight: 600, color: cat.color, marginBottom: 4 }}>{new Date(note.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>}
                    <p style={{ fontSize: 13.5, color: '#1a1d23', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{note.text}</p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
                      <button onClick={() => setModal(note)}
                        style={{ height: 25, padding: '0 8px', border: '1px solid #e8e9ec', borderRadius: 5, background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#374151' }}>Edit</button>
                      <button onClick={() => handleDelete(note.id)}
                        style={{ height: 25, padding: '0 8px', border: '1px solid #fecaca', borderRadius: 5, background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#dc2626' }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <TechNoteModal
          note={modal === 'new' ? null : modal}
          isAdmin={isAdmin}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ── Export helpers ────────────────────────────────────────────────────────────
export function getTechProfileNotes(techId) {
  return loadTechNotes(techId)
}
export function getTechSchedulingNotes(techId) {
  return loadTechNotes(techId).filter(n => n.category === 'scheduling')
}
