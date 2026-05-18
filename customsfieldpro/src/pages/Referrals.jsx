import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const FAKE_REFERRALS = [
  { business: 'Sunrise Plumbing', signedUp: '2026-03-12', status: 'Converted', credit: '$99' },
  { business: 'Metro HVAC Services', signedUp: '2026-04-01', status: 'Converted', credit: '$99' },
  { business: 'QuickFix Electric', signedUp: '2026-04-22', status: 'Pending', credit: '—' },
]

function generateReferralCode(user) {
  const src = user?.id || user?.name || 'customsfieldpro'
  try {
    return btoa(src).replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase()
  } catch {
    return 'FF1234'
  }
}

export default function Referrals() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const code = generateReferralCode(user)
  const referralLink = `customsfieldprocrm.com/register?ref=${code}`

  function copyLink() {
    navigator.clipboard?.writeText(`https://${referralLink}`).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shareEmail() {
    const subject = encodeURIComponent('Try CustomsFieldPro — Field Service Software')
    const body = encodeURIComponent(
      `Hi,\n\nI've been using CustomsFieldPro for my field service business and it's been fantastic. I think it would be a great fit for you too.\n\nYou can sign up here: https://${referralLink}\n\nThis will give you a 14-day free trial.\n\nBest,\n${user?.name || 'A CustomsFieldPro User'}`
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const convertedCount = FAKE_REFERRALS.filter(r => r.status === 'Converted').length

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary, #111827)', margin: '0 0 4px' }}>
        Referral Program
      </h1>
      <p style={{ fontSize: 14, color: 'var(--color-text-secondary, #6b7280)', margin: '0 0 28px' }}>
        Earn free months by referring other field service businesses to CustomsFieldPro.
      </p>

      {/* Referral card */}
      <div style={{
        background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
        borderRadius: 16, padding: 28, marginBottom: 24, color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>🎁 Refer a Business &amp; Earn</h2>
            <p style={{ fontSize: 14, color: '#bfdbfe', margin: '0 0 20px', maxWidth: 420 }}>
              Get <strong style={{ color: '#fff' }}>1 month FREE</strong> for every business you refer that signs up for a paid plan. No limit on referrals.
            </p>

            {/* Referral link */}
            <div style={{
              background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 13, color: '#eff6ff', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {referralLink}
              </span>
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                <button
                  onClick={copyLink}
                  style={{
                    background: copied ? '#16a34a' : '#fff', color: copied ? '#fff' : '#2563eb',
                    border: 'none', borderRadius: 7, padding: '7px 16px',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {copied ? '✓ Copied!' : 'Copy Link'}
                </button>
                <button
                  onClick={shareEmail}
                  style={{
                    background: 'rgba(255,255,255,0.15)', color: '#fff',
                    border: '1px solid rgba(255,255,255,0.3)', borderRadius: 7,
                    padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Share via Email
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{
            background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '16px 20px',
            minWidth: 180, textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 4px', fontSize: 12, color: '#bfdbfe' }}>Credits Earned</p>
            <p style={{ margin: '0 0 2px', fontSize: 28, fontWeight: 800 }}>2 months</p>
            <p style={{ margin: 0, fontSize: 12, color: '#86efac' }}>$198 value</p>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: 12, paddingTop: 10 }}>
              <p style={{ margin: '0 0 2px', fontSize: 12, color: '#bfdbfe' }}>
                {FAKE_REFERRALS.length} signups · {convertedCount} converted
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{
        background: 'var(--card-bg, #fff)', border: '1px solid var(--color-border-primary, #e5e7eb)',
        borderRadius: 14, padding: 24, marginBottom: 24,
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary, #111827)', margin: '0 0 18px' }}>
          How It Works
        </h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { step: 1, title: 'Share Your Link', desc: 'Send your unique referral link to other field service business owners.' },
            { step: 2, title: 'They Sign Up', desc: 'Your contact creates a CustomsFieldPro account using your referral link.' },
            { step: 3, title: 'You Both Earn', desc: 'When they convert to a paid plan, you get 1 free month credited automatically.' },
          ].map(s => (
            <div key={s.step} style={{ flex: '1 1 180px', display: 'flex', gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: '#eff6ff',
                color: '#2563eb', fontWeight: 800, fontSize: 15, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {s.step}
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary, #111827)' }}>{s.title}</h4>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary, #6b7280)', lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Referral history table */}
      <div style={{
        background: 'var(--card-bg, #fff)', border: '1px solid var(--color-border-primary, #e5e7eb)',
        borderRadius: 14, padding: 24, marginBottom: 24,
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary, #111827)', margin: '0 0 16px' }}>
          Referral History
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border-primary, #e5e7eb)' }}>
              {['Business', 'Signed Up', 'Status', 'Credit Earned'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FAKE_REFERRALS.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-border-primary, #f3f4f6)' }}>
                <td style={{ padding: '12px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary, #111827)' }}>{r.business}</td>
                <td style={{ padding: '12px', fontSize: 13, color: 'var(--color-text-secondary, #6b7280)' }}>{r.signedUp}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    display: 'inline-block', borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600,
                    background: r.status === 'Converted' ? '#dcfce7' : '#fef9c3',
                    color: r.status === 'Converted' ? '#16a34a' : '#ca8a04',
                  }}>
                    {r.status}
                  </span>
                </td>
                <td style={{ padding: '12px', fontSize: 14, fontWeight: 600, color: r.credit !== '—' ? '#16a34a' : '#9ca3af' }}>
                  {r.credit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {FAKE_REFERRALS.length === 0 && (
          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 14, padding: '20px 0' }}>
            No referrals yet. Start sharing your link!
          </p>
        )}
      </div>

      {/* Terms */}
      <div style={{ padding: '0 4px' }}>
        <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.7 }}>
          <strong>Terms:</strong> Referral credits are applied after the referred business completes their first paid billing cycle. Credits are non-transferable and have no cash value. CustomsFieldPro reserves the right to modify or cancel the referral program at any time with 30 days notice. Self-referrals are not permitted. Credits expire 12 months after issuance.
        </p>
      </div>
    </div>
  )
}
