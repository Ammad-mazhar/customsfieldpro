import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

function Logo({ onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
      <div style={{ width: 32, height: 32, background: '#16A34A', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.3px' }}>FieldFlow</span>
    </div>
  )
}

function Check({ color = '#16A34A' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function X() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function Amber({ label }) {
  return <span style={{ fontSize: 11, fontWeight: 700, color: '#D97706', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 5, padding: '1px 7px' }}>{label}</span>
}

const COMPETITOR_DATA = {
  jobber: {
    name: 'Jobber',
    tagline: 'How FieldFlow compares to Jobber',
    heroText: "Jobber is a solid tool, but it charges extra for features FieldFlow includes in every plan — and it doesn't have AI Receptionist at any price.",
    theirPrice: 'From $69/mo',
    theirUrl: 'https://getjobber.com',
    rows: [
      { label: 'Starting price',        ff: '$49/mo',   them: '$69/mo',        ffOk: true,    themOk: false },
      { label: 'Free trial',            ff: '14 days',  them: '14 days',       ffOk: true,    themOk: true  },
      { label: 'AI Receptionist',       ff: 'Included', them: '+$99/mo add-on',ffOk: true,    themOk: 'addon'},
      { label: 'Route optimization',    ff: 'All plans',them: 'Limited',       ffOk: true,    themOk: 'limited'},
      { label: 'Digital signatures',    ff: 'Included', them: 'Included',      ffOk: true,    themOk: true  },
      { label: 'Equipment history',     ff: 'Included', them: 'Not available', ffOk: true,    themOk: false },
      { label: 'Warranty module',       ff: 'Included', them: 'Not available', ffOk: true,    themOk: false },
      { label: 'Multi-branch',          ff: 'Business+',them: 'Connect plan',  ffOk: true,    themOk: true  },
      { label: 'API access',            ff: 'Business+',them: 'Connect plan',  ffOk: true,    themOk: true  },
      { label: 'Native mobile app',     ff: 'Included', them: 'Included',      ffOk: true,    themOk: true  },
      { label: 'QuickBooks sync',       ff: 'Included', them: 'Included',      ffOk: true,    themOk: true  },
      { label: 'Custom branding',       ff: 'Business+',them: 'Connect plan',  ffOk: true,    themOk: true  },
    ],
    switchReasons: [
      'AI Receptionist is built-in — no $99/mo add-on',
      'Full route optimization on every paid plan',
      'Equipment and warranty tracking included',
      'Starts at $49/mo vs $69/mo',
    ],
  },
  servicetitan: {
    name: 'ServiceTitan',
    tagline: 'How FieldFlow compares to ServiceTitan',
    heroText: "ServiceTitan is built for large enterprises. At $250+ per user per month, most small and mid-size field service businesses pay far more than they need to.",
    theirPrice: '$250+/user/mo',
    theirUrl: 'https://servicetitan.com',
    rows: [
      { label: 'Starting price',        ff: '$49/mo flat',  them: '$250+/user/mo', ffOk: true, themOk: false },
      { label: 'Free trial',            ff: '14 days',      them: 'No',            ffOk: true, themOk: false },
      { label: 'Setup time',            ff: 'Under 10 min', them: '90+ day onboard',ffOk: true, themOk: false },
      { label: 'AI Receptionist',       ff: 'Included',     them: 'Included',      ffOk: true, themOk: true  },
      { label: 'Route optimization',    ff: 'All plans',    them: 'Included',      ffOk: true, themOk: true  },
      { label: 'Digital signatures',    ff: 'Included',     them: 'Included',      ffOk: true, themOk: true  },
      { label: 'Equipment history',     ff: 'Included',     them: 'Included',      ffOk: true, themOk: true  },
      { label: 'Warranty module',       ff: 'Included',     them: 'Included',      ffOk: true, themOk: true  },
      { label: 'Native mobile app',     ff: 'Included',     them: 'Included',      ffOk: true, themOk: true  },
      { label: 'Small business focus',  ff: 'Built for SMB',them: 'Enterprise only',ffOk: true,themOk: false },
      { label: 'No long-term contract', ff: 'Month-to-month',them: 'Annual contract',ffOk: true,themOk: false },
    ],
    switchReasons: [
      'Flat monthly pricing — not per-user',
      'No 90-day onboarding — set up in under 10 minutes',
      'No annual contract required',
      '14-day free trial, no credit card needed',
    ],
  },
  'housecall-pro': {
    name: 'Housecall Pro',
    tagline: 'How FieldFlow compares to Housecall Pro',
    heroText: "Housecall Pro is a capable platform but charges for add-ons that FieldFlow includes by default, and lacks AI-powered features.",
    theirPrice: 'From $79/mo',
    theirUrl: 'https://housecallpro.com',
    rows: [
      { label: 'Starting price',     ff: '$49/mo',    them: '$79/mo',          ffOk: true, themOk: false },
      { label: 'Free trial',         ff: '14 days',   them: '14 days',         ffOk: true, themOk: true  },
      { label: 'AI Receptionist',    ff: 'Included',  them: 'Not available',   ffOk: true, themOk: false },
      { label: 'Route optimization', ff: 'All plans', them: 'Max plan only',   ffOk: true, themOk: 'limited'},
      { label: 'Digital signatures', ff: 'Included',  them: 'Included',        ffOk: true, themOk: true  },
      { label: 'Equipment history',  ff: 'Included',  them: 'Limited',         ffOk: true, themOk: 'limited'},
      { label: 'Warranty module',    ff: 'Included',  them: 'Not available',   ffOk: true, themOk: false },
      { label: 'Native mobile app',  ff: 'Included',  them: 'Included',        ffOk: true, themOk: true  },
      { label: 'QuickBooks sync',    ff: 'Included',  them: 'Included',        ffOk: true, themOk: true  },
      { label: 'Multi-branch',       ff: 'Business+', them: 'Max plan only',   ffOk: true, themOk: 'limited'},
    ],
    switchReasons: [
      'AI Receptionist included — not available on Housecall Pro at any price',
      'Starts at $49/mo vs $79/mo',
      'Route optimization on every plan',
      'Full warranty and equipment tracking',
    ],
  },
  workiz: {
    name: 'Workiz',
    tagline: 'How FieldFlow compares to Workiz',
    heroText: "Workiz is a newer platform with solid basics, but it lacks the AI-powered features and depth that growing field service businesses need.",
    theirPrice: 'From $65/mo',
    theirUrl: 'https://workiz.com',
    rows: [
      { label: 'Starting price',     ff: '$49/mo',    them: '$65/mo',          ffOk: true, themOk: false },
      { label: 'Free trial',         ff: '14 days',   them: '7 days',          ffOk: true, themOk: 'limited'},
      { label: 'AI Receptionist',    ff: 'Included',  them: 'Not available',   ffOk: true, themOk: false },
      { label: 'Route optimization', ff: 'All plans', them: 'Limited',         ffOk: true, themOk: 'limited'},
      { label: 'Digital signatures', ff: 'Included',  them: 'Included',        ffOk: true, themOk: true  },
      { label: 'Equipment history',  ff: 'Included',  them: 'Not available',   ffOk: true, themOk: false },
      { label: 'Warranty module',    ff: 'Included',  them: 'Not available',   ffOk: true, themOk: false },
      { label: 'Native mobile app',  ff: 'Included',  them: 'Included',        ffOk: true, themOk: true  },
      { label: 'QuickBooks sync',    ff: 'Included',  them: 'Included',        ffOk: true, themOk: true  },
      { label: 'AI job estimator',   ff: 'Pro+',      them: 'Not available',   ffOk: true, themOk: false },
    ],
    switchReasons: [
      'AI Receptionist and AI job estimator — not available in Workiz',
      'Cheaper starting price ($49 vs $65)',
      'Longer free trial — 14 days vs 7',
      'Full equipment history and warranty tracking',
    ],
  },
}

function StatusCell({ val }) {
  if (val === true)      return <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Check /><span style={{ fontSize: 13, color: '#374151' }}>Included</span></div>
  if (val === false)     return <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><X /><span style={{ fontSize: 13, color: '#94A3B8' }}>Not available</span></div>
  if (val === 'addon')   return <Amber label="Add-on" />
  if (val === 'limited') return <Amber label="Limited" />
  return <span style={{ fontSize: 13, color: '#374151' }}>{val}</span>
}

export default function ComparePage() {
  const navigate = useNavigate()
  const { competitor } = useParams()

  useEffect(() => { window.scrollTo(0, 0) }, [competitor])

  const data = COMPETITOR_DATA[competitor]

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <p style={{ fontSize: 48 }}>🔍</p>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A' }}>Comparison page not found</h1>
        <p style={{ fontSize: 15, color: '#64748B' }}>We haven&apos;t published this comparison yet.</p>
        <button onClick={() => navigate('/')} style={{ marginTop: 8, background: '#16A34A', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Back to home
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Nav */}
      <nav style={{ height: 64, background: '#fff', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', position: 'sticky', top: 0, zIndex: 100 }}>
        <Logo onClick={() => navigate('/')} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/login')} style={{ fontSize: 14, fontWeight: 600, color: '#475569', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 14px', borderRadius: 8, fontFamily: 'inherit' }}>
            Sign in
          </button>
          <button onClick={() => navigate('/register')} style={{ background: '#16A34A', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Start free trial
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '56px 40px 80px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>COMPARE</p>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: '#0F172A', letterSpacing: '-1px', marginBottom: 16 }}>{data.tagline}</h1>
          <p style={{ fontSize: 17, color: '#64748B', maxWidth: 580, margin: '0 auto', lineHeight: 1.65 }}>{data.heroText}</p>
        </div>

        {/* Price comparison pills */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 48, flexWrap: 'wrap' }}>
          <div style={{ background: '#F0FDF4', border: '2px solid #16A34A', borderRadius: 12, padding: '20px 32px', textAlign: 'center', minWidth: 160 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>FieldFlow</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>$49<span style={{ fontSize: 14, fontWeight: 400, color: '#94A3B8' }}>/mo</span></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 20, color: '#CBD5E1', fontWeight: 300 }}>vs</div>
          <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '20px 32px', textAlign: 'center', minWidth: 160 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>{data.name}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#64748B', letterSpacing: '-0.5px' }}>{data.theirPrice}</div>
          </div>
        </div>

        {/* Comparison table */}
        <div style={{ border: '1.5px solid #E2E8F0', borderRadius: 14, overflow: 'hidden', marginBottom: 48 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
            <div style={{ padding: '12px 20px', fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>Feature</div>
            <div style={{ padding: '12px 20px', fontSize: 12, fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', letterSpacing: 1, borderLeft: '1px solid #E2E8F0' }}>FieldFlow</div>
            <div style={{ padding: '12px 20px', fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, borderLeft: '1px solid #E2E8F0' }}>{data.name}</div>
          </div>

          {data.rows.map((row, i) => (
            <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: i < data.rows.length - 1 ? '1px solid #F1F5F9' : 'none', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
              <div style={{ padding: '14px 20px', fontSize: 14, fontWeight: 600, color: '#374151' }}>{row.label}</div>
              <div style={{ padding: '14px 20px', borderLeft: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check />
                <span style={{ fontSize: 13, color: '#374151' }}>{row.ff}</span>
              </div>
              <div style={{ padding: '14px 20px', borderLeft: '1px solid #F1F5F9', display: 'flex', alignItems: 'center' }}>
                <StatusCell val={row.themOk} />
                {row.themOk === true && row.them !== 'Included' && (
                  <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 6 }}>({row.them})</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Why switch */}
        <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: 14, padding: '28px 32px', marginBottom: 48 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Why teams switch from {data.name} to FieldFlow</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.switchReasons.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Check color="#16A34A" />
                <span style={{ fontSize: 15, color: '#166534' }}>{r}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ background: '#0F172A', borderRadius: 16, padding: '40px 48px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', marginBottom: 10 }}>
            Ready to make the switch?
          </h2>
          <p style={{ fontSize: 15, color: '#94A3B8', marginBottom: 28 }}>
            Start your 14-day free trial — no credit card required. We will help you import your data from {data.name}.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/register')} style={{ background: '#16A34A', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Start free trial →
            </button>
            <button onClick={() => navigate('/contact')} style={{ background: 'transparent', color: '#94A3B8', border: '1.5px solid #334155', borderRadius: 10, padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Talk to sales
            </button>
          </div>
          <p style={{ marginTop: 16, fontSize: 12, color: '#475569' }}>14-day free trial · All features · Cancel anytime</p>
        </div>

        {/* Other comparisons */}
        <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid #F1F5F9' }}>
          <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 12 }}>See other comparisons:</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {Object.entries(COMPETITOR_DATA)
              .filter(([key]) => key !== competitor)
              .map(([key, c]) => (
                <button key={key} onClick={() => navigate(`/compare/${key}`)} style={{
                  background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 8,
                  padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#475569',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  FieldFlow vs {c.name}
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
