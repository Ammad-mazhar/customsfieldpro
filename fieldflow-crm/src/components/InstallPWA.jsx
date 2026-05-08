import { useState, useEffect } from 'react'

const DISMISS_KEY   = 'fieldflow_pwa_dismissed_until'
const DISMISS_DAYS  = 7

function isIOS() {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) && !/MSStream/.test(ua)
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow]                     = useState(false)
  const [showIOS, setShowIOS]               = useState(false)

  useEffect(() => {
    // Don't show if already installed as PWA
    if (isInStandaloneMode()) return

    // Don't show if dismissed recently
    const dismissedUntil = localStorage.getItem(DISMISS_KEY)
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return

    if (isIOS()) {
      // iOS — show share-sheet instruction after a short delay
      const t = setTimeout(() => setShowIOS(true), 2500)
      return () => clearTimeout(t)
    }

    // Chrome/Android/desktop — listen for beforeinstallprompt
    function onPrompt(e) {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  function dismiss() {
    const until = Date.now() + DISMISS_DAYS * 86400000
    localStorage.setItem(DISMISS_KEY, String(until))
    setShow(false)
    setShowIOS(false)
  }

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShow(false)
      setDeferredPrompt(null)
    } else {
      dismiss()
    }
  }

  // ── iOS banner ────────────────────────────────────────────────────────────
  if (showIOS) {
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9000,
        background: '#1e40af', color: '#fff',
        padding: '14px 16px 18px',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
        animation: 'slideUp 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {/* App icon */}
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#2563eb', border: '1.5px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>Install FieldFlow CRM</p>
            <p style={{ fontSize: 12.5, margin: 0, color: '#bfdbfe', lineHeight: 1.5 }}>
              Tap{' '}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ display: 'inline', verticalAlign: 'middle' }}>
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              {' '}<strong>Share</strong> then <strong>"Add to Home Screen"</strong> for quick access without the browser.
            </p>
          </div>

          <button onClick={dismiss}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 22, cursor: 'pointer', padding: '0 0 0 4px', lineHeight: 1, flexShrink: 0 }}>
            ×
          </button>
        </div>

        {/* Arrow pointing to share button */}
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
      </div>
    )
  }

  // ── Android / desktop banner ──────────────────────────────────────────────
  if (!show) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9000,
      background: '#2563eb', color: '#fff',
      padding: '12px 16px',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
      display: 'flex', alignItems: 'center', gap: 12,
      animation: 'slideUp 0.3s ease',
    }}>
      {/* App icon */}
      <div style={{ width: 40, height: 40, borderRadius: 9, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, margin: '0 0 2px' }}>Install FieldFlow CRM</p>
        <p style={{ fontSize: 12, color: '#bfdbfe', margin: 0 }}>Quick access from your home screen</p>
      </div>

      <button onClick={handleInstall}
        style={{ height: 36, padding: '0 18px', background: '#fff', color: '#2563eb', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
        Install
      </button>

      <button onClick={dismiss}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0 }}>
        ×
      </button>

      <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
    </div>
  )
}
