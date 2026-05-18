import { useState } from 'react'
import { MetricCard, Card, CardHeader, Btn, Badge, PlanBadge } from './SuperAdmin'
import { SA_TENANTS } from './saData'

function RiskBadge({ score }) {
  const level = score >= 80 ? 'Critical' : score >= 60 ? 'High' : score >= 40 ? 'Medium' : 'Low'
  const styles = {
    Critical: { bg: '#7f1d1d', color: '#fca5a5' },
    High:     { bg: '#fee2e2', color: '#dc2626' },
    Medium:   { bg: '#fef9c3', color: '#b45309' },
    Low:      { bg: '#f0fdf4', color: '#15803d' },
  }[level]
  return (
    <span style={{ background: styles.bg, color: styles.color, borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
      {level}
    </span>
  )
}

function RiskBar({ score }) {
  const color = score >= 80 ? '#dc2626' : score >= 60 ? '#d97706' : score >= 40 ? '#ca8a04' : '#16a34a'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color, width: 32, textAlign: 'right' }}>{score}</span>
    </div>
  )
}

const RISK_SIGNALS = [
  { key: 'no_login_7d',     label: 'No login in 7+ days',      weight: 25 },
  { key: 'low_usage',       label: 'Usage < 20% of plan limit', weight: 20 },
  { key: 'failed_payment',  label: 'Failed payment',            weight: 30 },
  { key: 'downgrade',       label: 'Recent plan downgrade',     weight: 20 },
  { key: 'support_tickets', label: '3+ unresolved tickets',     weight: 15 },
  { key: 'low_onboarding',  label: 'Onboarding < 40%',         weight: 20 },
]

const ACTION_TEMPLATES = {
  critical: "Hi {name}, we noticed you haven't been active recently. We'd love to understand any challenges — book a free call with our success team and we'll help you get the most out of CustomsFieldPro.",
  high:     "Hi {name}, as a valued customer, your success matters to us. We have some tips and features that could make a big difference for your team. Can we schedule a quick check-in?",
  medium:   "Hi {name}, here are some CustomsFieldPro tips based on your usage that might save your team hours each week...",
}

