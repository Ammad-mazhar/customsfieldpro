import { useState } from 'react'
import { MetricCard, Card, CardHeader, Btn, Tabs } from './SuperAdmin'

const SERVICES = [
  { name: 'API Server',        status: 'operational', uptime: '99.98%', latency: '42ms',  region: 'us-east-1' },
  { name: 'Database (Supabase)', status: 'operational', uptime: '99.99%', latency: '8ms',   region: 'us-east-1' },
  { name: 'Auth Service',      status: 'operational', uptime: '100%',   latency: '35ms',  region: 'us-east-1' },
  { name: 'File Storage',      status: 'degraded',    uptime: '99.72%', latency: '180ms', region: 'us-east-1' },
  { name: 'Email (SendGrid)',  status: 'operational', uptime: '99.95%', latency: '—',     region: 'global' },
  { name: 'Payments (Stripe)', status: 'operational', uptime: '99.99%', latency: '—',     region: 'global' },
  { name: 'CDN',              status: 'operational', uptime: '100%',   latency: '12ms',  region: 'global' },
  { name: 'Background Jobs',   status: 'outage',      uptime: '97.10%', latency: '—',     region: 'us-east-1' },
]

const PERF_METRICS = [
  { label: 'P50 Latency',   value: '42ms',   sub: 'median' },
  { label: 'P95 Latency',   value: '180ms',  sub: '95th percentile' },
  { label: 'P99 Latency',   value: '490ms',  sub: '99th percentile' },
  { label: 'Error Rate',    value: '0.12%',  sub: 'last 24h', color: '#d97706' },
  { label: 'Req/min',       value: '2,840',  sub: 'avg last hour' },
  { label: 'Cache Hit',     value: '94.3%',  sub: 'Redis hit rate', color: '#16a34a' },
]

const RECENT_ERRORS = [
  { ts: '2026-05-07 14:32:18', level: 'ERROR', service: 'Background Jobs', message: 'Job worker failed to connect to queue — ECONNREFUSED redis:6379', count: 47 },
  { ts: '2026-05-07 14:18:05', level: 'WARN',  service: 'File Storage',    message: 'S3 upload timeout (>10s) — retried successfully', count: 12 },
  { ts: '2026-05-07 13:55:42', level: 'ERROR', service: 'API Server',      message: 'Unhandled rejection in /api/jobs/bulk-assign — TypeError: Cannot read property', count: 3 },
  { ts: '2026-05-07 12:40:11', level: 'WARN',  service: 'Auth Service',    message: 'High login failure rate from IP 185.220.101.x — rate limiter engaged', count: 89 },
  { ts: '2026-05-07 11:21:30', level: 'INFO',  service: 'Database',        message: 'Slow query detected (>2s): SELECT * FROM jobs WHERE tenant_id=... (full scan)', count: 4 },
]

const UPTIME_HISTORY = [
  { date: '05-01', pct: 100 }, { date: '05-02', pct: 100 }, { date: '05-03', pct: 99.8 },
  { date: '05-04', pct: 100 }, { date: '05-05', pct: 99.9 }, { date: '05-06', pct: 99.7 },
  { date: '05-07', pct: 99.1 },
]

const STATUS_STYLES = {
  operational: { bg: '#f0fdf4', color: '#16a34a', dot: '#16a34a', label: 'Operational' },
  degraded:    { bg: '#fffbeb', color: '#b45309', dot: '#d97706', label: 'Degraded' },
  outage:      { bg: '#fef2f2', color: '#dc2626', dot: '#dc2626', label: 'Outage' },
}

function StatusDot({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.operational
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.label}</span>
    </span>
  )
}

