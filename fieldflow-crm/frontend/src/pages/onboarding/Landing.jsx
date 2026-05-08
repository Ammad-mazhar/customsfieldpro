import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

// ── Data ──────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    color: '#2563eb', bg: '#eff6ff',
    title: 'Jobs & Scheduling',
    desc: 'Drag-and-drop scheduler, recurring jobs, GPS clock-in/out. Your team always knows where to be and what to do.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
    color: '#16a34a', bg: '#f0fdf4',
    title: 'Invoicing & Quotes',
    desc: 'Professional invoices and quotes in seconds. Send by email, accept Stripe payments, track what\'s outstanding.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    color: '#7c3aed', bg: '#faf5ff',
    title: 'Client Management',
    desc: 'Full client history, service records, notes, and a self-service portal so clients can track their own jobs.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    color: '#d97706', bg: '#fffbeb',
    title: 'Time Tracking',
    desc: 'GPS-verified clock-in/out at job sites. See who\'s on-site, hours worked, and labor costs — in real time.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    color: '#0891b2', bg: '#ecfeff',
    title: 'Reports & Analytics',
    desc: 'Revenue trends, technician performance, invoice aging, and job completion rates — all in one dashboard.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
      </svg>
    ),
    color: '#db2777', bg: '#fdf2f8',
    title: 'Mobile App (PWA)',
    desc: 'Install on any phone — iOS or Android — no app store needed. Works offline in the field, syncs when connected.',
  },
]

const PLANS = [
  {
    id: 'trial', name: 'Trial', monthlyPrice: 0, yearlyPrice: 0, badge: null, color: '#6b7280',
    features: ['All features — 5 months free', 'Up to 5 users', '50 clients', 'Email support'],
    cta: 'Start Free Trial',
  },
  {
    id: 'starter', name: 'Starter', monthlyPrice: 49, yearlyPrice: 39, badge: null, color: '#2563eb',
    features: ['All core features', '3 users', '100 clients', 'Invoicing & Quotes', 'Email support'],
    cta: 'Get Started',
  },
  {
    id: 'professional', name: 'Professional', monthlyPrice: 99, yearlyPrice: 79, badge: 'Most Popular', color: '#7c3aed',
    features: ['Everything in Starter', '10 users', '500 clients', 'AI Estimator', 'Priority support', 'Advanced analytics'],
    cta: 'Get Started',
  },
  {
    id: 'business', name: 'Business', monthlyPrice: 199, yearlyPrice: 159, badge: null, color: '#0891b2',
    features: ['Everything in Pro', '25 users', '2,000 clients', 'Custom branding', 'Phone support', 'API access'],
    cta: 'Get Started',
  },
]

const INDUSTRIES = ['HVAC', 'Plumbing', 'Electrical', 'Appliance Repair']

