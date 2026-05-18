import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim())    { setError('Email is required.'); return }
    if (!password)        { setError('Password is required.'); return }
    setLoading(true)
    // Small delay for feel
    await new Promise(r => setTimeout(r, 280))
    const err = login(email, password)
    setLoading(false)
    if (err) { setError(err); return }
    navigate('/dashboard', { replace: true })
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

        <h1 style={S.heading}>Sign in to your account</h1>
        <p style={S.sub}>Enter your credentials below to continue</p>

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
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="you@customsfieldpro.com"
              style={{ ...S.input, borderColor: error ? '#fca5a5' : '#e8e9ec' }}
            />
          </div>

          <div style={S.field}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={S.label}>Password</label>
              <Link to="/forgot-password" style={S.forgotLink}>Forgot password?</Link>
            </div>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="••••••••"
              style={{ ...S.input, borderColor: error ? '#fca5a5' : '#e8e9ec' }}
            />
          </div>

          <button type="submit" disabled={loading} style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={S.registerLine}>
          Don't have an account?{' '}
          <Link to="/register" style={S.registerLink}>Start free trial</Link>
        </p>

        <div style={S.hint}>
          <p style={S.hintTitle}>Demo credentials</p>
          {[
            ['Admin', 'admin@customsfieldpro.com', 'admin123'],
            ['Staff', 'moore@customsfieldpro.com', 'staff123'],
          ].map(([role, email, pwd]) => (
            <button key={role} onClick={() => { setEmail(email); setPassword(pwd); setError('') }} style={S.hintBtn}>
              <strong>{role}</strong> — {email}
            </button>
          ))}
        </div>
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
    color: '#9ca3af',
    margin: '0 0 24px',
    textAlign: 'center',
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
  hint: {
    marginTop: 24,
    borderTop: '1px solid #f0f1f3',
    paddingTop: 18,
  },
  hintTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    margin: '0 0 8px',
  },
  hintBtn: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    background: '#f8faff',
    border: '1px solid #e8e9ec',
    borderRadius: 7,
    padding: '8px 12px',
    fontSize: 12.5,
    color: '#374151',
    cursor: 'pointer',
    marginBottom: 6,
  },
  forgotLink: {
    fontSize: 12.5,
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: 500,
  },
  registerLine: {
    textAlign: 'center',
    fontSize: 13.5,
    color: '#6b7280',
    margin: '20px 0 0',
  },
  registerLink: {
    color: '#2563eb',
    fontWeight: 600,
    textDecoration: 'none',
  },
}
