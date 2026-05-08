// AI Receptionist — 5-tab admin page
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  loadSettings, saveSettings, DEFAULT_SETTINGS,
  handleIncomingMessage, loadAllConversations, saveAllConversations,
  getAIStats, loadConversation, clearConversation,
  checkEscalation, buildSystemPrompt,
} from '../../utils/aiReceptionist'

// ── Helpers ──────────────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const OUTCOME_COLORS = {
  'Request Created':    { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  'Escalated to Human': { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  'Answered Only':      { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  'Ongoing':            { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
}

const SCENARIOS = {
  'AC Not Working':       'Hi, my AC stopped working completely',
  'Water Heater Leak':    'My water heater is leaking water all over the floor',
  'Emergency — No Heat':  'I smell gas coming from my furnace, no heat',
  'Angry Customer':       'This is terrible service, I want to cancel and speak to a manager',
  'After Hours Inquiry':  'Do you have someone available tonight?',
  'Booking Request':      'I need to book a plumber for a leaking pipe next week',
}

const SIM_PHONE = '(703) 555-TEST'

function maskPhone(p) { return String(p).replace(/\d{4}(?=\D*$)/, 'XXXX') }

function timeAgo(iso) {
  if (!iso) return '—'
  const d = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (d < 1) return 'Just now'
  if (d < 60) return `${d}m ago`
  const h = Math.floor(d / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
}

function OutcomeBadge({ outcome }) {
  const c = OUTCOME_COLORS[outcome] || OUTCOME_COLORS['Ongoing']
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      whiteSpace: 'nowrap',
    }}>
      {outcome === 'Ongoing' && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, animation: 'pulseDot 1.4s infinite', flexShrink: 0 }} />
      )}
      {outcome}
    </span>
  )
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ border: '1px solid #e8e9ec', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: '#f8f9fa', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1d23' }}>{title}</span>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && <div style={{ padding: '18px 18px' }}>{children}</div>}
    </div>
  )
}

function LabeledInput({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '4px 0 0' }}>{hint}</p>}
    </div>
  )
}

