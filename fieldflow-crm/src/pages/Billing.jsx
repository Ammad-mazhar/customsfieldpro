import { useState, useMemo } from 'react'
import { getBilling, saveBilling, getBillingHistory, getLeads } from '../data/store'
import { PLAN_LIMITS, PLAN_NAMES, checkLimit } from '../utils/planLimits'
import { useAuth } from '../auth/AuthContext'

// ─── Plan definitions ─────────────────────────────────────────────────────────
const PLANS = [
  {
    slug: 'starter',
    name: 'Starter',
    monthly: 4900,
    yearly: 47000,
    color: '#6B7280',
    features: [
      '3 users',
      '100 clients',
      '100 jobs / month',
      'Service calls & jobs',
      'Invoicing & quotes',
      'Email support',
    ],
  },
  {
    slug: 'professional',
    name: 'Professional',
    monthly: 9900,
    yearly: 95000,
    color: '#2563EB',
    popular: true,
    features: [
      '10 users',
      '500 clients',
      '500 jobs / month',
      'Everything in Starter',
      'Scheduler & routing',
      'Lead management',
      'Equipment registry',
      'Warranty claims',
      'Priority support',
    ],
  },
  {
    slug: 'business',
    name: 'Business',
    monthly: 19900,
    yearly: 190000,
    color: '#7C3AED',
    features: [
      '25 users',
      '2,000 clients',
      'Unlimited jobs',
      'Everything in Professional',
      'Advanced reports',
      'Custom branding',
      'API access',
      'Dedicated CSM',
    ],
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    monthly: 39900,
    yearly: 383000,
    color: '#059669',
    features: [
      'Unlimited users',
      'Unlimited clients',
      'Unlimited everything',
      'Everything in Business',
      'SLA guarantee',
      'On-premise option',
      'White-label',
      '24/7 phone support',
    ],
  },
]

const PLAN_ORDER = ['starter', 'professional', 'business', 'enterprise']

function centsToDisplay(cents) {
  return `$${(cents / 100).toFixed(2).replace('.00', '')}`
}

function fmtDate(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return iso }
}

function relativeDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.round((d - now) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff > 0) return `in ${diff} days`
  if (diff === -1) return 'Yesterday'
  return fmtDate(iso)
}

