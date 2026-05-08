import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

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
        <Link to="/demo" style={{ color: '#374151', textDecoration: 'none', fontSize: 15 }}>Demo</Link>
        <Link to="/contact" style={{ color: '#2563eb', textDecoration: 'none', fontSize: 15, fontWeight: 600 }}>Contact</Link>
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
      </div>
      <div style={{ fontSize: 13 }}>&copy; {new Date().getFullYear()} FieldFlow CRM. All rights reserved.</div>
    </footer>
  )
}

const PLANS_OPTIONS = ['Not sure yet', 'Starter ($49/mo)', 'Professional ($99/mo)', 'Business ($199/mo)', 'Enterprise ($399/mo)']

export default function ContactPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', email: '', businessName: '', phone: '', plan: '', message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address'
    if (!form.message.trim()) e.message = 'Message is required'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    // Save to localStorage
    try {
      const arr = JSON.parse(localStorage.getItem('fieldflow_contact_submissions') || '[]')
      arr.push({ ...form, submittedAt: new Date().toISOString() })
      localStorage.setItem('fieldflow_contact_submissions', JSON.stringify(arr))
    } catch {}
    setSubmitted(true)
  }

  const field = (key) => ({
    value: form[key],
    onChange: e => { setForm(f => ({ ...f, [key]: e.target.value })); setErrors(er => ({ ...er, [key]: '' })) },
  })

  const inputStyle = (err) => ({
    width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 14,
    border: `1.5px solid ${err ? '#dc2626' : '#d1d5db'}`, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  })

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#fff' }}>
      <Navbar navigate={navigate} />

      {/* Header */}
      <section style={{ padding: '60px 40px 40px', textAlign: 'center', background: '#f9fafb' }}>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: '#111827', margin: '0 0 12px' }}>Contact Us</h1>
        <p style={{ fontSize: 17, color: '#6b7280', margin: 0 }}>
          We'd love to hear from you. Reach out anytime.
        </p>
      </section>

      <section style={{ padding: '60px 40px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60 }}>
          {/* Contact Form */}
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 24 }}>Send us a message</h2>

            {submitted ? (
              <div style={{
                background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: 32, textAlign: 'center',
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#16a34a', margin: '0 0 8px' }}>Message Sent!</h3>
                <p style={{ fontSize: 14, color: '#374151', margin: '0 0 16px' }}>
                  Thank you for reaching out. We'll get back to you within 24 hours.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: '', email: '', businessName: '', phone: '', plan: '', message: '' }) }}
                  style={{
                    background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8,
                    padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
                    Full Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input {...field('name')} placeholder="John Smith" style={inputStyle(errors.name)} />
                  {errors.name && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>{errors.name}</p>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
                    Email Address <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input {...field('email')} type="email" placeholder="john@example.com" style={inputStyle(errors.email)} />
                  {errors.email && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>{errors.email}</p>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
                      Business Name
                    </label>
                    <input {...field('businessName')} placeholder="Your company" style={inputStyle()} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
                      Phone
                    </label>
                    <input {...field('phone')} type="tel" placeholder="(555) 000-0000" style={inputStyle()} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
                    Plan Interested In
                  </label>
                  <select {...field('plan')} style={{ ...inputStyle(), background: '#fff' }}>
                    <option value="">Select a plan...</option>
                    {PLANS_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
                    Message <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <textarea
                    {...field('message')}
                    placeholder="How can we help you?"
                    rows={5}
                    style={{ ...inputStyle(errors.message), resize: 'vertical' }}
                  />
                  {errors.message && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>{errors.message}</p>}
                </div>

                <button
                  type="submit"
                  style={{
                    background: '#2563eb', color: '#fff', border: 'none',
                    borderRadius: 9, padding: '13px', fontSize: 15,
                    fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Send Message →
                </button>
              </form>
            )}
          </div>

          {/* Contact Info */}
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 24 }}>Get in touch</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ background: '#f9fafb', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✉️</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Email Support</h3>
                <a href="mailto:support@fieldflowcrm.com" style={{ fontSize: 15, color: '#2563eb', textDecoration: 'none' }}>
                  support@fieldflowcrm.com
                </a>
              </div>

              <div style={{ background: '#f9fafb', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⏱️</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Response Time</h3>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                  We reply within 24 hours on business days.
                </p>
              </div>

              <div style={{ background: '#f9fafb', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📚</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>FAQ</h3>
                <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 8px' }}>
                  Find quick answers to common questions.
                </p>
                <Link to="/pricing#faq" style={{ fontSize: 14, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                  Browse FAQ →
                </Link>
              </div>

              <div style={{ background: '#eff6ff', borderRadius: 12, padding: 24, border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🚀</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1d4ed8', margin: '0 0 8px' }}>
                  Try it free first
                </h3>
                <p style={{ fontSize: 14, color: '#3730a3', margin: '0 0 12px' }}>
                  Start a 14-day free trial before committing. No card required.
                </p>
                <button
                  onClick={() => navigate('/register')}
                  style={{
                    background: '#2563eb', color: '#fff', border: 'none',
                    borderRadius: 7, padding: '9px 18px', fontSize: 14,
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Start Free Trial
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
