import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const TRIAL_KEY = 'fieldflow_trial'

// Seed trial data for demo (5 days remaining by default)
function seedTrialData() {
  if (!localStorage.getItem(TRIAL_KEY)) {
    const trialEndsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    localStorage.setItem(TRIAL_KEY, JSON.stringify({ plan: 'trial', trialEndsAt }))
  }
}

export function getTrialData() {
  seedTrialData()
  try { return JSON.parse(localStorage.getItem(TRIAL_KEY)) } catch { return null }
}

export function setTrialPlan(plan) {
  const data = getTrialData() || {}
  localStorage.setItem(TRIAL_KEY, JSON.stringify({ ...data, plan }))
}

function getDismissKey() {
  return `fieldflow_trial_dismissed_${new Date().toISOString().slice(0, 10)}`
}

function isDismissedToday() {
  return !!localStorage.getItem(getDismissKey())
}

function dismissToday() {
  localStorage.setItem(getDismissKey(), '1')
}

// ── Expired overlay ───────────────────────────────────────────────────────────
function ExpiredOverlay() {
  const navigate = useNavigate()

  const PLANS = [
    { id: 'starter',      label: 'Starter',      price: 79,  desc: 'Up to 3 users, 100 jobs/mo'  },
    { id: 'professional', label: 'Professional',  price: 179, desc: 'Up to 10 users, unlimited jobs', popular: true },
    { id: 'business',     label: 'Business',      price: 349, desc: 'Unlimited users & jobs'      },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.96)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ maxWidth: 640, width: '100%', textAlign: 'center' }}>
        {/* Icon */}
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef3c7', border: '2px solid #fcd34d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#d97706" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/>
            <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/>
          </svg>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: '0 0 10px' }}>Your trial has ended</h1>
        <p style={{ fontSize: 15, color: '#94a3b8', margin: '0 0 32px', lineHeight: 1.6 }}>
          Choose a plan to continue using FieldFlow CRM. Your data is safe and will be restored once you subscribe.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 28 }}>
          {PLANS.map(plan => (
            <div key={plan.id} onClick={() => navigate('/billing')}
              style={{
                background: plan.popular ? '#2563eb' : '#1e293b',
                border: `1px solid ${plan.popular ? '#3b82f6' : '#334155'}`,
                borderRadius: 12, padding: '20px 16px', cursor: 'pointer',
                position: 'relative', transition: 'transform 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {plan.popular && (
                <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#fbbf24', color: '#78350f', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8, whiteSpace: 'nowrap' }}>
                  MOST POPULAR
                </span>
              )}
              <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>{plan.label}</p>
              <p style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800, color: '#fff' }}>${plan.price}<span style={{ fontSize: 12, fontWeight: 500, color: plan.popular ? '#bfdbfe' : '#64748b' }}>/mo</span></p>
              <p style={{ margin: 0, fontSize: 11.5, color: plan.popular ? '#bfdbfe' : '#64748b', lineHeight: 1.5 }}>{plan.desc}</p>
            </div>
          ))}
        </div>

        <button onClick={() => navigate('/billing')}
          style={{ height: 46, padding: '0 32px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          Choose a Plan →
        </button>
        <p style={{ marginTop: 14, fontSize: 12.5, color: '#475569' }}>
          Need help? <a href="mailto:support@fieldflow.app" style={{ color: '#60a5fa', textDecoration: 'none' }}>Contact support</a>
        </p>
      </div>
    </div>
  )
}

// ── Trial Banner ──────────────────────────────────────────────────────────────
export default function TrialBanner() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(() => isDismissedToday())
  const [trialData, setTrialData] = useState(() => getTrialData())

  // Re-read on mount and when user changes
  useEffect(() => {
    setTrialData(getTrialData())
    setDismissed(isDismissedToday())
  }, [user])

  // Only show for admin users on trial plan
  if (!user || !isAdmin) return null
  if (!trialData || trialData.plan !== 'trial') return null

  const daysLeft = trialData.trialEndsAt
    ? Math.ceil((new Date(trialData.trialEndsAt) - new Date()) / 86400000)
    : null

  if (daysLeft === null) return null

  // Expired: show full-page overlay (not dismissable)
  if (daysLeft <= 0) return <ExpiredOverlay />

  // Dismissed today: don't show banner
  if (dismissed) return null

  // Determine urgency styling
  const urgent   = daysLeft <= 3
  const warning  = daysLeft <= 7

  const bg      = urgent ? '#fef2f2' : warning ? '#fffbeb' : '#eff6ff'
  const border  = urgent ? '#fecaca' : warning ? '#fde68a' : '#bfdbfe'
  const color   = urgent ? '#dc2626' : warning ? '#d97706' : '#1d4ed8'
  const icon    = urgent
    ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round"/></svg>
    : <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/></svg>

  // Progress bar: 14-day trial total
  const trialTotal   = 14
  const trialUsed    = trialTotal - daysLeft
  const progressPct  = Math.min(100, Math.max(0, (trialUsed / trialTotal) * 100))

  function handleDismiss() {
    dismissToday()
    setDismissed(true)
  }

  return (
    <div style={{
      background: bg,
      borderBottom: `1px solid ${border}`,
      padding: '9px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
    }}>
      {/* Icon + message */}
      <span style={{ color, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {icon}
        <span style={{ fontSize: 13.5, fontWeight: 600, color }}>
          {urgent ? `⚠ Only ${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your trial!`
                  : `${daysLeft} days left in your free trial`}
        </span>
      </span>

      {/* Progress bar */}
      <div style={{ flex: 1, minWidth: 120, maxWidth: 200, height: 6, background: `${border}`, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progressPct}%`, background: color, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>

      {/* CTA */}
      <button onClick={() => navigate('/billing')}
        style={{ height: 30, padding: '0 14px', background: color, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
        Upgrade Now
      </button>

      {/* Dismiss */}
      <button onClick={handleDismiss}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color, padding: 2, display: 'flex', alignItems: 'center', flexShrink: 0, opacity: 0.6 }}
        title="Dismiss for today">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/>
          <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}
