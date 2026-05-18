import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function ForgotPassword() {
  const [email, setEmail]       = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Email is required.'); return }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email address.'); return }

    setLoading(true)
    const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    try {
      await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } catch {
      // Network error — still show success to avoid email enumeration
    }
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Logo */}
        <div style={S.logo}>
          <div style={S.logoIcon}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={S.logoName}>CustomsFieldPro</span>
        </div>

        {submitted ? (
          <div style={S.successBlock}>
            <div style={S.successIcon}>
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 style={S.heading}>Check your email</h1>
            <p style={S.sub}>
              If <strong>{email}</strong> is registered, you'll receive a password reset link shortly.
            </p>
            <p style={{ ...S.sub, marginTop: 8 }}>
              Didn't get it? Check your spam folder or{' '}
              <button onClick={() => setSubmitted(false)} style={S.textBtn}>try again</button>.
            </p>
            <Link to="/login" style={S.backBtn}>Back to sign in</Link>
          </div>
        ) : (
          <>
            <h1 style={S.heading}>Reset your password</h1>
            <p style={S.sub}>Enter the email address linked to your account and we'll send you a reset link.</p>

            {error && (
              <div style={S.errorBox}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={S.form} noValidate>
              <div style={S.field}>
                <label style={S.label}>Email address</label>
                <input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  placeholder="you@customsfieldpro.com"
                  style={{ ...S.input, borderColor: error ? '#fca5a5' : '#e8e9ec' }}
                />
              </div>

              <button type="submit" disabled={loading} style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p style={S.backLine}>
              <Link to="/login" style={S.backLink}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ verticalAlign: 'middle', marginRight: 4 }}>
                  <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

const S = {
  page: {
    minHeight: '100vh',
    background: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: '#ffffff',
    borderRadius: 14,
    border: '1px solid #e8e9ec',
    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
    padding: '36px 36px 28px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
    justifyContent: 'center',
  },
  logoIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    background: '#2563eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoName: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1a1d23',
    letterSpacing: '-0.3px',
  },
  heading: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1a1d23',
    margin: '0 0 6px',
    textAlign: 'center',
  },
  sub: {
    fontSize: 13.5,
    color: '#6b7280',
    margin: '0 0 24px',
    textAlign: 'center',
    lineHeight: 1.6,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13.5,
    marginBottom: 16,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151' },
  input: {
    height: 42,
    border: '1px solid #e8e9ec',
    borderRadius: 8,
    padding: '0 14px',
    fontSize: 14,
    color: '#1a1d23',
    outline: 'none',
    transition: 'border-color 0.15s',
    width: '100%',
    boxSizing: 'border-box',
  },
  btn: {
    height: 44,
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14.5,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 4,
    letterSpacing: '0.1px',
    transition: 'opacity 0.15s',
  },
  backLine: {
    textAlign: 'center',
    margin: '20px 0 0',
  },
  backLink: {
    fontSize: 13.5,
    color: '#2563eb',
    fontWeight: 600,
    textDecoration: 'none',
  },
  successBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0,
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: '50%',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  textBtn: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13.5,
    padding: 0,
    textDecoration: 'underline',
  },
  backBtn: {
    display: 'inline-block',
    marginTop: 20,
    height: 40,
    lineHeight: '40px',
    padding: '0 24px',
    background: '#2563eb',
    color: '#fff',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
  },
}
