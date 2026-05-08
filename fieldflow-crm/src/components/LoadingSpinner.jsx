export default function LoadingSpinner({ size = 32, color = '#2563eb', label = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" stroke="#e8e9ec" strokeWidth="3" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round"
          style={{ animation: 'spin 0.75s linear infinite', transformOrigin: '12px 12px' }} />
      </svg>
      {label && <span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>{label}</span>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/** Inline spinner — no padding, used inside buttons or small spaces */
export function InlineSpinner({ size = 16, color = 'currentColor' }) {
  return (
    <>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, display: 'inline-block' }}>
        <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.15)" strokeWidth="3" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round"
          style={{ animation: 'spin 0.75s linear infinite', transformOrigin: '12px 12px' }} />
      </svg>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

/** Full-page skeleton card for Dashboard-style loading */
export function SkeletonCard({ height = 120 }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, height, overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,#f0f1f3 25%,#e8e9ec 50%,#f0f1f3 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
      <style>{`@keyframes shimmer { to { background-position: -200% 0; } }`}</style>
    </div>
  )
}
