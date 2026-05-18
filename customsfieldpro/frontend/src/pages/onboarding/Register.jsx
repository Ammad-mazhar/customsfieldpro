import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ── Constants ─────────────────────────────────────────────────────────────────
const BIZ_TYPES = ['HVAC', 'Plumbing', 'Electrical', 'Appliance Repair', 'Multi-Service', 'Other']

const PLANS = [
  {
    id: 'trial',
    name: 'Trial',
    price: 0,
    period: '5 months free',
    badge: null,
    color: '#6b7280',
    features: ['All features included', 'Up to 5 users', '50 clients', 'Email support', 'No credit card needed'],
    cta: 'Start Free Trial',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    period: '/month',
    badge: null,
    color: '#2563eb',
    features: ['All core features', 'Up to 3 users', '100 clients', 'Email support', 'Invoicing & Quotes'],
    cta: 'Choose Starter',
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 99,
    period: '/month',
    badge: 'Most Popular',
    color: '#7c3aed',
    features: ['Everything in Starter', 'Up to 10 users', '500 clients', 'Priority support', 'AI Estimator', 'Advanced Reports'],
    cta: 'Choose Professional',
  },
  {
    id: 'business',
    name: 'Business',
    price: 199,
    period: '/month',
    badge: null,
    color: '#0891b2',
    features: ['Everything in Pro', 'Up to 25 users', '2,000 clients', 'Phone support', 'Custom branding', 'API access'],
    cta: 'Choose Business',
  },
]

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function passwordStrength(pwd) {
  if (!pwd) return 0
  let score = 0
  if (pwd.length >= 8)  score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  return Math.min(4, score)
}

const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLOR = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981']

// ── Logo ──────────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span style={{ fontSize: 18, fontWeight: 800, color: '#1a1d23', letterSpacing: '-0.4px' }}>CustomsFieldPro</span>
    </Link>
  )
}

