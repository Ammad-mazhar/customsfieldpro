import { useState } from 'react'
import { Badge, PlanBadge, MetricCard, Card, CardHeader, Btn, Tabs, Toggle } from './SuperAdmin'
import { SA_TENANTS, FEATURE_FLAGS } from './saData'

// ── Tenant Detail Page ────────────────────────────────────────────────────────

function UsageBar({ label, used, limit, color = '#2563eb' }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
        <span style={{ fontSize: 12, color: '#6b7280' }}>{used} / {limit}</span>
      </div>
      <div style={{ height: 8, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: pct > 80 ? '#dc2626' : pct > 60 ? '#d97706' : color, borderRadius: 99, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

function TenantDetail({ tenant, onBack, onImpersonate }) {
  const [tab, setTab] = useState('overview')
  const [notes, setNotes]   = useState([{ text: 'Strong growth potential — upsell to Business.', priority: 'important', author: 'superadmin', ts: '2026-05-06 14:30' }])
  const [noteText, setNoteText] = useState('')
  const [notePriority, setNotePriority] = useState('normal')
  const [featureOverrides, setFeatureOverrides] = useState({})
  const [extendDate, setExtendDate] = useState('')
  const [showExtend, setShowExtend] = useState(false)
  const [planChanging, setPlanChanging] = useState(false)
  const [newPlan, setNewPlan] = useState(tenant.plan)

  const tabs = [
    { id: 'overview',  label: 'Overview' },
    { id: 'billing',   label: 'Billing' },
    { id: 'usage',     label: 'Usage' },
    { id: 'users',     label: 'Users' },
    { id: 'support',   label: 'Support' },
    { id: 'features',  label: 'Feature Overrides' },
    { id: 'notes',     label: 'Internal Notes' },
  ]

  const MOCK_USERS = [
    { name: 'John Muir', email: 'john@' + tenant.email.split('@')[1], role: 'Admin', lastLogin: '2026-05-07 08:30', status: 'Active' },
    { name: 'Sarah Ops', email: 'sarah@' + tenant.email.split('@')[1], role: 'Staff', lastLogin: '2026-05-06 17:00', status: 'Active' },
    { name: 'Tech Mike', email: 'mike@' + tenant.email.split('@')[1], role: 'Technician', lastLogin: '2026-05-05 09:00', status: 'Active' },
  ].slice(0, Math.min(tenant.users, 3))

  const MOCK_PAYMENTS = [
    { date: '2026-05-01', amount: `$${tenant.mrr}`, desc: 'Monthly subscription', status: 'Paid' },
    { date: '2026-04-01', amount: `$${tenant.mrr}`, desc: 'Monthly subscription', status: 'Paid' },
    { date: '2026-03-01', amount: `$${tenant.mrr}`, desc: 'Monthly subscription', status: 'Paid' },
    { date: '2026-02-01', amount: `$${tenant.mrr}`, desc: 'Monthly subscription', status: tenant.status === 'Past Due' ? 'Failed' : 'Paid' },
  ]

  const priorityColors = { normal: '#6b7280', important: '#d97706', urgent: '#dc2626' }

  function addNote() {
    if (!noteText.trim()) return
    setNotes(n => [{ text: noteText, priority: notePriority, author: 'superadmin', ts: new Date().toLocaleString() }, ...n])
    setNoteText('')
    setNotePriority('normal')
  }

  return (
    <div>
      {/* Back + header */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 12, fontFamily: 'inherit' }}>
          ← Back to Tenants
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>{tenant.name}</h2>
              <PlanBadge plan={tenant.plan} />
              <Badge status={tenant.status} />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{tenant.email} · Owner: {tenant.owner} · Joined {tenant.joined}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn variant="success" size="md" onClick={() => onImpersonate(tenant)}>Impersonate</Btn>
            <Btn variant="outline" size="md">Edit Plan</Btn>
            <Btn variant="danger" size="md">Suspend</Btn>
          </div>
        </div>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Card>
            <CardHeader title="Business Info" />
            <div style={{ padding: 20 }}>
              {[['Business Name', tenant.name], ['Owner Email', tenant.email], ['Owner Name', tenant.owner],
                ['Joined', tenant.joined], ['Last Active', tenant.lastActive], ['Plan', tenant.plan],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                  <span style={{ color: '#6b7280' }}>{k}</span>
                  <span style={{ fontWeight: 600, color: '#111827', textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Usage" />
            <div style={{ padding: 20 }}>
              <UsageBar label="Users"    used={tenant.users} limit={tenant.usersLimit} />
              <UsageBar label="Jobs/mo"  used={tenant.jobs}  limit={500} color="#7c3aed" />
              <UsageBar label="Storage"  used={24}           limit={100} color="#d97706" />
              <div style={{ marginTop: 16, padding: '12px 14px', background: '#f9fafb', borderRadius: 8 }}>
                <p style={{ margin: '0 0 6px', fontSize: 12, color: '#6b7280' }}>Onboarding</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 8, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${tenant.onboarding}%`, height: '100%', background: '#16a34a', borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{tenant.onboarding}%</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Billing ── */}
      {tab === 'billing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <CardHeader title="Current Subscription" />
            <div style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                {[
                  ['Plan', tenant.plan],
                  ['Monthly Amount', tenant.mrr > 0 ? `$${tenant.mrr}/mo` : 'Free Trial'],
                  ['Status', tenant.status],
                  ['Next Renewal', tenant.renewal || tenant.trialEnd || '—'],
                  ['Stripe Customer', 'cus_abc' + tenant.id],
                  ['Stripe Sub ID',  'sub_xyz' + tenant.id],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p style={{ margin: '0 0 3px', fontSize: 11, color: '#9ca3af' }}>{k}</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{v}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Btn variant="outline" size="sm" onClick={() => setShowExtend(e => !e)}>Extend Trial</Btn>
                <Btn variant="outline" size="sm">Add Free Months</Btn>
                <Btn variant="outline" size="sm">Apply Discount</Btn>
                <Btn variant="primary" size="sm" onClick={() => setPlanChanging(true)}>Change Plan</Btn>
                <Btn variant="danger"  size="sm">Cancel Subscription</Btn>
              </div>
              {showExtend && (
                <div style={{ marginTop: 14, padding: '14px 16px', background: '#f9fafb', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#374151' }}>New trial end:</span>
                  <input type="date" value={extendDate} onChange={e => setExtendDate(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1.5px solid #d1d5db', fontSize: 13, outline: 'none' }} />
                  <Btn variant="success" size="sm" onClick={() => setShowExtend(false)}>Save Extension</Btn>
                  <Btn variant="ghost"   size="sm" onClick={() => setShowExtend(false)}>Cancel</Btn>
                </div>
              )}
              {planChanging && (
                <div style={{ marginTop: 14, padding: '14px 16px', background: '#f9fafb', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#374151' }}>New plan:</span>
                  <select value={newPlan} onChange={e => setNewPlan(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1.5px solid #d1d5db', fontSize: 13, outline: 'none', background: '#fff' }}>
                    {['starter', 'professional', 'business', 'enterprise'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <Btn variant="success" size="sm" onClick={() => setPlanChanging(false)}>Apply</Btn>
                  <Btn variant="ghost"   size="sm" onClick={() => setPlanChanging(false)}>Cancel</Btn>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Payment History" />
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>
                  {['Date', 'Amount', 'Description', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_PAYMENTS.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: '#374151' }}>{p.date}</td>
                    <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#111827' }}>{p.amount}</td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: '#6b7280' }}>{p.desc}</td>
                    <td style={{ padding: '11px 14px' }}><Badge status={p.status} /></td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {p.status === 'Paid'   && <Btn variant="outline" size="xs">Refund</Btn>}
                        {p.status === 'Failed' && <Btn variant="primary" size="xs">Retry</Btn>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── Usage ── */}
      {tab === 'usage' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Card>
            <CardHeader title="Usage Over Time" />
            <div style={{ padding: 20 }}>
              <p style={{ fontSize: 13, color: '#6b7280', marginTop: 0 }}>Jobs created per month</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
                {[28, 35, 42, 38, 45, tenant.jobs].map((v, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ width: '100%', background: i === 5 ? '#2563eb' : '#bfdbfe', borderRadius: '3px 3px 0 0', height: (v / 50) * 70 }} />
                    <span style={{ fontSize: 9, color: '#9ca3af', textAlign: 'center' }}>{['D', 'N', 'O', 'M', 'A', 'M'][i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Feature Usage" />
            <div style={{ padding: 20 }}>
              {[
                { feature: 'Job Management', last: 'Today', freq: 'Daily' },
                { feature: 'Invoice Builder', last: 'Yesterday', freq: 'Weekly' },
                { feature: 'Client Portal', last: '3 days ago', freq: 'Weekly' },
                { feature: 'Route Optimizer', last: '2 weeks ago', freq: 'Rare' },
                { feature: 'AI Estimator', last: 'Never', freq: 'Never' },
              ].map(f => (
                <div key={f.feature} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                  <span style={{ color: f.freq === 'Never' ? '#d1d5db' : '#374151' }}>{f.feature}</span>
                  <span style={{ color: f.last === 'Never' ? '#dc2626' : '#6b7280', fontSize: 12 }}>{f.last}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Users ── */}
      {tab === 'users' && (
        <Card>
          <CardHeader title="Users" sub={`${tenant.users} of ${tenant.usersLimit} seats used`} />
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>
                {['Name', 'Email', 'Role', 'Last Login', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_USERS.map((u, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: '#111827' }}>{u.name}</td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: '#6b7280' }}>{u.email}</td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: '#374151' }}>{u.role}</td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: '#9ca3af' }}>{u.lastLogin}</td>
                  <td style={{ padding: '11px 14px' }}><Badge status={u.status} /></td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Btn variant="outline" size="xs">Reset Password</Btn>
                      <Btn variant="danger"  size="xs">Deactivate</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── Feature Overrides ── */}
      {tab === 'features' && (
        <Card>
          <CardHeader title="Feature Overrides" sub="Toggle features on/off for this tenant only. Overrides the plan defaults." />
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 0 }}>
            {FEATURE_FLAGS.map(f => {
              const planDefault = f.plans[tenant.plan] ?? false
              const override = featureOverrides[f.key]
              const effective = override !== undefined ? override : planDefault
              return (
                <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <Toggle value={effective} onChange={v => setFeatureOverrides(p => ({ ...p, [f.key]: v }))} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: '#111827' }}>{f.label}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{f.desc}</p>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11 }}>
                    <span style={{ color: '#9ca3af' }}>Plan default: </span>
                    <span style={{ fontWeight: 700, color: planDefault ? '#16a34a' : '#dc2626' }}>{planDefault ? 'ON' : 'OFF'}</span>
                    {override !== undefined && (
                      <div style={{ color: '#d97706', fontWeight: 700 }}>OVERRIDDEN</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ── Notes ── */}
      {tab === 'notes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <CardHeader title="Add Internal Note" />
            <div style={{ padding: 20 }}>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Add a note about this tenant (only visible to super admins)..."
                rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 14, resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
                <select value={notePriority} onChange={e => setNotePriority(e.target.value)} style={{ padding: '7px 12px', borderRadius: 7, border: '1.5px solid #d1d5db', fontSize: 13, outline: 'none', background: '#fff' }}>
                  <option value="normal">Normal</option>
                  <option value="important">Important</option>
                  <option value="urgent">Urgent</option>
                </select>
                <Btn variant="primary" size="sm" onClick={addNote}>Add Note</Btn>
              </div>
            </div>
          </Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notes.map((n, i) => (
              <Card key={i}>
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: priorityColors[n.priority], textTransform: 'uppercase' }}>{n.priority}</span>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>{n.author} · {n.ts}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: '#374151' }}>{n.text}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Support ── */}
      {tab === 'support' && (
        <Card>
          <CardHeader title="Support History" />
          <div style={{ padding: '12px 20px', color: '#9ca3af', fontSize: 14 }}>No tickets from this tenant.</div>
        </Card>
      )}
    </div>
  )
}

// ── Tenants List Page ─────────────────────────────────────────────────────────

export default function SATenants({ impersonating, setImpersonating, globalSearch }) {
  const [detail, setDetail]       = useState(null)
  const [search, setSearch]       = useState('')
  const [planFilter, setPlanFilter]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy]       = useState('joined')
  const [selected, setSelected]   = useState([])

  const effectiveSearch = globalSearch || search

  const filtered = SA_TENANTS
    .filter(t => {
      const q = effectiveSearch.toLowerCase()
      return (
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.owner.toLowerCase().includes(q)
      ) && (!planFilter || t.plan === planFilter) && (!statusFilter || t.status === statusFilter)
    })
    .sort((a, b) => {
      if (sortBy === 'mrr') return b.mrr - a.mrr
      if (sortBy === 'users') return b.users - a.users
      if (sortBy === 'churn') return b.churnScore - a.churnScore
      return new Date(b.joined) - new Date(a.joined)
    })

  function toggleSelect(id) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  function exportCSV() {
    const rows = [
      ['Name', 'Email', 'Owner', 'Plan', 'Status', 'MRR', 'Users', 'Joined'],
      ...filtered.map(t => [t.name, t.email, t.owner, t.plan, t.status, t.mrr, t.users, t.joined])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv,' + encodeURIComponent(csv)
    a.download = 'tenants.csv'
    a.click()
  }

  if (detail) return (
    <TenantDetail
      tenant={detail}
      onBack={() => setDetail(null)}
      onImpersonate={t => { setImpersonating(t); setDetail(null) }}
    />
  )

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, owner..."
          style={{ flex: '1 1 220px', padding: '8px 14px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 13, outline: 'none' }}
        />
        {[
          { value: planFilter, onChange: setPlanFilter, opts: [['', 'All Plans'], ['starter', 'Starter'], ['professional', 'Professional'], ['business', 'Business'], ['enterprise', 'Enterprise']] },
          { value: statusFilter, onChange: setStatusFilter, opts: [['', 'All Statuses'], ['Active', 'Active'], ['Trial', 'Trial'], ['Past Due', 'Past Due'], ['Suspended', 'Suspended'], ['Cancelled', 'Cancelled']] },
          { value: sortBy, onChange: setSortBy, opts: [['joined', 'Newest First'], ['mrr', 'MRR ↓'], ['users', 'Users ↓'], ['churn', 'Churn Risk ↓']] },
        ].map((s, i) => (
          <select key={i} value={s.value} onChange={e => s.onChange(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 13, background: '#fff', outline: 'none' }}>
            {s.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <Btn variant="outline" size="sm" onClick={exportCSV}>Export CSV</Btn>
      </div>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 16px', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>{selected.length} selected</span>
          <Btn variant="primary" size="xs">Send Email</Btn>
          <Btn variant="outline" size="xs">Apply Discount</Btn>
          <Btn variant="outline" size="xs">Export Selected</Btn>
          <Btn variant="danger"  size="xs">Suspend Selected</Btn>
          <Btn variant="ghost"   size="xs" onClick={() => setSelected([])}>Clear</Btn>
        </div>
      )}

      {/* Table */}
      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ background: '#f9fafb', fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 12px', width: 32 }}>
                  <input type="checkbox" onChange={e => setSelected(e.target.checked ? filtered.map(t => t.id) : [])} checked={selected.length === filtered.length && filtered.length > 0} />
                </th>
                {['Business', 'Owner', 'Plan', 'Status', 'Users', 'MRR', 'Risk', 'Renewal', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const riskColor = t.churnScore > 60 ? '#dc2626' : t.churnScore > 30 ? '#d97706' : '#16a34a'
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6', background: selected.includes(t.id) ? '#eff6ff' : '#fff' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggleSelect(t.id)} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={() => setDetail(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#2563eb', padding: 0, fontFamily: 'inherit' }}>
                        {t.name}
                      </button>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{t.owner}</td>
                    <td style={{ padding: '10px 12px' }}><PlanBadge plan={t.plan} /></td>
                    <td style={{ padding: '10px 12px' }}><Badge status={t.status} /></td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: '#374151' }}>{t.users}/{t.usersLimit}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: t.mrr > 0 ? '#16a34a' : '#9ca3af' }}>
                      {t.mrr > 0 ? `$${t.mrr}` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: riskColor }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: riskColor }} />
                        {t.churnScore}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>{t.renewal || t.trialEnd || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <Btn variant="primary"  size="xs" onClick={() => setDetail(t)}>View</Btn>
                        <Btn variant="outline"  size="xs" onClick={() => setImpersonating(t)}>Login As</Btn>
                        <Btn variant="danger"   size="xs">Suspend</Btn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', fontSize: 12, color: '#9ca3af' }}>
          Showing {filtered.length} of {SA_TENANTS.length} tenants
        </div>
      </Card>
    </div>
  )
}