// ─── Mock checkout flow ────────────────────────────────────────────────────────
function MockCheckoutModal({ plan, billing, cycle, onConfirm, onClose }) {
  const [processing, setProcessing] = useState(false)
  const price = cycle === 'yearly' ? plan.yearly : plan.monthly
  const monthly = cycle === 'yearly' ? Math.round(plan.yearly / 12) : plan.monthly

  function handleConfirm() {
    setProcessing(true)
    setTimeout(() => {
      onConfirm()
    }, 1800)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, maxWidth: 480, width: '92%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stripe Checkout</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a1d23', margin: '4px 0 0' }}>
              FieldFlow {plan.name}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20 }}>×</button>
        </div>

        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
            <span style={{ color: '#374151' }}>FieldFlow {plan.name} — {cycle === 'yearly' ? 'Annual' : 'Monthly'}</span>
            <span style={{ fontWeight: 700 }}>{centsToDisplay(price)}</span>
          </div>
          {cycle === 'yearly' && (
            <div style={{ fontSize: 12, color: '#059669' }}>
              ≈ {centsToDisplay(monthly)}/mo · Save 20% vs monthly
            </div>
          )}
          <div style={{ borderTop: '1px solid #e8e9ec', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15 }}>
            <span>Total today</span>
            <span style={{ color: plan.color }}>{centsToDisplay(price)}</span>
          </div>
        </div>

        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 6, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#856404' }}>
          <strong>Demo Mode</strong> — In production this redirects to Stripe's hosted checkout page. No real charges will be made.
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Payment method on file</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
            <span style={{ background: '#1a1a2e', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>VISA</span>
            <span style={{ color: '#374151' }}>•••• •••• •••• 4242</span>
            <span style={{ color: '#9ca3af', marginLeft: 'auto' }}>12/27</span>
          </div>
        </div>

        <button onClick={handleConfirm} disabled={processing}
          style={{
            width: '100%', padding: '12px', background: processing ? '#93c5fd' : '#2563eb',
            color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
            cursor: processing ? 'default' : 'pointer', transition: 'background 0.2s',
          }}>
          {processing ? 'Processing…' : `Confirm — ${centsToDisplay(price)}`}
        </button>
        <button onClick={onClose} style={{ width: '100%', marginTop: 8, padding: '10px', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 13 }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Cancel subscription modal ─────────────────────────────────────────────────
function CancelModal({ plan, onConfirm, onClose }) {
  const [step, setStep] = useState(1)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 420, width: '92%' }}>
        {step === 1 ? (
          <>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#dc2626', margin: '0 0 12px' }}>Cancel Subscription?</h3>
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: 16 }}>
              Your <strong>{PLAN_NAMES[plan]}</strong> subscription will remain active until the end of your current billing period. After that, your account will be downgraded and most features will become inaccessible.
            </p>
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '10px 14px', marginBottom: 18, fontSize: 12, color: '#991b1b' }}>
              You will lose access to: scheduler, reports, leads, equipment registry, warranty claims, and more.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '9px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                Keep My Plan
              </button>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: '9px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
                Yes, Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>😢</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1a1d23', margin: '0 0 8px' }}>Subscription Cancelled</h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
                Your plan will remain active until the end of the billing period. You can reactivate anytime.
              </p>
              <button onClick={onConfirm} style={{ padding: '8px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
                Got it
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Limit bar ────────────────────────────────────────────────────────────────
function UsageBar({ label, current, limit, color = '#2563eb' }) {
  if (limit === -1) {
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
          <span style={{ color: '#374151', fontWeight: 600 }}>{label}</span>
          <span style={{ color: '#059669', fontWeight: 700 }}>Unlimited</span>
        </div>
        <div style={{ height: 6, background: '#e8e9ec', borderRadius: 3 }}>
          <div style={{ height: '100%', width: '100%', background: '#059669', borderRadius: 3 }} />
        </div>
      </div>
    )
  }
  const pct = Math.min(Math.round((current / limit) * 100), 100)
  const barColor = pct >= 100 ? '#dc2626' : pct >= 80 ? '#f59e0b' : color
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: '#374151', fontWeight: 600 }}>{label}</span>
        <span style={{ color: barColor, fontWeight: 700 }}>{current} / {limit}</span>
      </div>
      <div style={{ height: 6, background: '#e8e9ec', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
      {pct >= 80 && pct < 100 && (
        <div style={{ fontSize: 10, color: '#d97706', marginTop: 2 }}>
          ⚠ {100 - pct}% remaining — consider upgrading
        </div>
      )}
      {pct >= 100 && (
        <div style={{ fontSize: 10, color: '#dc2626', marginTop: 2 }}>
          Limit reached
        </div>
      )}
    </div>
  )
}

