import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

function Navbar({ navigate }) {
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 40px', background: '#fff', borderBottom: '1px solid #e5e7eb',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 22 }}>🏠</span>
        <span style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>FieldFlow</span>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <Link to="/pricing" style={{ color: '#374151', textDecoration: 'none', fontSize: 15 }}>Pricing</Link>
        <Link to="/demo" style={{ color: '#2563eb', textDecoration: 'none', fontSize: 15, fontWeight: 600 }}>Demo</Link>
        <Link to="/contact" style={{ color: '#374151', textDecoration: 'none', fontSize: 15 }}>Contact</Link>
        <Link to="/login" style={{ color: '#374151', textDecoration: 'none', fontSize: 15 }}>Login</Link>
        <button
          onClick={() => navigate('/register')}
          style={{
            background: '#16a34a', color: '#fff', border: 'none',
            borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Start Free Trial
        </button>
      </div>
    </nav>
  )
}

function Footer() {
  return (
    <footer style={{ background: '#111827', color: '#9ca3af', padding: '40px', textAlign: 'center' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
        <Link to="/" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>Home</Link>
        <Link to="/pricing" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>Pricing</Link>
        <Link to="/contact" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>Contact</Link>
      </div>
      <div style={{ fontSize: 13 }}>&copy; {new Date().getFullYear()} FieldFlow CRM. All rights reserved.</div>
    </footer>
  )
}

const DEMO_FAQS = [
  { q: 'Is this a real account?', a: 'No. The demo environment uses pre-loaded sample data for a fictional HVAC company. None of the data is real.' },
  { q: 'Can I use it freely?', a: 'Yes, you can explore all features for up to 30 minutes. The demo resets automatically every 24 hours.' },
  { q: 'Will my changes be saved?', a: 'Demo changes are saved in your browser\'s localStorage but will be cleared on the next demo reset.' },
  { q: 'What are the demo login credentials?', a: 'Email: admin@fieldflow.com — Password: admin123. There\'s also a technician account: moore@fieldflow.com / staff123' },
]

export default function DemoPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)

  function handleTryDemo() {
    setLoading(true)
    const err = login('admin@fieldflow.com', 'admin123')
    if (!err) {
      navigate('/dashboard')
    } else {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#fff' }}>
      <Navbar navigate={navigate} />

      {/* Hero */}
      <section style={{ padding: '80px 40px 60px', textAlign: 'center', background: 'linear-gradient(to bottom, #f9fafb, #fff)' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <span style={{
            display: 'inline-block', background: '#dcfce7', color: '#16a34a',
            borderRadius: 99, padding: '5px 16px', fontSize: 13, fontWeight: 600, marginBottom: 20,
          }}>
            Live Demo — No signup required
          </span>
          <h1 style={{ fontSize: 48, fontWeight: 800, color: '#111827', lineHeight: 1.15, margin: '0 0 16px' }}>
            See FieldFlow in Action
          </h1>
          <p style={{ fontSize: 18, color: '#6b7280', margin: '0 0 40px', lineHeight: 1.6 }}>
            Explore the full FieldFlow CRM with sample data. Schedule jobs, send invoices, optimize routes, and more — all without creating an account.
          </p>
          <button
            onClick={handleTryDemo}
            disabled={loading}
            style={{
              background: loading ? '#9ca3af' : '#16a34a',
              color: '#fff', border: 'none', borderRadius: 12,
              padding: '18px 44px', fontSize: 20, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 24px rgba(22,163,74,0.3)',
            }}
          >
            {loading ? 'Launching...' : '🚀 Try Live Demo'}
          </button>
          <p style={{ marginTop: 12, fontSize: 13, color: '#9ca3af' }}>
            Logs in as Admin · Full access · No account needed
          </p>
        </div>
      </section>

      {/* Features list */}
      <section style={{ padding: '60px 40px', background: '#f9fafb' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 32 }}>
            What's included in the demo
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
            {[
              { icon: '✅', text: 'Full access to all features' },
              { icon: '📊', text: 'Sample data pre-loaded' },
              { icon: '🔑', text: 'No signup required' },
              { icon: '🔄', text: 'Resets every 24 hours' },
            ].map(item => (
              <div key={item.text} style={{
                background: '#fff', borderRadius: 10, padding: 20,
                border: '1px solid #e5e7eb', textAlign: 'center',
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
                <p style={{ margin: 0, fontSize: 14, color: '#374151', fontWeight: 500 }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section style={{ padding: '60px 40px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 32 }}>
            Explore every feature
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {[
              { label: 'Dashboard', color: '#eff6ff', border: '#bfdbfe', icon: '📊', desc: 'Revenue, jobs, and KPIs at a glance' },
              { label: 'Scheduler', color: '#fdf4ff', border: '#e9d5ff', icon: '📅', desc: 'Visual calendar with drag-and-drop jobs' },
              { label: 'Invoices', color: '#f0fdf4', border: '#86efac', icon: '💰', desc: 'Professional invoices sent in seconds' },
            ].map(s => (
              <div key={s.label} style={{
                background: s.color, border: `1.5px solid ${s.border}`,
                borderRadius: 12, padding: 40, textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              }}>
                <div style={{ fontSize: 40 }}>{s.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>{s.label}</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '60px 40px', background: '#f9fafb' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 32 }}>
            Demo FAQ
          </h2>
          {DEMO_FAQS.map((faq, i) => (
            <div key={i} style={{
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
              marginBottom: 10, overflow: 'hidden',
            }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: '100%', textAlign: 'left', padding: '14px 18px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: 14, fontWeight: 600, color: '#111827',
                }}
              >
                {faq.q}
                <span style={{ color: '#6b7280', fontSize: 18, transform: openFaq === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 18px 14px', fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: '60px 40px', textAlign: 'center', background: '#111827' }}>
        <h2 style={{ fontSize: 30, fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>
          Ready to start your own account?
        </h2>
        <p style={{ color: '#9ca3af', fontSize: 16, margin: '0 0 28px' }}>
          Get your own FieldFlow account with 14 days free. No credit card required.
        </p>
        <button
          onClick={() => navigate('/register')}
          style={{
            background: '#16a34a', color: '#fff', border: 'none',
            borderRadius: 10, padding: '14px 32px', fontSize: 17,
            fontWeight: 700, cursor: 'pointer',
          }}
        >
          Start Free Trial →
        </button>
      </section>

      <Footer />
    </div>
  )
}