// ── Sub-components ────────────────────────────────────────────────────────────
function Logo({ light = false }) {
  return (
    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: light ? 'rgba(255,255,255,0.2)' : '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span style={{ fontSize: 18, fontWeight: 800, color: light ? '#fff' : '#1a1d23', letterSpacing: '-0.4px' }}>FieldFlow</span>
    </Link>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate()
  const [yearly, setYearly] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', color: '#1a1d23', overflowX: 'hidden' }}>

      {/* ── NAV ───────────────────────────────────────────────────────────── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #f0f1f3' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a href="#features" style={NAV_LINK}>Features</a>
            <a href="#pricing"  style={NAV_LINK}>Pricing</a>
            <Link to="/login" style={{ ...NAV_LINK, marginLeft: 8 }}>Login</Link>
            <Link to="/register" style={{ height: 38, padding: '0 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', textDecoration: 'none', marginLeft: 4 }}>
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(160deg,#1e3a8a 0%,#2563eb 45%,#1d4ed8 100%)', padding: '80px 24px 100px', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          {/* Industry badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
            {INDUSTRIES.map(ind => (
              <span key={ind} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12.5, fontWeight: 600, padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}>
                {ind}
              </span>
            ))}
          </div>

          <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, color: '#fff', margin: '0 0 20px', lineHeight: 1.15, letterSpacing: '-1.5px' }}>
            Run Your Field Service<br />Business Like a Pro
          </h1>
          <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(255,255,255,0.8)', margin: '0 0 40px', lineHeight: 1.6, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
            Jobs, scheduling, invoicing, team management, and GPS tracking — all in one app built for HVAC, plumbing, electrical, and appliance repair businesses.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={{ height: 52, padding: '0 32px', background: '#fff', color: '#2563eb', border: 'none', borderRadius: 12, fontSize: 15.5, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', letterSpacing: '-0.2px' }}>
              Start Free Trial
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
            <Link to="/login" style={{ height: 52, padding: '0 32px', background: 'rgba(255,255,255,0.12)', color: '#fff', border: '2px solid rgba(255,255,255,0.3)', borderRadius: 12, fontSize: 15.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', backdropFilter: 'blur(4px)' }}>
              See Demo →
            </Link>
          </div>
          <p style={{ marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>No credit card required · 5-month free trial · Cancel anytime</p>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ────────────────────────────────────────────── */}
      <section style={{ background: '#f8faff', borderBottom: '1px solid #e8e9ec', padding: '20px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
          {[
            ['500+', 'Field service businesses'],
            ['98%', 'Customer satisfaction'],
            ['$2M+', 'Invoices processed monthly'],
            ['50k+', 'Jobs completed'],
          ].map(([num, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb', letterSpacing: '-0.5px' }}>{num}</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={{ display: 'inline-block', background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>Features</span>
            <h2 style={{ fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 800, color: '#1a1d23', margin: '0 0 14px', letterSpacing: '-0.8px' }}>
              Everything your field service team needs
            </h2>
            <p style={{ fontSize: 16, color: '#6b7280', maxWidth: 520, margin: '0 auto', lineHeight: 1.65 }}>
              Purpose-built for HVAC, plumbing, electrical, and appliance repair — not generic CRM bloatware.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #f0f1f3', borderRadius: 14, padding: '24px 26px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.10)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: f.bg, color: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1d23', margin: '0 0 8px' }}>{f.title}</h3>
                <p style={{ fontSize: 13.5, color: '#6b7280', margin: 0, lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(135deg,#f8faff,#eff6ff)', padding: '72px 24px', borderTop: '1px solid #e8e9ec', borderBottom: '1px solid #e8e9ec' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, color: '#1a1d23', margin: '0 0 48px', letterSpacing: '-0.6px' }}>
            Up and running in minutes
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32 }}>
            {[
              { step: '01', title: 'Sign Up', desc: 'Create your account — no credit card needed.' },
              { step: '02', title: 'Add Your Team', desc: 'Invite technicians and set their permissions.' },
              { step: '03', title: 'Import Clients', desc: 'Add clients or import from a spreadsheet.' },
              { step: '04', title: 'Start Working', desc: 'Create jobs, schedule, invoice, and grow.' },
            ].map((s, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#bfdbfe', letterSpacing: '1px', marginBottom: 10 }}>{s.step}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1e3a8a', marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13.5, color: '#4b5563', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ display: 'inline-block', background: '#faf5ff', color: '#7c3aed', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>Pricing</span>
            <h2 style={{ fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 800, color: '#1a1d23', margin: '0 0 14px', letterSpacing: '-0.8px' }}>
              Simple, transparent pricing
            </h2>
            <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 28 }}>Start free for 5 months. No credit card required.</p>

            {/* Monthly / Yearly toggle */}
            <div style={{ display: 'inline-flex', background: '#f3f4f6', borderRadius: 10, padding: 3, gap: 2 }}>
              <button onClick={() => setYearly(false)}
                style={{ height: 36, padding: '0 20px', background: !yearly ? '#fff' : 'transparent', color: !yearly ? '#1a1d23' : '#6b7280', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', boxShadow: !yearly ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                Monthly
              </button>
              <button onClick={() => setYearly(true)}
                style={{ height: 36, padding: '0 20px', background: yearly ? '#fff' : 'transparent', color: yearly ? '#1a1d23' : '#6b7280', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', boxShadow: yearly ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
                Yearly
                <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>Save 20%</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {PLANS.map(plan => {
              const price = yearly ? plan.yearlyPrice : plan.monthlyPrice
              const isPopular = plan.badge === 'Most Popular'
              return (
                <div key={plan.id} style={{
                  background: isPopular ? `linear-gradient(160deg,${plan.color},#5b21b6)` : '#fff',
                  border: isPopular ? 'none' : '1px solid #e8e9ec',
                  borderRadius: 16, padding: '28px 26px',
                  boxShadow: isPopular ? '0 16px 48px rgba(124,58,237,0.25)' : '0 2px 12px rgba(0,0,0,0.05)',
                  position: 'relative', transform: isPopular ? 'scale(1.03)' : 'none',
                }}>
                  {plan.badge && (
                    <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#fff', color: plan.color, fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 20, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                      {plan.badge}
                    </span>
                  )}
                  <div style={{ fontSize: 16, fontWeight: 700, color: isPopular ? '#fff' : '#1a1d23', marginBottom: 4 }}>{plan.name}</div>
                  <div style={{ marginBottom: 20 }}>
                    <span style={{ fontSize: 36, fontWeight: 900, color: isPopular ? '#fff' : '#1a1d23', letterSpacing: '-1px' }}>
                      {price === 0 ? 'Free' : `$${price}`}
                    </span>
                    {price > 0 && <span style={{ fontSize: 13, color: isPopular ? 'rgba(255,255,255,0.7)' : '#9ca3af', marginLeft: 3 }}>/month</span>}
                    {yearly && price > 0 && <div style={{ fontSize: 11.5, color: isPopular ? 'rgba(255,255,255,0.6)' : '#9ca3af', marginTop: 2 }}>billed annually</div>}
                  </div>
                  <ul style={{ margin: '0 0 24px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {plan.features.map((f, i) => (
                      <li key={i} style={{ fontSize: 13.5, color: isPopular ? 'rgba(255,255,255,0.88)' : '#374151', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={isPopular ? 'rgba(255,255,255,0.7)' : plan.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12"/></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/register"
                    style={{ display: 'block', textAlign: 'center', height: 44, lineHeight: '44px', background: isPopular ? 'rgba(255,255,255,0.2)' : plan.color, color: '#fff', border: isPopular ? '2px solid rgba(255,255,255,0.4)' : 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none', transition: 'opacity 0.15s' }}
                    onMouseEnter={e => e.target.style.opacity = '0.85'}
                    onMouseLeave={e => e.target.style.opacity = '1'}>
                    {plan.cta}
                  </Link>
                </div>
              )
            })}
          </div>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', marginTop: 32 }}>
            All plans include SSL encryption, daily backups, and 99.9% uptime SLA.
            <br />Need a custom plan? <a href="mailto:sales@fieldflow.app" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Contact sales</a>
          </p>
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, color: '#fff', margin: '0 0 14px', letterSpacing: '-0.6px' }}>
            Ready to grow your business?
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', margin: '0 0 32px', lineHeight: 1.6 }}>
            Join hundreds of field service businesses that trust FieldFlow to manage their operations.
          </p>
          <Link to="/register"
            style={{ height: 52, padding: '0 36px', background: '#fff', color: '#2563eb', border: 'none', borderRadius: 12, fontSize: 15.5, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', letterSpacing: '-0.2px' }}>
            Start Your Free Trial
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
          <p style={{ marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>5-month free trial · No credit card · Cancel anytime</p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#111827', padding: '48px 24px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 32, marginBottom: 40 }}>
            <div>
              <Logo light />
              <p style={{ fontSize: 13.5, color: '#9ca3af', marginTop: 14, lineHeight: 1.7, maxWidth: 260 }}>
                The all-in-one field service management platform for HVAC, plumbing, electrical, and appliance repair businesses.
              </p>
            </div>
            {[
              { title: 'Product', links: [['Features', '#features'], ['Pricing', '#pricing'], ['Mobile App', '#'], ['Integrations', '#']] },
              { title: 'Company', links: [['About', '#'], ['Blog', '#'], ['Careers', '#'], ['Contact', '#']] },
              { title: 'Account', links: [['Register', '/register'], ['Login', '/login'], ['Demo', '/login'], ['Support', '#']] },
            ].map(col => (
              <div key={col.title}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.7px', margin: '0 0 14px' }}>{col.title}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {col.links.map(([label, href]) => (
                    href.startsWith('/') ? (
                      <Link key={label} to={href} style={{ fontSize: 13.5, color: '#9ca3af', textDecoration: 'none' }}
                        onMouseEnter={e => e.target.style.color = '#e5e7eb'}
                        onMouseLeave={e => e.target.style.color = '#9ca3af'}>{label}</Link>
                    ) : (
                      <a key={label} href={href} style={{ fontSize: 13.5, color: '#9ca3af', textDecoration: 'none' }}
                        onMouseEnter={e => e.target.style.color = '#e5e7eb'}
                        onMouseLeave={e => e.target.style.color = '#9ca3af'}>{label}</a>
                    )
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #1f2937', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 13, color: '#4b5563', margin: 0 }}>© {new Date().getFullYear()} FieldFlow CRM. All rights reserved.</p>
            <div style={{ display: 'flex', gap: 20 }}>
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(l => (
                <a key={l} href="#" style={{ fontSize: 13, color: '#4b5563', textDecoration: 'none' }}>{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

const NAV_LINK = {
  fontSize: 13.5, fontWeight: 500, color: '#374151', textDecoration: 'none',
  padding: '6px 12px', borderRadius: 7,
}
