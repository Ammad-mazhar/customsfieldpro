import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Smooth scroll utility ────────────────────────────────────────────────────
const scrollTo = (id) => {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ─── Global CSS ───────────────────────────────────────────────────────────────
const CSS = `
  :root {
    --lp-green: #16A34A;
    --lp-green-dark: #15803D;
    --lp-green-light: #F0FDF4;
    --lp-navy: #0F172A;
    --lp-muted: #64748B;
    --lp-border: #E2E8F0;
    --lp-bg: #F8FAFC;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

  @keyframes lp-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(0.8); }
  }
  @keyframes lp-hero-in {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .lp-fade { opacity: 0; transform: translateY(20px); transition: opacity 0.5s ease, transform 0.5s ease; }
  .lp-fade.lp-visible { opacity: 1; transform: translateY(0); }

  .lp-stagger-1 { transition-delay: 0ms; }
  .lp-stagger-2 { transition-delay: 80ms; }
  .lp-stagger-3 { transition-delay: 160ms; }
  .lp-stagger-4 { transition-delay: 240ms; }
  .lp-stagger-5 { transition-delay: 320ms; }
  .lp-stagger-6 { transition-delay: 400ms; }

  .lp-pulse-dot { animation: lp-pulse 2s infinite; }

  .lp-btn-green { transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
  .lp-btn-green:hover { background: #15803D !important; box-shadow: 0 4px 16px rgba(22,163,74,0.35) !important; transform: translateY(-1px); }

  .lp-btn-outline { transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease; }
  .lp-btn-outline:hover { border-color: #0F172A !important; color: #0F172A !important; background: rgba(15,23,42,0.04) !important; }

  .lp-btn-ghost { transition: color 0.15s ease, background 0.15s ease; }
  .lp-btn-ghost:hover { color: #0F172A !important; background: rgba(15,23,42,0.05) !important; }

  .lp-nav-link { transition: color 0.2s ease, border-color 0.2s ease; cursor: pointer; }
  .lp-nav-link:hover { color: #0F172A !important; }
  .lp-nav-link-active { color: #16A34A !important; border-bottom: 2px solid #16A34A; padding-bottom: 2px; }

  .lp-feat-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
  .lp-feat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.09) !important; }

  .lp-price-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
  .lp-price-card:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.10) !important; }

  .lp-faq-answer { overflow: hidden; transition: max-height 0.32s ease, opacity 0.25s ease; }

  .lp-toggle-pill { transition: background 0.2s ease; }
  .lp-toggle-knob { transition: transform 0.2s ease; }

  .lp-hero-anim { animation: lp-hero-in 0.7s ease both; }
  .lp-hero-anim-1 { animation-delay: 0ms; }
  .lp-hero-anim-2 { animation-delay: 100ms; }
  .lp-hero-anim-3 { animation-delay: 200ms; }
  .lp-hero-anim-4 { animation-delay: 320ms; }
  .lp-hero-anim-5 { animation-delay: 420ms; }

  .lp-mobile-menu { display: none; overflow: hidden; transition: max-height 0.3s ease; }

  .lp-footer-link { transition: color 0.15s ease; cursor: pointer; }
  .lp-footer-link:hover { color: #0F172A !important; }

  @media (max-width: 768px) {
    .lp-nav-center { display: none !important; }
    .lp-hamburger  { display: flex !important; }
    .lp-mobile-menu { display: block; }
    .lp-hero-h1    { font-size: 36px !important; letter-spacing: -0.5px !important; }
    .lp-hero-sub   { font-size: 16px !important; }
    .lp-hero-btns  { flex-direction: column !important; align-items: stretch !important; max-width: 320px; margin: 0 auto; }
    .lp-trust-wrap { flex-wrap: wrap !important; }
    .lp-trust-item { flex: 0 0 50% !important; }
    .lp-trust-div  { display: none !important; }
    .lp-steps      { flex-direction: column !important; gap: 24px !important; align-items: flex-start !important; }
    .lp-step-line  { display: none !important; }
    .lp-feat-grid  { grid-template-columns: repeat(2, 1fr) !important; }
    .lp-pricing-row { flex-direction: column !important; align-items: center !important; }
    .lp-compare-row { flex-direction: column !important; }
    .lp-testi-row  { flex-direction: column !important; }
    .lp-footer-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
    .lp-cta-box    { margin: 0 16px 48px !important; padding: 40px 24px !important; }
    .lp-cta-h2     { font-size: 28px !important; }
    .lp-section-h2 { font-size: 28px !important; }
    .lp-price-card { width: 100% !important; max-width: 360px !important; }
    .lp-nav-actions button:first-child { display: none !important; }
  }
  @media (max-width: 480px) {
    .lp-feat-grid { grid-template-columns: 1fr !important; }
  }
`

// ─── Intersection Observer helpers ────────────────────────────────────────────
function useFadeIn(threshold = 0.12) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('lp-visible'); obs.unobserve(el) } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return ref
}

