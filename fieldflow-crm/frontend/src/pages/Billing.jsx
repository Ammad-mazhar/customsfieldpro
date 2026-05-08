import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTrialData, setTrialPlan } from '../components/TrialBanner'
import { useAuth } from '../auth/AuthContext'

const PLANS = [
  {
    id:       'starter',
    label:    'Starter',
    price:    79,
    yearlyPrice: 63,
    color:    '#2563eb',
    features: [
      'Up to 3 users',
      '100 jobs / month',
      'Clients & invoicing',
      'Basic scheduling',
      'Email support',
    ],
  },
  {
    id:       'professional',
    label:    'Professional',
    price:    179,
    yearlyPrice: 143,
    color:    '#7c3aed',
    popular:  true,
    features: [
      'Up to 10 users',
      'Unlimited jobs',
      'AI job estimator',
      'Advanced reports',
      'GPS time tracking',
      'Priority support',
    ],
  },
  {
    id:       'business',
    label:    'Business',
    price:    349,
    yearlyPrice: 279,
    color:    '#059669',
    features: [
      'Unlimited users',
      'Unlimited jobs',
      'All Professional features',
      'Custom branding',
      'API access',
      'Dedicated support',
    ],
  },
  {
    id:       'enterprise',
    label:    'Enterprise',
    price:    null,
    color:    '#1a1d23',
    features: [
      'Everything in Business',
      'Custom integrations',
      'SLA guarantee',
      'On-premise option',
      'Custom contract',
      'Account manager',
    ],
  },
]

