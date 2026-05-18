import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

// ─── Global CSS ───────────────────────────────────────────────────────────────
const CSS = `
  @keyframes jb-card-in {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes jb-shake {
    0%,100% { transform: translateX(0); }
    15%     { transform: translateX(-5px); }
    30%     { transform: translateX(5px); }
    45%     { transform: translateX(-4px); }
    60%     { transform: translateX(4px); }
    75%     { transform: translateX(-2px); }
    90%     { transform: translateX(2px); }
  }
  @keyframes jb-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes jb-err-in {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .jb-card {
    animation: jb-card-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  /* Input focus */
  .jb-input:focus {
    outline: none;
    border-color: #16A34A !important;
    box-shadow: 0 0 0 3px rgba(22,163,74,0.12) !important;
  }
  .jb-input:focus + .jb-icon-left,
  .jb-input-wrap:focus-within .jb-icon-left {
    color: #16A34A !important;
  }

  /* Buttons */
  .jb-btn-google {
    transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .jb-btn-google:hover {
    background: #F8FAFC !important;
    border-color: #CBD5E1 !important;
  }
  .jb-btn-submit {
    transition: background 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
  }
  .jb-btn-submit:hover:not(:disabled) {
    background: #15803D !important;
    box-shadow: 0 4px 12px rgba(22,163,74,0.30) !important;
  }
  .jb-btn-submit:active:not(:disabled) {
    transform: scale(0.99);
  }

  /* Password toggle + demo hover */
  .jb-pw-eye { transition: color 0.12s; }
  .jb-pw-eye:hover { color: #16A34A !important; }

  .jb-demo-row {
    transition: background 0.12s;
    cursor: pointer;
  }
  .jb-demo-row:hover { background: rgba(22,163,74,0.07) !important; }

  .jb-footer-link { transition: color 0.12s; }
  .jb-footer-link:hover { color: #374151 !important; }

  /* Error */
  .jb-error-box {
    animation: jb-err-in 0.2s ease both;
  }
  .jb-error-shake {
    animation: jb-shake 0.42s ease;
  }

  /* Spinner */
  .jb-spinner {
    width: 16px; height: 16px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: #fff;
    animation: jb-spin 0.65s linear infinite;
    flex-shrink: 0;
  }

  /* ── Dark mode ─────────────────────────────── */
  html.dark .jb-page      { background: #0F1117 !important; }
  html.dark .jb-topbar    { background: #161B22 !important; border-color: #21262D !important; }
  html.dark .jb-card      { background: #161B22 !important; border-color: #21262D !important; box-shadow: 0 4px 24px rgba(0,0,0,0.3) !important; }
  html.dark .jb-h1        { color: #E6EDF3 !important; }
  html.dark .jb-subtitle  { color: #8B949E !important; }
  html.dark .jb-label     { color: #8B949E !important; }
  html.dark .jb-input     { background: #0D1117 !important; border-color: #30363D !important; color: #E6EDF3 !important; }
  html.dark .jb-input::placeholder { color: #484F58 !important; }
  html.dark .jb-icon-left { color: #484F58 !important; }
  html.dark .jb-demo-box  { background: #0D2818 !important; border-color: #1A4731 !important; }
  html.dark .jb-demo-title{ color: #4ade80 !important; }
  html.dark .jb-demo-cred { color: #8B949E !important; }
  html.dark .jb-btn-google{ background: #21262D !important; border-color: #30363D !important; color: #E6EDF3 !important; }
  html.dark .jb-btn-google:hover { background: #2D333B !important; }
  html.dark .jb-divider-line { background: #21262D !important; }
  html.dark .jb-divider-txt  { color: #484F58 !important; }
  html.dark .jb-topbar-txt   { color: #8B949E !important; }
  html.dark .jb-signup-txt   { color: #8B949E !important; }
  html.dark .jb-trust-txt    { color: #484F58 !important; }
  html.dark .jb-footer-txt   { color: #484F58 !important; }
  html.dark .jb-footer-link  { color: #484F58 !important; }
  html.dark .jb-footer-link:hover { color: #8B949E !important; }
  html.dark .jb-remember-lbl { color: #8B949E !important; }
  html.dark .jb-forgot-link  { color: #4ade80 !important; }

  /* ── Mobile ─────────────────────────────────── */
  @media (max-width: 480px) {
    .jb-topbar-right { display: none !important; }
    .jb-card {
      border-radius: 12px !important;
      padding: 28px 24px !important;
      margin: 0 16px !important;
    }
    .jb-trust-row { flex-wrap: wrap !important; gap: 10px !important; justify-content: center !important; }
  }
`

// ─── Inline SVGs ──────────────────────────────────────────────────────────────
const IconEnvelope = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <polyline points="2,4 12,13 22,4"/>
  </svg>
)

