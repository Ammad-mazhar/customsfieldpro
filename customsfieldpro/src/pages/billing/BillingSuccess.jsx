import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getBilling } from '../../data/store'
import { PLAN_NAMES } from '../../utils/planLimits'

function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      color: ['#2563eb', '#059669', '#7c3aed', '#f59e0b', '#ec4899'][Math.floor(Math.random() * 5)],
      size: 6 + Math.random() * 8,
    }))
  )

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999, overflow: 'hidden' }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.left}%`,
          top: -20,
          width: p.size,
          height: p.size,
          background: p.color,
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
      <style>{`
        @keyframes confettiFall {
          to { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export default function BillingSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const billing = getBilling()
  const planName = PLAN_NAMES[billing.plan] || billing.plan
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 4000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {showConfetti && <Confetti />}
      <div style={{ textAlign: 'center', maxWidth: 480, padding: '0 20px' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1a1d23', marginBottom: 8 }}>
          Welcome to CustomsFieldPro {planName}!
        </h1>
        <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.6, marginBottom: 24 }}>
          Your subscription is now active. All {planName} features are unlocked and ready to use.
        </p>

        <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '16px 20px', marginBottom: 28, textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46', marginBottom: 8 }}>Plan Details</div>
          {[
            ['Plan', planName],
            ['Billing', billing.billingCycle === 'yearly' ? 'Annual' : 'Monthly'],
            ['Status', 'Active'],
            ['Next Billing', billing.currentPeriodEnd ? new Date(billing.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
              <span style={{ color: '#374151' }}>{k}</span>
              <span style={{ fontWeight: 700, color: '#1a1d23' }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => navigate('/dashboard')}
            style={{ padding: '10px 28px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 700 }}>
            Go to Dashboard
          </button>
          <button onClick={() => navigate('/billing')}
            style={{ padding: '10px 20px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
            View Billing
          </button>
        </div>
      </div>
    </div>
  )
}
