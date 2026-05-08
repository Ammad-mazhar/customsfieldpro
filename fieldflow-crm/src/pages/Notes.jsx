import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'

// ── Persistence ───────────────────────────────────────────────────────────────
const NOTES_KEY = 'ff_notes'

function loadNotes() {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '[]') } catch { return [] }
}
function saveNotes(notes) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
}

// ── Sample data ───────────────────────────────────────────────────────────────
const SAMPLE_NOTES = [
  { id: 'note-1', text: 'Maria Rivera prefers morning appointments only. Do not schedule after noon.', category: 'client', color: 'blue', isPinned: true, visibility: 'everyone', linkedModule: 'Clients', linkedRecordId: 'CLT-0001', linkedRecordLabel: 'Maria Rivera', authorId: 'admin', authorName: 'Admin User', createdAt: Date.now() - 86400000 * 3, updatedAt: Date.now() - 86400000 * 3 },
  { id: 'note-2', text: 'Follow up with Thompson about the panel upgrade invoice — they mentioned they may want to add a whole-home surge protector.', category: 'followup', color: 'purple', isPinned: false, visibility: 'everyone', linkedModule: 'Jobs', linkedRecordId: 'JOB-1056', linkedRecordLabel: 'JOB-1056', authorId: 'admin', authorName: 'Admin User', createdAt: Date.now() - 86400000 * 1, updatedAt: Date.now() - 86400000 * 1 },
  { id: 'note-3', text: 'URGENT: Water pressure in Patel job area was lower than expected. May need to revisit with a pressure booster.', category: 'urgent', color: 'red', isPinned: true, visibility: 'everyone', linkedModule: 'Jobs', linkedRecordId: 'JOB-1057', linkedRecordLabel: 'JOB-1057', authorId: 'admin', authorName: 'Admin User', createdAt: Date.now() - 3600000 * 5, updatedAt: Date.now() - 3600000 * 5 },
  { id: 'note-4', text: 'Order 2x Honeywell T6 Pro thermostats before the Kim furnace job. Part # TH6320U2008.', category: 'general', color: 'yellow', isPinned: false, visibility: 'everyone', linkedModule: null, linkedRecordId: null, linkedRecordLabel: null, authorId: 'admin', authorName: 'Admin User', createdAt: Date.now() - 3600000 * 2, updatedAt: Date.now() - 3600000 * 2 },
  { id: 'note-5', text: 'Johnson AC Inspection completed. Refrigerant was low — topped up with 2 lbs R-410A. Recommended full unit replacement within 2 years.', category: 'job', color: 'green', isPinned: false, visibility: 'everyone', linkedModule: 'Jobs', linkedRecordId: 'JOB-1059', linkedRecordLabel: 'JOB-1059', authorId: 'admin', authorName: 'Admin User', createdAt: Date.now() - 86400000 * 2, updatedAt: Date.now() - 86400000 * 2 },
]