function useCountUp(target, duration = 1300, started = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!started) return
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      setVal(Math.floor(progress * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [started, target, duration])
  return val
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────
function GreenBtn({ children, onClick, style = {}, type = 'button' }) {
  return (
    <button type={type} onClick={onClick} className="lp-btn-green" style={{
      background: '#16A34A', color: '#fff', border: 'none', borderRadius: 10,
      padding: '13px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
      fontFamily: 'inherit', letterSpacing: '-0.2px', display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center', gap: 8, ...style,
    }}>
      {children}
    </button>
  )
}

function OutlineBtn({ children, onClick, style = {} }) {
  return (
    <button onClick={onClick} className="lp-btn-outline" style={{
      background: '#fff', color: '#475569', border: '1.5px solid #E2E8F0',
      borderRadius: 10, padding: '13px 24px', fontSize: 14, fontWeight: 600,
      cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center', gap: 8, ...style,
    }}>
      {children}
    </button>
  )
}

function Stars() {
  return (
    <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
      {[...Array(5)].map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </div>
  )
}

function CheckIcon({ color = '#16A34A', size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ChevronDown({ open }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"
      style={{ transition: 'transform 0.3s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function Logo({ onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
      <div style={{ width: 32, height: 32, background: '#16A34A', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.3px' }}>CustomsFieldPro</span>
    </div>
  )
}

// ─── Section 1: Navigation ────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: 'Features',  id: 'features' },
  { label: 'Pricing',   id: 'pricing' },
  { label: 'Compare',   id: 'compare' },
  { label: 'Customers', id: 'customers' },
  { label: 'Resources', id: 'faq' },
]

function Nav({ onLogin, onRegister, activeSection }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  // close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function handleLink(id) {
    scrollTo(id)
    setMenuOpen(false)
  }

  return (
    <div ref={menuRef}>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100, height: 64, background: '#fff',
        borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 40px',
      }}>
        <Logo onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />

        {/* Center links — desktop */}
        <div className="lp-nav-center" style={{ display: 'flex', gap: 32 }}>
          {NAV_LINKS.map(l => (
            <span
              key={l.id}
              onClick={() => handleLink(l.id)}
              className={`lp-nav-link${activeSection === l.id ? ' lp-nav-link-active' : ''}`}
              style={{ fontSize: 14, color: activeSection === l.id ? '#16A34A' : '#475569', fontWeight: 500, userSelect: 'none' }}
            >
              {l.label}
            </span>
          ))}
        </div>

        {/* Right */}
        <div className="lp-nav-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={onLogin} className="lp-btn-ghost" style={{
            fontSize: 14, fontWeight: 600, color: '#475569', background: 'none',
            border: 'none', cursor: 'pointer', padding: '8px 14px', borderRadius: 8, fontFamily: 'inherit',
          }}>Sign in</button>
          <GreenBtn onClick={onRegister} style={{ padding: '9px 18px', fontSize: 14 }}>
            Start free trial
          </GreenBtn>
          {/* Hamburger */}
          <button
            className="lp-hamburger"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 6, flexDirection: 'column', gap: 5, borderRadius: 6 }}
          >
            {menuOpen
              ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              : [0, 1, 2].map(i => <span key={i} style={{ display: 'block', width: 22, height: 2, background: '#475569', borderRadius: 2 }} />)
            }
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      <div className="lp-mobile-menu" style={{ maxHeight: menuOpen ? 400 : 0, background: '#fff', borderBottom: menuOpen ? '1px solid #F1F5F9' : 'none', overflow: 'hidden' }}>
        <div style={{ padding: '8px 24px 16px' }}>
          {NAV_LINKS.map(l => (
            <div
              key={l.id}
              onClick={() => handleLink(l.id)}
              style={{ padding: '14px 0', fontSize: 15, color: activeSection === l.id ? '#16A34A' : '#374151', fontWeight: 600, borderBottom: '1px solid #F8FAFC', cursor: 'pointer' }}
            >
              {l.label}
            </div>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            <button onClick={() => { setMenuOpen(false); onLogin() }}
              style={{ width: '100%', padding: 13, background: 'none', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}>
              Sign in
            </button>
            <GreenBtn onClick={() => { setMenuOpen(false); onRegister() }} style={{ width: '100%', padding: 13 }}>
              Start free trial
            </GreenBtn>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Section 2: Hero ──────────────────────────────────────────────────────────
function Hero({ onRegister }) {
  return (
    <section id="hero" style={{ background: '#fff', padding: '80px 40px 64px', textAlign: 'center', overflow: 'hidden' }}>
      <div className="lp-hero-anim lp-hero-anim-1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 99, padding: '6px 14px', marginBottom: 28 }}>
        <span className="lp-pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A', flexShrink: 0, display: 'block' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#16A34A' }}>Now with AI Receptionist — answers calls 24/7</span>
      </div>

      <h1 className="lp-hero-anim lp-hero-anim-2 lp-hero-h1" style={{
        fontSize: 52, fontWeight: 800, color: '#0F172A', letterSpacing: '-1.5px',
        lineHeight: 1.12, maxWidth: 700, margin: '0 auto 20px',
      }}>
        The smarter way to run your{' '}
        <span style={{ color: '#16A34A' }}>field service</span>{' '}
        business
      </h1>

      <p className="lp-hero-anim lp-hero-anim-3 lp-hero-sub" style={{ fontSize: 18, color: '#64748B', maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.65 }}>
        Schedule jobs, dispatch your team, send invoices, and get paid — all from one platform built for HVAC, Plumbing, Electrical &amp; Appliance Repair.
      </p>

      <div className="lp-hero-anim lp-hero-anim-4 lp-hero-btns" style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        <GreenBtn onClick={onRegister} style={{ padding: '14px 28px', fontSize: 15 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
          Start free — 14 days
        </GreenBtn>
        <OutlineBtn onClick={() => scrollTo('how-it-works')} style={{ padding: '14px 28px', fontSize: 15 }}>
          See how it works
        </OutlineBtn>
      </div>

      <p className="lp-hero-anim lp-hero-anim-5" style={{ marginTop: 16, fontSize: 13, color: '#94A3B8' }}>
        No credit card required · Setup in under 10 minutes · Cancel anytime
      </p>
    </section>
  )
}

// ─── Section 3: Trust Bar ─────────────────────────────────────────────────────
const STATS = [
  { num: 500,  suffix: '+',  label: 'Businesses',        isFloat: false },
  { num: 29,   suffix: 'M+', label: 'Jobs managed',      isFloat: false },
  { num: 49,   suffix: '',   label: '4.9★ App Store',    display: '4.9★', isFloat: true },
  { num: 44,   suffix: '%',  label: 'Avg revenue growth', isFloat: false },
  { num: 10,   suffix: 'hrs',label: 'Saved per week',    isFloat: false },
]

function StatItem({ stat, started }) {
  const val = useCountUp(stat.num, 1400, started)
  const display = stat.display ? (started ? stat.display : '0.0★') : `${val}${stat.suffix}`
  return (
    <div style={{ textAlign: 'center', padding: '8px 20px', flex: 1 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px', lineHeight: 1.2 }}>{display}</div>
      <div style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>{stat.label}</div>
    </div>
  )
}

function TrustBar() {
  const ref = useRef(null)
  const [started, setStarted] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStarted(true); obs.unobserve(el) } }, { threshold: 0.4 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section ref={ref} style={{ background: '#F8FAFC', borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', padding: '20px 40px' }}>
      <div className="lp-trust-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: 900, margin: '0 auto' }}>
        {STATS.map((s, i) => (
          <div key={s.label} className="lp-trust-item" style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            {i > 0 && <div className="lp-trust-div" style={{ width: 1, height: 36, background: '#E2E8F0', flexShrink: 0 }} />}
            <StatItem stat={s} started={started} />
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Section 4: How It Works ──────────────────────────────────────────────────
const STEPS = [
  { n: '1', label: 'Request',  color: '#3B82F6', bg: '#EFF6FF', desc: 'Client books online, calls in, or AI answers for you' },
  { n: '2', label: 'Quote',    color: '#16A34A', bg: '#F0FDF4', desc: 'Send professional quote in seconds, client approves online' },
  { n: '3', label: 'Schedule', color: '#D97706', bg: '#FFFBEB', desc: 'Assign tech, optimize route, send reminders automatically' },
  { n: '4', label: 'Complete', color: '#7C3AED', bg: '#F5F3FF', desc: 'Photos, signature, diagnosis report — all from the phone' },
  { n: '5', label: 'Get Paid', color: '#16A34A', bg: '#F0FDF4', desc: 'Invoice sent, payment collected, review requested' },
]

function HowItWorks({ onRegister }) {
  const ref = useFadeIn(0.1)
  return (
    <section id="how-it-works" ref={ref} className="lp-fade" style={{ background: '#fff', padding: '72px 40px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>HOW IT WORKS</p>
        <h2 className="lp-section-h2" style={{ fontSize: 36, fontWeight: 800, color: '#0F172A', letterSpacing: '-1px' }}>Five steps to a better business</h2>
      </div>
      <div className="lp-steps" style={{ display: 'flex', alignItems: 'flex-start', maxWidth: 1040, margin: '0 auto 40px', position: 'relative' }}>
        {STEPS.map((s, i) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 8px' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: s.bg, border: `2px solid ${s.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.n}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.55 }}>{s.desc}</div>
            </div>
            {i < STEPS.length - 1 && (
              <div className="lp-step-line" style={{ width: 40, height: 2, background: '#E2E8F0', marginTop: 24, flexShrink: 0 }} />
            )}
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center' }}>
        <GreenBtn onClick={onRegister} style={{ padding: '13px 28px', fontSize: 15 }}>
          Get started free →
        </GreenBtn>
      </div>
    </section>
  )
}

// ─── Section 5: Features Grid ─────────────────────────────────────────────────
const FEATURES = [
  { icon: '📅', label: 'Smart Scheduling',    desc: 'Drag-and-drop dispatch board with real-time technician availability and auto-conflict detection.', iconBg: '#EFF6FF', badge: null },
  { icon: '🔧', label: 'Job Management',      desc: 'Full job lifecycle from request to completion — photos, checklists, parts, and digital sign-off.', iconBg: '#F0FDF4', badge: null },
  { icon: '🧾', label: 'Invoicing & Payments',desc: "One-click invoicing, online card payments, auto-reminders, and QuickBooks sync built in.",          iconBg: '#FFFBEB', badge: null },
  { icon: '🤖', label: 'AI Receptionist',     desc: "Never miss a call. AI answers, qualifies leads, and books jobs 24/7 — even after hours.",            iconBg: '#F5F3FF', badge: 'New',     badgeColor: '#16A34A' },
  { icon: '📱', label: 'Mobile App',          desc: 'Native iOS & Android app for technicians — offline-capable, GPS tracking, camera, signatures.',       iconBg: '#F0FDF4', badge: 'Popular', badgeColor: '#3B82F6' },
  { icon: '📊', label: 'Reports & Analytics', desc: 'Revenue trends, technician performance, job profitability, and customer retention at a glance.',       iconBg: '#FFF7ED', badge: null },
]

function FeaturesGrid({ onRegister }) {
  const ref = useFadeIn(0.08)
  return (
    <section id="features" ref={ref} className="lp-fade" style={{ background: '#F8FAFC', padding: '72px 40px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>FEATURES</p>
        <h2 className="lp-section-h2" style={{ fontSize: 36, fontWeight: 800, color: '#0F172A', letterSpacing: '-1px', marginBottom: 12 }}>Everything your team needs</h2>
        <p style={{ fontSize: 16, color: '#64748B', maxWidth: 480, margin: '0 auto' }}>One platform — no duct tape, no integrations needed.</p>
      </div>

      <div className="lp-feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, maxWidth: 1080, margin: '0 auto 40px', border: '2px solid #F1F5F9', borderRadius: 16, overflow: 'hidden' }}>
        {FEATURES.map((f, i) => (
          <div
            key={f.label}
            className={`lp-feat-card lp-stagger-${i + 1}`}
            onClick={() => scrollTo('pricing')}
            style={{
              background: '#fff', padding: '32px 28px', position: 'relative', cursor: 'pointer',
              borderRight: (i + 1) % 3 === 0 ? 'none' : '2px solid #F1F5F9',
              borderBottom: i < 3 ? '2px solid #F1F5F9' : 'none',
            }}
          >
            {f.badge && (
              <div style={{ position: 'absolute', top: 20, right: 20, background: f.badgeColor, color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 8px', letterSpacing: '0.5px' }}>
                {f.badge}
              </div>
            )}
            <div style={{ width: 44, height: 44, background: f.iconBg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 22 }}>
              {f.icon}
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 8, letterSpacing: '-0.3px' }}>{f.label}</h3>
            <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 12 }}>{f.desc}</p>
            <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>See pricing →</span>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center' }}>
        <GreenBtn onClick={onRegister} style={{ padding: '13px 28px', fontSize: 15 }}>
          Start free trial — all features included
        </GreenBtn>
      </div>
    </section>
  )
}

// ─── Section 6: Pricing ───────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'starter', name: 'STARTER', monthly: 49, yearly: 39,
    desc: 'Perfect for solo operators and small crews.',
    limits: '3 users · 100 clients',
    features: [
      [true,  'Jobs & scheduling'],
      [true,  'Invoicing & payments'],
      [true,  'Mobile app'],
      [true,  'Basic reports'],
      [false, 'Route optimization'],
      [false, 'AI Receptionist'],
    ],
    cta: 'Start free trial', featured: false,
  },
  {
    id: 'professional', name: 'PROFESSIONAL', monthly: 99, yearly: 79,
    desc: 'For growing teams that need more power.',
    limits: '10 users · 500 clients',
    features: [
      [true,  'Everything in Starter'],
      [true,  'Route optimization'],
      [true,  'AI job estimator'],
      [true,  'Advanced reports'],
      [true,  'Digital signatures'],
      [false, 'AI Receptionist'],
    ],
    cta: 'Start free trial', featured: true,
  },
  {
    id: 'business', name: 'BUSINESS', monthly: 199, yearly: 159,
    desc: 'Multi-location businesses with high volume.',
    limits: '25 users · 2,000 clients',
    features: [
      [true, 'Everything in Pro'],
      [true, 'AI Receptionist'],
      [true, 'Multi-branch'],
      [true, 'Custom branding'],
      [true, 'Priority support'],
      [true, 'Purchase orders'],
    ],
    cta: 'Start free trial', featured: false,
  },
  {
    id: 'enterprise', name: 'ENTERPRISE', monthly: 399, yearly: 319,
    desc: 'Unlimited scale with dedicated support.',
    limits: 'Unlimited users & clients',
    features: [
      [true, 'Everything in Business'],
      [true, 'API access'],
      [true, 'Dedicated CSM'],
      [true, 'SLA guarantee'],
      [true, 'Custom integrations'],
      [true, 'SSO / SAML'],
    ],
    cta: 'Contact sales', featured: false,
  },
]

function Pricing({ onRegister, onContact }) {
  const [yearly, setYearly] = useState(false)
  const ref = useFadeIn(0.06)

  return (
    <section id="pricing" ref={ref} className="lp-fade" style={{ background: '#fff', padding: '72px 40px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>PRICING</p>
        <h2 className="lp-section-h2" style={{ fontSize: 36, fontWeight: 800, color: '#0F172A', letterSpacing: '-1px', marginBottom: 20 }}>Simple, transparent pricing</h2>

        {/* Toggle */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 99, padding: '6px 18px' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: yearly ? '#94A3B8' : '#0F172A' }}>Monthly</span>
          <div
            className="lp-toggle-pill"
            onClick={() => setYearly(v => !v)}
            style={{ width: 44, height: 24, background: yearly ? '#16A34A' : '#CBD5E1', borderRadius: 99, position: 'relative', cursor: 'pointer' }}
          >
            <div className="lp-toggle-knob" style={{
              position: 'absolute', top: 3, left: 3, width: 18, height: 18,
              background: '#fff', borderRadius: '50%', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              transform: yearly ? 'translateX(20px)' : 'translateX(0)',
            }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: yearly ? '#0F172A' : '#94A3B8' }}>Yearly</span>
          {yearly && <span style={{ background: '#FEF9C3', color: '#854D0E', fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 8px' }}>Save 20%</span>}
        </div>
      </div>

      <div className="lp-pricing-row" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 1100, margin: '0 auto' }}>
        {PLANS.map(p => (
          <div key={p.id} className="lp-price-card" style={{
            background: '#fff', border: p.featured ? '2px solid #16A34A' : '1.5px solid #E2E8F0',
            borderRadius: 16, padding: '28px 24px', width: 240, position: 'relative', flexShrink: 0,
          }}>
            {p.featured && (
              <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: '#16A34A', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '3px 14px', whiteSpace: 'nowrap' }}>
                Most popular
              </div>
            )}
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: 1.5, marginBottom: 8 }}>{p.name}</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: '#0F172A', letterSpacing: '-1.5px', lineHeight: 1 }}>
                ${yearly ? p.yearly : p.monthly}
              </span>
              <span style={{ fontSize: 13, color: '#94A3B8', marginBottom: 4 }}>/mo</span>
            </div>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>{yearly ? 'billed annually' : 'billed monthly'}</p>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 4 }}>{p.desc}</p>
            <p style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, marginBottom: 16 }}>{p.limits}</p>
            <div style={{ height: 1, background: '#F1F5F9', marginBottom: 16 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 24 }}>
              {p.features.map(([ok, label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {ok ? <CheckIcon /> : <XIcon />}
                  <span style={{ fontSize: 13, color: ok ? '#374151' : '#94A3B8' }}>{label}</span>
                </div>
              ))}
            </div>
            {p.featured
              ? <GreenBtn onClick={onRegister} style={{ width: '100%' }}>{p.cta}</GreenBtn>
              : p.id === 'enterprise'
                ? <OutlineBtn onClick={onContact} style={{ width: '100%' }}>{p.cta}</OutlineBtn>
                : <OutlineBtn onClick={onRegister} style={{ width: '100%' }}>{p.cta}</OutlineBtn>
            }
          </div>
        ))}
      </div>

      <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: '#94A3B8' }}>
        All plans include 14-day free trial · No credit card required · Cancel anytime
      </p>
    </section>
  )
}

// ─── Section 7: Comparison ────────────────────────────────────────────────────
const COMPARE = [
  {
    name: 'CustomsFieldPro', price: 'From $49/mo', you: true, url: null,
    rows: [
      [true,      'AI Receptionist',    'Included'],
      [true,      'Route optimization', 'All plans'],
      [true,      'Digital signatures', 'Included'],
      [true,      'Equipment history',  'Included'],
      [true,      'Warranty module',    'Included'],
    ],
  },
  {
    name: 'Jobber', price: 'From $69/mo', you: false, url: 'https://getjobber.com',
    rows: [
      ['addon',   'AI Receptionist',    '+$99/mo add-on'],
      ['limited', 'Route optimization', 'Limited'],
      [true,      'Digital signatures', 'Included'],
      [false,     'Equipment history',  'Not available'],
      [false,     'Warranty module',    'Not available'],
    ],
  },
  {
    name: 'ServiceTitan', price: '$250+/user/mo', you: false, url: 'https://servicetitan.com',
    rows: [
      [true, 'AI Receptionist',    'Included'],
      [true, 'Route optimization', 'Included'],
      [true, 'Digital signatures', 'Included'],
      [true, 'Equipment history',  'Included'],
      [true, 'Warranty module',    'Included'],
    ],
    note: 'Enterprise pricing only',
  },
]

function CompareIcon({ val }) {
  if (val === true)      return <CheckIcon color="#16A34A" size={15} />
  if (val === false)     return <XIcon size={15} />
  if (val === 'addon')   return <span style={{ fontSize: 11, fontWeight: 700, color: '#D97706' }}>Add-on</span>
  if (val === 'limited') return <span style={{ fontSize: 11, fontWeight: 700, color: '#D97706' }}>Limited</span>
  return null
}

function Comparison({ onRegister, navigate }) {
  const ref = useFadeIn(0.08)
  return (
    <section id="compare" ref={ref} className="lp-fade" style={{ background: '#F8FAFC', padding: '72px 40px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>COMPARE</p>
        <h2 className="lp-section-h2" style={{ fontSize: 36, fontWeight: 800, color: '#0F172A', letterSpacing: '-1px' }}>Why teams choose CustomsFieldPro</h2>
      </div>

      <div className="lp-compare-row" style={{ display: 'flex', gap: 16, justifyContent: 'center', maxWidth: 900, margin: '0 auto 36px', flexWrap: 'wrap' }}>
        {COMPARE.map(c => (
          <div key={c.name} style={{ flex: 1, minWidth: 240, background: '#fff', border: c.you ? '2px solid #16A34A' : '1.5px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
            {c.you && (
              <div style={{ background: '#16A34A', color: '#fff', fontSize: 11, fontWeight: 700, textAlign: 'center', padding: '5px 0', letterSpacing: 1 }}>
                YOU ARE HERE
              </div>
            )}
            <div style={{ padding: '20px 20px 4px' }}>
              <div
                style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 2, cursor: c.url ? 'pointer' : 'default' }}
                onClick={() => c.url && window.open(c.url, '_blank', 'noopener')}
              >
                {c.name}{c.url && <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 4 }}>↗</span>}
              </div>
              <div style={{ fontSize: 13, color: c.you ? '#16A34A' : '#64748B', fontWeight: 600, marginBottom: 14 }}>{c.price}</div>
              {c.note && <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, marginBottom: 10 }}>{c.note}</div>}
            </div>
            <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {c.rows.map(([val, label, detail]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CompareIcon val={val} />
                    <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#94A3B8', textAlign: 'right' }}>{detail}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center' }}>
        <GreenBtn onClick={onRegister} style={{ padding: '13px 28px', fontSize: 15 }}>
          Switch to CustomsFieldPro — start free →
        </GreenBtn>
      </div>
    </section>
  )
}

// ─── Section 8: Testimonials ──────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    quote: "CustomsFieldPro replaced 3 separate tools we were paying for. Scheduling, invoicing, and customer follow-up all in one place. Our collection rate went from 72% to 96% in the first month.",
    name: 'Mike Rodriguez', company: 'Rodriguez HVAC', location: 'Texas', techs: 12, initials: 'MR', color: '#3B82F6',
  },
  {
    quote: "The AI Receptionist paid for itself in week one. It booked 4 jobs overnight that we would've missed. Our team is focused on work, not answering phones.",
    name: 'Sarah Chen', company: 'Chen Plumbing', location: 'California', techs: 8, initials: 'SC', color: '#16A34A',
  },
  {
    quote: "Route optimization saves us 2 hours of driving every day across 15 technicians. That's 30 hours of labor recaptured per week — nearly $3,000 in billable time.",
    name: 'David Patel', company: 'Patel Electrical', location: 'Florida', techs: 15, initials: 'DP', color: '#7C3AED',
  },
]

function Testimonials() {
  const ref = useFadeIn(0.08)
  return (
    <section id="customers" ref={ref} className="lp-fade" style={{ background: '#fff', padding: '72px 40px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>CUSTOMERS</p>
        <h2 className="lp-section-h2" style={{ fontSize: 36, fontWeight: 800, color: '#0F172A', letterSpacing: '-1px' }}>Loved by 500+ field service teams</h2>
      </div>
      <div className="lp-testi-row" style={{ display: 'flex', gap: 20, maxWidth: 1040, margin: '0 auto', flexWrap: 'wrap' }}>
        {TESTIMONIALS.map(t => (
          <div key={t.name} className="lp-feat-card" style={{ flex: 1, minWidth: 280, background: '#F8FAFC', border: '1.5px solid #F1F5F9', borderRadius: 14, padding: '24px 22px' }}>
            <Stars />
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.65, fontStyle: 'italic', marginBottom: 20 }}>
              &ldquo;{t.quote}&rdquo;
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {t.initials}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{t.name}</div>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>{t.company} · {t.location} · {t.techs} techs</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Section 9: FAQ ───────────────────────────────────────────────────────────
const FAQS = [
  ['Is there a free trial?',                    '14 days, all features included, no credit card required. If you love it, pick a plan. If not, your data can be exported anytime.'],
  ['Can I import my existing clients?',         'Yes — we support CSV import for clients, job history, and equipment records. Our onboarding team will help you get set up in under a day.'],
  ['Does it work on mobile?',                   'Yes. CustomsFieldPro has native iOS and Android apps for field technicians. They work offline too — syncs when connection is restored.'],
  ['Can I customize it for my business type?',  'Absolutely. You can customize job types, checklists, invoice templates, and branding to match your specific trade and workflow.'],
  ["What happens to my data if I cancel?",      'Your data is kept for 30 days after cancellation so you can export everything. After that, it is permanently deleted. You own your data.'],
  ['Do you integrate with QuickBooks?',         'Yes — full two-way sync with QuickBooks Online. Invoices, payments, and customers stay in sync automatically with no manual work.'],
]

function FAQ({ onContact }) {
  const [open, setOpen] = useState(null)
  const ref = useFadeIn(0.08)

  return (
    <section id="faq" ref={ref} className="lp-fade" style={{ background: '#F8FAFC', padding: '72px 40px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>FAQ</p>
        <h2 className="lp-section-h2" style={{ fontSize: 36, fontWeight: 800, color: '#0F172A', letterSpacing: '-1px' }}>Common questions</h2>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto 28px', border: '1.5px solid #E2E8F0', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
        {FAQS.map(([q, a], i) => (
          <div key={i} style={{ borderBottom: i < FAQS.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', background: 'none', border: 'none', cursor: 'pointer', gap: 16, textAlign: 'left', fontFamily: 'inherit' }}
            >
              <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>{q}</span>
              <ChevronDown open={open === i} />
            </button>
            <div className="lp-faq-answer" style={{ maxHeight: open === i ? 180 : 0, opacity: open === i ? 1 : 0 }}>
              <p style={{ padding: '0 22px 18px', fontSize: 14, color: '#64748B', lineHeight: 1.65 }}>{a}</p>
            </div>
          </div>
        ))}
      </div>

      <p style={{ textAlign: 'center', fontSize: 14, color: '#64748B' }}>
        Still have questions?{' '}
        <span
          onClick={onContact}
          style={{ color: '#16A34A', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
        >
          Contact support →
        </span>
      </p>
    </section>
  )
}

// ─── Section 10: Final CTA ────────────────────────────────────────────────────
function FinalCTA({ onRegister, onContact }) {
  const ref = useFadeIn(0.1)
  return (
    <div ref={ref} className="lp-fade lp-cta-box" style={{ background: '#0F172A', borderRadius: 20, margin: '0 40px 72px', padding: '64px 48px', textAlign: 'center' }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>GET STARTED TODAY</p>
      <h2 className="lp-cta-h2" style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-1px', maxWidth: 560, margin: '0 auto 14px' }}>
        Ready to grow your field service business?
      </h2>
      <p style={{ fontSize: 16, color: '#94A3B8', marginBottom: 32, lineHeight: 1.6 }}>
        Join 500+ businesses already running smarter with CustomsFieldPro.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={onRegister} className="lp-btn-green" style={{
          background: '#fff', color: '#0F172A', border: 'none', borderRadius: 10,
          padding: '14px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Start free trial →
        </button>
        <button onClick={onContact} className="lp-btn-outline" style={{
          background: 'transparent', color: '#94A3B8', border: '1.5px solid #334155',
          borderRadius: 10, padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Talk to sales
        </button>
      </div>
      <p style={{ marginTop: 20, fontSize: 12, color: '#475569' }}>
        14-day free trial · All features included · Cancel anytime · Setup in 10 minutes
      </p>
    </div>
  )
}

// ─── Section 11: Footer ───────────────────────────────────────────────────────
function Footer({ navigate, onRegister }) {
  function FooterLink({ label, onClick }) {
    return (
      <div
        onClick={onClick}
        className="lp-footer-link"
        style={{ fontSize: 14, color: '#64748B', marginBottom: 10, cursor: 'pointer' }}
      >
        {label}
      </div>
    )
  }

  return (
    <footer style={{ background: '#F8FAFC', borderTop: '1px solid #F1F5F9' }}>
      <div className="lp-footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, maxWidth: 1080, margin: '0 auto', padding: '48px 40px 40px' }}>
        {/* Col 1 */}
        <div>
          <Logo onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 14, lineHeight: 1.65, maxWidth: 280 }}>
            The all-in-one field service platform for HVAC, Plumbing, Electrical, and Appliance Repair businesses.
          </p>
        </div>
        {/* Col 2 */}
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>Product</p>
          <FooterLink label="Features"       onClick={() => scrollTo('features')} />
          <FooterLink label="Pricing"        onClick={() => scrollTo('pricing')} />
          <FooterLink label="Mobile App"     onClick={() => scrollTo('features')} />
          <FooterLink label="AI Receptionist" onClick={() => scrollTo('features')} />
          <FooterLink label="Integrations"   onClick={() => scrollTo('pricing')} />
        </div>
        {/* Col 3 */}
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>Compare</p>
          <FooterLink label="vs Jobber"         onClick={() => navigate('/compare/jobber')} />
          <FooterLink label="vs ServiceTitan"   onClick={() => navigate('/compare/servicetitan')} />
          <FooterLink label="vs Housecall Pro"  onClick={() => navigate('/compare/housecall-pro')} />
          <FooterLink label="vs Workiz"         onClick={() => navigate('/compare/workiz')} />
        </div>
        {/* Col 4 */}
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>Company</p>
          <FooterLink label="About"          onClick={() => scrollTo('customers')} />
          <FooterLink label="Contact"        onClick={() => navigate('/contact')} />
          <FooterLink label="Privacy Policy" onClick={() => navigate('/privacy')} />
          <FooterLink label="Terms"          onClick={() => navigate('/terms')} />
          <FooterLink label="Security"       onClick={() => navigate('/contact')} />
        </div>
      </div>
      <div style={{ borderTop: '1px solid #F1F5F9', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <p
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ fontSize: 13, color: '#94A3B8', cursor: 'pointer' }}
        >
          © 2026 CustomsFieldPro. All rights reserved.
        </p>
        <p style={{ fontSize: 13, color: '#CBD5E1' }}>HVAC · Plumbing · Electrical · Appliance Repair</p>
      </div>
    </footer>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('')

  // Inject CSS once
  useEffect(() => {
    const id = 'lp-global-css'
    if (!document.getElementById(id)) {
      const tag = document.createElement('style')
      tag.id = id
      tag.textContent = CSS
      document.head.appendChild(tag)
    }
  }, [])

  // Scroll to hash or ?section= on load
  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    const param = new URLSearchParams(window.location.search).get('section')
    const target = hash || param
    if (target) setTimeout(() => scrollTo(target), 150)
  }, [])

  // Active section tracking
  useEffect(() => {
    const ids = ['features', 'pricing', 'compare', 'customers', 'faq']
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        })
      },
      { threshold: 0.3 }
    )
    ids.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [])

  const goLogin    = useCallback(() => navigate('/login'),    [navigate])
  const goRegister = useCallback(() => navigate('/register'), [navigate])
  const goContact  = useCallback(() => navigate('/contact'),  [navigate])

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <Nav onLogin={goLogin} onRegister={goRegister} activeSection={activeSection} />
      <Hero onRegister={goRegister} />
      <TrustBar />
      <HowItWorks onRegister={goRegister} />
      <FeaturesGrid onRegister={goRegister} />
      <Pricing onRegister={goRegister} onContact={goContact} />
      <Comparison onRegister={goRegister} navigate={navigate} />
      <Testimonials />
      <FAQ onContact={goContact} />
      <FinalCTA onRegister={goRegister} onContact={goContact} />
      <Footer navigate={navigate} onRegister={goRegister} />
    </div>
  )
}
