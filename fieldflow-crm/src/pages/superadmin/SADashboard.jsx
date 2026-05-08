import { useState } from 'react'
import { MetricCard, Card, CardHeader, Badge, PlanBadge, Btn } from './SuperAdmin'
import { SA_TENANTS, MRR_HISTORY } from './saData'

// Simple sparkline using SVG
function Sparkline({ data, color = '#16a34a', height = 48, width = 200 }) {
  const vals = data.map(d => d.mrr)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 8)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Area fill */}
      <polygon points={`0,${height} ${pts} ${width},${height}`} fill={color} opacity="0.12" />
    </svg>
  )
}

// Mini bar chart
function MiniBar({ data, color = '#2563eb', height = 60 }) {
  const max = Math.max(...data.map(d => d.value))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div
            style={{
              width: '100%', background: color, borderRadius: '3px 3px 0 0',
              height: max > 0 ? `${(d.value / max) * (height - 16)}px` : 0,
              minHeight: d.value > 0 ? 3 : 0,
              opacity: i === data.length - 1 ? 1 : 0.5 + (i / data.length) * 0.5,
            }}
          />
          <span style={{ fontSize: 9, color: '#9ca3af', whiteSpace: 'nowrap' }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

const ACTIVITY_FEED = [
  { id: 1, tenant: 'Valley Electric LLC', event: 'Trial signup',       type: 'signup',   ts: '2 min ago',  positive: true  },
  { id: 2, tenant: 'FastFix Appliance',   event: 'Payment failed',     type: 'failed',   ts: '8 min ago',  positive: false },
  { id: 3, tenant: 'Blue Ridge HVAC',     event: 'Opened ticket',      type: 'ticket',   ts: '22 min ago', positive: null  },
  { id: 4, tenant: 'Metro Plumbing Co',   event: 'Upgraded: Pro→Business', type: 'upgrade', ts: '1h ago',  positive: true  },
  { id: 5, tenant: 'ProDrain Plumbing',   event: 'Invoice paid ($199)', type: 'payment',  ts: '2h ago',   positive: true  },
  { id: 6, tenant: 'Apex Electrical',     event: 'Login from new IP',  type: 'security', ts: '3h ago',    positive: null  },
  { id: 7, tenant: 'Coastal Cooling',     event: 'Trial expiring soon', type: 'trial',   ts: '4h ago',    positive: false },
  { id: 8, tenant: 'Greenfield Electric', event: 'Report exported',    type: 'activity', ts: '5h ago',    positive: null  },
  { id: 9, tenant: 'Summit Services LLC', event: 'New user added',     type: 'user',     ts: '6h ago',    positive: true  },
  { id:10, tenant: 'Alpine HVAC',         event: 'Subscription cancelled', type: 'cancel', ts: '1d ago',  positive: false },
]

const EVENT_ICONS = {
  signup: '🆕', failed: '❌', ticket: '🎫', upgrade: '⬆️',
  payment: '💳', security: '🔐', trial: '⏳', activity: '📊',
  user: '👤', cancel: '🚫',
}

export default function SADashboard({ onNavigate }) {
  const [period] = useState('30d')

  const activeTenants  = SA_TENANTS.filter(t => t.status === 'Active').length
  const activeTrials   = SA_TENANTS.filter(t => t.status === 'Trial').length
  const pastDue        = SA_TENANTS.filter(t => t.status === 'Past Due').length
  const totalMRR       = SA_TENANTS.reduce((s, t) => s + (t.mrr || 0), 0)
  const trialsExpiring = SA_TENANTS.filter(t => t.status === 'Trial' && t.trialEnd && (new Date(t.trialEnd) - new Date()) / 86400000 <= 7).length

  const planDist = [
    { name: 'Starter',      count: SA_TENANTS.filter(t => t.plan === 'starter').length,      color: '#6b7280', pct: 33 },
    { name: 'Professional', count: SA_TENANTS.filter(t => t.plan === 'professional').length, color: '#2563eb', pct: 33 },
    { name: 'Business',     count: SA_TENANTS.filter(t => t.plan === 'business').length,     color: '#7c3aed', pct: 25 },
    { name: 'Enterprise',   count: SA_TENANTS.filter(t => t.plan === 'enterprise').length,   color: '#111827', pct:  8 },
  ]

  const signupData = [
    { label: 'Dec', value: 3 }, { label: 'Jan', value: 5 }, { label: 'Feb', value: 4 },
    { label: 'Mar', value: 6 }, { label: 'Apr', value: 8 }, { label: 'May', value: 2 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPI Row 1 */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <MetricCard label="Total Tenants"      value={SA_TENANTS.length}  sub="all time"           />
        <MetricCard label="Active Trials"      value={activeTrials}       sub="avg 8 days left"    color="#2563eb" trend="+2" />
        <MetricCard label="Paying Customers"   value={activeTenants}      sub="active accounts"    color="#16a34a" trend="+3" />
        <MetricCard label="MRR"                value={`$${totalMRR.toLocaleString()}`} sub="monthly recurring"  color="#16a34a" trend="+$380" />
        <MetricCard label="ARR"                value={`$${(totalMRR * 12).toLocaleString()}`} sub="annualized"    color="#16a34a" />
        <MetricCard label="Churn Rate"         value="2.1%"               sub="this month"         color="#dc2626" />
      </div>

      {/* KPI Row 2 — today's activity */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <MetricCard small label="New Signups Today"     value="2"         color="#2563eb" />
        <MetricCard small label="Trials Expiring (7d)"  value={trialsExpiring} color="#d97706" sub="⚠ needs attention" />
        <MetricCard small label="Failed Payments"        value={pastDue}   color="#dc2626" sub="requires action" />
        <MetricCard small label="Open Support Tickets"   value="3"         color="#6b7280" />
        <MetricCard small label="New Tickets Today"      value="2"         color="#374151" />
        <MetricCard small label="Trial→Paid Conv."       value="68%"       color="#16a34a" sub="this month" />
      </div>

      {/* MRR Growth chart + Activity feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* MRR Chart */}
        <Card>
          <CardHeader title="MRR Growth — Last 12 Months" sub={`Current: $${totalMRR.toLocaleString()} / mo`} />
          <div style={{ padding: '16px 20px' }}>
            {/* Simple visual chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, marginBottom: 8 }}>
              {MRR_HISTORY.map((m, i) => {
                const maxMrr = Math.max(...MRR_HISTORY.map(x => x.mrr))
                const h = (m.mrr / maxMrr) * 90
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: '100%', background: i === MRR_HISTORY.length - 1 ? '#16a34a' : '#d1fae5', borderRadius: '3px 3px 0 0', height: h, minHeight: 4 }} />
                    <span style={{ fontSize: 9, color: '#9ca3af', transform: 'rotate(-45deg)', transformOrigin: 'right', whiteSpace: 'nowrap' }}>{m.month}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
              {[
                { label: 'New MRR', value: `+$${MRR_HISTORY[MRR_HISTORY.length-1].new}`, color: '#16a34a' },
                { label: 'Churned MRR', value: `-$${MRR_HISTORY[MRR_HISTORY.length-1].churned}`, color: '#dc2626' },
                { label: 'Net Change', value: `+$${MRR_HISTORY[MRR_HISTORY.length-1].new - MRR_HISTORY[MRR_HISTORY.length-1].churned}`, color: '#2563eb' },
              ].map(m => (
                <div key={m.label}>
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: '#9ca3af' }}>{m.label}</p>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: m.color }}>{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Activity feed */}
        <Card>
          <CardHeader title="Recent Activity" />
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {ACTIVITY_FEED.map(ev => (
              <div key={ev.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, marginTop: 1, flexShrink: 0 }}>{EVENT_ICONS[ev.type]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.tenant}</p>
                  <p style={{ margin: '1px 0 0', fontSize: 12, color: '#6b7280' }}>{ev.event}</p>
                </div>
                <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', marginTop: 2 }}>{ev.ts}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* New signups per month */}
        <Card>
          <CardHeader title="New Signups / Month" />
          <div style={{ padding: '16px 20px' }}>
            <MiniBar data={signupData} color="#2563eb" height={80} />
          </div>
        </Card>

        {/* Plan distribution */}
        <Card>
          <CardHeader title="Plan Distribution" />
          <div style={{ padding: '16px 20px' }}>
            <div style={{ height: 18, borderRadius: 8, overflow: 'hidden', display: 'flex', marginBottom: 16 }}>
              {planDist.map(p => (
                <div key={p.name} style={{ width: `${p.pct}%`, background: p.color }} title={`${p.name}: ${p.count}`} />
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {planDist.map(p => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: '#374151' }}>{p.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{p.count}</span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{p.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Trial conversion */}
        <Card>
          <CardHeader title="Trial → Paid Conversion" />
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: '#16a34a', marginBottom: 6 }}>68%</div>
            <div style={{ height: 10, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ width: '68%', height: '100%', background: '#16a34a', borderRadius: 99 }} />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Last 30 days — 8 of 12 trials converted</p>
            <div style={{ marginTop: 14, display: 'flex', gap: 16 }}>
              <div><p style={{ margin: '0 0 2px', fontSize: 11, color: '#9ca3af' }}>Avg time to convert</p><p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#374151' }}>9.2 days</p></div>
              <div><p style={{ margin: '0 0 2px', fontSize: 11, color: '#9ca3af' }}>Drop-off day</p><p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#374151' }}>Day 11</p></div>
            </div>
          </div>
        </Card>

        {/* Churn by plan */}
        <Card>
          <CardHeader title="Churn by Plan" />
          <div style={{ padding: '16px 20px' }}>
            {[
              { plan: 'Starter', pct: 8, color: '#6b7280' },
              { plan: 'Professional', pct: 3, color: '#2563eb' },
              { plan: 'Business', pct: 2, color: '#7c3aed' },
              { plan: 'Enterprise', pct: 0, color: '#111827' },
            ].map(p => (
              <div key={p.plan} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ width: 90, fontSize: 12, color: '#374151' }}>{p.plan}</span>
                <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${p.pct * 10}%`, height: '100%', background: p.color, borderRadius: 99 }} />
                </div>
                <span style={{ width: 30, fontSize: 13, fontWeight: 700, color: p.pct > 5 ? '#dc2626' : '#374151', textAlign: 'right' }}>{p.pct}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent signups table */}
      <Card>
        <CardHeader
          title="Recent Signups"
          action={<Btn variant="outline" size="xs" onClick={() => onNavigate('tenants')}>View All →</Btn>}
        />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>
              {['Business', 'Owner', 'Plan', 'Status', 'Joined', 'MRR'].map(h => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...SA_TENANTS].sort((a, b) => new Date(b.joined) - new Date(a.joined)).slice(0, 6).map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: '#111827' }}>{t.name}</td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: '#6b7280' }}>{t.owner}</td>
                <td style={{ padding: '11px 14px' }}><PlanBadge plan={t.plan} /></td>
                <td style={{ padding: '11px 14px' }}><Badge status={t.status} /></td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: '#9ca3af' }}>{t.joined}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: t.mrr > 0 ? '#16a34a' : '#9ca3af' }}>
                  {t.mrr > 0 ? `$${t.mrr}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
