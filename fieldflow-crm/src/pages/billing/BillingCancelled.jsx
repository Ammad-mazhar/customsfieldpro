import { useNavigate } from 'react-router-dom'

export default function BillingCancelled() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 440, padding: '0 20px' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>👋</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1d23', marginBottom: 10 }}>
          No problem — you can upgrade anytime
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, marginBottom: 28 }}>
          Your checkout was cancelled. You haven't been charged. Return to billing to explore plans or start a subscription.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => navigate('/billing')}
            style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 700 }}>
            Back to Billing
          </button>
          <button onClick={() => navigate('/dashboard')}
            style={{ padding: '10px 20px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
            Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
