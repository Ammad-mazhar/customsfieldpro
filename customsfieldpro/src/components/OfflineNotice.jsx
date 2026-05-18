import { useState, useEffect, useRef } from 'react'

const isNative = () => !!(window.Capacitor?.isNativePlatform?.())

export default function OfflineNotice() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [flashBack, setFlashBack] = useState(false)
  const wasOfflineRef = useRef(!navigator.onLine)
  const flashTimer    = useRef(null)
  const cleanupRef    = useRef(null)

  useEffect(() => {
    function goOffline() {
      setIsOffline(true)
      wasOfflineRef.current = true
      clearTimeout(flashTimer.current)
      setFlashBack(false)
    }

    function goOnline() {
      setIsOffline(false)
      if (wasOfflineRef.current) {
        setFlashBack(true)
        flashTimer.current = setTimeout(() => {
          setFlashBack(false)
          wasOfflineRef.current = false
        }, 3000)
      }
    }

    if (isNative()) {
      // Capacitor Network plugin — more reliable on mobile than browser events
      ;(async () => {
        try {
          const { Network } = await import('@capacitor/network')

          // Check initial status
          const status = await Network.getStatus()
          setIsOffline(!status.connected)
          wasOfflineRef.current = !status.connected

          // Listen for changes
          const handle = Network.addListener('networkStatusChange', (s) => {
            if (s.connected) goOnline()
            else goOffline()
          })
          cleanupRef.current = () => handle.remove()
        } catch (err) {
          console.error('[OfflineNotice] Network plugin error:', err)
          // Fallback to browser events
          _addBrowserListeners(goOffline, goOnline)
        }
      })()
    } else {
      _addBrowserListeners(goOffline, goOnline)
    }

    return () => {
      cleanupRef.current?.()
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online',  goOnline)
      clearTimeout(flashTimer.current)
    }
  }, [])

  if (flashBack) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        background: '#16a34a', color: '#fff',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        animation: 'slideDown 0.25s ease',
      }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>Back online! Your connection has been restored.</span>
        <style>{`@keyframes slideDown { from { transform: translateY(-100%) } to { transform: translateY(0) } }`}</style>
      </div>
    )
  }

  if (!isOffline) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: '#d97706', color: '#fff',
      padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      animation: 'slideDown 0.25s ease',
    }}>
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
        <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="3"/>
      </svg>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>
        You are offline — changes will sync when reconnected
      </span>
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      <style>{`@keyframes slideDown { from { transform: translateY(-100%) } to { transform: translateY(0) } }`}</style>
    </div>
  )
}

function _addBrowserListeners(goOffline, goOnline) {
  window.addEventListener('offline', goOffline)
  window.addEventListener('online',  goOnline)
}