const CAT_COLORS = {
  general:  { bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', label: 'General' },
  client:   { bg: '#eff6ff', border: '#bfdbfe', dot: '#2563eb', label: 'Client'  },
  job:      { bg: '#f0fdf4', border: '#bbf7d0', dot: '#16a34a', label: 'Job'     },
  urgent:   { bg: '#fef2f2', border: '#fecaca', dot: '#dc2626', label: 'Urgent'  },
  followup: { bg: '#faf5ff', border: '#e9d5ff', dot: '#7c3aed', label: 'Follow-up'},
}

// ── Components ────────────────────────────────────────────────────────────────
function NoteCard({ note, onEdit, onDelete, onPin }) {
  const cat  = CAT_COLORS[note.category] || CAT_COLORS.general
  const ago  = (() => {
    const diff = Date.now() - note.createdAt
    if (diff < 60_000)     return 'just now'
    if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    return `${Math.floor(diff / 86_400_000)}d ago`
  })()

  return (
    <div style={{ background: cat.bg, border: `1px solid ${cat.border}`, borderTop: `4px solid ${cat.dot}`, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, breakInside: 'avoid', marginBottom: 12 }}>
      {note.isPinned && <div style={{ fontSize: 10, color: cat.dot, fontWeight: 700, letterSpacing: '0.5px' }}>📌 PINNED</div>}
      <p style={{ fontSize: 13.5, color: '#1a1d23', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{note.text}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {note.linkedRecordLabel && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 10, background: cat.dot + '20', color: cat.dot, padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>{note.linkedModule}</span>
            <span style={{ fontSize: 11, color: '#6b7280' }}>{note.linkedRecordLabel}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: cat.dot, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 7.5, fontWeight: 700, flexShrink: 0 }}>
              {note.authorName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{note.authorName} · {ago}</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => onPin(note.id)} title={note.isPinned ? 'Unpin' : 'Pin'}
              style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #e8e9ec', background: note.isPinned ? cat.dot + '15' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
              📌
            </button>
            <button onClick={() => onEdit(note)} title="Edit"
              style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #e8e9ec', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#6b7280" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button onClick={() => onDelete(note.id)} title="Delete"
              style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #e8e9ec', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth="2.5"><polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Note modal ────────────────────────────────────────────────────────────────
const BLANK_NOTE = { text: '', category: 'general', color: 'yellow', isPinned: false, visibility: 'everyone', linkedModule: null, linkedRecordId: null, linkedRecordLabel: null }

function NoteModal({ note, onSave, onClose }) {
  const [form, setForm] = useState(note || BLANK_NOTE)
  const isEdit = !!note?.id

  function save() {
    if (!form.text.trim()) return
    onSave(form)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(2px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '28px', width: 520, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a1d23' }}>{isEdit ? 'Edit Note' : 'New Note'}</h3>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #e8e9ec', background: '#f9fafb', fontSize: 20, color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Text */}
        <div>
          <label style={lbl}>Note</label>
          <textarea
            value={form.text}
            onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
            placeholder="Write your note…"
            rows={5}
            autoFocus
            style={{ width: '100%', border: '1px solid #e8e9ec', borderRadius: 8, padding: '10px 12px', fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }}
          />
        </div>

        {/* Category */}
        <div>
          <label style={lbl}>Category</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(CAT_COLORS).map(([key, val]) => (
              <button key={key} onClick={() => setForm(f => ({ ...f, category: key }))}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, border: `2px solid ${form.category === key ? val.dot : '#e8e9ec'}`, background: form.category === key ? val.bg : '#fff', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: form.category === key ? val.dot : '#6b7280' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: val.dot, flexShrink: 0 }} />
                {val.label}
              </button>
            ))}
          </div>
        </div>

        {/* Options row */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13.5, fontWeight: 500, color: '#374151' }}>
            <input type="checkbox" checked={form.isPinned} onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))} style={{ width: 16, height: 16, accentColor: '#2563eb' }} />
            📌 Pin this note
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={lbl} style={{ margin: 0, fontSize: 13, color: '#6b7280', fontWeight: 600 }}>Visibility:</label>
            <select value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}
              style={{ height: 34, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 10px', fontSize: 13, color: '#374151', outline: 'none' }}>
              <option value="everyone">Everyone</option>
              <option value="admin">Admin Only</option>
              <option value="private">Private (My Notes)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 6, borderTop: '1px solid #f0f1f3' }}>
          <button onClick={onClose} style={{ height: 40, padding: '0 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} style={{ height: 40, padding: '0 22px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
            {isEdit ? 'Save Changes' : 'Add Note'}
          </button>
        </div>
      </div>
    </div>
  )
}

const lbl = { display: 'block', fontSize: 11.5, fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }

// ── Main Notes page ───────────────────────────────────────────────────────────
export default function Notes() {
  const { user } = useAuth()

  const [notes,     setNotes]     = useState(() => {
    const stored = loadNotes()
    return stored.length ? stored : SAMPLE_NOTES
  })
  const [tab,       setTab]       = useState('all')  // all | mine | pinned
  const [search,    setSearch]    = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [modal,     setModal]     = useState(null)    // null | 'new' | noteObject
  const [quickNote, setQuickNote] = useState('')

  useEffect(() => { saveNotes(notes) }, [notes])

  // Quick note
  function addQuick() {
    if (!quickNote.trim()) return
    const note = {
      id: `note-${Date.now()}`,
      text: quickNote.trim(),
      category: 'general',
      color: 'yellow',
      isPinned: false,
      visibility: 'private',
      linkedModule: null, linkedRecordId: null, linkedRecordLabel: null,
      authorId: user?.id || 'me',
      authorName: user?.name || 'Me',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setNotes(prev => [note, ...prev])
    setQuickNote('')
  }

  function handleSave(form) {
    if (form.id) {
      setNotes(prev => prev.map(n => n.id === form.id ? { ...n, ...form, updatedAt: Date.now() } : n))
    } else {
      setNotes(prev => [{
        ...form,
        id: `note-${Date.now()}`,
        authorId: user?.id || 'me',
        authorName: user?.name || 'Me',
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

  function handlePin(id) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n))
  }

  // Filter
  const visible = notes.filter(n => {
    if (tab === 'mine'   && n.authorId !== (user?.id || 'me')) return false
    if (tab === 'pinned' && !n.isPinned) return false
    if (filterCat !== 'all' && n.category !== filterCat) return false
    if (search && !n.text.toLowerCase().includes(search.toLowerCase()) && !(n.linkedRecordLabel || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  }).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.createdAt - a.createdAt)

  const counts = {
    all:    notes.length,
    mine:   notes.filter(n => n.authorId === (user?.id || 'me')).length,
    pinned: notes.filter(n => n.isPinned).length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1d23', margin: 0 }}>Notes</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '2px 0 0' }}>Business notepad — instructions, reminders, field observations</p>
        </div>
        <button onClick={() => setModal('new')}
          style={{ height: 40, padding: '0 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round"/></svg>
          New Note
        </button>
      </div>

      {/* Quick note bar */}
      <div style={{ display: 'flex', gap: 8, background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '10px 14px', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <span style={{ fontSize: 16 }}>⚡</span>
        <input
          value={quickNote}
          onChange={e => setQuickNote(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addQuick()}
          placeholder="Quick note — press Enter to save instantly…"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#374151', background: 'transparent', fontFamily: 'inherit' }}
        />
        {quickNote && (
          <button onClick={addQuick}
            style={{ height: 32, padding: '0 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save</button>
        )}
      </div>

      {/* Tabs + filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 10, padding: 4 }}>
          {[['all', 'All Notes'], ['mine', 'My Notes'], ['pinned', '📌 Pinned']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: tab === key ? '#fff' : 'transparent', color: tab === key ? '#1a1d23' : '#9ca3af', fontSize: 13, fontWeight: tab === key ? 700 : 500, cursor: 'pointer', boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              {label}
              <span style={{ fontSize: 11, fontWeight: 700, background: tab === key ? '#eff6ff' : '#e5e7eb', color: tab === key ? '#2563eb' : '#9ca3af', padding: '0 6px', borderRadius: 8 }}>{counts[key]}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…"
              style={{ height: 36, paddingLeft: 32, paddingRight: 12, border: '1px solid #e8e9ec', borderRadius: 8, fontSize: 13, outline: 'none', width: 200 }} />
          </div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            style={{ height: 36, border: '1px solid #e8e9ec', borderRadius: 8, padding: '0 12px', fontSize: 13, color: '#374151', outline: 'none' }}>
            <option value="all">All categories</option>
            {Object.entries(CAT_COLORS).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
          </select>
        </div>
      </div>

      {/* Notes grid (masonry via columns) */}
      {visible.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', gap: 12 }}>
          <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" strokeLinecap="round" strokeLinejoin="round"/><rect x="9" y="3" width="6" height="4" rx="1" strokeLinecap="round"/><line x1="9" y1="12" x2="15" y2="12" strokeLinecap="round"/><line x1="9" y1="16" x2="13" y2="16" strokeLinecap="round"/></svg>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>No notes found</p>
          <p style={{ margin: 0, fontSize: 13 }}>Click "New Note" or type a quick note above</p>
        </div>
      ) : (
        <div style={{ columnCount: 3, columnGap: 14, overflowY: 'auto', flex: 1 }}>
          {visible.map(note => (
            <NoteCard key={note.id} note={note}
              onEdit={n => setModal(n)}
              onDelete={handleDelete}
              onPin={handlePin}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <NoteModal
          note={modal === 'new' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