const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const IconEyeOpen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const IconEyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

const IconArrow = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
)

const IconAlert = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)

const IconGoogle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

const IconLayers = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>
)

// ─── Main component ───────────────────────────────────────────────────────────
export default function Login() {
  // ── Auth logic — DO NOT CHANGE ────────────────────────────────────────────
  const { login }  = useAuth()
  const navigate   = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Email is required.'); return }
    if (!password)     { setError('Password is required.'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 280))
    const err = await login(email, password)
    setLoading(false)
    if (err) { setError(err); return }
    navigate('/dashboard', { replace: true })
  }
  // ─────────────────────────────────────────────────────────────────────────

  // UI state
  const [showPw,    setShowPw]    = useState(false)
  const [remember,  setRemember]  = useState(false)
  const [shaking,   setShaking]   = useState(false)
  const dismissRef = useRef(null)

  // Shake + auto-dismiss error
  useEffect(() => {
    if (!error) { setShaking(false); return }
    setShaking(false)
    // double-raf so class removal + re-add triggers the animation
    requestAnimationFrame(() => requestAnimationFrame(() => setShaking(true)))
    clearTimeout(dismissRef.current)
    dismissRef.current = setTimeout(() => { setError(''); setShaking(false) }, 5000)
    return () => clearTimeout(dismissRef.current)
  }, [error])

  function fillDemo(em, pw) { setEmail(em); setPassword(pw); setError('') }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading

  // ─── Input styles (shared) ────────────────────────────────────────────────
  const inputStyle = (hasErr) => ({
    width: '100%',
    boxSizing: 'border-box',
    height: 46,
    border: `1.5px solid ${hasErr ? '#FCA5A5' : '#E2E8F0'}`,
    borderRadius: 10,
    padding: '0 44px 0 44px',
    fontSize: 14,
    color: '#0F172A',
    background: '#fff',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    fontFamily: 'inherit',
  })

  return (
    <>
      <style>{CSS}</style>

      {/* ═══ PAGE SHELL ════════════════════════════════════════════════════ */}
      <div className="jb-page" style={{ minHeight: '100vh', background: '#F7F8FA', display: 'flex', flexDirection: 'column', fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif" }}>

        {/* ─── TOP BAR ────────────────────────────────────────────────────── */}
        <header className="jb-topbar" style={{ background: '#fff', borderBottom: '1px solid #E8EAF0', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', flexShrink: 0 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', letterSpacing: '-0.2px' }}>CustomsFieldPro</span>
          </div>

          {/* Right side */}
          <div className="jb-topbar-right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="jb-topbar-txt" style={{ fontSize: 13.5, color: '#64748B' }}>New to CustomsFieldPro?</span>
            <a href="/register" style={{ fontSize: 13.5, fontWeight: 600, color: '#16A34A', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
              Start free trial →
            </a>
          </div>
        </header>

        {/* ─── MAIN CONTENT ───────────────────────────────────────────────── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px 24px' }}>

          {/* CARD */}
          <div className="jb-card" style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, border: '1px solid #E8EAF0', padding: '40px 40px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

            {/* Card header */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <IconLayers />
              </div>
              <h1 className="jb-h1" style={{ fontSize: 22, fontWeight: 600, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.4px', lineHeight: 1.25 }}>
                Sign in to CustomsFieldPro
              </h1>
              <p className="jb-subtitle" style={{ fontSize: 14, color: '#64748B', margin: 0, lineHeight: 1.55 }}>
                Field service management for HVAC,<br />Plumbing &amp; Electrical teams
              </p>
            </div>

            {/* Google button */}
            <button type="button" className="jb-btn-google" style={{ width: '100%', height: 44, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, fontWeight: 500, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 18, fontFamily: 'inherit' }}>
              <IconGoogle />
              Continue with Google
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div className="jb-divider-line" style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
              <span className="jb-divider-txt" style={{ fontSize: 12, fontWeight: 500, color: '#94A3B8', whiteSpace: 'nowrap' }}>or sign in with email</span>
              <div className="jb-divider-line" style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
            </div>

            {/* Demo hint */}
            <div className="jb-demo-box" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
              <p className="jb-demo-title" style={{ fontSize: 11, fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 9px' }}>
                Try Demo Account
              </p>
              {[
                { role: 'Admin', badge: '#DCFCE7', badgeTxt: '#15803D', em: 'admin@customsfieldpro.com', pw: 'admin123' },
                { role: 'Staff', badge: '#D1FAE5', badgeTxt: '#065F46', em: 'moore@customsfieldpro.com', pw: 'staff123' },
              ].map(({ role, badge, badgeTxt, em, pw }) => (
                <div key={role} className="jb-demo-row" onClick={() => fillDemo(em, pw)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 7, background: 'transparent', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: badgeTxt, background: badge, borderRadius: 5, padding: '2px 8px', letterSpacing: '0.3px', flexShrink: 0 }}>{role}</span>
                  <span className="jb-demo-cred" style={{ fontSize: 12, color: '#374151', fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: '0.2px' }}>{em} / {pw}</span>
                </div>
              ))}
            </div>

            {/* Error message */}
            {error && (
              <div className={`jb-error-box${shaking ? ' jb-error-shake' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14, lineHeight: 1.45 }}>
                <IconAlert />
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="jb-label" style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block' }}>
                  Email address
                </label>
                <div className="jb-input-wrap" style={{ position: 'relative' }}>
                  <div className="jb-icon-left" style={{ position: 'absolute', left: 14, top: 0, bottom: 0, display: 'flex', alignItems: 'center', color: '#9CA3AF', pointerEvents: 'none', transition: 'color 0.15s' }}>
                    <IconEnvelope />
                  </div>
                  <input
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    disabled={loading}
                    className="jb-input"
                    style={{ ...inputStyle(error && !email.trim()), paddingRight: 14, opacity: loading ? 0.65 : 1 }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label className="jb-label" style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
                    Password
                  </label>
                  <button type="button" className="jb-forgot-link" style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 500, color: '#16A34A', cursor: 'pointer', padding: 0, fontFamily: 'inherit', transition: 'opacity 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    Forgot password?
                  </button>
                </div>
                <div className="jb-input-wrap" style={{ position: 'relative' }}>
                  <div className="jb-icon-left" style={{ position: 'absolute', left: 14, top: 0, bottom: 0, display: 'flex', alignItems: 'center', color: '#9CA3AF', pointerEvents: 'none', transition: 'color 0.15s' }}>
                    <IconLock />
                  </div>
                  <input
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    disabled={loading}
                    className="jb-input"
                    style={{ ...inputStyle(error && !password), opacity: loading ? 0.65 : 1 }}
                  />
                  <button type="button" className="jb-pw-eye" onClick={() => setShowPw(s => !s)} style={{ position: 'absolute', right: 14, top: 0, bottom: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', padding: 0, fontFamily: 'inherit' }}>
                    {showPw ? <IconEyeOff /> : <IconEyeOpen />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label className="jb-remember-lbl" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#64748B', userSelect: 'none' }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ width: 15, height: 15, accentColor: '#16A34A', cursor: 'pointer', flexShrink: 0, margin: 0 }} />
                Keep me signed in for 30 days
              </label>

              {/* Submit */}
              <button type="submit" disabled={!canSubmit} className="jb-btn-submit" style={{
                width: '100%', height: 46, borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 600,
                color: '#fff', cursor: canSubmit ? 'pointer' : 'not-allowed',
                background: canSubmit ? '#16A34A' : '#D1D5DB',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                fontFamily: 'inherit', letterSpacing: '0.01em', marginTop: 2,
              }}>
                {loading ? (
                  <><div className="jb-spinner" />Signing in…</>
                ) : (
                  <>Sign in <IconArrow /></>
                )}
              </button>

            </form>

            {/* Card footer */}
            <p className="jb-signup-txt" style={{ textAlign: 'center', fontSize: 13.5, color: '#64748B', margin: '22px 0 0' }}>
              Don&apos;t have an account?{' '}
              <a href="/register" style={{ color: '#16A34A', fontWeight: 500, textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                Start your free 14-day trial
              </a>
            </p>

          </div>

          {/* ─── TRUST ROW ────────────────────────────────────────────────── */}
          <div className="jb-trust-row" style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 20 }}>
            {[
              { icon: '⭐', text: '500+ businesses' },
              { icon: '🔒', text: 'Bank-level security' },
              { icon: '✓',  text: '99.9% uptime' },
            ].map(({ icon, text }, i) => (
              <div key={i} className="jb-trust-txt" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#94A3B8', fontWeight: 500, whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 12 }}>{icon}</span>
                {text}
              </div>
            ))}
          </div>

        </main>

        {/* ─── BOTTOM FOOTER ──────────────────────────────────────────────── */}
        <footer style={{ padding: '14px 20px 20px', textAlign: 'center', flexShrink: 0 }}>
          <div className="jb-footer-txt" style={{ fontSize: 11, color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '4px 8px' }}>
            <span>© 2026 CustomsFieldPro</span>
            {['Privacy Policy', 'Terms of Service', 'Security', 'Help Center'].map((lbl, i) => (
              <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#CBD5E1' }}>·</span>
                <a href="#" className="jb-footer-link" style={{ color: '#94A3B8', textDecoration: 'none' }}>{lbl}</a>
              </span>
            ))}
          </div>
        </footer>

      </div>
    </>
  )
}
