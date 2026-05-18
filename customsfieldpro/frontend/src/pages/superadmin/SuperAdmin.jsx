import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts'

// ── Credentials from env (demo fallback) ──────────────────────────────────────
const SA_EMAIL    = import.meta.env.VITE_SUPERADMIN_EMAIL    || 'superadmin@customsfieldpro.com'
const SA_PASSWORD = import.meta.env.VITE_SUPERADMIN_PASSWORD || 'superadmin123'

const SA_SESSION_KEY = 'customsfieldpro_sa_session'
const TENANTS_KEY    = 'customsfieldpro_sa_tenants'

// ── Plan config ───────────────────────────────────────────────────────────────
const PLAN_MRR = { trial: 0, starter: 79, professional: 179, business: 349, enterprise: 699 }
const PLAN_BADGE = {
  trial:        { bg: '#f3f4f6', color: '#6b7280',  label: 'Trial'        },
  starter:      { bg: '#eff6ff', color: '#2563eb',  label: 'Starter'      },
  professional: { bg: '#f5f3ff', color: '#7c3aed',  label: 'Professional' },
  business:     { bg: '#ecfdf5', color: '#059669',  label: 'Business'     },
  enterprise:   { bg: '#fef2f2', color: '#dc2626',  label: 'Enterprise'   },
}
const STATUS_BADGE = {
  active:    { bg: '#ecfdf5', color: '#059669', label: 'Active'    },
  suspended: { bg: '#fffbeb', color: '#d97706', label: 'Suspended' },
  cancelled: { bg: '#fef2f2', color: '#dc2626', label: 'Cancelled' },
}

// ── Sample tenant data ────────────────────────────────────────────────────────
function daysOut(n) {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10)
}

const SAMPLE_TENANTS = [
  { id: 't1',  businessName: 'Cool Air HVAC',          plan: 'professional', status: 'active',    trialEndsAt: null,          renewalDate: daysOut(18), userCount: 8,  jobsThisMonth: 47, adminEmail: 'admin@coolair.com',       adminName: 'James Wilson',  createdAt: '2024-06-15' },
  { id: 't2',  businessName: 'QuickFix Plumbing',      plan: 'starter',      status: 'active',    trialEndsAt: null,          renewalDate: daysOut(5),  userCount: 3,  jobsThisMonth: 28, adminEmail: 'owner@quickfix.com',      adminName: 'Maria Santos',  createdAt: '2024-08-02' },
  { id: 't3',  businessName: 'Bright Spark Electric',  plan: 'trial',        status: 'active',    trialEndsAt: daysOut(9),    renewalDate: null,        userCount: 2,  jobsThisMonth: 11, adminEmail: 'admin@brightspark.com',   adminName: 'Tom Chen',      createdAt: '2024-11-20' },
  { id: 't4',  businessName: 'ProClean Services',      plan: 'business',     status: 'active',    trialEndsAt: null,          renewalDate: daysOut(22), userCount: 15, jobsThisMonth: 93, adminEmail: 'ops@proclean.com',        adminName: 'Rachel Kim',    createdAt: '2024-03-10' },
  { id: 't5',  businessName: 'Summit Roofing',         plan: 'trial',        status: 'active',    trialEndsAt: daysOut(2),    renewalDate: null,        userCount: 4,  jobsThisMonth: 7,  adminEmail: 'info@summitroofing.com',  adminName: 'Derek Hall',    createdAt: '2024-11-28' },
  { id: 't6',  businessName: 'OceanView Landscaping',  plan: 'professional', status: 'active',    trialEndsAt: null,          renewalDate: daysOut(11), userCount: 6,  jobsThisMonth: 34, adminEmail: 'admin@oceanview.com',     adminName: 'Sofia Rivera',  createdAt: '2024-07-01' },
  { id: 't7',  businessName: 'Metro Pest Control',     plan: 'starter',      status: 'suspended', trialEndsAt: null,          renewalDate: daysOut(-3), userCount: 2,  jobsThisMonth: 0,  adminEmail: 'contact@metropest.com',   adminName: 'Aaron Mills',   createdAt: '2024-09-14' },
  { id: 't8',  businessName: 'Alpine Glass Repair',    plan: 'trial',        status: 'active',    trialEndsAt: daysOut(-2),   renewalDate: null,        userCount: 1,  jobsThisMonth: 3,  adminEmail: 'admin@alpineglass.com',   adminName: 'Nadia Patel',   createdAt: '2024-11-10' },
  { id: 't9',  businessName: 'SunState Solar',         plan: 'business',     status: 'active',    trialEndsAt: null,          renewalDate: daysOut(30), userCount: 11, jobsThisMonth: 62, adminEmail: 'ops@sunstate.com',        adminName: 'Chris Park',    createdAt: '2024-04-22' },
  { id: 't10', businessName: 'CityWide Cleaning',      plan: 'trial',        status: 'active',    trialEndsAt: daysOut(12),   renewalDate: null,        userCount: 2,  jobsThisMonth: 5,  adminEmail: 'hello@citywide.com',      adminName: 'Emma Foster',   createdAt: '2024-11-18' },
]

