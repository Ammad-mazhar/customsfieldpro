import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

const PLANS = [
  { id: 'starter', name: 'Starter', price: '$49/mo', desc: 'Solo operators & small teams', color: '#6b7280' },
  { id: 'professional', name: 'Professional', price: '$99/mo', desc: 'Growing field service businesses', color: '#2563eb', popular: true },
  { id: 'business', name: 'Business', price: '$199/mo', desc: 'Multi-branch operations', color: '#7c3aed' },
  { id: 'enterprise', name: 'Enterprise', price: '$399/mo', desc: 'Large-scale enterprise needs', color: '#111827' },
]

const BUSINESS_TYPES = ['HVAC', 'Plumbing', 'Electrical', 'Appliance Repair', 'Multi-service', 'Other']
const HEAR_OPTIONS = ['Google', 'Referral', 'Social Media', 'Event', 'Other']

function ProgressBar({ step }) {
  const steps = ['Choose Plan', 'Business Info', 'Create Account', 'Done']
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 40 }}>
      {steps.map((label, i) => {
        const num = i + 1
        const isActive = step === num
        const isComplete = step > num
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: isComplete ? '#16a34a' : isActive ? '#2563eb' : '#e5e7eb',
                color: isComplete || isActive ? '#fff' : '#9ca3af',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 15,
              }}>
                {isComplete ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l4 4 6-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : num}
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, color: isActive ? '#2563eb' : '#9ca3af', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                width: 60, height: 2, margin: '0 0 18px',
                background: isComplete ? '#16a34a' : '#e5e7eb',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function PasswordStrength({ password }) {
  const len = password.length
  const strength = len === 0 ? 0 : len < 8 ? 1 : len < 12 ? 2 : 3
  const colors = ['#e5e7eb', '#dc2626', '#f59e0b', '#16a34a']
  const labels = ['', 'Weak', 'Fair', 'Strong']
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            height: 4, flex: 1, borderRadius: 99,
            background: strength >= i ? colors[strength] : '#e5e7eb',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
      {password.length > 0 && (
        <p style={{ margin: 0, fontSize: 11, color: colors[strength], fontWeight: 600 }}>
          {labels[strength]}
        </p>
      )}
    </div>
  )
}

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    plan: '', businessName: '', businessType: '', phone: '', address: '',
    website: '', hearFrom: '', fullName: '', email: '', password: '',
    confirmPassword: '', agreeTerms: false, agreePrivacy: false,
  })
  const [errors, setErrors] = useState({})

  function set(key, value) {
    setFormData(f => ({ ...f, [key]: value }))
    setErrors(e => ({ ...e, [key]: '' }))
  }

  function validateStep1() {
    if (!formData.plan) return { plan: 'Please select a plan to continue.' }
    return {}
  }

  function validateStep2() {
    const e = {}
    if (!formData.businessName.trim()) e.businessName = 'Business name is required.'
    if (!formData.businessType) e.businessType = 'Please select your business type.'
    return e
  }

  function validateStep3() {
    const e = {}
    if (!formData.fullName.trim()) e.fullName = 'Full name is required.'
    if (!formData.email.trim()) e.email = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Enter a valid email address.'
    if (!formData.password) e.password = 'Password is required.'
    else if (formData.password.length < 8) e.password = 'Password must be at least 8 characters.'
    if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match.'
    if (!formData.agreeTerms) e.agreeTerms = 'You must agree to the Terms of Service.'
    if (!formData.agreePrivacy) e.agreePrivacy = 'You must agree to the Privacy Policy.'
    return e
  }

  function handleNext() {
    let errs = {}
    if (step === 1) errs = validateStep1()
    if (step === 2) errs = validateStep2()
    if (step === 3) errs = validateStep3()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setStep(s => s + 1)
  }

  function handleBack() {
    setErrors({})
    setStep(s => s - 1)
  }

  function handleGoToDashboard() {
    login('admin@fieldflow.com', 'admin123')
    navigate('/dashboard')
  }

  const trialEnd = new Date(Date.now() + 14 * 86400000).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  const inputStyle = (err) => ({
    width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 14, boxSizing: 'border-box',
    border: `1.5px solid ${err ? '#dc2626' : '#d1d5db'}`, outline: 'none', fontFamily: 'inherit',
  })

  const labelStyle = {
    display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>🏠</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>FieldFlow</span>
        </Link>
        <span style={{ fontSize: 13, color: '#6b7280' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#2563eb', fontWeight: 600 }}>Sign in</Link>
        </span>
      </div>

      <div style={{ maxWidth: step === 1 ? 900 : 560, margin: '40px auto', padding: '0 20px' }}>
        {step < 4 && <ProgressBar step={step} />}

        <div style={{ background: '#fff', borderRadius: 16, padding: 40, boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>

          {/* STEP 1 — Choose Plan */}
          {step === 1 && (
            <>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '0 0 6px', textAlign: 'center' }}>
                Choose Your Plan
              </h2>
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <span style={{
                  display: 'inline-block', background: '#dcfce7', color: '#16a34a',
                  borderRadius: 99, padding: '5px 16px', fontSize: 13, fontWeight: 600,
                }}>
                  14-day free trial — no credit card required
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 28 }}>
                {PLANS.map(p => {
                  const selected = formData.plan === p.id
                  return (
                    <div
                      key={p.id}
                      onClick={() => set('plan', p.id)}
                      style={{
                        border: selected ? `2px solid #16a34a` : '2px solid #e5e7eb',
                        borderRadius: 12, padding: 20, cursor: 'pointer', position: 'relative',
                        background: selected ? '#f0fdf4' : '#fff',
                        transition: 'all 0.15s',
                      }}
                    >
                      {p.popular && (
                        <div style={{
                          position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                          background: '#2563eb', color: '#fff', borderRadius: 99,
                          padding: '3px 12px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                        }}>Most Popular</div>
                      )}
                      {selected && (
                        <div style={{
                          position: 'absolute', top: 10, right: 10,
                          width: 22, height: 22, borderRadius: '50%', background: '#16a34a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                      <h3 style={{ fontSize: 17, fontWeight: 700, color: p.color, margin: '0 0 4px' }}>{p.name}</h3>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '4px 0 6px' }}>{p.price}</div>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{p.desc}</p>
                    </div>
                  )
                })}
              </div>

              {errors.plan && <p style={{ color: '#dc2626', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>{errors.plan}</p>}

              <button
                onClick={handleNext}
                style={{
                  width: '100%', background: '#2563eb', color: '#fff', border: 'none',
                  borderRadius: 9, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Continue →
              </button>
            </>
          )}

          {/* STEP 2 — Business Info */}
          {step === 2 && (
            <>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 28px' }}>
                Tell us about your business
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Business Name <span style={{ color: '#dc2626' }}>*</span></label>
                  <input value={formData.businessName} onChange={e => set('businessName', e.target.value)} placeholder="e.g. Johnson HVAC Services" style={inputStyle(errors.businessName)} />
                  {errors.businessName && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>{errors.businessName}</p>}
                </div>

                <div>
                  <label style={labelStyle}>Business Type <span style={{ color: '#dc2626' }}>*</span></label>
                  <select value={formData.businessType} onChange={e => set('businessType', e.target.value)} style={{ ...inputStyle(errors.businessType), background: '#fff' }}>
                    <option value="">Select type...</option>
                    {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors.businessType && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>{errors.businessType}</p>}
                </div>

                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <input value={formData.phone} onChange={e => set('phone', e.target.value)} type="tel" placeholder="(555) 000-0000" style={inputStyle()} />
                </div>

                <div>
                  <label style={labelStyle}>Business Address</label>
                  <input value={formData.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St, City, State, ZIP" style={inputStyle()} />
                </div>

                <div>
                  <label style={labelStyle}>Website <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
                  <input value={formData.website} onChange={e => set('website', e.target.value)} type="url" placeholder="https://yourwebsite.com" style={inputStyle()} />
                </div>

                <div>
                  <label style={labelStyle}>How did you hear about FieldFlow?</label>
                  <select value={formData.hearFrom} onChange={e => set('hearFrom', e.target.value)} style={{ ...inputStyle(), background: '#fff' }}>
                    <option value="">Select...</option>
                    {HEAR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                <button onClick={handleBack} style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 9, padding: '13px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                  ← Back
                </button>
                <button onClick={handleNext} style={{ flex: 2, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 9, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  Continue →
                </button>
              </div>
            </>
          )}

          {/* STEP 3 — Create Account */}
          {step === 3 && (
            <>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 28px' }}>
                Create your account
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Full Name <span style={{ color: '#dc2626' }}>*</span></label>
                  <input value={formData.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Jane Smith" style={inputStyle(errors.fullName)} />
                  {errors.fullName && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>{errors.fullName}</p>}
                </div>

                <div>
                  <label style={labelStyle}>Email Address <span style={{ color: '#dc2626' }}>*</span></label>
                  <input value={formData.email} onChange={e => set('email', e.target.value)} type="email" placeholder="you@company.com" style={inputStyle(errors.email)} />
                  {errors.email && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>{errors.email}</p>}
                </div>

                <div>
                  <label style={labelStyle}>Password <span style={{ color: '#dc2626' }}>*</span></label>
                  <input value={formData.password} onChange={e => set('password', e.target.value)} type="password" placeholder="Min 8 characters" style={inputStyle(errors.password)} />
                  <PasswordStrength password={formData.password} />
                  {errors.password && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>{errors.password}</p>}
                </div>

                <div>
                  <label style={labelStyle}>Confirm Password <span style={{ color: '#dc2626' }}>*</span></label>
                  <input value={formData.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} type="password" placeholder="Re-enter password" style={inputStyle(errors.confirmPassword)} />
                  {errors.confirmPassword && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>{errors.confirmPassword}</p>}
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                    <input type="checkbox" checked={formData.agreeTerms} onChange={e => set('agreeTerms', e.target.checked)} style={{ marginTop: 2 }} />
                    <span>I agree to the <a href="#" style={{ color: '#2563eb' }}>Terms of Service</a></span>
                  </label>
                  {errors.agreeTerms && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>{errors.agreeTerms}</p>}
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                    <input type="checkbox" checked={formData.agreePrivacy} onChange={e => set('agreePrivacy', e.target.checked)} style={{ marginTop: 2 }} />
                    <span>I agree to the <a href="#" style={{ color: '#2563eb' }}>Privacy Policy</a></span>
                  </label>
                  {errors.agreePrivacy && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>{errors.agreePrivacy}</p>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                <button onClick={handleBack} style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 9, padding: '13px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                  ← Back
                </button>
                <button onClick={handleNext} style={{ flex: 2, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 9, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  Create Account →
                </button>
              </div>
            </>
          )}

          {/* STEP 4 — Success */}
          {step === 4 && (
            <div style={{ textAlign: 'center' }}>
              {/* Animated checkmark */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%', background: '#16a34a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
                animation: 'popIn 0.4s ease-out',
              }}>
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <path d="M8 18l8 8 12-12" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <style>{`@keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>

              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>
                Welcome to FieldFlow, {formData.businessName || 'your business'}! 🎉
              </h2>
              <p style={{ fontSize: 16, color: '#6b7280', margin: '0 0 12px' }}>
                Your 14-day free trial has started.
              </p>
              <div style={{
                display: 'inline-block', background: '#f0fdf4', border: '1px solid #86efac',
                borderRadius: 8, padding: '8px 20px', marginBottom: 28,
              }}>
                <span style={{ fontSize: 14, color: '#16a34a', fontWeight: 600 }}>
                  Trial ends: {trialEnd}
                </span>
              </div>

              <button
                onClick={handleGoToDashboard}
                style={{
                  width: '100%', background: '#16a34a', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '15px', fontSize: 17, fontWeight: 700, cursor: 'pointer',
                  marginBottom: 28,
                }}
              >
                Go to Dashboard →
              </button>

              <div style={{
                background: '#f9fafb', borderRadius: 12, padding: 20,
                border: '1px solid #e5e7eb', textAlign: 'left',
              }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: '0 0 12px' }}>
                  What to do next:
                </h4>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    '👥 Add your team members',
                    '📋 Import your client list',
                    '🔧 Create your first job',
                  ].map(item => (
                    <li key={item} style={{ fontSize: 14, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
