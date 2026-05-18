import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const STORAGE_KEY = 'customsfieldpro_onboarding'
const DISMISS_KEY = 'customsfieldpro_checklist_dismiss'
const DONE_KEY = 'customsfieldpro_checklist_done'

const TASKS = [
  { id: 'account', label: 'Create your account', path: null, autoComplete: true },
  { id: 'company', label: 'Add your company info', path: '/settings', hint: 'Set up your business details' },
  { id: 'client', label: 'Add your first client', path: '/clients', hint: 'Start building your client base' },
  { id: 'job', label: 'Create your first job', path: '/jobs', hint: 'Schedule your first work order' },
  { id: 'tech', label: 'Add a technician', path: '/user-management', hint: 'Build your team' },
  { id: 'invoice', label: 'Send your first invoice', path: '/invoices', hint: 'Get paid faster' },
  { id: 'review', label: 'Set up Google review link', path: '/settings', hint: 'Boost your online reputation' },
  { id: 'pwa', label: 'Install the mobile app', path: null, hint: 'Access from any device' },
]

function loadCompleted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const saved = raw ? JSON.parse(raw) : {}
    return { account: true, ...saved }
  } catch {
    return { account: true }
  }
}

function saveCompleted(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
}

export default function OnboardingChecklist() {
  const navigate = useNavigate()
  const [completed, setCompleted] = useState(() => loadCompleted())
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Check if permanently done
    if (localStorage.getItem(DONE_KEY) === 'true') {
      setVisible(false)
      return
    }
    // Check if dismissed within 7 days
    try {
      const ts = localStorage.getItem(DISMISS_KEY)
      if (ts && Date.now() - Number(ts) < 7 * 86400000) {
        setVisible(false)
      }
    } catch {}
  }, [])

  if (!visible) return null

  const completedCount = TASKS.filter(t => completed[t.id]).length
  const total = TASKS.length
  const pct = Math.round((completedCount / total) * 100)
  const allDone = completedCount === total

  function markDone(id) {
    const next = { ...completed, [id]: true }
    setCompleted(next)
    saveCompleted(next)
  }

  function handleGo(task) {
    markDone(task.id)
    if (task.path) navigate(task.path)
  }

  function handleDismiss() {
    if (allDone) {
      try { localStorage.setItem(DONE_KEY, 'true') } catch {}
    } else {
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
    }
    setVisible(false)
  }

  if (allDone && localStorage.getItem(DONE_KEY) === 'true') return null

  return (
    <div style={{
      background: 'var(--card-bg, #fff)',
      border: '1px solid var(--color-border-primary, #e5e7eb)',
      borderRadius: 12, padding: 20, marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary, #111827)' }}>
          🚀 Get Started with CustomsFieldPro
        </h3>
        <span style={{ fontSize: 13, fontWeight: 600, color: pct === 100 ? '#16a34a' : '#2563eb' }}>
          {pct}% done
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 6, background: '#e5e7eb', borderRadius: 99, marginBottom: 16, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 99,
          background: pct === 100 ? '#16a34a' : '#2563eb',
          width: `${pct}%`, transition: 'width 0.4s ease',
        }} />
      </div>

      {allDone ? (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
          <p style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: '#16a34a' }}>
            You're all set! Your account is fully configured.
          </p>
          <button
            onClick={handleDismiss}
            style={{
              background: '#16a34a', color: '#fff', border: 'none',
              borderRadius: 7, padding: '8px 20px', fontSize: 14,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Hide Checklist
          </button>
        </div>
      ) : (
        <>
          {/* Task list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {TASKS.map(task => {
              const done = !!completed[task.id]
              return (
                <div key={task.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8,
                  background: done ? 'var(--color-success-light, #f0fdf4)' : 'transparent',
                  opacity: done ? 0.7 : 1,
                }}>
                  {/* Checkbox */}
                  <div style={{
                    width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                    border: done ? 'none' : '2px solid #d1d5db',
                    background: done ? '#16a34a' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }} onClick={() => !done && markDone(task.id)}>
                    {done && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>

                  {/* Label */}
                  <div style={{ flex: 1 }}>
                    <span style={{
                      fontSize: 14, fontWeight: 500,
                      color: done ? '#6b7280' : 'var(--color-text-primary, #111827)',
                      textDecoration: done ? 'line-through' : 'none',
                    }}>
                      {task.label}
                    </span>
                    {task.hint && !done && (
                      <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>
                        — {task.hint}
                      </span>
                    )}
                  </div>

                  {/* Action button */}
                  {!done && (task.path || task.id === 'pwa') && (
                    <button
                      onClick={() => handleGo(task)}
                      style={{
                        background: '#eff6ff', color: '#2563eb',
                        border: '1px solid #bfdbfe', borderRadius: 6,
                        padding: '4px 10px', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      {task.id === 'pwa' ? 'Install →' : 'Go →'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            style={{
              marginTop: 14, background: 'transparent', border: 'none',
              color: '#9ca3af', fontSize: 13, cursor: 'pointer', padding: 0,
            }}
          >
            Dismiss for now
          </button>
        </>
      )}
    </div>
  )
}
