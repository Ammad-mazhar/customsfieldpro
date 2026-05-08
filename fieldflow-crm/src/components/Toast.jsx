import { createContext, useContext, useState, useCallback, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────
const TYPE_STYLES = {
  success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )},
  error: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )},
  warning: { bg: '#fffbeb', border: '#fde68a', color: '#d97706', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )},
  info: { bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )},
}

// ── Context ───────────────────────────────────────────────────────────────────
const ToastContext = createContext(null)

let _nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = _nextId++
    setToasts(prev => [...prev.slice(-4), { id, message, type }]) // max 5 stacked
    timers.current[id] = setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }) {
  const st = TYPE_STYLES[toast.type] || TYPE_STYLES.info
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      background: st.bg, border: `1px solid ${st.border}`, borderRadius: 10,
      padding: '12px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      minWidth: 280, maxWidth: 380, pointerEvents: 'all',
      animation: 'toastSlideIn 0.22s ease',
    }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>{st.icon}</span>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: st.color, lineHeight: 1.45 }}>{toast.message}</span>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: st.color, fontSize: 18, lineHeight: 1, padding: '0 2px', opacity: 0.6, flexShrink: 0, marginTop: -1 }}>×</button>
      <style>{`@keyframes toastSlideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) return () => {}  // no-op outside provider
  return ctx
}

/** Convenience wrappers returned by useToast variant */
export function useToastActions() {
  const add = useToast()
  return {
    success: (msg, dur)  => add(msg, 'success', dur),
    error:   (msg, dur)  => add(msg, 'error',   dur),
    warning: (msg, dur)  => add(msg, 'warning',  dur),
    info:    (msg, dur)  => add(msg, 'info',     dur),
  }
}