const INP = { height: 38, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#374151', outline: 'none', width: '100%', boxSizing: 'border-box', background: '#fff' }
const SEL = { ...INP, appearance: 'auto' }
const TA  = { border: '1px solid #e8e9ec', borderRadius: 7, padding: '10px 12px', fontSize: 13.5, color: '#374151', outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5 }

// ── Tab 1: Dashboard ─────────────────────────────────────────────────────────

function Tab1Dashboard({ settings, onTabChange, navigate }) {
  const [stats]     = useState(() => getAIStats())
  const [convs]     = useState(() => loadAllConversations())
  const escalations = convs.filter(c => c.escalated)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Connected phone + today stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Texts Handled',    value: stats.todayTexts,       color: '#2563eb', bg: '#eff6ff', icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/></svg> },
          { label: 'Calls Handled',    value: stats.todayCalls,       color: '#16a34a', bg: '#f0fdf4', icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.08 6.08l.91-.86a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round" strokeLinejoin="round"/></svg> },
          { label: 'Requests Created', value: stats.todayRequests,    color: '#7c3aed', bg: '#f5f3ff', icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" strokeLinecap="round"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12" strokeLinecap="round"/><line x1="9" y1="16" x2="13" y2="16" strokeLinecap="round"/></svg> },
          { label: 'Escalations',      value: stats.todayEscalations, color: '#dc2626', bg: '#fef2f2', icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round"/><line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></svg> },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</span>
            </div>
            <p style={{ fontSize: 30, fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '3px 0 0' }}>Today</p>
          </div>
        ))}
      </div>

      {/* Info row */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Receptionist Info</h3>
            {settings.active && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '3px 10px' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', animation: 'pulseDot 1.4s infinite', flexShrink: 0 }} />
                Live
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              ['Name', settings.receptionistName || 'Alex'],
              ['Phone', settings.connectedPhone || '(703) 555-0190'],
              ['Mode', settings.twilioAccountSid ? '🟢 Live (Twilio)' : '🟡 Test Mode'],
              ['Language', settings.language || 'English'],
              ['Tone', settings.tone || 'Friendly'],
              ['Emergency', settings.emergencyService ? '✓ Available' : '✗ Not set'],
            ].map(([l, v]) => (
              <div key={l} style={{ background: '#f8f9fa', borderRadius: 8, padding: '10px 12px' }}>
                <p style={{ fontSize: 10.5, fontWeight: 600, color: '#9ca3af', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{l}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1d23', margin: 0 }}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '16px 20px' }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Performance</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12.5, color: '#6b7280' }}>Resolution Rate</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>{stats.resolutionRate}%</span>
              </div>
              <div style={{ height: 6, background: '#f0f1f3', borderRadius: 3 }}>
                <div style={{ height: '100%', width: `${stats.resolutionRate}%`, background: '#16a34a', borderRadius: 3, transition: 'width 0.6s' }} />
              </div>
            </div>
            {[
              ['Total Conversations', convs.length],
              ['Requests Created', convs.filter(c => c.requestId).length],
              ['Avg Messages', convs.length > 0 ? (convs.reduce((s, c) => s + (c.messageCount || 0), 0) / convs.length).toFixed(1) : '—'],
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #f0f1f3' }}>
                <span style={{ fontSize: 12.5, color: '#6b7280' }}>{l}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1d23' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Escalations panel */}
      {escalations.length > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid #fecaca', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', background: '#fef2f2', borderBottom: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round"/><line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round"/><circle cx="12" cy="17" r="0.5" fill="#dc2626"/></svg>
            <h3 style={{ fontSize: 13.5, fontWeight: 700, color: '#dc2626', margin: 0 }}>Escalations Needing Attention ({escalations.length})</h3>
          </div>
          {escalations.slice(0, 5).map(c => (
            <div key={c.id} style={{ padding: '14px 20px', borderBottom: '1px solid #f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 13.5, fontWeight: 700, color: '#1a1d23' }}>🤖 {maskPhone(c.phone)}</span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{timeAgo(c.lastActivity)}</span>
                </div>
                <p style={{ fontSize: 12.5, color: '#dc2626', margin: 0 }}>{c.escalationReason || 'Customer needs human assistance'}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => navigate('/inbox')}
                  style={{ height: 32, padding: '0 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                  Take Over
                </button>
                <button style={{ height: 32, padding: '0 14px', background: '#fff', color: '#6b7280', border: '1px solid #e8e9ec', borderRadius: 7, fontSize: 12.5, cursor: 'pointer' }}>
                  Mark Resolved
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Conversations table */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f1f3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Recent AI Conversations</h3>
          <button onClick={() => onTabChange('history')}
            style={{ fontSize: 12.5, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            View All →
          </button>
        </div>
        {convs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🤖</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>No conversations yet</p>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Test the AI in the Simulator tab or activate to handle real messages.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Phone', 'Time', 'Channel', 'Messages', 'Outcome', 'Action'].map(h => (
                <th key={h} style={{ textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: '#9ca3af', padding: '9px 16px', borderBottom: '1px solid #f0f1f3', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}</tr></thead>
              <tbody>
                {convs.slice(0, 10).map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f8f9fa' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: 15 }}>🤖</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1d23', fontFamily: 'monospace' }}>{maskPhone(c.phone)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 12.5, color: '#9ca3af', whiteSpace: 'nowrap' }}>{timeAgo(c.lastActivity)}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: '#f0f9ff', color: '#0369a1' }}>{c.channel || 'SMS'}</span>
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 13, color: '#374151', textAlign: 'center' }}>{c.messageCount || 0}</td>
                    <td style={{ padding: '11px 16px' }}><OutcomeBadge outcome={c.outcome} /></td>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {c.requestId && (
                          <button onClick={() => navigate('/requests')}
                            style={{ fontSize: 11.5, color: '#16a34a', background: '#f0fdf4', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontWeight: 600 }}>
                            View Request
                          </button>
                        )}
                        {c.escalated && (
                          <button onClick={() => navigate('/inbox')}
                            style={{ fontSize: 11.5, color: '#dc2626', background: '#fef2f2', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontWeight: 600 }}>
                            Take Over
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tab 2: Setup & Configuration ─────────────────────────────────────────────

function Tab2Setup({ settings, persist, flash }) {
  const [apiTesting, setApiTesting] = useState(false)
  const [apiStatus,  setApiStatus]  = useState(null)

  function toggleService(svc) {
    const next = settings.services.includes(svc)
      ? settings.services.filter(s => s !== svc)
      : [...settings.services, svc]
    persist({ services: next })
  }

  function updateHours(day, field, value) {
    persist({ businessHours: { ...settings.businessHours, [day]: { ...settings.businessHours[day], [field]: value } } })
  }

  async function testApiConnection() {
    const key = settings.anthropicApiKey
    if (!key) { setApiStatus({ ok: false, msg: 'No API key entered' }); return }
    setApiTesting(true)
    const t0 = Date.now()
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 20,
          messages: [{ role: 'user', content: 'Reply with: OK' }],
        }),
      })
      const ms = Date.now() - t0
      if (res.ok) setApiStatus({ ok: true, msg: `Connected ✓ — ${ms}ms response time` })
      else { const d = await res.json(); setApiStatus({ ok: false, msg: d?.error?.message || `HTTP ${res.status}` }) }
    } catch (e) { setApiStatus({ ok: false, msg: e.message }) }
    setApiTesting(false)
  }

  const previewGreeting = (settings.greeting || '')
    .replace('{{company_name}}', settings.businessName || 'FieldFlow')
    .replace('{{receptionist_name}}', settings.receptionistName || 'Alex')

  return (
    <div style={{ maxWidth: 780 }}>
      {/* Business Info */}
      <Section title="1 · Business Information">
        <LabeledInput label="Business Name">
          <input style={INP} value={settings.businessName} onChange={e => persist({ businessName: e.target.value })} />
        </LabeledInput>
        <LabeledInput label="Services Offered">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
            {['HVAC', 'Plumbing', 'Electrical', 'Appliance Repair', 'Generator', 'Drain Cleaning'].map(svc => {
              const on = settings.services?.includes(svc)
              return (
                <button key={svc} onClick={() => toggleService(svc)}
                  style={{ height: 32, padding: '0 14px', border: `1px solid ${on ? '#2563eb' : '#e8e9ec'}`, borderRadius: 20, background: on ? '#eff6ff' : '#f9fafb', color: on ? '#2563eb' : '#6b7280', fontSize: 12.5, fontWeight: on ? 700 : 500, cursor: 'pointer' }}>
                  {on ? '✓ ' : ''}{svc}
                </button>
              )
            })}
          </div>
        </LabeledInput>
        <LabeledInput label="Service Area" hint="Cities, ZIP codes, or counties served">
          <textarea style={{ ...TA, height: 60 }} value={settings.serviceArea} onChange={e => persist({ serviceArea: e.target.value })} />
        </LabeledInput>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Business Hours</label>
          <div style={{ border: '1px solid #e8e9ec', borderRadius: 8, overflow: 'hidden' }}>
            {DAYS.map((day, i) => {
              const h = settings.businessHours?.[day] || { open: false, start: '08:00', end: '18:00' }
              return (
                <div key={day} style={{ display: 'grid', gridTemplateColumns: '80px 60px 1fr', gap: 10, alignItems: 'center', padding: '10px 14px', borderBottom: i < 6 ? '1px solid #f0f1f3' : 'none', background: h.open ? '#fff' : '#fafafa' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{day}</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={h.open} onChange={e => updateHours(day, 'open', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#2563eb' }} />
                    <span style={{ fontSize: 12, color: h.open ? '#16a34a' : '#9ca3af', fontWeight: 600 }}>{h.open ? 'Open' : 'Closed'}</span>
                  </label>
                  {h.open ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="time" value={h.start} onChange={e => updateHours(day, 'start', e.target.value)}
                        style={{ height: 32, border: '1px solid #e8e9ec', borderRadius: 6, padding: '0 8px', fontSize: 13, color: '#374151', outline: 'none' }} />
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>to</span>
                      <input type="time" value={h.end} onChange={e => updateHours(day, 'end', e.target.value)}
                        style={{ height: 32, border: '1px solid #e8e9ec', borderRadius: 6, padding: '0 8px', fontSize: 13, color: '#374151', outline: 'none' }} />
                    </div>
                  ) : <span style={{ fontSize: 12.5, color: '#c4c9d4' }}>—</span>}
                </div>
              )
            })}
          </div>
        </div>
        <LabeledInput label="After-Hours Message">
          <textarea style={{ ...TA, height: 72 }} value={settings.afterHoursMessage} onChange={e => persist({ afterHoursMessage: e.target.value })} />
        </LabeledInput>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <LabeledInput label="Pricing Info (optional)" hint="e.g. 'Starting from $89 for a diagnostic'">
            <input style={INP} value={settings.pricingInfo} onChange={e => persist({ pricingInfo: e.target.value })} placeholder="Starting from $89 for diagnostics" />
          </LabeledInput>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Emergency Service</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => persist({ emergencyService: !settings.emergencyService })}
                style={{ width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', background: settings.emergencyService ? '#16a34a' : '#d1d5db', transition: 'background 0.2s' }}>
                <span style={{ position: 'absolute', top: 3, left: settings.emergencyService ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
              <span style={{ fontSize: 13, color: settings.emergencyService ? '#16a34a' : '#6b7280', fontWeight: 600 }}>{settings.emergencyService ? 'Available' : 'Disabled'}</span>
              {settings.emergencyService && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12.5, color: '#6b7280' }}>Surcharge: $</span>
                  <input type="number" value={settings.emergencySurcharge} onChange={e => persist({ emergencySurcharge: Number(e.target.value) })}
                    style={{ width: 70, height: 32, border: '1px solid #e8e9ec', borderRadius: 6, padding: '0 8px', fontSize: 13, color: '#374151', outline: 'none' }} />
                </div>
              )}
            </div>
          </div>
        </div>
        <LabeledInput label="Special Instructions" hint="Always included in AI context">
          <textarea style={{ ...TA, height: 64 }} value={settings.specialInstructions} onChange={e => persist({ specialInstructions: e.target.value })} placeholder="e.g. Always mention we offer free estimates for new installations" />
        </LabeledInput>
      </Section>

      {/* AI Personality */}
      <Section title="2 · AI Personality">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <LabeledInput label="Receptionist Name">
            <input style={INP} value={settings.receptionistName} onChange={e => persist({ receptionistName: e.target.value })} placeholder="Alex" />
          </LabeledInput>
          <LabeledInput label="Tone">
            <select style={SEL} value={settings.tone} onChange={e => persist({ tone: e.target.value })}>
              {['Professional', 'Friendly', 'Casual'].map(t => <option key={t}>{t}</option>)}
            </select>
          </LabeledInput>
          <LabeledInput label="Language">
            <select style={SEL} value={settings.language} onChange={e => persist({ language: e.target.value })}>
              {['English', 'Spanish', 'Both'].map(l => <option key={l}>{l}</option>)}
            </select>
          </LabeledInput>
        </div>
        <LabeledInput label="Custom Greeting" hint="Use {{company_name}} and {{receptionist_name}} as placeholders">
          <textarea style={{ ...TA, height: 80 }} value={settings.greeting} onChange={e => persist({ greeting: e.target.value })} />
        </LabeledInput>
        <div style={{ background: '#f8f9fa', border: '1px solid #e8e9ec', borderRadius: 8, padding: '12px 14px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Preview</p>
          <p style={{ fontSize: 13.5, color: '#1a1d23', margin: 0, lineHeight: 1.6 }}>"{previewGreeting}"</p>
        </div>
      </Section>

      {/* Booking */}
      <Section title="3 · Booking Settings">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button onClick={() => persist({ canBookDirectly: !settings.canBookDirectly })}
            style={{ width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', background: settings.canBookDirectly ? '#2563eb' : '#d1d5db', transition: 'background 0.2s' }}>
            <span style={{ position: 'absolute', top: 3, left: settings.canBookDirectly ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </button>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23' }}>Allow AI to book jobs directly</span>
        </div>
        {settings.canBookDirectly && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <LabeledInput label="Minimum advance notice (hours)">
                <input type="number" min="1" max="72" style={INP} value={settings.advanceHours} onChange={e => persist({ advanceHours: Number(e.target.value) })} />
              </LabeledInput>
            </div>
            <LabeledInput label="Booking Confirmation Message">
              <textarea style={{ ...TA, height: 72 }} value={settings.confirmationMessage} onChange={e => persist({ confirmationMessage: e.target.value })} />
            </LabeledInput>
          </>
        )}
      </Section>

      {/* Escalation Rules */}
      <Section title="4 · Escalation Rules">
        <p style={{ fontSize: 12.5, color: '#6b7280', marginTop: 0, marginBottom: 16 }}>
          AI will immediately escalate conversations matching these keywords. Separate with commas.
        </p>
        {[
          { key: 'emergency',    label: '🚨 Emergency Keywords', color: '#dc2626' },
          { key: 'anger',        label: '😠 Anger / Complaint Keywords', color: '#ea580c' },
          { key: 'humanRequest', label: '👤 Human Request Keywords', color: '#7c3aed' },
        ].map(({ key, label, color }) => (
          <LabeledInput key={key} label={label}>
            <input style={{ ...INP, borderColor: color + '60' }}
              value={(settings.escalationKeywords?.[key] || []).join(', ')}
              onChange={e => persist({
                escalationKeywords: {
                  ...settings.escalationKeywords,
                  [key]: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                },
              })} />
          </LabeledInput>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <LabeledInput label="Escalate after failed attempts">
            <input type="number" min="1" max="10" style={INP} value={settings.maxAiFailures} onChange={e => persist({ maxAiFailures: Number(e.target.value) })} />
          </LabeledInput>
        </div>
        <LabeledInput label="Message sent to customer on escalation">
          <textarea style={{ ...TA, height: 64 }} value={settings.escalationMessage} onChange={e => persist({ escalationMessage: e.target.value })} />
        </LabeledInput>
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { key: 'escalationInApp',   label: 'In-app notification' },
            { key: 'escalationSmsAdmin', label: 'SMS to admin' },
          ].map(({ key, label }) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={settings[key]} onChange={e => persist({ [key]: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: '#2563eb' }} />
              <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
            </label>
          ))}
        </div>
      </Section>

      {/* API Key */}
      <Section title="5 · Anthropic API Key">
        <LabeledInput label="API Key" hint="Your key is stored locally and never shared with third parties.">
          <input type="password" style={INP} value={settings.anthropicApiKey} onChange={e => persist({ anthropicApiKey: e.target.value })} placeholder="sk-ant-api03-..." />
        </LabeledInput>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={testApiConnection} disabled={apiTesting}
            style={{ height: 36, padding: '0 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: apiTesting ? 'wait' : 'pointer', opacity: apiTesting ? 0.7 : 1 }}>
            {apiTesting ? '⏳ Testing…' : '🔌 Test AI Connection'}
          </button>
          {apiStatus && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: apiStatus.ok ? '#16a34a' : '#dc2626', background: apiStatus.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${apiStatus.ok ? '#bbf7d0' : '#fecaca'}`, borderRadius: 7, padding: '6px 12px' }}>
              {apiStatus.ok ? '✓' : '✗'} {apiStatus.msg}
            </div>
          )}
        </div>
        {!settings.anthropicApiKey && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12.5, color: '#92400E' }}>
            ⚠️ No API key configured — AI Receptionist will run in <strong>Demo Mode</strong> with simulated responses.
          </div>
        )}
        <div style={{ marginTop: 16, padding: '12px 16px', background: '#f8f9fa', borderRadius: 8, fontSize: 12.5, color: '#6b7280' }}>
          <strong style={{ color: '#374151' }}>Note:</strong> The AI Receptionist uses claude-haiku-4-5-20251001 for fast, cost-effective SMS responses. Each conversation typically costs &lt;$0.01.
        </div>
      </Section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
        <button onClick={() => flash('Settings saved successfully!')}
          style={{ height: 40, padding: '0 28px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Save All Settings
        </button>
      </div>
    </div>
  )
}

// ── Tab 3: AI Simulator ───────────────────────────────────────────────────────

function Tab3Simulator({ settings, navigate }) {
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [log,      setLog]      = useState([])
  const [banner,   setBanner]   = useState(null)
  const chatRef    = useRef(null)
  const inputRef   = useRef(null)

  const addLog = useCallback((text) => {
    setLog(prev => [...prev, { text, time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) }])
  }, [])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages, loading])

  function resetConversation() {
    clearConversation(SIM_PHONE)
    setMessages([])
    setLog([])
    setBanner(null)
    setInput('')
  }

  async function loadScenario(scenarioMsg) {
    resetConversation()
    await new Promise(r => setTimeout(r, 50))
    sendMessage(scenarioMsg)
  }

  async function sendMessage(msgText) {
    const text = (msgText ?? input).trim()
    if (!text || loading) return
    if (!msgText) setInput('')

    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    setBanner(null)
    setLog([])

    try {
      const result = await handleIncomingMessage(text, SIM_PHONE, 'SMS', addLog)

      if (result.error && !result.reply) {
        addLog(`Error: ${result.error}`)
        setLoading(false)
        return
      }

      const aiMsg = {
        role: 'assistant',
        content: result.reply || '(No reply)',
        timestamp: new Date().toISOString(),
        escalated: result.escalated,
        demoMode: result.demoMode,
      }
      setMessages(prev => [...prev, aiMsg])

      if (result.escalated) {
        setBanner({ type: 'escalation', reason: result.escalationReason || 'Escalated to human', category: result.escalationCategory })
        addLog(`⚠️ Conversation escalated`)
      } else if (result.action?.type === 'create_request') {
        setBanner({ type: 'request', requestId: result.action.request?.id })
        addLog(`✅ Service request ${result.action.request?.id} created`)
      }
    } catch (e) {
      addLog(`Fatal error: ${e.message}`)
    }
    setLoading(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const demoMode = !settings.anthropicApiKey

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', minHeight: 520 }}>
      {/* Chat panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f0f0f0', borderRadius: 16, overflow: 'hidden', minHeight: 500, border: '1px solid #e0e0e0' }}>
        {/* Phone status bar */}
        <div style={{ background: '#1a1d23', color: '#fff', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Simulated: (703) 555-TEST</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {demoMode && (
              <span style={{ fontSize: 11, fontWeight: 600, background: '#f59e0b', color: '#1a1d23', borderRadius: 10, padding: '2px 8px' }}>DEMO</span>
            )}
            <button onClick={resetConversation}
              style={{ fontSize: 11.5, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, color: '#fff', padding: '4px 10px', cursor: 'pointer', fontWeight: 500 }}>
              Reset
            </button>
          </div>
        </div>

        {/* Scenario buttons */}
        <div style={{ padding: '10px 12px', background: '#f8f8f8', borderBottom: '1px solid #e0e0e0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {Object.entries(SCENARIOS).map(([label, msg]) => (
            <button key={label} onClick={() => loadScenario(msg)} disabled={loading}
              style={{ fontSize: 11.5, padding: '4px 10px', background: '#fff', border: '1px solid #d0d0d0', borderRadius: 20, cursor: 'pointer', color: '#374151', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 280, maxHeight: 380 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
              <p style={{ fontSize: 13.5, fontWeight: 500, margin: 0 }}>Pick a scenario above or type a message below</p>
              <p style={{ fontSize: 12, margin: '6px 0 0' }}>The AI will respond as {settings.receptionistName || 'Alex'}</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-start' : 'flex-end', animation: 'slideIn 0.2s ease' }}>
              <div style={{ maxWidth: '78%', borderRadius: m.role === 'user' ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                padding: '10px 14px',
                background: m.role === 'user' ? '#fff' : m.escalated ? '#fef2f2' : '#2563eb',
                color: m.role === 'user' ? '#1a1d23' : m.escalated ? '#dc2626' : '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                border: m.escalated ? '1px solid #fecaca' : 'none',
              }}>
                {m.role === 'assistant' && (
                  <p style={{ fontSize: 10.5, fontWeight: 700, margin: '0 0 4px', opacity: 0.7 }}>🤖 {settings.receptionistName || 'Alex'} (AI){m.demoMode ? ' • Demo' : ''}</p>
                )}
                <p style={{ fontSize: 13.5, margin: 0, lineHeight: 1.5 }}>{m.content}</p>
                <p style={{ fontSize: 10, margin: '4px 0 0', opacity: 0.5, textAlign: 'right' }}>
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ background: '#2563eb', borderRadius: '16px 16px 4px 16px', padding: '10px 16px', display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0, 1, 2].map(n => (
                  <span key={n} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', animation: `pulseDot 1s ease-in-out ${n * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Banner */}
        {banner && (
          <div style={{ margin: '0 12px 8px', padding: '10px 14px', borderRadius: 8,
            background: banner.type === 'request' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${banner.type === 'request' ? '#bbf7d0' : '#fecaca'}`,
            color: banner.type === 'request' ? '#16a34a' : '#dc2626',
            fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{banner.type === 'request' ? `✅ AI Created Service Request ${banner.requestId || ''}` : `⚠️ Escalated — ${banner.reason}`}</span>
            {banner.type === 'request' && (
              <button onClick={() => navigate('/requests')}
                style={{ fontSize: 12, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontWeight: 600 }}>
                View Request
              </button>
            )}
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '10px 12px', background: '#fff', borderTop: '1px solid #e0e0e0', display: 'flex', gap: 8 }}>
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Type as the customer… (Enter to send, Shift+Enter for new line)"
            style={{ flex: 1, border: '1px solid #e0e0e0', borderRadius: 10, padding: '8px 12px', fontSize: 13.5, resize: 'none', outline: 'none', lineHeight: 1.4, fontFamily: 'inherit', height: 46, maxHeight: 100 }} />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            style={{ width: 46, height: 46, borderRadius: 10, background: '#2563eb', color: '#fff', border: 'none', cursor: loading || !input.trim() ? 'default' : 'pointer', opacity: loading || !input.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <line x1="22" y1="2" x2="11" y2="13" strokeLinecap="round" strokeLinejoin="round"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Action log */}
      <div style={{ width: 260, flexShrink: 0, background: '#1a1d23', borderRadius: 12, overflow: 'hidden', minHeight: 500, border: '1px solid #2d3139' }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #2d3139' }}>
          <p style={{ fontSize: 11.5, fontWeight: 700, color: '#9ca3af', margin: 0, textTransform: 'uppercase', letterSpacing: '0.6px' }}>AI Action Log</p>
        </div>
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', maxHeight: 460 }}>
          {log.length === 0 ? (
            <p style={{ fontSize: 12, color: '#4b5563', margin: '8px 0', lineHeight: 1.5 }}>Send a message to see the AI processing steps here…</p>
          ) : log.map((entry, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, animation: 'slideIn 0.15s ease' }}>
              <span style={{ fontSize: 10, color: '#4b5563', flexShrink: 0, lineHeight: '18px', fontFamily: 'monospace' }}>{entry.time}</span>
              <span style={{ fontSize: 12.5, color: entry.text.startsWith('✅') ? '#4ade80' : entry.text.startsWith('⚠️') ? '#fb923c' : entry.text.startsWith('❌') ? '#f87171' : '#d1d5db', lineHeight: '18px' }}>{entry.text}</span>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 12.5, color: '#6b7280', animation: 'pulseDot 1s infinite' }}>⟳ Processing…</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tab 4: Conversation History ───────────────────────────────────────────────

function Tab4History({ navigate }) {
  const [allConvs]    = useState(() => loadAllConversations())
  const [search,      setSearch]     = useState('')
  const [outcomeF,    setOutcomeF]   = useState('All')
  const [channelF,    setChannelF]   = useState('All')
  const [selected,    setSelected]   = useState(null)

  const filtered = allConvs.filter(c => {
    const q = search.toLowerCase()
    return (!q || c.phone.toLowerCase().includes(q))
      && (outcomeF === 'All' || c.outcome === outcomeF)
      && (channelF === 'All' || c.channel === channelF)
  })

  const selConvMessages = selected ? loadConversation(selected.phone) : []

  function exportCsv() {
    const rows = [['ID', 'Phone', 'Channel', 'Started', 'Last Activity', 'Messages', 'Outcome', 'Request ID'].join(',')]
    filtered.forEach(c => rows.push([c.id, maskPhone(c.phone), c.channel, fmtTime(c.startedAt), fmtTime(c.lastActivity), c.messageCount, c.outcome, c.requestId || ''].join(',')))
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ai-conversations.csv'; a.click()
  }

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div style={{ flex: 1 }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 280 }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2.2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round"/>
            </svg>
            <input placeholder="Search by phone…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...INP, paddingLeft: 32 }} />
          </div>
          <select style={{ height: 36, border: '1px solid #e8e9ec', borderRadius: 8, padding: '0 10px', fontSize: 13, color: '#374151', background: '#fff' }}
            value={outcomeF} onChange={e => setOutcomeF(e.target.value)}>
            {['All', 'Request Created', 'Escalated to Human', 'Answered Only', 'Ongoing'].map(o => <option key={o}>{o}</option>)}
          </select>
          <select style={{ height: 36, border: '1px solid #e8e9ec', borderRadius: 8, padding: '0 10px', fontSize: 13, color: '#374151', background: '#fff' }}
            value={channelF} onChange={e => setChannelF(e.target.value)}>
            {['All', 'SMS', 'Call'].map(c => <option key={c}>{c}</option>)}
          </select>
          <button onClick={exportCsv}
            style={{ height: 36, padding: '0 14px', background: '#fff', border: '1px solid #e8e9ec', borderRadius: 8, fontSize: 13, color: '#374151', cursor: 'pointer', fontWeight: 500, marginLeft: 'auto' }}>
            ⬇ Export CSV
          </button>
        </div>

        <p style={{ fontSize: 12.5, color: '#9ca3af', marginBottom: 8 }}>{filtered.length} conversations</p>

        <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Date/Time', 'Phone', 'Channel', 'Messages', 'Outcome', 'Request', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: '#9ca3af', padding: '9px 14px', borderBottom: '1px solid #f0f1f3', whiteSpace: 'nowrap', letterSpacing: '0.4px' }}>{h}</th>
              ))}</tr></thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f8f9fa', cursor: 'pointer' }}
                    onClick={() => setSelected(c)}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '11px 14px', fontSize: 12.5, color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtTime(c.startedAt)}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14 }}>🤖</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: '#1a1d23' }}>{maskPhone(c.phone)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: '#f0f9ff', color: '#0369a1' }}>{c.channel || 'SMS'}</span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: '#374151', textAlign: 'center' }}>{c.messageCount}</td>
                    <td style={{ padding: '11px 14px' }}><OutcomeBadge outcome={c.outcome} /></td>
                    <td style={{ padding: '11px 14px' }}>
                      {c.requestId ? (
                        <button onClick={e => { e.stopPropagation(); navigate('/requests') }}
                          style={{ fontSize: 11.5, color: '#16a34a', background: '#f0fdf4', border: 'none', borderRadius: 5, padding: '2px 8px', cursor: 'pointer', fontWeight: 600, fontFamily: 'monospace' }}>
                          {c.requestId}
                        </button>
                      ) : <span style={{ color: '#c4c9d4' }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <button onClick={e => { e.stopPropagation(); setSelected(c) }}
                        style={{ fontSize: 12, color: '#2563eb', background: '#eff6ff', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontWeight: 600 }}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px 24px', color: '#9ca3af' }}>No conversations found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Slide-out conversation panel */}
      {selected && (
        <div style={{ width: 340, flexShrink: 0, background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 620, animation: 'slideIn 0.2s ease' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f1f3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1d23', margin: 0, fontFamily: 'monospace' }}>{maskPhone(selected.phone)}</p>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>{fmtTime(selected.startedAt)} · {selected.messageCount} messages</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <OutcomeBadge outcome={selected.outcome} />
              <button onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10, background: '#f8f9fa' }}>
            {selConvMessages.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '20px 0' }}>Conversation messages not available in local storage</p>
            ) : selConvMessages.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-start' : 'flex-end' }}>
                <div style={{ maxWidth: '82%', borderRadius: m.role === 'user' ? '12px 12px 12px 3px' : '12px 12px 3px 12px', padding: '8px 12px',
                  background: m.role === 'user' ? '#fff' : '#2563eb', color: m.role === 'user' ? '#1a1d23' : '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)', fontSize: 13, lineHeight: 1.5 }}>
                  {m.role === 'assistant' && <p style={{ fontSize: 10, fontWeight: 700, margin: '0 0 3px', opacity: 0.7 }}>🤖 AI</p>}
                  {m.content}
                </div>
                <p style={{ fontSize: 10, color: '#9ca3af', margin: '2px 4px 0' }}>
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab 5: Twilio Setup ───────────────────────────────────────────────────────

function Tab5Twilio({ settings, persist, flash }) {
  const [testing, setTesting] = useState(false)
  const [status,  setStatus]  = useState(null)
  const isConnected = !!(settings.twilioAccountSid && settings.twilioAuthToken && settings.twilioPhone)

  const backendBase = window.location.hostname === 'localhost'
    ? 'https://your-backend.railway.app'
    : `${window.location.protocol}//${window.location.host}`

  async function testConnection() {
    if (!isConnected) { setStatus({ ok: false, msg: 'Fill in all Twilio credentials first' }); return }
    setTesting(true)
    await new Promise(r => setTimeout(r, 1500))
    setStatus({ ok: false, msg: 'Twilio connection requires a backend server. See Step 3.' })
    setTesting(false)
  }

  function copy(text) { navigator.clipboard.writeText(text).then(() => flash('Copied to clipboard!')) }

  const steps = [
    {
      num: 1, title: 'Create a Twilio Account',
      content: (
        <>
          <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.6, margin: '0 0 12px' }}>
            Twilio provides the phone number and SMS/voice infrastructure for your AI Receptionist.
          </p>
          <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', background: '#F22F46', color: '#fff', borderRadius: 8, fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>
            Create Twilio Account ↗
          </a>
          <p style={{ fontSize: 12.5, color: '#6b7280', margin: '10px 0 0' }}>💡 Free trial includes $15 credit — enough to test hundreds of messages.</p>
        </>
      ),
    },
    {
      num: 2, title: 'Get a Phone Number',
      content: (
        <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.6, margin: 0 }}>
          In your Twilio console, go to <strong>Phone Numbers → Buy a Number</strong>. Choose a local number in your area code that has SMS and Voice capabilities.
        </p>
      ),
    },
    {
      num: 3, title: 'Configure Webhooks',
      content: (
        <>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 0, marginBottom: 12 }}>Set these webhook URLs in your Twilio phone number settings:</p>
          {[
            { label: 'SMS Webhook URL', url: `${backendBase}/api/ai-receptionist/sms-webhook` },
            { label: 'Voice Webhook URL', url: `${backendBase}/api/ai-receptionist/call-webhook` },
          ].map(({ label, url }) => (
            <div key={label} style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>{label}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <code style={{ flex: 1, fontSize: 12, background: '#f3f4f6', border: '1px solid #e8e9ec', borderRadius: 6, padding: '7px 10px', color: '#374151', fontFamily: 'monospace', wordBreak: 'break-all' }}>{url}</code>
                <button onClick={() => copy(url)}
                  style={{ height: 34, padding: '0 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12.5, cursor: 'pointer', fontWeight: 500, flexShrink: 0 }}>
                  Copy
                </button>
              </div>
            </div>
          ))}
        </>
      ),
    },
    {
      num: 4, title: 'Enter Your Credentials',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Account SID', key: 'twilioAccountSid', type: 'text',     placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
            { label: 'Auth Token',  key: 'twilioAuthToken',  type: 'password', placeholder: '••••••••••••••••••••••••••••••••' },
            { label: 'Phone Number', key: 'twilioPhone',     type: 'text',     placeholder: '+17035550190' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}</label>
              <input type={type} style={INP} value={settings[key]} onChange={e => persist({ [key]: e.target.value })} placeholder={placeholder} />
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <button onClick={testConnection} disabled={testing}
              style={{ height: 36, padding: '0 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: testing ? 'wait' : 'pointer', opacity: testing ? 0.7 : 1 }}>
              {testing ? '⏳ Testing…' : '🔌 Test Connection'}
            </button>
            {status && (
              <span style={{ fontSize: 13, fontWeight: 600, color: status.ok ? '#16a34a' : '#dc2626' }}>
                {status.ok ? '✓' : '✗'} {status.msg}
              </span>
            )}
          </div>
        </div>
      ),
    },
  ]

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Mode banner */}
      {!isConnected ? (
        <div style={{ padding: '14px 18px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🟡</span>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: '#92400E', margin: 0 }}>AI Receptionist is in TEST MODE</p>
            <p style={{ fontSize: 13, color: '#78350F', margin: '2px 0 0' }}>Responses are simulated locally. Configure Twilio below to go live.</p>
          </div>
        </div>
      ) : (
        <div style={{ padding: '14px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🟢</span>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: '#15803d', margin: 0 }}>Twilio Connected — Live Mode Active</p>
            <p style={{ fontSize: 13, color: '#166534', margin: '2px 0 0' }}>Phone: {settings.twilioPhone} · Real SMS/calls are being handled.</p>
          </div>
        </div>
      )}

      {/* Steps */}
      {steps.map(step => (
        <div key={step.num} style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#2563eb', color: '#fff', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
            {step.num}
          </div>
          <div style={{ flex: 1, background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '16px 18px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1d23', margin: '0 0 10px' }}>{step.title}</h3>
            {step.content}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AIReceptionist() {
  const navigate  = useNavigate()
  const [tab,      setTab]      = useState('dashboard')
  const [settings, setSettings] = useState(() => loadSettings())
  const [banner,   setBanner]   = useState('')

  function persist(updates) {
    const next = { ...settings, ...updates }
    setSettings(next)
    saveSettings(next)
  }

  function flash(msg) { setBanner(msg); setTimeout(() => setBanner(''), 3000) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <style>{`
        @keyframes pulseDot  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
        @keyframes pulseGlow { 0%,100%{box-shadow:0 0 0 0 rgba(22,163,74,.4)} 50%{box-shadow:0 0 0 8px rgba(22,163,74,0)} }
        @keyframes slideIn   { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
      `}</style>

      {banner && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: 8, padding: '10px 16px', fontSize: 13.5, fontWeight: 600, marginBottom: 10 }}>
          ✓ {banner}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #e8e9ec' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="8" width="18" height="12" rx="3"/>
                <path d="M9 8V6a3 3 0 0 1 6 0v2"/>
                <circle cx="9.5" cy="13.5" r="1.2" fill="white" stroke="none"/>
                <circle cx="14.5" cy="13.5" r="1.2" fill="white" stroke="none"/>
                <path d="M9 17c.5.5 1.5.8 3 .8s2.5-.3 3-.8" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 21, fontWeight: 800, color: '#1a1d23', margin: 0, letterSpacing: '-0.3px' }}>AI Receptionist</h1>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: '2px 0 0' }}>24/7 automated customer handling powered by Claude AI</p>
            </div>
            {/* Master toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: settings.active ? '#f0fdf4' : '#f3f4f6', border: `1px solid ${settings.active ? '#bbf7d0' : '#e8e9ec'}`, borderRadius: 24, padding: '8px 16px', flexShrink: 0 }}>
              {settings.active && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', animation: 'pulseGlow 2s ease-in-out infinite', flexShrink: 0 }} />}
              <span style={{ fontSize: 13.5, fontWeight: 700, color: settings.active ? '#16a34a' : '#6b7280' }}>{settings.active ? 'Active' : 'Paused'}</span>
              <button onClick={() => persist({ active: !settings.active })}
                style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', background: settings.active ? '#16a34a' : '#d1d5db', transition: 'background 0.25s' }}>
                <span style={{ position: 'absolute', top: 3, left: settings.active ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }} />
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex' }}>
            {[
              { id: 'dashboard', label: '📊 Dashboard' },
              { id: 'setup',     label: '⚙️ Setup & Config' },
              { id: 'simulator', label: '🧪 AI Simulator' },
              { id: 'history',   label: '📋 History' },
              { id: 'twilio',    label: '📡 Twilio Setup' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding: '10px 20px', background: 'none', border: 'none',
                  borderBottom: `2px solid ${tab === t.id ? '#2563eb' : 'transparent'}`,
                  color: tab === t.id ? '#2563eb' : '#6b7280',
                  fontSize: 13.5, fontWeight: tab === t.id ? 700 : 500, cursor: 'pointer', marginBottom: -1, whiteSpace: 'nowrap' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {tab === 'dashboard' && <Tab1Dashboard settings={settings} onTabChange={setTab} navigate={navigate} />}
          {tab === 'setup'     && <Tab2Setup settings={settings} persist={persist} flash={flash} />}
          {tab === 'simulator' && <Tab3Simulator settings={settings} navigate={navigate} />}
          {tab === 'history'   && <Tab4History navigate={navigate} />}
          {tab === 'twilio'    && <Tab5Twilio settings={settings} persist={persist} flash={flash} />}
        </div>
      </div>
    </div>
  )
}