function CheckIcon({ color }) {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="2.5" style={{ flexShrink: 0 }}>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function Billing() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [yearly,  setYearly]  = useState(false)
  const [success, setSuccess] = useState(null) // plan id after "upgrade"

  const trialData    = getTrialData()
  const currentPlan  = trialData?.plan || 'trial'
  const trialDaysLeft = trialData?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialData.trialEndsAt) - new Date()) / 86400000))
    : null

  function handleContactUpgrade(planId) {
    // In demo mode: simulate upgrade
    setTrialPlan(planId)
    setSuccess(planId)
  }

  if (success) {
    const plan = PLANS.find(p => p.id === success)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, padding: 24, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ecfdf5', border: '2px solid #6ee7b7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1d23', margin: 0 }}>Welcome to {plan?.label}!</h2>
        <p style={{ fontSize: 14.5, color: '#6b7280', margin: 0, maxWidth: 400, lineHeight: 1.6 }}>
          Your plan has been updated. In a live environment this would process your payment via Stripe. Enjoy all {plan?.label} features!
        </p>
        <button onClick={() => navigate('/dashboard')}
          style={{ height: 42, padding: '0 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 0', maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 36, padding: '0 24px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1a1d23', margin: '0 0 8px' }}>Plans &amp; Billing</h1>
        <p style={{ fontSize: 15, color: '#6b7280', margin: '0 0 20px' }}>
          Simple pricing — no hidden fees. Cancel anytime.
        </p>

        {/* Monthly / Yearly toggle */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#f3f4f6', border: '1px solid #e8e9ec', borderRadius: 8, padding: '6px 12px' }}>
          <span style={{ fontSize: 13, color: !yearly ? '#1a1d23' : '#9ca3af', fontWeight: !yearly ? 600 : 400 }}>Monthly</span>
          <button onClick={() => setYearly(v => !v)}
            style={{ position: 'relative', width: 40, height: 22, borderRadius: 11, background: yearly ? '#2563eb' : '#d1d5db', border: 'none', cursor: 'pointer', transition: 'background 0.2s', padding: 0 }}>
            <span style={{ position: 'absolute', top: 3, left: yearly ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
          </button>
          <span style={{ fontSize: 13, color: yearly ? '#1a1d23' : '#9ca3af', fontWeight: yearly ? 600 : 400 }}>
            Yearly <span style={{ background: '#ecfdf5', color: '#059669', fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>Save 20%</span>
          </span>
        </div>
      </div>

      {/* Current plan status */}
      {currentPlan !== 'trial' ? (
        <div style={{ margin: '0 24px 28px', padding: '14px 18px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1e40af' }}>
              Current plan: {PLANS.find(p => p.id === currentPlan)?.label || currentPlan}
            </span>
            <span style={{ fontSize: 12.5, color: '#3b82f6', marginLeft: 12 }}>Active subscription</span>
          </div>
        </div>
      ) : trialDaysLeft !== null && (
        <div style={{ margin: '0 24px 28px', padding: '14px 18px', background: trialDaysLeft <= 3 ? '#fef2f2' : '#fffbeb', border: `1px solid ${trialDaysLeft <= 3 ? '#fecaca' : '#fde68a'}`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke={trialDaysLeft <= 3 ? '#dc2626' : '#d97706'} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/></svg>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: trialDaysLeft <= 3 ? '#dc2626' : '#d97706' }}>
            {trialDaysLeft > 0 ? `Free trial — ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} remaining` : 'Your trial has expired'}
          </span>
        </div>
      )}

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, padding: '0 24px', marginBottom: 40 }}>
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.id
          const price     = plan.price ? (yearly ? plan.yearlyPrice : plan.price) : null
          const savings   = plan.price && yearly ? Math.round((plan.price - plan.yearlyPrice) * 12) : 0

          return (
            <div key={plan.id}
              style={{
                background: plan.popular ? plan.color : '#fff',
                border: `1px solid ${plan.popular ? plan.color : '#e8e9ec'}`,
                borderRadius: 14,
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                position: 'relative',
                boxShadow: plan.popular ? '0 8px 32px rgba(124,58,237,0.2)' : '0 1px 4px rgba(0,0,0,0.04)',
                transform: plan.popular ? 'scale(1.02)' : 'none',
              }}>

              {plan.popular && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#fbbf24', color: '#78350f', fontSize: 10.5, fontWeight: 700, padding: '3px 12px', borderRadius: 10, whiteSpace: 'nowrap', letterSpacing: '0.3px' }}>
                  MOST POPULAR
                </div>
              )}

              {isCurrent && (
                <div style={{ position: 'absolute', top: 12, right: 12, background: '#ecfdf5', color: '#059669', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>CURRENT</div>
              )}

              <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: plan.popular ? '#fff' : '#1a1d23' }}>{plan.label}</p>

              {price !== null ? (
                <div style={{ margin: '0 0 16px' }}>
                  <span style={{ fontSize: 30, fontWeight: 800, color: plan.popular ? '#fff' : '#1a1d23' }}>${price}</span>
                  <span style={{ fontSize: 13, color: plan.popular ? '#e9d5ff' : '#9ca3af', marginLeft: 3 }}>/mo</span>
                  {yearly && savings > 0 && (
                    <p style={{ margin: '3px 0 0', fontSize: 11.5, color: plan.popular ? '#d8b4fe' : '#059669', fontWeight: 600 }}>
                      Save ${savings}/yr
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ margin: '0 0 16px' }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#1a1d23' }}>Custom</span>
                </div>
              )}

              <ul style={{ listStyle: 'none', margin: '0 0 20px', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: plan.popular ? '#ede9fe' : '#374151' }}>
                    <CheckIcon color={plan.popular ? '#c4b5fd' : plan.color} />
                    {f}
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: 'auto' }}>
                {plan.id === 'enterprise' ? (
                  <a href="mailto:sales@fieldflow.app?subject=Enterprise%20Plan%20Inquiry"
                    style={{ display: 'block', textAlign: 'center', height: 40, lineHeight: '40px', background: '#1a1d23', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
                    Contact Sales
                  </a>
                ) : isCurrent ? (
                  <button disabled
                    style={{ width: '100%', height: 40, background: '#f3f4f6', color: '#9ca3af', border: '1px solid #e8e9ec', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'not-allowed' }}>
                    Current Plan
                  </button>
                ) : (
                  <button onClick={() => handleContactUpgrade(plan.id)}
                    style={{ width: '100%', height: 40, background: plan.popular ? '#fff' : plan.color, color: plan.popular ? plan.color : '#fff', border: plan.popular ? 'none' : 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
                    {currentPlan === 'trial' ? 'Start with ' : (PLANS.findIndex(p => p.id === plan.id) > PLANS.findIndex(p => p.id === currentPlan) ? 'Upgrade to ' : 'Downgrade to ')}{plan.label}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Stripe note */}
      <div style={{ margin: '0 24px 28px', padding: '16px 20px', background: '#f8faff', border: '1px solid #e0e7ff', borderRadius: 10, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.8" style={{ flexShrink: 0, marginTop: 1 }}>
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="1" y1="10" x2="23" y2="10" strokeLinecap="round"/>
        </svg>
        <div>
          <p style={{ margin: '0 0 3px', fontSize: 13.5, fontWeight: 600, color: '#4f46e5' }}>Stripe billing coming soon</p>
          <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
            Clicking "Upgrade" currently simulates the plan change. Full Stripe integration is in progress.
            To upgrade now, email <a href="mailto:billing@fieldflow.app" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 600 }}>billing@fieldflow.app</a> and we'll set you up manually within 24 hours.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ padding: '0 24px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a1d23', margin: '0 0 16px' }}>Frequently Asked Questions</h2>
        {[
          ['Can I change plans later?', 'Yes, upgrade or downgrade at any time. Prorated credits are applied automatically.'],
          ['What happens to my data if I cancel?', 'Your data is retained for 30 days after cancellation. You can export it anytime.'],
          ['Is there a contract or commitment?', 'No contracts — all plans are month-to-month or yearly (with 20% discount). Cancel anytime.'],
          ['Do you offer a free trial?', 'Yes! Every new account gets a 14-day free trial with full access to Professional features.'],
        ].map(([q, a]) => (
          <FAQItem key={q} question={q} answer={a} />
        ))}
      </div>
    </div>
  )
}

function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid #f0f1f3', marginBottom: 4 }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1d23' }}>{question}</span>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2.5" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && <p style={{ margin: '0 0 14px', fontSize: 13.5, color: '#6b7280', lineHeight: 1.6 }}>{answer}</p>}
    </div>
  )
}
