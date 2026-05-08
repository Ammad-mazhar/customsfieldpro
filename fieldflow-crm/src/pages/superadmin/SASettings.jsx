import { useState } from 'react'
import { Card, CardHeader, Btn, Tabs, Toggle } from './SuperAdmin'

const TABS = [
  { id: 'pricing',   label: 'Pricing' },
  { id: 'email',     label: 'Email Templates' },
  { id: 'webhooks',  label: 'Webhooks' },
  { id: 'admins',    label: 'Admin Accounts' },
  { id: 'general',   label: 'General' },
]

const DEFAULT_PLANS = [
  { id: 'starter',      name: 'Starter',      price: 49,  trialDays: 14, usersLimit: 3,   jobsLimit: 50,   color: '#6b7280' },
  { id: 'professional', name: 'Professional', price: 99,  trialDays: 14, usersLimit: 10,  jobsLimit: 500,  color: '#2563eb' },
  { id: 'business',     name: 'Business',     price: 199, trialDays: 14, usersLimit: 25,  jobsLimit: 2000, color: '#7c3aed' },
  { id: 'enterprise',   name: 'Enterprise',   price: 399, trialDays: 30, usersLimit: 999, jobsLimit: 999999, color: '#111827' },
]

const EMAIL_TEMPLATES = [
  { id: 'trial_expiry',   label: 'Trial Expiry Warning',       subject: 'Your FieldFlow trial ends in {days} days' },
  { id: 'welcome',        label: 'Welcome / Onboarding',       subject: 'Welcome to FieldFlow, {name}!' },
  { id: 'payment_failed', label: 'Payment Failed',             subject: 'Action required: Payment failed for your FieldFlow account' },
  { id: 'invoice',        label: 'Monthly Invoice',            subject: 'Your FieldFlow invoice for {month}' },
  { id: 'maintenance',    label: 'Maintenance Notification',   subject: 'Scheduled maintenance: {date}' },
  { id: 'password_reset', label: 'Password Reset',             subject: 'Reset your FieldFlow password' },
]

const DEFAULT_BODIES = {
  trial_expiry:   'Hi {name},\n\nYour FieldFlow trial expires in {days} days. Upgrade now to keep all your data, clients, and jobs.\n\nUse code WELCOME20 for 20% off your first 3 months.\n\nUpgrade here: {upgrade_url}\n\nBest,\nFieldFlow Team',
  welcome:        'Hi {name},\n\nWelcome to FieldFlow! We\'re excited to have you on board.\n\nGet started by:\n1. Adding your first client\n2. Creating a job\n3. Inviting your team\n\nNeed help? Reply to this email anytime.\n\nBest,\nFieldFlow Team',
  payment_failed: 'Hi {name},\n\nWe couldn\'t process your payment of ${amount} for your FieldFlow subscription.\n\nPlease update your payment method to avoid service interruption: {billing_url}\n\nBest,\nFieldFlow Team',
  invoice:        'Hi {name},\n\nPlease find your invoice for {month} attached.\n\nAmount: ${amount}\nPlan: {plan}\n\nView invoice: {invoice_url}\n\nThank you,\nFieldFlow Team',
  maintenance:    'Hi {name},\n\nWe\'ll be performing scheduled maintenance on {date} from {start} to {end} UTC.\n\nDuring this time, FieldFlow will be unavailable. We apologize for any inconvenience.\n\nFieldFlow Team',
  password_reset: 'Hi {name},\n\nClick the link below to reset your password. This link expires in 1 hour.\n\n{reset_url}\n\nIf you didn\'t request this, ignore this email.\n\nFieldFlow Team',
}

const ADMIN_ACCOUNTS = [
  { id: 1, email: 'superadmin@fieldflow.com', name: 'Super Admin', role: 'superadmin', lastLogin: '2026-05-07 14:22', mfa: true },
  { id: 2, email: 'ops@fieldflow.com',        name: 'Ops Team',    role: 'support',    lastLogin: '2026-05-06 09:14', mfa: false },
]

function Field({ label, sub, children }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: sub ? 2 : 6 }}>{label}</label>
      {sub && <p style={{ margin: '0 0 6px', fontSize: 11, color: '#9ca3af' }}>{sub}</p>}
      {children}
    </div>
  )
}