export default function SAChurnRisk() {
  const [filter, setFilter] = useState('all')
  const [emailId, setEmailId] = useState(null)
  const [emailText, setEmailText] = useState('')
  const [actioned, setActioned] = useState({})

  const tenants = SA_TENANTS.filter(t => t.churnScore != null && t.status !== 'Cancelled')
    .sort((a, b) => b.churnScore - a.churnScore)

  const critical = tenants.filter(t => t.churnScore >= 80)
  const high     = tenants.filter(t => t.churnScore >= 60 && t.churnScore < 80)
  const medium   = tenants.filter(t => t.churnScore >= 40 && t.churnScore < 60)
  const low      = tenants.filter(t => t.churnScore < 40)

  const filtered = filter === 'all' ? tenants
    : filter === 'critical' ? critical
    : filter === 'high' ? high
    : filter === 'medium' ? medium
    : low

  const atRisk = tenants.filter(t => t.churnScore >= 60)
  const mrrAtRisk = atRisk.reduce((s, t) => s + (t.mrr || 0), 0)

  function openEmail(t) {
    const level = t.churnScore >= 80 ? 'critical' : t.churnScore >= 60 ? 'high' : 'medium'
    const template = ACTION_TEMPLATES[level] || ACTION_TEMPLATES.medium
    setEmailText(template.replace(/{name}/g, t.name))
    setEmailId(emailId === t.id ? null : t.id)
  }

  function markActioned(id) {
    setActioned(a => ({ ...a, [id]: true }))
    setEmailId(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <MetricCard label="Critical Risk (80+)"  value={critical.length}              color="#dc2626" sub="immediate action" />
        <MetricCard label="High Risk (60–79)"    value={high.length}                  color="#d97706" />
        <MetricCard label="Medium Risk (40–59)"  value={medium.length}                color="#ca8a04" />
        <MetricCard label="MRR at Risk"          value={`$${mrrAtRisk.toLocaleString()}`} color="#dc2626" sub="high + critical" />
        <MetricCard label="Avg Churn Score"      value={tenants.length ? Math.round(tenants.reduce((s, t) => s + t.churnScore, 0) / tenants.length) : 0} sub="across all tenants" />
      </div>

      {/* Risk signals legend */}
      <Card>
        <CardHeader title="Risk Signal Weights" sub="How churn scores are calculated" />
        <div style={{ padding: '12px 20px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {RISK_SIGNALS.map(s => (
            <div key={s.key} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
              <span style={{ color: '#374151', fontWeight: 600 }}>{s.label}</span>
              <span style={{ marginLeft: 8, color: '#dc2626', fontWeight: 700 }}>+{s.weight} pts</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[
          { key: 'all',      label: `All (${tenants.length})` },
          { key: 'critical', label: `Critical (${critical.length})` },
          { key: 'high',     label: `High (${high.length})` },
          { key: 'medium',   label: `Medium (${medium.length})` },
          { key: 'low',      label: `Low (${low.length})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '6px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              border: `1.5px solid ${filter === f.key ? '#2563eb' : '#e5e7eb'}`,
              background: filter === f.key ? '#eff6ff' : '#fff',
              color: filter === f.key ? '#2563eb' : '#6b7280',
            }}
          >
            {f.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <Btn variant="outline" size="sm">Export CSV</Btn>
        </div>
      </div>

      {/* Critical risk alert */}
      {critical.length > 0 && filter === 'all' && (
        <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '14px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>
            ⚠ {critical.length} tenant{critical.length !== 1 ? 's' : ''} at critical churn risk
          </div>
          <div style={{ fontSize: 13, color: '#991b1b' }}>
            ${mrrAtRisk.toLocaleString()} MRR at risk. These accounts need immediate outreach.
          </div>
        </div>
      )}

      {/* Churn table */}
      <Card>
        <CardHeader title="Churn Risk Accounts" sub={`${filtered.length} tenants`} />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>
              {['Business', 'Plan', 'Status', 'Risk Score', 'Risk Level', 'Last Active', 'Onboarding', 'MRR', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <>
                <tr
                  key={t.id}
                  style={{
                    borderBottom: '1px solid #f3f4f6',
                    background: actioned[t.id] ? '#f0fdf4' : t.churnScore >= 80 ? '#fff5f5' : '#fff',
                  }}
                >
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{t.owner}</div>
                  </td>
                  <td style={{ padding: '11px 14px' }}><PlanBadge plan={t.plan} /></td>
                  <td style={{ padding: '11px 14px' }}><Badge status={t.status} /></td>
                  <td style={{ padding: '11px 14px', width: 160 }}>
                    <RiskBar score={t.churnScore} />
                  </td>
                  <td style={{ padding: '11px 14px' }}><RiskBadge score={t.churnScore} /></td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: '#6b7280' }}>{t.lastActive}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 50, height: 6, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${t.onboarding}%`, height: '100%', background: t.onboarding >= 70 ? '#16a34a' : '#d97706', borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{t.onboarding}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#374151' }}>
                    {t.mrr ? `$${t.mrr}` : '—'}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <Btn variant="outline" size="xs" onClick={() => openEmail(t)}>
                        {emailId === t.id ? 'Close' : 'Email'}
                      </Btn>
                      <Btn variant="primary" size="xs">Call</Btn>
                      {actioned[t.id]
                        ? <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>✓ Done</span>
                        : <Btn variant="success" size="xs" onClick={() => markActioned(t.id)}>Mark Done</Btn>
                      }
                    </div>
                  </td>
                </tr>

                {/* Inline email composer */}
                {emailId === t.id && (
                  <tr key={t.id + '-email'} style={{ background: '#eff6ff' }}>
                    <td colSpan={9} style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                        Email to: {t.owner} ({t.email})
                      </div>
                      <textarea
                        value={emailText}
                        onChange={e => setEmailText(e.target.value)}
                        rows={4}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #bfdbfe', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <Btn variant="primary" size="xs" onClick={() => markActioned(t.id)}>Send Email</Btn>
                        <Btn variant="ghost" size="xs" onClick={() => setEmailId(null)}>Cancel</Btn>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 28, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No tenants in this risk category</div>
        )}
      </Card>
    </div>
  )
}