function seedTenants() {
  if (!localStorage.getItem(TENANTS_KEY))
    localStorage.setItem(TENANTS_KEY, JSON.stringify(SAMPLE_TENANTS))
}
function getTenants()           { seedTenants(); try { return JSON.parse(localStorage.getItem(TENANTS_KEY)) } catch { return SAMPLE_TENANTS } }
function saveTenants(t)         { localStorage.setItem(TENANTS_KEY, JSON.stringify(t)) }
function getSASession()         { try { return JSON.parse(sessionStorage.getItem(SA_SESSION_KEY)) } catch { return null } }
function setSASession(s)        { sessionStorage.setItem(SA_SESSION_KEY, JSON.stringify(s)) }
function clearSASession()       { sessionStorage.removeItem(SA_SESSION_KEY) }

// Generate 6-month MRR history based on current paying tenants
function buildMRRHistory(tenants) {
  const paying = tenants.filter(t => t.plan !== 'trial' && t.status === 'active')
  const currentMRR = paying.reduce((s, t) => s + (PLAN_MRR[t.plan] || 0), 0)
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' })
    const factor = 0.55 + (0.45 * i / 5)
    return { month: label, mrr: Math.round(currentMRR * factor) }
  })
}

function fmt$(n) { return `$${Number(n).toLocaleString()}` }
function trialDaysLeft(t) {
  if (!t.trialEndsAt) return null
  return Math.ceil((new Date(t.trialEndsAt) - new Date()) / 86400000)
}

// ── Badge components ──────────────────────────────────────────────────────────
function Badge({ cfg, children }) {
  return <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 5, padding: '2px 8px', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{children || cfg.label}</span>
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent = '#2563eb' }) {
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '18px 22px', minWidth: 0 }}>
      <p style={{ margin: '0 0 4px', fontSize: 12, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.5px' }}>{value}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: 12, color: accent, fontWeight: 500 }}>{sub}</p>}
    </div>
  )
}

