import { useState } from 'react'
import { MetricCard, Card, CardHeader, Badge, PlanBadge, Btn, Tabs } from './SuperAdmin'
import { SA_TENANTS, MRR_HISTORY } from './saData'

export default function SARevenue() {
  const [tab, setTab] = useState('overview')

  const totalMRR = SA_TENANTS.reduce((s, t) => s + (t.mrr || 0), 0)
  const totalARR  = totalMRR * 12
  const lastMRR   = MRR_HISTORY[MRR_HISTORY.length - 2].mrr
  const mrrChange = totalMRR - lastMRR
  const mrrChangePct = ((mrrChange / lastMRR) * 100).toFixed(1)

  const planGroups = [
    { plan: 'Starter',      color: '#6b7280', price: 49  },
    { plan: 'Professional', color: '#2563eb', price: 99  },
    { plan: 'Business',     color: '#7c3aed', price: 199 },
    { plan: 'Enterprise',   color: '#111827', price: 399 },
  ].map(p => {
    const tenants = SA_TENANTS.filter(t => t.plan === p.plan.toLowerCase() && t.mrr > 0)
    const mrr = tenants.reduce((s, t) => s + t.mrr, 0)
    return { ...p, count: tenants.length, mrr, pctOfTotal: totalMRR > 0 ? ((mrr / totalMRR) * 100).toFixed(1) : 0 }
  })

  const activeSubs = SA_TENANTS.filter(t => t.mrr > 0)
  const failedPayments = SA_TENANTS.filter(t => t.status === 'Past Due')

  const tabs = [
    { id: 'overview',   label: 'Overview' },
    { id: 'subs',       label: 'Subscriptions' },
    { id: 'failed',     label: 'Failed Payments' },
    { id: 'reports',    label: 'Reports' },
  ]

  function exportCSV() {
    const rows = [
      ['Month', 'MRR', 'New MRR', 'Churned MRR', 'Net Change'],
      ...MRR_HISTORY.map(m => [m.month, m.mrr, m.new, m.churned, m.new - m.churned])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv,' + encodeURIComponent(csv)
    a.download = 'revenue-report.csv'
    a.click()
  }

  return (
    <div>
      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <MetricCard label="MRR"       value={`$${totalMRR.toLocaleString()}`}  trend={`${mrrChange >= 0 ? '+' : ''}$${mrrChange}`} color="#16a34a" />
            <MetricCard label="ARR"       value={`$${totalARR.toLocaleString()}`}   color="#16a34a" />
            <MetricCard label="ARPU"      value={`$${(totalMRR / Math.max(activeSubs.length, 1)).toFixed(0)}`} sub="avg revenue per user" />
            <MetricCard label="Net Rev Retention" value="108%" sub="expansion > churn" color="#16a34a" />
            <MetricCard label="MRR Growth" value={`${mrrChangePct}%`} sub="vs last month" color={mrrChange >= 0 ? '#16a34a' : '#dc2626'} />
          </div>

          {/* MRR chart */}
          <Card>
            <CardHeader title="MRR Over Time — Last 12 Months" />
            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 120, marginBottom: 12 }}>
                {MRR_HISTORY.map((m, i) => {
                  const maxMrr = Math.max(...MRR_HISTORY.map(x => x.mrr))
                  const barH = (m.mrr / maxMrr) * 110
                  const isLast = i === MRR_HISTORY.length - 1
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 9, color: isLast ? '#111827' : '#9ca3af', fontWeight: isLast ? 700 : 400 }}>${m.mrr.toLocaleString()}</span>
                      <div style={{ width: '100%', background: isLast ? '#16a34a' : '#d1fae5', borderRadius: '3px 3px 0 0', height: barH, minHeight: 4 }} />
                      <span style={{ fontSize: 9, color: '#9ca3af', whiteSpace: 'nowrap' }}>{m.month}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 24, paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
                {[
                  { l: 'New MRR this month',    v: `+$${MRR_HISTORY[MRR_HISTORY.length-1].new}`,     c: '#16a34a' },
                  { l: 'Churned MRR',           v: `-$${MRR_HISTORY[MRR_HISTORY.length-1].churned}`, c: '#dc2626' },
                  { l: 'Net MRR change',         v: `+$${MRR_HISTORY[MRR_HISTORY.length-1].new - MRR_HISTORY[MRR_HISTORY.length-1].churned}`, c: '#2563eb' },
                ].map(m => (
                  <div key={m.l}>
                    <p style={{ margin: '0 0 2px', fontSize: 11, color: '#9ca3af' }}>{m.l}</p>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: m.c }}>{m.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* MRR by plan */}
          <Card>
            <CardHeader title="MRR by Plan" />
            <div style={{ padding: 20 }}>
              {planGroups.map(p => (
                <div key={p.plan} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <span style={{ width: 100, fontSize: 13, color: '#374151', fontWeight: 500 }}>{p.plan}</span>
                  <div style={{ flex: 1, height: 12, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${p.pctOfTotal}%`, height: '100%', background: p.color, borderRadius: 99 }} />
                  </div>
                  <span style={{ width: 70, fontSize: 14, fontWeight: 700, color: '#111827', textAlign: 'right' }}>${p.mrr.toLocaleString()}</span>
                  <span style={{ width: 60, fontSize: 12, color: '#9ca3af' }}>{p.count} tenants</span>
                  <span style={{ width: 40, fontSize: 12, color: '#9ca3af' }}>{p.pctOfTotal}%</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: '#111827' }}>Total MRR</span>
                <span style={{ fontWeight: 800, fontSize: 18, color: '#16a34a' }}>${totalMRR.toLocaleString()}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Subscriptions ── */}
      {tab === 'subs' && (
        <Card>
          <CardHeader title="Active Subscriptions" sub={`${activeSubs.length} paying tenants`} />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>
                  {['Tenant', 'Plan', 'Amount/mo', 'Cycle', 'Next Billing', 'Stripe Sub ID', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeSubs.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#111827' }}>{t.name}</td>
                    <td style={{ padding: '11px 14px' }}><PlanBadge plan={t.plan} /></td>
                    <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#16a34a' }}>${t.mrr}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#6b7280' }}>Monthly</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#374151' }}>{t.renewal || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: 11, fontFamily: 'monospace', color: '#6b7280' }}>sub_xyz{t.id}</td>
                    <td style={{ padding: '11px 14px' }}><Badge status={t.status} /></td>
                    <td style={{ padding: '11px 14px' }}>
                      <Btn variant="outline" size="xs">View in Stripe ↗</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Failed Payments ── */}
      {tab === 'failed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {failedPayments.length === 0 ? (
            <Card><div style={{ padding: 28, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No failed payments 🎉</div></Card>
          ) : failedPayments.map(t => (
            <Card key={t.id}>
              <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{t.name}</span>
                    <PlanBadge plan={t.plan} />
                    <Badge status={t.status} />
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                    Last attempted: {t.renewal} · Amount: ${t.mrr}/mo · 2 retries failed
                  </p>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>
                    ✉ Reminder sent: {t.renewal} · No response
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn variant="primary" size="sm">Retry Payment</Btn>
                  <Btn variant="outline" size="sm">Send Reminder</Btn>
                  <Btn variant="danger"  size="sm">Suspend</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Reports ── */}
      {tab === 'reports' && (
        <Card>
          <CardHeader
            title="Monthly Revenue Report — Last 12 Months"
            action={<Btn variant="outline" size="sm" onClick={exportCSV}>Export CSV</Btn>}
          />
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>
                {['Month', 'MRR', 'New MRR', 'Churned MRR', 'Net Change', 'Growth %'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...MRR_HISTORY].reverse().map((m, i) => {
                const prev = MRR_HISTORY[MRR_HISTORY.length - 2 - i]
                const net = m.new - m.churned
                const growth = prev ? (((m.mrr - prev.mrr) / prev.mrr) * 100).toFixed(1) : '—'
                return (
                  <tr key={m.month} style={{ borderBottom: '1px solid #f3f4f6', background: i === 0 ? '#f0fdf4' : '#fff' }}>
                    <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: i === 0 ? 700 : 400, color: '#111827' }}>{m.month}{i === 0 ? ' (current)' : ''}</td>
                    <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#16a34a' }}>${m.mrr.toLocaleString()}</td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: '#16a34a' }}>+${m.new}</td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: '#dc2626' }}>-${m.churned}</td>
                    <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: net >= 0 ? '#16a34a' : '#dc2626' }}>
                      {net >= 0 ? '+' : ''}{net}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: '#6b7280' }}>
                      {prev ? `${parseFloat(growth) >= 0 ? '+' : ''}${growth}%` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
