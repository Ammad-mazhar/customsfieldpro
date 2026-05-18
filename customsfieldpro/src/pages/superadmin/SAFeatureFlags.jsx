import { useState } from 'react'
import { Card, CardHeader, Btn, Toggle, Badge } from './SuperAdmin'
import { FEATURE_FLAGS, SA_TENANTS } from './saData'

const PLANS = ['starter', 'professional', 'business', 'enterprise']

const PLAN_COLORS = {
  starter:      { bg: '#f3f4f6', color: '#374151' },
  professional: { bg: '#eff6ff', color: '#2563eb' },
  business:     { bg: '#f5f3ff', color: '#7c3aed' },
  enterprise:   { bg: '#111827', color: '#f9fafb' },
}

function PlanCell({ enabled }) {
  return (
    <td style={{ padding: '11px 14px', textAlign: 'center' }}>
      {enabled
        ? <span style={{ color: '#16a34a', fontSize: 16, fontWeight: 700 }}>✓</span>
        : <span style={{ color: '#e5e7eb', fontSize: 16 }}>—</span>
      }
    </td>
  )
}

function TenantOverrideModal({ flag, tenants, onClose }) {
  const [overrides, setOverrides] = useState(() => {
    const map = {}
    tenants.forEach(t => { map[t.id] = false })
    return map
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ background: '#fff', borderRadius: 14, width: 540, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Tenant Overrides — {flag.label}</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Enable or disable this feature for specific tenants, regardless of their plan.</p>
        </div>
        <div style={{ overflow: 'auto', flex: 1, padding: '12px 24px' }}>
          {tenants.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{t.name}</span>
                <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>{t.plan} · {t.status}</span>
              </div>
              <Toggle value={overrides[t.id]} onChange={v => setOverrides(o => ({ ...o, [t.id]: v }))} />
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn variant="outline" size="sm" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" size="sm" onClick={onClose}>Save Overrides</Btn>
        </div>
      </div>
    </div>
  )
}

export default function SAFeatureFlags() {
  const [flags, setFlags] = useState(FEATURE_FLAGS)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('')
  const [overrideModal, setOverrideModal] = useState(null)
  const [saved, setSaved] = useState(false)

  const filtered = flags.filter(f => {
    const q = search.toLowerCase()
    const matchSearch = f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q)
    const matchPlan = !filterPlan || !f.plans[filterPlan]
    return matchSearch && (filterPlan ? !f.plans[filterPlan] || matchSearch : matchSearch)
  })

  const filteredFlags = flags.filter(f => {
    const q = search.toLowerCase()
    return f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q)
  })

  function togglePlan(flagKey, plan) {
    setFlags(fs => fs.map(f => f.key === flagKey
      ? { ...f, plans: { ...f.plans, [plan]: !f.plans[plan] } }
      : f
    ))
  }

  function toggleGlobal(flagKey) {
    setFlags(fs => fs.map(f => f.key === flagKey
      ? { ...f, globalOverride: !f.globalOverride }
      : f
    ))
  }

  function saveAll() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const enabledCount = flags.filter(f => Object.values(f.plans).some(Boolean)).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Flags', value: flags.length, color: '#374151' },
          { label: 'Enabled (any plan)', value: enabledCount, color: '#16a34a' },
          { label: 'Enterprise-only', value: flags.filter(f => f.plans.enterprise && !f.plans.business).length, color: '#7c3aed' },
          { label: 'Starter+', value: flags.filter(f => f.plans.starter).length, color: '#6b7280' },
        ].map(m => (
          <div key={m.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 20px', minWidth: 140 }}>
            <p style={{ margin: '0 0 4px', fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>{m.label}</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search flags..."
          style={{ flex: '1 1 200px', padding: '8px 14px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 13, outline: 'none' }}
        />
        <Btn variant={saved ? 'success' : 'primary'} size="sm" onClick={saveAll}>
          {saved ? '✓ Saved!' : 'Save All Changes'}
        </Btn>
      </div>

      {/* Main flags table */}
      <Card>
        <CardHeader
          title="Feature Flag Matrix"
          sub="Configure which features are available on each plan"
        />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', width: '35%' }}>Feature</th>
                {PLANS.map(p => (
                  <th key={p} style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
                    <span style={{ ...PLAN_COLORS[p], padding: '3px 10px', borderRadius: 99, fontSize: 11 }}>{p}</span>
                  </th>
                ))}
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Global Override</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFlags.map(f => (
                <tr key={f.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{f.key}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>{f.desc}</div>
                  </td>
                  {PLANS.map(p => (
                    <td key={p} style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <Toggle value={!!f.plans[p]} onChange={() => togglePlan(f.key, p)} />
                    </td>
                  ))}
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <Toggle value={!!f.globalOverride} onChange={() => toggleGlobal(f.key)} />
                      {f.globalOverride && (
                        <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 700 }}>ALL TENANTS</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <Btn variant="outline" size="xs" onClick={() => setOverrideModal(f)}>
                      Per-Tenant
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Plan comparison summary */}
      <Card>
        <CardHeader title="Plan Summary" sub="Features enabled per plan" />
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {PLANS.map(plan => {
            const planFlags = flags.filter(f => f.plans[plan])
            return (
              <div key={plan} style={{ border: '1.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ ...PLAN_COLORS[plan], padding: '10px 14px', fontWeight: 700, fontSize: 13, textTransform: 'capitalize' }}>
                  {plan}
                  <span style={{ float: 'right', fontSize: 11, fontWeight: 400, opacity: 0.8 }}>{planFlags.length} features</span>
                </div>
                <div style={{ padding: '10px 14px' }}>
                  {planFlags.map(f => (
                    <div key={f.key} style={{ fontSize: 12, color: '#374151', padding: '3px 0', borderBottom: '1px solid #f9fafb' }}>
                      ✓ {f.label}
                    </div>
                  ))}
                  {flags.filter(f => !f.plans[plan]).map(f => (
                    <div key={f.key} style={{ fontSize: 12, color: '#d1d5db', padding: '3px 0', borderBottom: '1px solid #f9fafb' }}>
                      — {f.label}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {overrideModal && (
        <TenantOverrideModal
          flag={overrideModal}
          tenants={SA_TENANTS}
          onClose={() => setOverrideModal(null)}
        />
      )}
    </div>
  )
}