// ── Login screen ──────────────────────────────────────────────────────────────
function SuperAdminLogin({ onLogin }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 300))
    if (email.trim().toLowerCase() === SA_EMAIL.toLowerCase() && password === SA_PASSWORD) {
      onLogin({ email: SA_EMAIL, loginAt: new Date().toISOString() })
    } else {
      setError('Invalid super admin credentials.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380, background: '#1e293b', borderRadius: 14, border: '1px solid #334155', padding: '36px 36px 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 9, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>CustomsFieldPro</p>
            <p style={{ margin: 0, fontSize: 11, color: '#7c3aed', fontWeight: 600, letterSpacing: '0.5px' }}>SUPER ADMIN</p>
          </div>
        </div>

        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px', textAlign: 'center' }}>Restricted Access</h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px', textAlign: 'center' }}>CustomsFieldPro internal use only</p>

        {error && (
          <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', color: '#fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: '#94a3b8' }}>Email</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }} placeholder={SA_EMAIL}
              style={{ height: 40, background: '#0f172a', border: '1px solid #334155', borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#f1f5f9', outline: 'none', boxSizing: 'border-box', width: '100%' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: '#94a3b8' }}>Password</label>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="••••••••"
              style={{ height: 40, background: '#0f172a', border: '1px solid #334155', borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#f1f5f9', outline: 'none', boxSizing: 'border-box', width: '100%' }} />
          </div>
          <button type="submit" disabled={loading}
            style={{ height: 42, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Authenticating…' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 11.5, color: '#475569', marginTop: 20 }}>
          Demo: {SA_EMAIL} / {SA_PASSWORD}
        </p>
      </div>
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ tenants }) {
  const stats = useMemo(() => {
    const now = new Date()
    const activeTrials  = tenants.filter(t => t.plan === 'trial' && t.status === 'active' && t.trialEndsAt && new Date(t.trialEndsAt) > now)
    const paying        = tenants.filter(t => t.plan !== 'trial' && t.status === 'active')
    const mrr           = paying.reduce((s, t) => s + (PLAN_MRR[t.plan] || 0), 0)
    const totalUsers    = tenants.reduce((s, t) => s + t.userCount, 0)
    const jobsToday     = tenants.reduce((s, t) => s + Math.round(t.jobsThisMonth / 22), 0) // rough daily estimate
    const avgTrialDays  = activeTrials.length
      ? (activeTrials.reduce((s, t) => s + Math.max(0, Math.ceil((new Date(t.trialEndsAt) - now) / 86400000)), 0) / activeTrials.length).toFixed(1)
      : 0
    return { total: tenants.length, activeTrials: activeTrials.length, avgTrialDays, paying: paying.length, mrr, totalUsers, jobsToday }
  }, [tenants])

  return (
    <div style={{ padding: '28px 32px' }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>Platform Overview</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 32 }}>
        <StatCard label="Total Tenants"    value={stats.total}        sub={`${stats.paying} paying`} />
        <StatCard label="Active Trials"    value={stats.activeTrials} sub={`avg ${stats.avgTrialDays} days left`} accent="#f59e0b" />
        <StatCard label="Paying Customers" value={stats.paying}       sub="active subscriptions" accent="#10b981" />
        <StatCard label="MRR"              value={fmt$(stats.mrr)}    sub="monthly recurring rev." accent="#10b981" />
        <StatCard label="Total Users"      value={stats.totalUsers}   sub="across all tenants" />
        <StatCard label="Jobs Today"       value={`~${stats.jobsToday}`} sub="estimated from this month" accent="#a78bfa" />
      </div>

      {/* Plan distribution */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '20px 24px' }}>
        <p style={{ margin: '0 0 16px', fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>Plan Distribution</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Object.entries(PLAN_MRR).map(([plan]) => {
            const count = tenants.filter(t => t.plan === plan).length
            const cfg = PLAN_BADGE[plan]
            return (
              <div key={plan} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: '14px 20px', minWidth: 120, textAlign: 'center' }}>
                <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 5, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>{cfg.label}</span>
                <p style={{ margin: '8px 0 2px', fontSize: 26, fontWeight: 800, color: '#f1f5f9' }}>{count}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{fmt$(PLAN_MRR[plan])}/mo</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Tenants tab ───────────────────────────────────────────────────────────────
function TenantsTab({ tenants, setTenants, onImpersonate }) {
  const [filterPlan,   setFilterPlan]   = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [search,       setSearch]       = useState('')
  const [confirmDel,   setConfirmDel]   = useState(null) // tenant id
  const navigate = useNavigate()

  const filtered = useMemo(() => tenants.filter(t => {
    if (filterPlan   !== 'all' && t.plan   !== filterPlan)   return false
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (search && !t.businessName.toLowerCase().includes(search.toLowerCase()) &&
        !t.adminEmail.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [tenants, filterPlan, filterStatus, search])

  function handleSuspend(id) {
    const updated = tenants.map(t => t.id === id ? { ...t, status: t.status === 'suspended' ? 'active' : 'suspended' } : t)
    saveTenants(updated); setTenants(updated)
  }

  function handleDelete(id) {
    const updated = tenants.filter(t => t.id !== id)
    saveTenants(updated); setTenants(updated); setConfirmDel(null)
  }

  const inputStyle = { height: 36, background: '#0f172a', border: '1px solid #334155', borderRadius: 7, padding: '0 11px', fontSize: 13, color: '#f1f5f9', outline: 'none' }
  const selectStyle = { ...inputStyle, cursor: 'pointer' }

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>Tenants ({filtered.length})</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, width: 200 }} />
          <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} style={selectStyle}>
            <option value="all">All Plans</option>
            {Object.keys(PLAN_MRR).map(p => <option key={p} value={p}>{PLAN_BADGE[p].label}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                {['Business Name', 'Plan', 'Trial / Renewal', 'Users', 'Jobs/mo', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const days = trialDaysLeft(t)
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #1e3a5f20' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <p style={{ margin: 0, fontWeight: 600, color: '#f1f5f9' }}>{t.businessName}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#64748b' }}>{t.adminEmail}</p>
                    </td>
                    <td style={{ padding: '12px 14px' }}><Badge cfg={PLAN_BADGE[t.plan]} /></td>
                    <td style={{ padding: '12px 14px', fontSize: 12.5, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {t.plan === 'trial'
                        ? days !== null
                          ? <span style={{ color: days <= 2 ? '#f87171' : days <= 7 ? '#fb923c' : '#94a3b8' }}>
                              {days > 0 ? `${days}d trial left` : 'Trial expired'}
                            </span>
                          : '—'
                        : t.renewalDate
                          ? `Renews ${t.renewalDate}`
                          : '—'
                      }
                    </td>
                    <td style={{ padding: '12px 14px', color: '#94a3b8' }}>{t.userCount}</td>
                    <td style={{ padding: '12px 14px', color: '#94a3b8' }}>{t.jobsThisMonth}</td>
                    <td style={{ padding: '12px 14px' }}><Badge cfg={STATUS_BADGE[t.status] || STATUS_BADGE.active} /></td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <ActionBtn color="#2563eb" onClick={() => onImpersonate(t)}>Impersonate</ActionBtn>
                        <ActionBtn color="#d97706" onClick={() => handleSuspend(t.id)}>
                          {t.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                        </ActionBtn>
                        <ActionBtn color="#dc2626" onClick={() => setConfirmDel(t.id)}>Delete</ActionBtn>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!filtered.length && (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#475569' }}>No tenants match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmDel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: '28px 32px', maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 10px', color: '#f1f5f9', fontSize: 17 }}>Delete Tenant?</h3>
            <p style={{ margin: '0 0 20px', color: '#94a3b8', fontSize: 13.5, lineHeight: 1.5 }}>
              This will permanently remove <strong style={{ color: '#f1f5f9' }}>{tenants.find(t => t.id === confirmDel)?.businessName}</strong> and all associated data. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDel(null)} style={{ padding: '8px 18px', background: 'transparent', border: '1px solid #334155', borderRadius: 7, color: '#94a3b8', cursor: 'pointer', fontSize: 13.5 }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDel)} style={{ padding: '8px 18px', background: '#dc2626', border: 'none', borderRadius: 7, color: '#fff', cursor: 'pointer', fontSize: 13.5, fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ActionBtn({ children, color, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ padding: '4px 10px', border: `1px solid ${color}`, borderRadius: 5, background: hover ? color : 'transparent', color: hover ? '#fff' : color, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  )
}

// ── Revenue tab ───────────────────────────────────────────────────────────────
function RevenueTab({ tenants }) {
  const mrrHistory = useMemo(() => buildMRRHistory(tenants), [tenants])

  const now = new Date()
  const paying   = tenants.filter(t => t.plan !== 'trial' && t.status === 'active')
  const trials   = tenants.filter(t => t.plan === 'trial')
  const expired  = trials.filter(t => t.trialEndsAt && new Date(t.trialEndsAt) < now)
  const converted = paying.length
  const convRate  = trials.length + converted > 0 ? ((converted / (trials.length + converted)) * 100).toFixed(1) : 0
  const churnRate = tenants.length > 0
    ? (tenants.filter(t => t.status === 'cancelled').length / tenants.length * 100).toFixed(1)
    : 0
  const currentMRR = paying.reduce((s, t) => s + (PLAN_MRR[t.plan] || 0), 0)
  const prevMRR    = mrrHistory.length >= 2 ? mrrHistory[mrrHistory.length - 2].mrr : currentMRR
  const mrrGrowth  = prevMRR > 0 ? (((currentMRR - prevMRR) / prevMRR) * 100).toFixed(1) : 0

  return (
    <div style={{ padding: '28px 32px' }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>Revenue Dashboard</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard label="Current MRR"   value={fmt$(currentMRR)} sub={`${mrrGrowth > 0 ? '+' : ''}${mrrGrowth}% from last month`} accent={mrrGrowth >= 0 ? '#10b981' : '#f87171'} />
        <StatCard label="ARR (est.)"    value={fmt$(currentMRR * 12)} sub="annualized" accent="#a78bfa" />
        <StatCard label="Churn Rate"    value={`${churnRate}%`} sub="of all tenants" accent={Number(churnRate) > 5 ? '#f87171' : '#10b981'} />
        <StatCard label="Trial → Paid"  value={`${convRate}%`} sub="conversion rate" accent={Number(convRate) > 20 ? '#10b981' : '#f59e0b'} />
      </div>

      {/* MRR chart */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
        <p style={{ margin: '0 0 16px', fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>MRR by Month</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={mrrHistory} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={v => [fmt$(v), 'MRR']}
            />
            <Area type="monotone" dataKey="mrr" stroke="#7c3aed" strokeWidth={2.5} fill="url(#mrrGrad)" dot={{ fill: '#7c3aed', r: 4 }} activeDot={{ r: 6 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Plan revenue breakdown */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '20px 24px' }}>
        <p style={{ margin: '0 0 16px', fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>Revenue by Plan</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={Object.entries(PLAN_MRR).filter(([, mrr]) => mrr > 0).map(([plan, mrr]) => ({
            plan: PLAN_BADGE[plan].label,
            revenue: tenants.filter(t => t.plan === plan && t.status === 'active').length * mrr,
            tenants: tenants.filter(t => t.plan === plan && t.status === 'active').length,
          }))} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="plan" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
              formatter={(v, name, props) => [fmt$(v), `Revenue (${props.payload.tenants} tenants)`]}
            />
            <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Main SuperAdmin component ─────────────────────────────────────────────────
export default function SuperAdmin() {
  const navigate = useNavigate()
  const [session,  setSession]  = useState(() => getSASession())
  const [tenants,  setTenants]  = useState(() => getTenants())
  const [tab,      setTab]      = useState('overview')

  function handleLogin(s) { setSASession(s); setSession(s) }

  function handleLogout() { clearSASession(); setSession(null) }

  function handleImpersonate(tenant) {
    // Store impersonation flag
    localStorage.setItem('customsfieldpro_impersonation', JSON.stringify({
      active: true,
      tenantId: tenant.id,
      tenantName: tenant.businessName,
    }))
    // Inject a fake admin session for the regular app
    const fakeUser = {
      id: `imp-${tenant.id}`,
      email: tenant.adminEmail,
      name: `${tenant.adminName}`,
      role: 'admin',
    }
    localStorage.setItem('customsfieldpro_user', JSON.stringify(fakeUser))
    // Navigate to the main app
    navigate('/dashboard')
  }

  if (!session) return <SuperAdminLogin onLogin={handleLogin} />

  const NAV = [
    { id: 'overview', label: 'Overview',  icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
    { id: 'tenants',  label: 'Tenants',   icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    { id: 'revenue',  label: 'Revenue',   icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" strokeLinecap="round"/><path d="M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6" strokeLinecap="round"/></svg> },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, minWidth: 220, background: '#1e293b', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 18px 16px', borderBottom: '1px solid #334155' }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#f1f5f9' }}>CustomsFieldPro</p>
            <p style={{ margin: 0, fontSize: 10, color: '#7c3aed', fontWeight: 700, letterSpacing: '0.5px' }}>SUPER ADMIN</p>
          </div>
        </div>

        <nav style={{ padding: '14px 10px', flex: 1 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 11px', borderRadius: 8, border: 'none', background: tab === n.id ? '#7c3aed20' : 'transparent', color: tab === n.id ? '#a78bfa' : '#64748b', fontSize: 13.5, fontWeight: tab === n.id ? 600 : 500, cursor: 'pointer', textAlign: 'left', marginBottom: 2 }}>
              {n.icon}{n.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '14px 14px', borderTop: '1px solid #334155' }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: '#475569' }}>Logged in as<br /><span style={{ color: '#94a3b8', fontWeight: 600 }}>{session.email}</span></p>
          <button onClick={handleLogout}
            style={{ width: '100%', padding: '8px 0', background: 'transparent', border: '1px solid #334155', borderRadius: 7, color: '#64748b', fontSize: 12.5, cursor: 'pointer', fontWeight: 500 }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'overview' && <OverviewTab tenants={tenants} />}
        {tab === 'tenants'  && <TenantsTab  tenants={tenants} setTenants={setTenants} onImpersonate={handleImpersonate} />}
        {tab === 'revenue'  && <RevenueTab  tenants={tenants} />}
      </main>
    </div>
  )
}
