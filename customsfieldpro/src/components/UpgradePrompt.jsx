import { useNavigate } from 'react-router-dom'
import { PLAN_NAMES } from '../utils/planLimits'

export default function UpgradePrompt({ feature, featureName, requiredPlan, currentPlan, onClose, onUpgrade }) {
  const navigate = useNavigate()

  const planName = PLAN_NAMES[requiredPlan] || requiredPlan
  const currentPlanName = PLAN_NAMES[currentPlan] || currentPlan

  function handleUpgrade() {
    if (onUpgrade) {
      onUpgrade()
    } else {
      navigate('/billing')
    }
    onClose && onClose()
  }

  function handleViewPlans() {
    navigate('/billing')
    onClose && onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, padding: 32,
          maxWidth: 440, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          textAlign: 'center',
        }}
      >
        {/* Lock Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: '#eff6ff', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 20px',
        }}>
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
          Upgrade to Access {featureName}
        </h2>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.6 }}>
          <strong>{featureName}</strong> is available on the{' '}
          <strong style={{ color: '#2563eb' }}>{planName}</strong> plan and above.
        </p>

        {/* Current plan badge */}
        <div style={{
          display: 'inline-block', background: '#f3f4f6',
          borderRadius: 99, padding: '4px 14px', fontSize: 12,
          color: '#6b7280', marginBottom: 24,
        }}>
          Your current plan: <strong style={{ color: '#374151' }}>{currentPlanName}</strong>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={handleUpgrade}
            style={{
              background: '#2563eb', color: '#fff', border: 'none',
              borderRadius: 8, padding: '12px 20px', fontSize: 15,
              fontWeight: 600, cursor: 'pointer', width: '100%',
            }}
          >
            Upgrade to {planName} →
          </button>
          <button
            onClick={handleViewPlans}
            style={{
              background: 'transparent', color: '#2563eb',
              border: '1.5px solid #2563eb', borderRadius: 8,
              padding: '11px 20px', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', width: '100%',
            }}
          >
            View all plans
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', color: '#9ca3af',
              border: 'none', padding: '8px 20px', fontSize: 14,
              cursor: 'pointer', width: '100%',
            }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