// ─── Plan card ────────────────────────────────────────────────────────────────
function PlanCard({ plan, currentPlan, billingCycle, onSelect }) {
  const isCurrent = plan.slug === currentPlan
  const price = billingCycle === 'yearly' ? plan.yearly : plan.monthly
  const monthly = billingCycle === 'yearly' ? Math.round(plan.yearly / 12) : plan.monthly

  const currentIdx = PLAN_ORDER.indexOf(currentPlan)
  const planIdx = PLAN_ORDER.indexOf(plan.slug)
  const isUpgrade = planIdx > currentIdx
  const isDowngrade = planIdx < currentIdx

  return (
    <div style={{
      background: '#fff',
      border: `2px solid ${plan.popular ? plan.color : '#e8e9ec'}`,
      borderRadius: 10,
      padding: '22px 20px',
      position: 'relative',
      flex: 1,
      minWidth: 0,
      transition: 'box-shadow 0.15s',
      ...(plan.popular ? { boxShadow: '0 4px 20px rgba(37,99,235,0.15)' } : {}),
    }}
      onMouseEnter={e => { if (!plan.popular) e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)' }}
      onMouseLeave={e => { if (!plan.popular) e.currentTarget.style.boxShadow = 'none' }}>
      {plan.popular && (
        <div style={{
          position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
          background: plan.color, color: '#fff', fontSize: 10, fontWeight: 800,
          padding: '3px 12px', borderRadius: 10, letterSpacing: '0.5px', textTransform: 'uppercase',
        }}>Most Popular</div>
      )}
      <div style={{ fontSize: 13, fontWeight: 700, color: plan.color, marginBottom: 6 }}>{plan.name}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 2 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: '#1a1d23' }}>
          {centsToDisplay(monthly)}
        </span>
        <span style={{ fontSize: 12, color: '#9ca3af', marginBottom: 5 }}>/mo</span>
      </div>
      {billingCycle === 'yearly' && (
        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>
          {centsToDisplay(price)} billed yearly
        </div>
      )}
      <div style={{ height: 1, background: '#f3f4f6', margin: '14px 0' }} />
      <ul style={{ padding: 0, margin: '0 0 18px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {plan.features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#374151' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={plan.color} strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={() => !isCurrent && onSelect(plan, billingCycle)}
        disabled={isCurrent}
        style={{
          width: '100%', padding: '9px', borderRadius: 6, fontSize: 13, fontWeight: 700,
          cursor: isCurrent ? 'default' : 'pointer', border: 'none',
          background: isCurrent ? '#f3f4f6' : isUpgrade ? plan.color : '#fff',
          color: isCurrent ? '#9ca3af' : isUpgrade ? '#fff' : plan.color,
          border: !isCurrent && !isUpgrade ? `1px solid ${plan.color}` : 'none',
        }}>
        {isCurrent ? 'Current Plan' : isUpgrade ? 'Upgrade' : 'Downgrade'}
      </button>
    </div>
  )
}

// ─── Main Billing page ────────────────────────────────────────────────────────
export default function Billing() {
  const { user } = useAuth()
  const [billing, setBillingState] = useState(() => getBilling())
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [checkoutPlan, setCheckoutPlan] = useState(null)
  const [showCancel, setShowCancel] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const history = useMemo(() => getBillingHistory(), [])

  // Mock usage counts (would come from real DB in production)
  const usage = useMemo(() => ({
    users: 4,
    clients: 87,
    jobsPerMonth: 43,
  }), [])

  const plan = billing.plan
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.trial
  const isTrialMode = plan === 'trial'
  const trialDaysLeft = billing.trialEndsAt
    ? Math.max(0, Math.round((new Date(billing.trialEndsAt) - Date.now()) / 86400000))
    : null

  function handleSelectPlan(plan, cycle) {
    setCheckoutPlan({ plan, cycle })
  }

  function handleCheckoutConfirm() {
    const { plan: selectedPlan, cycle } = checkoutPlan
    const newBilling = {
      plan: selectedPlan.slug,
      billingCycle: cycle,
      subscriptionStatus: 'active',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + (cycle === 'yearly' ? 365 : 30) * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      trialEndsAt: null,
    }
    saveBilling(newBilling)
    setBillingState({ ...billing, ...newBilling })
    setCheckoutPlan(null)
    setSuccessMsg(`Successfully upgraded to ${selectedPlan.name}!`)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  function handleCancelConfirm() {
    const updated = { cancelAtPeriodEnd: true, subscriptionStatus: 'cancelling' }
    saveBilling(updated)
    setBillingState({ ...billing, ...updated })
    setShowCancel(false)
    setSuccessMsg('Your subscription has been cancelled. Access continues until end of billing period.')
    setTimeout(() => setSuccessMsg(''), 6000)
  }

  const statusColor = {
    active: '#059669', cancelling: '#d97706', cancelled: '#dc2626', trial: '#2563eb',
  }[billing.subscriptionStatus] || '#6b7280'

  const statusLabel = {
    active: 'Active', cancelling: 'Cancelling', cancelled: 'Cancelled', trial: 'Trial',
  }[billing.subscriptionStatus] || billing.subscriptionStatus

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {checkoutPlan && (
        <MockCheckoutModal
          plan={checkoutPlan.plan}
          billing={billing}
          cycle={checkoutPlan.cycle}
          onConfirm={handleCheckoutConfirm}
          onClose={() => setCheckoutPlan(null)}
        />
      )}
      {showCancel && (
        <CancelModal plan={plan} onConfirm={handleCancelConfirm} onClose={() => setShowCancel(false)} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Billing & Subscription</h1>
      </div>

      {successMsg && (
        <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '12px 16px', marginBottom: 18, color: '#065f46', fontWeight: 600, fontSize: 13 }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Trial banner */}
      {isTrialMode && trialDaysLeft !== null && (
        <div style={{ background: 'linear-gradient(135deg, #eff6ff, #e0f2fe)', border: '1px solid #bfdbfe', borderRadius: 10, padding: '18px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1e40af', marginBottom: 4 }}>
              🎉 Free Trial — {trialDaysLeft} days remaining
            </div>
            <div style={{ fontSize: 13, color: '#3b82f6' }}>
              Trial ends: {fmtDate(billing.trialEndsAt)} · All features unlocked during trial
            </div>
          </div>
          <button onClick={() => setBillingCycle('yearly')}
            style={{ padding: '9px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
            Choose a Plan — Lock In Your Price →
          </button>
        </div>
      )}

      {/* Current plan status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Current Plan</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1d23' }}>{PLAN_NAMES[plan] || plan}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
                <span style={{ fontSize: 13, color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2 }}>
                {billing.cancelAtPeriodEnd ? 'Access until' : 'Next billing'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1d23' }}>{fmtDate(billing.currentPeriodEnd)}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{relativeDate(billing.currentPeriodEnd)}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 8 }}>
            <UsageBar label="Users" current={usage.users} limit={limits.users} />
            <UsageBar label="Clients" current={usage.clients} limit={limits.clients} />
            <UsageBar label="Jobs this month" current={usage.jobsPerMonth} limit={limits.jobsPerMonth} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              onClick={() => {
                setSuccessMsg('Opening billing portal… (Stripe portal would open here in production)')
                setTimeout(() => setSuccessMsg(''), 3000)
              }}
              style={{ padding: '8px 18px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              Manage Billing
            </button>
            <button
              onClick={() => document.getElementById('plan-comparison')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
              Upgrade Plan →
            </button>
          </div>
        </div>

        {/* Payment method */}
        <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '20px 22px' }}>
          <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>Payment Method</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid #e8e9ec', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ background: '#1a1a2e', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 4, minWidth: 36, textAlign: 'center' }}>
              {billing.cardBrand?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1d23' }}>•••• •••• •••• {billing.cardLast4}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Expires {billing.cardExpMonth}/{billing.cardExpYear}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
            Billing email: <strong style={{ color: '#374151' }}>{billing.billingEmail}</strong>
          </div>
          <button
            onClick={() => setSuccessMsg('Stripe portal opened (demo mode — would redirect to Stripe)')}
            style={{ width: '100%', padding: '8px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600, color: '#374151' }}>
            Update Payment Method
          </button>
          {!billing.cancelAtPeriodEnd && billing.subscriptionStatus === 'active' && (
            <button onClick={() => setShowCancel(true)}
              style={{ width: '100%', marginTop: 8, padding: '7px', background: 'none', border: 'none', fontSize: 11, cursor: 'pointer', color: '#dc2626', fontWeight: 500 }}>
              Cancel Subscription
            </button>
          )}
          {billing.cancelAtPeriodEnd && (
            <div style={{ marginTop: 10, padding: '8px 10px', background: '#fef2f2', borderRadius: 5, fontSize: 12, color: '#dc2626' }}>
              ⚠ Cancels on {fmtDate(billing.currentPeriodEnd)}
            </div>
          )}
        </div>
      </div>

      {/* Plan comparison */}
      <div id="plan-comparison" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Plans</h2>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Choose the plan that fits your team</div>
          </div>
          {/* Monthly/Yearly toggle */}
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 3, gap: 2 }}>
            {['monthly', 'yearly'].map(c => (
              <button key={c} onClick={() => setBillingCycle(c)}
                style={{
                  padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: billingCycle === c ? '#fff' : 'transparent',
                  color: billingCycle === c ? '#1a1d23' : '#6b7280',
                  boxShadow: billingCycle === c ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                }}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
                {c === 'yearly' && <span style={{ marginLeft: 5, background: '#dcfce7', color: '#059669', fontSize: 10, fontWeight: 800, padding: '1px 5px', borderRadius: 4 }}>−20%</span>}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          {PLANS.map(p => (
            <PlanCard
              key={p.slug}
              plan={p}
              currentPlan={plan}
              billingCycle={billingCycle}
              onSelect={handleSelectPlan}
            />
          ))}
        </div>
      </div>

      {/* Billing history */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '20px 22px', marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 16px' }}>Billing History</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e8e9ec' }}>
              {['Date', 'Description', 'Amount', 'Status', 'Invoice'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((inv, i) => (
              <tr key={inv.id} style={{ borderBottom: '1px solid #f0f1f3' }}>
                <td style={{ padding: '10px 12px', color: '#374151' }}>{fmtDate(inv.date)}</td>
                <td style={{ padding: '10px 12px', color: '#374151' }}>{inv.description}</td>
                <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1a1d23' }}>${(inv.amount / 100).toFixed(2)}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #6ee7b7', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 3 }}>
                    {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <button style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    ↓ PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