const INPUT = { width: '100%', padding: '9px 14px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
const INPUT_SM = { padding: '7px 12px', borderRadius: 7, border: '1.5px solid #d1d5db', fontSize: 13, outline: 'none', fontFamily: 'inherit' }

export default function SASettings() {
  const [tab, setTab] = useState('pricing')
  const [plans, setPlans] = useState(DEFAULT_PLANS)
  const [editPlan, setEditPlan] = useState(null)
  const [templates, setTemplates] = useState(() => {
    const m = {}
    EMAIL_TEMPLATES.forEach(t => { m[t.id] = { subject: t.subject, body: DEFAULT_BODIES[t.id] } })
    return m
  })
  const [activeTemplate, setActiveTemplate] = useState('trial_expiry')
  const [webhooks, setWebhooks] = useState([
    { id: 1, url: 'https://hooks.example.com/fieldflow', events: ['tenant.created', 'payment.failed'], active: true, secret: 'whsec_abc123' },
  ])
  const [newWebhookUrl, setNewWebhookUrl] = useState('')
  const [saved, setSaved] = useState('')
  const [admins, setAdmins] = useState(ADMIN_ACCOUNTS)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('support')

  // General settings
  const [siteName, setSiteName] = useState('FieldFlow CRM')
  const [supportEmail, setSupportEmail] = useState('support@fieldflow.com')
  const [fromEmail, setFromEmail] = useState('noreply@fieldflow.com')
  const [trialDefault, setTrialDefault] = useState(14)
  const [maintenanceMsg, setMaintenanceMsg] = useState('We are currently performing scheduled maintenance.')
  const [signupEnabled, setSignupEnabled] = useState(true)
  const [requireMfa, setRequireMfa] = useState(false)

  function saveSection(section) {
    setSaved(section)
    setTimeout(() => setSaved(''), 2500)
  }

  function updatePlanField(id, field, val) {
    setPlans(ps => ps.map(p => p.id === id ? { ...p, [field]: val } : p))
  }

  function addWebhook() {
    if (!newWebhookUrl.trim()) return
    setWebhooks(ws => [...ws, { id: Date.now(), url: newWebhookUrl, events: ['tenant.created'], active: true, secret: 'whsec_' + Math.random().toString(36).slice(2, 10) }])
    setNewWebhookUrl('')
  }

  const WEBHOOK_EVENTS = ['tenant.created', 'tenant.cancelled', 'payment.succeeded', 'payment.failed', 'trial.started', 'trial.expired', 'user.created']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* ── Pricing ── */}
      {tab === 'pricing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {plans.map(p => (
            <Card key={p.id}>
              <div style={{ padding: '14px 20px', borderLeft: `4px solid ${p.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', textTransform: 'capitalize' }}>{p.name} Plan</span>
                  <Btn variant={editPlan === p.id ? 'primary' : 'outline'} size="sm" onClick={() => setEditPlan(editPlan === p.id ? null : p.id)}>
                    {editPlan === p.id ? 'Done' : 'Edit'}
                  </Btn>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                  {[
                    { label: 'Monthly Price ($)', field: 'price', type: 'number' },
                    { label: 'Trial Days', field: 'trialDays', type: 'number' },
                    { label: 'Users Limit', field: 'usersLimit', type: 'number' },
                    { label: 'Jobs Limit', field: 'jobsLimit', type: 'number' },
                  ].map(f => (
                    <div key={f.field}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>{f.label}</label>
                      {editPlan === p.id
                        ? <input type={f.type} value={p[f.field]} onChange={e => updatePlanField(p.id, f.field, +e.target.value)} style={{ ...INPUT_SM, width: '100%', boxSizing: 'border-box' }} />
                        : <span style={{ fontSize: 18, fontWeight: 800, color: p.color }}>{f.field === 'price' ? `$${p[f.field]}` : p[f.field] === 999999 ? '∞' : p[f.field]}</span>
                      }
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Btn variant={saved === 'pricing' ? 'success' : 'primary'} size="sm" onClick={() => saveSection('pricing')}>
              {saved === 'pricing' ? '✓ Saved!' : 'Save Pricing Changes'}
            </Btn>
          </div>
        </div>
      )}

      {/* ── Email Templates ── */}
      {tab === 'email' && (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, alignItems: 'start' }}>
          <Card>
            <div style={{ padding: 8 }}>
              {EMAIL_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTemplate(t.id)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: 8, border: 'none',
                    background: activeTemplate === t.id ? '#eff6ff' : 'transparent', color: activeTemplate === t.id ? '#2563eb' : '#374151',
                    fontSize: 13, fontWeight: activeTemplate === t.id ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title={EMAIL_TEMPLATES.find(t => t.id === activeTemplate)?.label} sub="Use {name}, {days}, {amount}, {plan}, {upgrade_url} as variables" />
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Subject Line">
                <input
                  value={templates[activeTemplate]?.subject || ''}
                  onChange={e => setTemplates(ts => ({ ...ts, [activeTemplate]: { ...ts[activeTemplate], subject: e.target.value } }))}
                  style={INPUT}
                />
              </Field>
              <Field label="Body">
                <textarea
                  value={templates[activeTemplate]?.body || ''}
                  onChange={e => setTemplates(ts => ({ ...ts, [activeTemplate]: { ...ts[activeTemplate], body: e.target.value } }))}
                  rows={12}
                  style={{ ...INPUT, resize: 'vertical' }}
                />
              </Field>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="outline" size="sm">Send Test Email</Btn>
                <Btn variant={saved === 'email' ? 'success' : 'primary'} size="sm" onClick={() => saveSection('email')}>
                  {saved === 'email' ? '✓ Saved!' : 'Save Template'}
                </Btn>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Webhooks ── */}
      {tab === 'webhooks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <CardHeader title="Add Webhook Endpoint" />
            <div style={{ padding: 20, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Endpoint URL</label>
                <input value={newWebhookUrl} onChange={e => setNewWebhookUrl(e.target.value)} placeholder="https://your-server.com/webhook" style={{ ...INPUT }} />
              </div>
              <Btn variant="primary" size="sm" onClick={addWebhook}>Add Endpoint</Btn>
            </div>
          </Card>

          {webhooks.map(w => (
            <Card key={w.id}>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', fontFamily: 'monospace', marginBottom: 4 }}>{w.url}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>Secret: <code style={{ background: '#f3f4f6', padding: '1px 6px', borderRadius: 4 }}>{w.secret}</code></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Toggle value={w.active} onChange={v => setWebhooks(ws => ws.map(x => x.id === w.id ? { ...x, active: v } : x))} />
                    <Btn variant="danger" size="xs" onClick={() => setWebhooks(ws => ws.filter(x => x.id !== w.id))}>Remove</Btn>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>Events</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {WEBHOOK_EVENTS.map(ev => {
                      const active = w.events.includes(ev)
                      return (
                        <button
                          key={ev}
                          onClick={() => setWebhooks(ws => ws.map(x => x.id === w.id ? {
                            ...x,
                            events: active ? x.events.filter(e => e !== ev) : [...x.events, ev]
                          } : x))}
                          style={{
                            padding: '3px 10px', borderRadius: 6, border: `1.5px solid ${active ? '#2563eb' : '#e5e7eb'}`,
                            background: active ? '#eff6ff' : '#fff', color: active ? '#2563eb' : '#9ca3af',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'monospace',
                          }}
                        >
                          {ev}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <Btn variant="outline" size="xs">Send Test Ping</Btn>
                  <Btn variant="outline" size="xs">View Delivery Log</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Admin Accounts ── */}
      {tab === 'admins' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <CardHeader
              title="Admin Accounts"
              action={<Btn variant="primary" size="sm" onClick={() => setShowInvite(v => !v)}>+ Invite Admin</Btn>}
            />
            {showInvite && (
              <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Email</label>
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="admin@fieldflow.com" style={INPUT} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Role</label>
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ ...INPUT_SM }}>
                    <option value="superadmin">Super Admin</option>
                    <option value="support">Support Agent</option>
                    <option value="finance">Finance</option>
                    <option value="readonly">Read Only</option>
                  </select>
                </div>
                <Btn variant="primary" size="sm" onClick={() => {
                  if (!inviteEmail.trim()) return
                  setAdmins(a => [...a, { id: Date.now(), email: inviteEmail, name: inviteEmail.split('@')[0], role: inviteRole, lastLogin: 'Never', mfa: false }])
                  setInviteEmail(''); setShowInvite(false)
                }}>Send Invite</Btn>
              </div>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>
                  {['Name', 'Email', 'Role', 'MFA', 'Last Login', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {admins.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#111827' }}>{a.name}</td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: '#374151' }}>{a.email}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: a.role === 'superadmin' ? '#fef2f2' : '#f3f4f6', color: a.role === 'superadmin' ? '#dc2626' : '#374151', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
                        {a.role}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      {a.mfa
                        ? <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 12 }}>✓ Enabled</span>
                        : <span style={{ color: '#d97706', fontWeight: 700, fontSize: 12 }}>✕ Off</span>
                      }
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#9ca3af' }}>{a.lastLogin}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Btn variant="outline" size="xs">Edit</Btn>
                        {a.id !== 1 && <Btn variant="danger" size="xs" onClick={() => setAdmins(aa => aa.filter(x => x.id !== a.id))}>Remove</Btn>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── General ── */}
      {tab === 'general' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <CardHeader title="Platform Settings" />
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Platform Name">
                  <input value={siteName} onChange={e => setSiteName(e.target.value)} style={INPUT} />
                </Field>
                <Field label="Support Email">
                  <input value={supportEmail} onChange={e => setSupportEmail(e.target.value)} style={INPUT} />
                </Field>
                <Field label="From Email (transactional)">
                  <input value={fromEmail} onChange={e => setFromEmail(e.target.value)} style={INPUT} />
                </Field>
                <Field label="Default Trial Length (days)">
                  <input type="number" value={trialDefault} onChange={e => setTrialDefault(+e.target.value)} style={INPUT} />
                </Field>
              </div>
              <Field label="Default Maintenance Message">
                <textarea value={maintenanceMsg} onChange={e => setMaintenanceMsg(e.target.value)} rows={2} style={{ ...INPUT, resize: 'vertical' }} />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Security & Access" />
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'New Tenant Signups', sub: 'Allow new accounts to register on the platform', value: signupEnabled, onChange: setSignupEnabled },
                { label: 'Require MFA for Admins', sub: 'All super admin accounts must have 2FA enabled', value: requireMfa, onChange: setRequireMfa },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f9fafb' }}>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: '#374151' }}>{s.label}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>{s.sub}</p>
                  </div>
                  <Toggle value={s.value} onChange={s.onChange} />
                </div>
              ))}
            </div>
          </Card>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Btn variant={saved === 'general' ? 'success' : 'primary'} size="sm" onClick={() => saveSection('general')}>
              {saved === 'general' ? '✓ Saved!' : 'Save Settings'}
            </Btn>
          </div>
        </div>
      )}
    </div>
  )
}
