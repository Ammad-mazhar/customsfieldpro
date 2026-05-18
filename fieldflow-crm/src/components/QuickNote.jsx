// QuickNote.jsx — Floating quick note button + modal
// Used on Scheduler, Service Calls, Jobs pages

import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { NOTE_TYPES } from './TechNotes'

const NOTES_KEY = 'customsfieldpro_job_notes'

function loadAllNotes() {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}') } catch { return {} }
}
function saveAllNotes(all) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(all))
}

function userRole(user, isAdmin) {
  if (isAdmin) return 'admin'
  return user?.role || 'staff'
}

export default function QuickNote({ context = null, contextLabel = '' }) {
  const { user, isAdmin } = useAuth()
  const role = userRole(user, isAdmin)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    type: NOTE_TYPES.filter(nt => nt.editableBy.includes(role))[0]?.key || 'office_to_tech',
    text: '',
    isPinned: false,
    priority: 'normal',
    linkedTo: context || '',
    linkedLabel: contextLabel || '',
  })
  const [saved, setSaved] = useState(false)

  // Keyboard shortcut: Ctrl+Enter to save
  useEffect(() => {
    if (!open) return
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (form.text.trim()) handleSave()
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, form])

  function handleSave() {
    if (!form.text.trim()) return
    const all = loadAllNotes()
    const entityId = form.linkedTo || `quick-${Date.now()}`
    if (!all[entityId]) all[entityId] = []
    all[entityId].unshift({
      id: `qnote-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: form.type,
      text: form.text.trim(),
      isPinned: form.isPinned,
      priority: form.priority,
      entityId,
      authorId: user?.id || 'unknown',
      authorName: user?.name || 'Unknown',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    saveAllNotes(all)
    setSaved(true)
    setForm(f => ({ ...f, text: '', isPinned: false, priority: 'normal' }))
    setTimeout(() => { setSaved(false); setOpen(false) }, 1200)
  }

  const allowedTypes = NOTE_TYPES.filter(nt => nt.editableBy.includes(role))
  const selectedType = NOTE_TYPES.find(t => t.key === form.type) || NOTE_TYPES[0]

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Quick Note (opens modal)"
        style={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 1100,
          width: 48, height: 48, borderRadius: '50%',
          background: open ? '#1a1d23' : '#f59e0b',
          color: '#fff', border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, transition: 'all 0.2s',
          transform: open ? 'rotate(45deg)' : 'none',
        }}>
        {open ? '×' : '📝'}
      </button>

      {/* Modal */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(2px)' }}
          onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>📝</span>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a1d23' }}>Quick Note</h3>
              </div>
              <button onClick={() => setOpen(false)} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e8e9ec', background: '#f9fafb', cursor: 'pointer', fontSize: 18, color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            {/* Note type selector */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Note Type</div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {allowedTypes.map(nt => (
                  <button key={nt.key} onClick={() => setForm(f => ({ ...f, type: nt.key }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: `2px solid ${form.type === nt.key ? nt.borderColor : '#e8e9ec'}`, background: form.type === nt.key ? nt.bgColor : '#fff', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: form.type === nt.key ? nt.textColor : '#6b7280' }}>
                    {nt.icon} {nt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div>
              <textarea
                value={form.text}
                onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                placeholder={`${selectedType.icon} ${selectedType.description}…\n\nCtrl+Enter to save quickly`}
                rows={5} autoFocus
                style={{ width: '100%', border: `2px solid ${selectedType.borderColor}`, borderRadius: 8, padding: '10px 12px', fontSize: 13.5, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6, background: selectedType.bgColor }}
              />
            </div>

            {/* Link to record */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Link to Record (optional)</div>
              <input
                value={form.linkedTo}
                onChange={e => setForm(f => ({ ...f, linkedTo: e.target.value }))}
                placeholder="Job ID, Service Call ID, or leave blank…"
                style={{ width: '100%', height: 38, border: '1px solid #e8e9ec', borderRadius: 8, padding: '0 12px', fontSize: 13, color: '#374151', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Options row */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#374151' }}>
                <input type="checkbox" checked={form.isPinned} onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))} style={{ width: 15, height: 15, accentColor: '#2563eb' }} />
                📌 Pin
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Priority:</span>
                {['normal', 'important', 'urgent'].map(p => (
                  <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))}
                    style={{ padding: '3px 9px', borderRadius: 20, border: `1px solid ${form.priority === p ? (p === 'urgent' ? '#dc2626' : p === 'important' ? '#d97706' : '#2563eb') : '#e8e9ec'}`, background: form.priority === p ? (p === 'urgent' ? '#fef2f2' : p === 'important' ? '#fffbeb' : '#eff6ff') : '#fff', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', color: form.priority === p ? (p === 'urgent' ? '#dc2626' : p === 'important' ? '#d97706' : '#2563eb') : '#6b7280', textTransform: 'capitalize' }}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f1f3', paddingTop: 14 }}>
              <span style={{ fontSize: 11.5, color: '#9ca3af' }}>Ctrl+Enter to save</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setOpen(false)} style={{ height: 38, padding: '0 18px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSave}
                  style={{ height: 38, padding: '0 20px', background: saved ? '#22c55e' : selectedType.borderColor, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, transition: 'background 0.2s', opacity: form.text.trim() ? 1 : 0.5 }}>
                  {saved ? '✓ Saved!' : 'Save Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
