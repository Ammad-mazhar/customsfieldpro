import { useState } from 'react'
import { Card, CardHeader, Btn, Badge, Toggle } from './SuperAdmin'

const TYPE_STYLES = {
  info:     { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', icon: 'ℹ' },
  warning:  { bg: '#fffbeb', border: '#fde68a', color: '#b45309', icon: '⚠' },
  success:  { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', icon: '✓' },
  critical: { bg: '#fef2f2', border: '#fca5a5', color: '#dc2626', icon: '🔴' },
}

const PAST_ANNOUNCEMENTS = [
  { id: 1, title: 'Scheduled Maintenance — May 3', type: 'warning', target: 'All tenants', channels: ['In-app', 'Email'], sent: '2026-05-01', recipients: 47, opened: 38 },
  { id: 2, title: 'New Feature: Digital Signatures', type: 'success', target: 'Pro + Business', channels: ['In-app'], sent: '2026-04-28', recipients: 29, opened: 24 },
  { id: 3, title: 'Trial Ending Reminder', type: 'info', target: 'Trial users', channels: ['Email'], sent: '2026-04-25', recipients: 12, opened: 9 },
]

export default function SAAnnouncements() {
  const [announcements, setAnnouncements] = useState(PAST_ANNOUNCEMENTS)
  const [maintenance, setMaintenance] = useState(() => localStorage.getItem('fieldflow_maintenance_mode') === 'true')
  const [maintenanceMsg, setMaintenanceMsg] = useState('We are currently performing scheduled maintenance. We will be back shortly.')
  const [maintenanceEta, setMaintenanceEta] = useState('')

  // Form state
  const [title, setTitle]       = useState('')
  const [message, setMessage]   = useState('')
  const [type, setType]         = useState('info')
  const [targetType, setTargetType] = useState('all')
  const [targetPlan, setTargetPlan] = useState('starter')
  const [chanInApp, setChanInApp]   = useState(true)
  const [chanEmail, setChanEmail]   = useState(false)
  const [schedule, setSchedule] = useState('now')
  const [schedDate, setSchedDate] = useState('')
  const [preview, setPreview]   = useState(false)
  const [sent, setSent]         = useState(false)

  const targetLabels = {
    all: 'All tenants', plan: `Plan: ${targetPlan}`, trial: 'Trial users only', paying: 'Paying customers',
  }

  function send() {
    if (!title.trim() || !message.trim()) return
    const newAnn = {
      id: Date.now(), title, type,
      target: targetLabels[targetType],
      channels: [chanInApp && 'In-app', chanEmail && 'Email'].filter(Boolean),
      sent: new Date().toLocaleDateString(),
      recipients: targetType === 'all' ? 47 : targetType === 'trial' ? 12 : 29,
      opened: 0,
    }
    setAnnouncements(a => [newAnn, ...a])
    setSent(true)
    setTitle(''); setMessage(''); setPreview(false)
    setTimeout(() => setSent(false), 3000)
  }

  function toggleMaintenance() {
    const next = !maintenance
    setMaintenance(next)
    localStorage.setItem('fieldflow_maintenance_mode', String(next))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Create announcement */}
      <Card>
        <CardHeader title="Create Announcement" />
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Type selector */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(TYPE_STYLES).map(([key, s]) => (
                <button
                  key={key}
                  onClick={() => setType(key)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${type === key ? s.border : '#e5e7eb'}`,
                    background: type === key ? s.bg : '#fff', color: type === key ? s.color : '#6b7280',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
                    fontFamily: 'inherit',
                  }}
                >
                  {s.icon} {key}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title..." style={{ width: '100%', padding: '9px 14px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Announcement message..." rows={4} style={{ width: '100%', padding: '9px 14px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Target Audience</label>
              <select value={targetType} onChange={e => setTargetType(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1.5px solid #d1d5db', fontSize: 13, outline: 'none', background: '#fff' }}>
                <option value="all">All Tenants</option>
                <option value="plan">Specific Plan</option>
                <option value="trial">Trial Users Only</option>
                <option value="paying">Paying Customers Only</option>
              </select>
              {targetType === 'plan' && (
                <select value={targetPlan} onChange={e => setTargetPlan(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1.5px solid #d1d5db', fontSize: 13, outline: 'none', background: '#fff', marginTop: 8 }}>
                  {['starter', 'professional', 'business', 'enterprise'].map(p => <option key={p}>{p}</option>)}
                </select>
              )}
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Channels</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[['In-app banner', chanInApp, setChanInApp], ['Email notification', chanEmail, setChanEmail]].map(([l, v, f]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Toggle value={v} onChange={f} />
                    <span style={{ fontSize: 13, color: '#374151' }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Schedule</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {['now', 'later'].map(s => (
                <button key={s} onClick={() => setSchedule(s)} style={{
                  padding: '6px 16px', borderRadius: 7, border: `1.5px solid ${schedule === s ? '#2563eb' : '#e5e7eb'}`,
                  background: schedule === s ? '#eff6ff' : '#fff', color: schedule === s ? '#2563eb' : '#6b7280',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {s === 'now' ? 'Send Now' : 'Schedule'}
                </button>
              ))}
              {schedule === 'later' && (
                <input type="datetime-local" value={schedDate} onChange={e => setSchedDate(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1.5px solid #d1d5db', fontSize: 13, outline: 'none' }} />
              )}
            </div>
          </div>

          {/* Preview */}
          {preview && title && (
            <div style={{ border: `1.5px solid ${TYPE_STYLES[type].border}`, background: TYPE_STYLES[type].bg, borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{TYPE_STYLES[type].icon}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: TYPE_STYLES[type].color }}>{title}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: TYPE_STYLES[type].color }}>{message}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="outline" size="sm" onClick={() => setPreview(p => !p)}>{preview ? 'Hide Preview' : 'Preview'}</Btn>
            <Btn variant="primary" size="sm" onClick={send} disabled={!title || !message}>
              {sent ? '✓ Sent!' : schedule === 'now' ? 'Send Now' : 'Schedule'}
            </Btn>
          </div>
        </div>
      </Card>

      {/* Maintenance mode */}
      <Card>
        <CardHeader title="Maintenance Mode" />
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 600, color: '#374151' }}>Enable Maintenance Mode</p>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>All tenants see a maintenance page. Super admin still has full access.</p>
            </div>
            <Toggle value={maintenance} onChange={toggleMaintenance} />
          </div>
          {maintenance && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
              ⚠ Maintenance mode is ACTIVE. All tenants are seeing the maintenance page.
            </div>
          )}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Maintenance Message</label>
            <textarea value={maintenanceMsg} onChange={e => setMaintenanceMsg(e.target.value)} rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Estimated Completion</label>
            <input type="datetime-local" value={maintenanceEta} onChange={e => setMaintenanceEta(e.target.value)} style={{ padding: '7px 12px', borderRadius: 7, border: '1.5px solid #d1d5db', fontSize: 13, outline: 'none' }} />
          </div>
        </div>
      </Card>

      {/* Past announcements */}
      <Card>
        <CardHeader title="Announcements History" />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>
              {['Title', 'Type', 'Target', 'Channels', 'Sent', 'Recipients', 'Opened', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {announcements.map(a => {
              const s = TYPE_STYLES[a.type]
              return (
                <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: '#111827' }}>{a.title}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                      {s.icon} {a.type}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: '#6b7280' }}>{a.target}</td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: '#374151' }}>{a.channels.join(', ')}</td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: '#9ca3af' }}>{a.sent}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: '#374151' }}>{a.recipients}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: '#16a34a', fontWeight: 600 }}>{a.opened}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Btn variant="outline" size="xs">Duplicate</Btn>
                      <Btn variant="danger"  size="xs" onClick={() => setAnnouncements(p => p.filter(x => x.id !== a.id))}>Delete</Btn>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
