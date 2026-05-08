import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBilling } from '../data/store'

const DISMISS_KEY = 'fieldflow_trial_dismiss'

export default function TrialBanner() {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)
  const [billing, setBilling] = useState(null)

  useEffect(() => {
    setBilling(getBilling())
    // Check if dismissed within 24hrs
    try {
      const ts = localStorage.getItem(DISMISS_KEY)
      if (ts && Date.now() - Number(ts) < 86400000) {
        setDismissed(true)
      }
    } catch {}
  }, [])

  if (!billing) return null
  if (billing.plan !== 'trial' || !billing.trialEndsAt) return null

  const daysLeft = Math.max(0, Math.round((new Date(billing.trialEndsAt) - Date.now()) / 86400000))

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
    setDismissed(true)
  }

  // Trial expired — full screen overlay, cannot dismiss
  if (daysLeft === 0) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}>
        <div style={{
          background: '#fff', borderRadius: 16, padding: 40,
          maxWidth: 480, width: '100%', textAlign: 'center',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>
            Your Trial Has Ended
          </h2>
          <p style={{ fontSize: 15, color: '#6b7280', margin: '0 0 28px', lineHeight: 1.6 }}>
            Your 14-day free trial has expired. Choose a plan to continue using FieldFlow CRM.
          </p>
          <button
            onClick={() => navigate('/billing')}
            style={{
              background: '#16a34a', color: '#fff', border: 'none',
              borderRadius: 8, padding: '14px 28px', fontSize: 16,
              fontWeight: 600, cursor: 'pointer', width: '100%', marginBottom: 16,
            }}
          >
            View Plans &amp; Pricing
          </button>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
            Questions? Contact{' '}
            <a href="mailto:support@fieldflowcrm.com" style={{ color: '#2563eb' }}>
              support@fieldflowcrm.com
            </a>
          </p>
        </div>
      </div>
    )
  }

  // 3 days or less — red, cannot dismiss
  if (daysLeft <= 3) {
    return (
      <div style={{
        background: '#fef2f2', borderBottom: '1px solid #fca5a5',
        padding: '10px 20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
      }}>
        <span style={{ fontSize: 14, color: '#dc2626', fontWeight: 600 }}>
          🚨 Trial expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''} — Upgrade now to keep your data
        </span>
        <button
          onClick={() => navigate('/billing')}
          style={{
            background: '#dc2626', color: '#fff', border: 'none',
            borderRadius: 6, padding: '6px 16px', fontSize: 13,
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          Upgrade Now
        </button>
      </div>
    )
  }

  // 7 days or less — amber, dismissable
  if (daysLeft <= 7) {
    if (dismissed) return null
    return (
      <div style={{
        background: '#fffbeb', borderBottom: '1px solid #fde68a',
        padding: '10px 20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
      }}>
        <span style={{ fontSize: 14, color: '#92400e', fontWeight: 500 }}>
          ⚠️ Trial ending soon — {daysLeft} days left
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => navigate('/billing')}
            style={{
              background: '#d97706', color: '#fff', border: 'none',
              borderRadius: 6, padding: '6px 14px', fontSize: 13,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Choose a Plan
          </button>
          <button
            onClick={dismiss}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#92400e', fontSize: 18, lineHeight: 1, padding: '2px 4px',
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    )
  }

  // More than 7 days — blue, dismissable
  if (dismissed) return null
  return (
    <div style={{
      background: '#eff6ff', borderBottom: '1px solid #bfdbfe',
      padding: '10px 20px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
    }}>
      <span style={{ fontSize: 14, color: '#1d4ed8', fontWeight: 500 }}>
        🎉 Free Trial — {daysLeft} days remaining
      </span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={() => navigate('/billing')}
          style={{
            background: '#2563eb', color: '#fff', border: 'none',
            borderRadius: 6, padding: '6px 14px', fontSize: 13,
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          Upgrade Now
        </button>
        <button
          onClick={dismiss}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#1d4ed8', fontSize: 18, lineHeight: 1, padding: '2px 4px',
          }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  )
}