// ── Step indicator ────────────────────────────────────────────────────────────
function Steps({ current }) {
  const steps = ['Business Info', 'Your Account', 'Choose Plan', 'Get Started']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 36 }}>
      {steps.map((label, i) => {
        const num   = i + 1
        const done  = num < current
        const active = num === current
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : undefined }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#2563eb' : active ? '#2563eb' : '#f3f4f6',
                color: done || active ? '#fff' : '#9ca3af',
                fontSize: done ? 13 : 13, fontWeight: 700,
                border: `2px solid ${done || active ? '#2563eb' : '#e8e9ec'}`,
                transition: 'all 0.2s',
              }}>
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                ) : num}
              </div>
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? '#2563eb' : done ? '#6b7280' : '#9ca3af', whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? '#2563eb' : '#e8e9ec', margin: '0 6px', marginBottom: 22, transition: 'background 0.2s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  // Step 1
  const [biz, setBiz] = useState({ name: '', type: 'HVAC', phone: '', address: '', city: '', zip: '' })
  // Step 2
  const [account, setAccount] = useState({ fullName: '', email: '', password: '', confirm: '' })
  // Step 3
  const [planId, setPlanId] = useState('trial')
  // Step 4 result
  const [result, setResult] = useState(null)

  // Field errors
  const [errs, setErrs] = useState({})

  const slug = toSlug(biz.name || '')
  const strength = passwordStrength(account.password)

  function validateStep1() {
    const e = {}
    if (!biz.name.trim()) e.name = 'Business name is required'
    setErrs(e)
    return Object.keys(e).length === 0
  }

  function validateStep2() {
    const e = {}
    if (!account.fullName.trim()) e.fullName = 'Full name is required'
    if (!account.email.trim())    e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(account.email)) e.email = 'Enter a valid email'
    if (!account.password)        e.password = 'Password is required'
    else if (account.password.length < 8) e.password = 'Must be at least 8 characters'
    if (account.password !== account.confirm) e.confirm = 'Passwords do not match'
    setErrs(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setApiError('')
    setStep(s => s + 1)
  }

  async function handleRegister() {
    setLoading(true)
    setApiError('')
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: biz.name,
          businessType: biz.type,
          phone: biz.phone,
          address: biz.address,
          city: biz.city,
          zip: biz.zip,
          fullName: account.fullName,
          email: account.email,
          password: account.password,
          plan: planId,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')

      // Compute trial end date
      const trialEnd = new Date()
      trialEnd.setMonth(trialEnd.getMonth() + 5)

      setResult({
        businessName: biz.name,
        email: account.email,
        plan: planId,
        trialEnd: trialEnd.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        token: data.access_token,
      })
      setStep(4)
    } catch (err) {
      // Demo fallback — show success even if API isn't running
      if (err.message.includes('fetch') || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        const trialEnd = new Date()
        trialEnd.setMonth(trialEnd.getMonth() + 5)
        setResult({
          businessName: biz.name,
          email: account.email,
          plan: planId,
          trialEnd: trialEnd.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          demoMode: true,
        })
        setStep(4)
      } else {
        setApiError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  function goToDashboard() {
    if (result?.demoMode) {
      navigate('/login')
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f8faff 0%,#eff6ff 100%)', padding: '24px 16px 48px' }}>
      {/* Nav */}
      <div style={{ maxWidth: 700, margin: '0 auto 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo />
          <span style={{ fontSize: 13.5, color: '#6b7280' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </span>
        </div>
      </div>

      {/* Card */}
      <div style={{ maxWidth: 700, margin: '0 auto', background: '#fff', borderRadius: 18, border: '1px solid #e8e9ec', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', padding: '40px 44px' }}>

        {step < 4 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1a1d23', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
                {step === 1 ? 'Set up your business' : step === 2 ? 'Create your account' : 'Choose a plan'}
              </h1>
              <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>
                {step === 1 ? 'Tell us about your field service business' : step === 2 ? 'You\'ll use this to log into CustomsFieldPro' : 'Start free — upgrade anytime'}
              </p>
            </div>
            <Steps current={step} />
          </>
        )}

        {apiError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '10px 14px', fontSize: 13.5, marginBottom: 20 }}>
            {apiError}
          </div>
        )}

        {/* ── Step 1: Business Info ──────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={LB}>Business Name <Req /></label>
                <input value={biz.name} onChange={e => { setBiz(p => ({ ...p, name: e.target.value })); setErrs(p => ({ ...p, name: undefined })) }}
                  placeholder="Apex HVAC & Plumbing" style={{ ...INP, borderColor: errs.name ? '#fca5a5' : '#e8e9ec' }} />
                {errs.name && <p style={ET}>{errs.name}</p>}
                {biz.name && <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '4px 0 0' }}>Your URL: customsfieldpro.app/<strong>{slug}</strong></p>}
              </div>
              <div>
                <label style={LB}>Business Type</label>
                <select value={biz.type} onChange={e => setBiz(p => ({ ...p, type: e.target.value }))} style={SEL}>
                  {BIZ_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={LB}>Phone Number</label>
                <input value={biz.phone} onChange={e => setBiz(p => ({ ...p, phone: e.target.value }))}
                  placeholder="(555) 000-0000" style={INP} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={LB}>Business Address</label>
                <input value={biz.address} onChange={e => setBiz(p => ({ ...p, address: e.target.value }))}
                  placeholder="123 Main St" style={INP} />
              </div>
              <div>
                <label style={LB}>City</label>
                <input value={biz.city} onChange={e => setBiz(p => ({ ...p, city: e.target.value }))}
                  placeholder="Springfield" style={INP} />
              </div>
              <div>
                <label style={LB}>ZIP Code</label>
                <input value={biz.zip} onChange={e => setBiz(p => ({ ...p, zip: e.target.value }))}
                  placeholder="62701" style={INP} />
              </div>
            </div>
            <div style={FOOTER}>
              <div />
              <button onClick={next} style={BTN_PRIMARY}>Continue →</button>
            </div>
          </div>
        )}

        {/* ── Step 2: Admin Account ──────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={LB}>Full Name <Req /></label>
                <input value={account.fullName} onChange={e => { setAccount(p => ({ ...p, fullName: e.target.value })); setErrs(p => ({ ...p, fullName: undefined })) }}
                  placeholder="Alex Johnson" style={{ ...INP, borderColor: errs.fullName ? '#fca5a5' : '#e8e9ec' }} />
                {errs.fullName && <p style={ET}>{errs.fullName}</p>}
              </div>
              <div>
                <label style={LB}>Work Email <Req /></label>
                <input type="email" value={account.email} onChange={e => { setAccount(p => ({ ...p, email: e.target.value })); setErrs(p => ({ ...p, email: undefined })) }}
                  placeholder="alex@mycompany.com" style={{ ...INP, borderColor: errs.email ? '#fca5a5' : '#e8e9ec' }} />
                {errs.email && <p style={ET}>{errs.email}</p>}
              </div>
              <div>
                <label style={LB}>Password <Req /></label>
                <input type="password" value={account.password} onChange={e => { setAccount(p => ({ ...p, password: e.target.value })); setErrs(p => ({ ...p, password: undefined })) }}
                  placeholder="Min 8 characters" style={{ ...INP, borderColor: errs.password ? '#fca5a5' : '#e8e9ec' }} />
                {/* Strength meter */}
                {account.password && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
                      {[1, 2, 3, 4].map(n => (
                        <div key={n} style={{ flex: 1, height: 3, borderRadius: 3, background: n <= strength ? STRENGTH_COLOR[strength] : '#e8e9ec', transition: 'background 0.2s' }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: STRENGTH_COLOR[strength], fontWeight: 600 }}>{STRENGTH_LABEL[strength]}</span>
                  </div>
                )}
                {errs.password && <p style={ET}>{errs.password}</p>}
              </div>
              <div>
                <label style={LB}>Confirm Password <Req /></label>
                <input type="password" value={account.confirm} onChange={e => { setAccount(p => ({ ...p, confirm: e.target.value })); setErrs(p => ({ ...p, confirm: undefined })) }}
                  placeholder="••••••••" style={{ ...INP, borderColor: errs.confirm ? '#fca5a5' : '#e8e9ec' }} />
                {account.confirm && account.password === account.confirm && (
                  <p style={{ fontSize: 11.5, color: '#10b981', margin: '4px 0 0', fontWeight: 600 }}>✓ Passwords match</p>
                )}
                {errs.confirm && <p style={ET}>{errs.confirm}</p>}
              </div>
            </div>
            <div style={FOOTER}>
              <button onClick={() => setStep(1)} style={BTN_GHOST}>← Back</button>
              <button onClick={next} style={BTN_PRIMARY}>Continue →</button>
            </div>
          </div>
        )}

        {/* ── Step 3: Choose Plan ────────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 24 }}>
              {PLANS.map(plan => {
                const active = planId === plan.id
                return (
                  <div key={plan.id} onClick={() => setPlanId(plan.id)}
                    style={{ border: `2px solid ${active ? plan.color : '#e8e9ec'}`, borderRadius: 12, padding: '18px 20px', cursor: 'pointer', background: active ? plan.color + '08' : '#fff', transition: 'all 0.15s', position: 'relative' }}>
                    {plan.badge && (
                      <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                        {plan.badge}
                      </span>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23' }}>{plan.name}</span>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${active ? plan.color : '#e8e9ec'}`, background: active ? plan.color : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ fontSize: 26, fontWeight: 800, color: plan.price === 0 ? '#16a34a' : '#1a1d23' }}>
                        {plan.price === 0 ? 'Free' : `$${plan.price}`}
                      </span>
                      <span style={{ fontSize: 13, color: '#9ca3af', marginLeft: 3 }}>{plan.period}</span>
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {plan.features.map((f, i) => (
                        <li key={i} style={{ fontSize: 12.5, color: '#374151', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ color: plan.color, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
            {planId === 'trial' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', fontSize: 13.5, color: '#15803d', textAlign: 'center', marginBottom: 20, fontWeight: 500 }}>
                Start Free — No credit card needed. Full access for 5 months.
              </div>
            )}
            <div style={FOOTER}>
              <button onClick={() => setStep(2)} style={BTN_GHOST}>← Back</button>
              <button onClick={handleRegister} disabled={loading} style={{ ...BTN_PRIMARY, opacity: loading ? 0.7 : 1, minWidth: 160 }}>
                {loading ? 'Creating account…' : `Start with ${PLANS.find(p => p.id === planId)?.name} →`}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Success ────────────────────────────────────────────── */}
        {step === 4 && result && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 24px rgba(37,99,235,0.3)' }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1a1d23', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              Welcome to CustomsFieldPro, {result.businessName}!
            </h1>
            {result.plan === 'trial' ? (
              <>
                <p style={{ fontSize: 15, color: '#6b7280', margin: '0 0 6px' }}>Your <strong>5-month free trial</strong> has started.</p>
                <p style={{ fontSize: 13.5, color: '#9ca3af', margin: '0 0 28px' }}>
                  Trial ends: <strong style={{ color: '#374151' }}>{result.trialEnd}</strong>
                </p>
              </>
            ) : (
              <p style={{ fontSize: 15, color: '#6b7280', margin: '0 0 28px' }}>
                Your <strong>{PLANS.find(p => p.id === result.plan)?.name}</strong> account is ready.
              </p>
            )}

            {/* Feature highlights */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32, textAlign: 'left' }}>
              {[
                { icon: '🔧', label: 'Jobs & Scheduling', desc: 'Manage all your field jobs' },
                { icon: '📄', label: 'Invoicing', desc: 'Bill clients professionally' },
                { icon: '👥', label: 'Team Management', desc: 'Assign and track your techs' },
              ].map((f, i) => (
                <div key={i} style={{ background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a', marginBottom: 2 }}>{f.label}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{f.desc}</div>
                </div>
              ))}
            </div>

            <button onClick={goToDashboard}
              style={{ height: 48, padding: '0 40px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(37,99,235,0.35)', letterSpacing: '-0.2px' }}>
              Go to Dashboard →
            </button>
            {result.demoMode && (
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
                (Backend not connected — using demo login instead)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer note */}
      {step < 4 && (
        <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 24 }}>
          By registering you agree to our{' '}
          <a href="#" style={{ color: '#6b7280', textDecoration: 'underline' }}>Terms of Service</a>
          {' '}and{' '}
          <a href="#" style={{ color: '#6b7280', textDecoration: 'underline' }}>Privacy Policy</a>
        </p>
      )}
    </div>
  )
}

function Req() { return <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span> }

const LB = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 5 }
const ET = { fontSize: 11.5, color: '#ef4444', margin: '4px 0 0' }
const INP = { width: '100%', boxSizing: 'border-box', height: 42, border: '1px solid #e8e9ec', borderRadius: 8, padding: '0 13px', fontSize: 14, color: '#1a1d23', outline: 'none', background: '#fff' }
const SEL = { width: '100%', height: 42, border: '1px solid #e8e9ec', borderRadius: 8, padding: '0 13px', fontSize: 14, color: '#1a1d23', background: '#fff', cursor: 'pointer' }
const FOOTER = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid #f0f1f3' }
const BTN_PRIMARY = { height: 44, padding: '0 28px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14.5, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.1px' }
const BTN_GHOST = { height: 44, padding: '0 20px', background: '#f3f4f6', color: '#374151', border: '1px solid #e8e9ec', borderRadius: 9, fontSize: 14, fontWeight: 500, cursor: 'pointer' }