function LatencySparkline({ values }) {
  const max = Math.max(...values, 1)
  const w = 80, h = 32
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * (h - 4)}`).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

const LATENCY_DATA = [42, 55, 48, 60, 44, 180, 52, 46, 70, 42, 38, 42]

export default function SASystemHealth() {
  const [tab, setTab] = useState('status')
  const [autoRefresh, setAutoRefresh] = useState(false)

  const overallStatus = SERVICES.some(s => s.status === 'outage') ? 'outage'
    : SERVICES.some(s => s.status === 'degraded') ? 'degraded' : 'operational'

  const tabs = [
    { id: 'status',  label: 'Service Status' },
    { id: 'perf',    label: 'Performance' },
    { id: 'logs',    label: 'Error Logs' },
    { id: 'uptime',  label: 'Uptime History' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Overall status banner */}
      <div style={{
        background: STATUS_STYLES[overallStatus].bg,
        border: `1.5px solid ${STATUS_STYLES[overallStatus].dot}`,
        borderRadius: 10,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>{overallStatus === 'operational' ? '✓' : overallStatus === 'degraded' ? '⚠' : '✕'}</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: STATUS_STYLES[overallStatus].color }}>
              {overallStatus === 'operational' ? 'All Systems Operational'
                : overallStatus === 'degraded' ? 'Partial Degradation Detected'
                : 'Service Outage Detected'}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
              Last checked: just now · {SERVICES.filter(s => s.status === 'operational').length}/{SERVICES.length} services healthy
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Auto-refresh</span>
          <button
            onClick={() => setAutoRefresh(v => !v)}
            style={{
              padding: '5px 12px', borderRadius: 7, border: '1.5px solid #d1d5db', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              background: autoRefresh ? '#eff6ff' : '#fff', color: autoRefresh ? '#2563eb' : '#6b7280',
            }}
          >
            {autoRefresh ? 'On (30s)' : 'Off'}
          </button>
          <Btn variant="outline" size="sm">Refresh Now</Btn>
        </div>
      </div>

      {/* Quick metrics */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <MetricCard label="API Uptime (30d)"  value="99.94%" color="#16a34a" />
        <MetricCard label="Avg Latency"       value="42ms"   sub="P50" />
        <MetricCard label="Error Rate"        value="0.12%"  color="#d97706" />
        <MetricCard label="Active Jobs"       value="0"      color="#dc2626" sub="worker down" />
        <MetricCard label="DB Connections"    value="23/100" sub="pool usage" />
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {/* ── Service Status ── */}
      {tab === 'status' && (
        <Card>
          <CardHeader title="Service Status" sub="Real-time health of all system components" />
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>
                {['Service', 'Status', 'Uptime (30d)', 'Latency', 'Region', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SERVICES.map(s => (
                <tr key={s.name} style={{ borderBottom: '1px solid #f3f4f6', background: s.status === 'outage' ? '#fef2f2' : s.status === 'degraded' ? '#fffbeb' : '#fff' }}>
                  <td style={{ padding: '13px 14px', fontSize: 13, fontWeight: 700, color: '#111827' }}>{s.name}</td>
                  <td style={{ padding: '13px 14px' }}><StatusDot status={s.status} /></td>
                  <td style={{ padding: '13px 14px', fontSize: 13, fontWeight: 700, color: parseFloat(s.uptime) >= 99.9 ? '#16a34a' : '#d97706' }}>{s.uptime}</td>
                  <td style={{ padding: '13px 14px', fontSize: 13, color: '#374151' }}>{s.latency}</td>
                  <td style={{ padding: '13px 14px', fontSize: 12, color: '#9ca3af' }}>{s.region}</td>
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Btn variant="outline" size="xs">Ping</Btn>
                      {s.status !== 'operational' && <Btn variant="primary" size="xs">Investigate</Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── Performance ── */}
      {tab === 'perf' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {PERF_METRICS.map(m => (
              <div key={m.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 20px', minWidth: 130 }}>
                <p style={{ margin: '0 0 4px', fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>{m.label}</p>
                <p style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 800, color: m.color || '#111827' }}>{m.value}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{m.sub}</p>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader title="API Latency — Last 12 Hours" />
            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
                {LATENCY_DATA.map((v, i) => {
                  const maxV = Math.max(...LATENCY_DATA)
                  const h = (v / maxV) * 90
                  const color = v > 100 ? '#dc2626' : v > 60 ? '#d97706' : '#2563eb'
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <span style={{ fontSize: 9, color: '#9ca3af' }}>{v}ms</span>
                      <div style={{ width: '100%', background: color, borderRadius: '3px 3px 0 0', height: h, minHeight: 4, opacity: 0.85 }} />
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12, color: '#9ca3af' }}>
                <span style={{ color: '#2563eb', fontWeight: 600 }}>■ Normal (&lt;60ms)</span>
                <span style={{ color: '#d97706', fontWeight: 600 }}>■ Slow (60–100ms)</span>
                <span style={{ color: '#dc2626', fontWeight: 600 }}>■ Critical (&gt;100ms)</span>
              </div>
            </div>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card>
              <CardHeader title="Database Metrics" />
              <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { k: 'Connection Pool', v: '23/100', pct: 23 },
                  { k: 'Query Cache Hit', v: '94.3%',  pct: 94.3 },
                  { k: 'Index Usage',     v: '98.1%',  pct: 98.1 },
                  { k: 'Disk Usage',      v: '34%',    pct: 34 },
                ].map(m => (
                  <div key={m.k}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#374151', fontWeight: 600 }}>{m.k}</span>
                      <span style={{ color: '#111827', fontWeight: 700 }}>{m.v}</span>
                    </div>
                    <div style={{ height: 6, background: '#f3f4f6', borderRadius: 99 }}>
                      <div style={{ width: `${m.pct}%`, height: '100%', background: m.pct > 80 ? '#dc2626' : '#2563eb', borderRadius: 99 }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Server Resources" />
              <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { k: 'CPU Usage',     v: '28%',  pct: 28 },
                  { k: 'Memory (RAM)',  v: '61%',  pct: 61 },
                  { k: 'Disk I/O',     v: '12%',  pct: 12 },
                  { k: 'Network Out',  v: '3.2MB/s', pct: 32 },
                ].map(m => (
                  <div key={m.k}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#374151', fontWeight: 600 }}>{m.k}</span>
                      <span style={{ color: '#111827', fontWeight: 700 }}>{m.v}</span>
                    </div>
                    <div style={{ height: 6, background: '#f3f4f6', borderRadius: 99 }}>
                      <div style={{ width: `${m.pct}%`, height: '100%', background: m.pct > 80 ? '#dc2626' : m.pct > 60 ? '#d97706' : '#16a34a', borderRadius: 99 }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Error Logs ── */}
      {tab === 'logs' && (
        <Card>
          <CardHeader
            title="Recent Error Log"
            sub="Last 24 hours"
            action={<Btn variant="outline" size="sm">Download Full Log</Btn>}
          />
          <div style={{ padding: 0 }}>
            {RECENT_ERRORS.map((e, i) => {
              const levelStyle = {
                ERROR: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
                WARN:  { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
                INFO:  { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
              }[e.level] || { bg: '#f9fafb', color: '#374151', border: '#e5e7eb' }

              return (
                <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ background: levelStyle.bg, color: levelStyle.color, border: `1px solid ${levelStyle.border}`, borderRadius: 5, padding: '2px 8px', fontSize: 10, fontWeight: 800, letterSpacing: '0.5px', flexShrink: 0 }}>
                      {e.level}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: '#374151' }}>{e.service}</span>
                        {' · '}{e.ts}
                        {e.count > 1 && <span style={{ marginLeft: 8, background: '#f3f4f6', color: '#6b7280', borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>×{e.count}</span>}
                      </div>
                      <div style={{ fontSize: 13, color: '#374151', fontFamily: 'monospace', wordBreak: 'break-all' }}>{e.message}</div>
                    </div>
                    <Btn variant="outline" size="xs">Details</Btn>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ── Uptime History ── */}
      {tab === 'uptime' && (
        <Card>
          <CardHeader title="7-Day Uptime History" sub="Rolling average across all services" />
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 120, marginBottom: 16 }}>
              {UPTIME_HISTORY.map((d, i) => {
                const h = ((d.pct - 97) / 3) * 100
                const color = d.pct === 100 ? '#16a34a' : d.pct >= 99.5 ? '#2563eb' : d.pct >= 99 ? '#d97706' : '#dc2626'
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, color: '#374151', fontWeight: 700 }}>{d.pct}%</span>
                    <div style={{ width: '100%', background: color, borderRadius: '4px 4px 0 0', height: Math.max(h, 8), opacity: 0.85 }} />
                    <span style={{ fontSize: 10, color: '#9ca3af' }}>{d.date}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { k: '30-day uptime', v: '99.94%', c: '#16a34a' },
                { k: '90-day uptime', v: '99.87%', c: '#16a34a' },
                { k: 'Incidents (30d)', v: '2', c: '#d97706' },
              ].map(m => (
                <div key={m.k} style={{ textAlign: 'center' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#9ca3af' }}>{m.k}</p>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: m.c }}>{m.v}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
