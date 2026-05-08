import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const PLANS = [
  {
    id: 'starter', name: 'Starter', monthly: 49, yearly: 39, color: '#6b7280',
    desc: 'Perfect for solo operators or very small teams.',
    features: ['3 users', '100 clients', '100 jobs/month', '5 GB storage'],
  },
  {
    id: 'professional', name: 'Professional', monthly: 99, yearly: 79, color: '#2563eb', popular: true,
    desc: 'The most popular choice for growing businesses.',
    features: ['10 users', '500 clients', '500 jobs/month', '20 GB storage', 'Route Optimization', 'AI Estimator', 'Advanced Reports'],
  },
  {
    id: 'business', name: 'Business', monthly: 199, yearly: 159, color: '#7c3aed',
    desc: 'For established companies managing multiple branches.',
    features: ['25 users', '2,000 clients', 'Unlimited jobs', '50 GB storage', 'AI Receptionist', 'Multi-branch', 'Custom Branding'],
  },
  {
    id: 'enterprise', name: 'Enterprise', monthly: 399, yearly: 319, color: '#111827',
    desc: 'Custom solutions for large-scale operations.',
    features: ['Unlimited users', 'Unlimited clients', 'Unlimited jobs', 'Unlimited storage', 'API Access', 'Dedicated support'],
  },
]

const FEATURES_TABLE = [
  { category: 'Core', rows: [
    { label: 'Service Calls', values: [true, true, true, true] },
    { label: 'Jobs & Scheduling', values: [true, true, true, true] },
    { label: 'Invoicing', values: [true, true, true, true] },
    { label: 'Quotes / Estimates', values: [true, true, true, true] },
    { label: 'Client Portal', values: [true, true, true, true] },
    { label: 'Inventory Management', values: [true, true, true, true] },
    { label: 'Purchase Orders', values: [true, true, true, true] },
    { label: 'Leads & CRM', values: [true, true, true, true] },
    { label: 'Equipment History', values: [true, true, true, true] },
    { label: 'Warranty Module', values: [true, true, true, true] },
  ]},
  { category: 'Advanced', rows: [
    { label: 'Route Optimization', values: [false, true, true, true] },
    { label: 'AI Estimator', values: [false, true, true, true] },
    { label: 'Advanced Reports', values: [false, true, true, true] },
    { label: 'AI Receptionist', values: [false, false, true, true] },
    { label: 'Multi-branch Support', values: [false, false, true, true] },
    { label: 'Custom Branding', values: [false, false, true, true] },
    { label: 'API Access', values: [false, false, false, true] },
    { label: 'Dedicated Support', values: [false, false, false, true] },
  ]},
  { category: 'Limits', rows: [
    { label: 'Users', values: ['3', '10', '25', 'Unlimited'] },
    { label: 'Clients', values: ['100', '500', '2,000', 'Unlimited'] },
    { label: 'Storage', values: ['5 GB', '20 GB', '50 GB', 'Unlimited'] },
  ]},
]

const FAQS = [
  { q: 'Is there a free trial?', a: 'Yes! Every plan comes with a 14-day free trial. No credit card required to start.' },
  { q: 'Can I change plans later?', a: 'Absolutely. You can upgrade or downgrade at any time. Changes take effect immediately and we prorate the billing.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit cards (Visa, Mastercard, Amex) and ACH bank transfers for annual plans.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel anytime from your billing settings. Your account stays active until the end of the billing period.' },
  { q: 'Do you offer discounts for nonprofits or schools?', a: 'Yes, we offer 25% off for verified nonprofits and educational institutions. Contact support to apply.' },
]

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
        <Link to="/pricing" style={{ color: '#2563eb', textDecoration: 'none', fontSize: 15, fontWeight: 600 }}>Pricing</Link>
        <Link to="/demo" style={{ color: '#374151', textDecoration: 'none', fontSize: 15 }}>Demo</Link>
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
        <Link to="/demo" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>Demo</Link>
        <Link to="/contact" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>Contact</Link>
        <a href="#" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>Privacy</a>
        <a href="#" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>Terms</a>
      </div>
      <div style={{ fontSize: 13 }}>&copy; {new Date().getFullYear()} FieldFlow CRM. All rights reserved.</div>
    </footer>
  )
}

function CheckMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill="#dcfce7"/>
      <path d="M5 9l3 3 5-5" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function XMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill="#f3f4f6"/>
      <path d="M6 6l6 6M12 6l-6 6" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export default function PricingPage() {
  const navigate = useNavigate()
  const [yearly, setYearly] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#fff' }}>
      <Navbar navigate={navigate} />

      {/* Header */}
      <section style={{ padding: '60px 40px 40px', textAlign: 'center', background: '#f9fafb' }}>
        <h1 style={{ fontSize: 44, fontWeight: 800, color: '#111827', margin: '0 0 12px' }}>
          Simple, Transparent Pricing
        </h1>
        <p style={{ fontSize: 18, color: '#6b7280', margin: '0 0 28px' }}>
          Start free. Scale as you grow. No hidden fees.
        </p>

        {/* Toggle */}
        <div style={{ display: 'inline-flex', background: '#e5e7eb', borderRadius: 99, padding: 4 }}>
          <button
            onClick={() => setYearly(false)}
            style={{
              padding: '9px 22px', borderRadius: 99, border: 'none',
              background: !yearly ? '#fff' : 'transparent',
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
              color: !yearly ? '#111827' : '#6b7280',
              boxShadow: !yearly ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >Monthly</button>
          <button
            onClick={() => setYearly(true)}
            style={{
              padding: '9px 22px', borderRadius: 99, border: 'none',
              background: yearly ? '#fff' : 'transparent',
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
              color: yearly ? '#111827' : '#6b7280',
              boxShadow: yearly ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Yearly <span style={{ color: '#16a34a', fontSize: 12, fontWeight: 700 }}>Save 20%</span>
          </button>
        </div>
      </section>

      {/* Plan cards */}
      <section style={{ padding: '48px 40px 60px', background: '#f9fafb' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 20 }}>
          {PLANS.map(p => (
            <div key={p.id} style={{
              background: p.popular ? '#2563eb' : '#fff',
              border: p.popular ? 'none' : '1.5px solid #e5e7eb',
              borderRadius: 14, padding: 28, position: 'relative',
              boxShadow: p.popular ? '0 12px 40px rgba(37,99,235,0.3)' : '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              {p.popular && (
                <div style={{
                  position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                  background: '#16a34a', color: '#fff', borderRadius: 99,
                  padding: '4px 14px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                }}>
                  Most Popular
                </div>
              )}
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: p.popular ? '#fff' : '#111827' }}>
                {p.name}
              </h3>
              <p style={{ fontSize: 13, color: p.popular ? '#bfdbfe' : '#6b7280', margin: '0 0 16px' }}>{p.desc}</p>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 40, fontWeight: 800, color: p.popular ? '#fff' : '#111827' }}>
                  ${yearly ? p.yearly : p.monthly}
                </span>
                <span style={{ fontSize: 14, color: p.popular ? '#bfdbfe' : '#9ca3af' }}>/mo</span>
                {yearly && (
                  <div style={{ fontSize: 12, color: p.popular ? '#86efac' : '#16a34a', marginTop: 2 }}>
                    Billed ${(yearly ? p.yearly : p.monthly) * 12}/year
                  </div>
                )}
              </div>
              <ul style={{ margin: '0 0 20px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {p.features.map(f => (
                  <li key={f} style={{ fontSize: 13, color: p.popular ? '#eff6ff' : '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: p.popular ? '#86efac' : '#16a34a' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/register')}
                style={{
                  width: '100%', padding: '11px', borderRadius: 8, border: 'none',
                  background: p.popular ? '#fff' : '#2563eb',
                  color: p.popular ? '#2563eb' : '#fff',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}
              >
                Start Free Trial
              </button>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#9ca3af' }}>
          14-day free trial · No credit card required · Cancel anytime
        </p>
      </section>

      {/* Feature Comparison Table */}
      <section style={{ padding: '60px 40px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, color: '#111827', marginBottom: 40 }}>
            Compare all features
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: 13, color: '#6b7280', fontWeight: 600, borderBottom: '2px solid #e5e7eb' }}>Feature</th>
                  {PLANS.map(p => (
                    <th key={p.id} style={{
                      textAlign: 'center', padding: '14px 16px', fontSize: 14, fontWeight: 700,
                      color: p.popular ? '#2563eb' : '#111827', borderBottom: '2px solid #e5e7eb',
                    }}>
                      {p.name}
                      {p.popular && <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>Popular</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES_TABLE.map(cat => (
                  <>
                    <tr key={cat.category}>
                      <td colSpan={5} style={{ padding: '16px 16px 8px', fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#fafafa' }}>
                        {cat.category}
                      </td>
                    </tr>
                    {cat.rows.map((row, i) => (
                      <tr key={row.label} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '12px 16px', fontSize: 14, color: '#374151', borderBottom: '1px solid #f3f4f6' }}>
                          {row.label}
                        </td>
                        {row.values.map((v, j) => (
                          <td key={j} style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
                            {typeof v === 'boolean' ? (v ? <CheckMark /> : <XMark />) : (
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{v}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '60px 40px', background: '#f9fafb' }} id="faq">
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, color: '#111827', marginBottom: 36 }}>
            Frequently Asked Questions
          </h2>
          {FAQS.map((faq, i) => (
            <div key={i} style={{
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
              marginBottom: 12, overflow: 'hidden',
            }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: '100%', textAlign: 'left', padding: '16px 20px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: 15, fontWeight: 600, color: '#111827',
                }}
              >
                {faq.q}
                <span style={{ fontSize: 20, color: '#6b7280', transform: openFaq === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 20px 16px', fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '60px 40px', textAlign: 'center', background: '#2563eb' }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>
          Ready to get started?
        </h2>
        <p style={{ color: '#bfdbfe', fontSize: 17, margin: '0 0 28px' }}>
          Try FieldFlow free for 14 days. No credit card needed.
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
