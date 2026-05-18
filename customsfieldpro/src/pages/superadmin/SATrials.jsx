import { useState } from 'react'
import { MetricCard, Card, CardHeader, Badge, PlanBadge, Btn } from './SuperAdmin'
import { SA_TENANTS } from './saData'

function daysLeft(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000)
}

function TrialRowColor(days) {
  if (days === null) return '#fff'
  if (days < 0)   return '#fef2f2'
  if (days <= 3)  return '#fef2f2'
  if (days <= 7)  return '#fffbeb'
  return '#f0fdf4'
}

export default function SATrials({ setImpersonating }) {
  const [extendId, setExtendId]   = useState(null)
  const [extendDate, setExtendDate] = useState('')
  const [emailId, setEmailId]     = useState(null)
  const [emailText, setEmailText] = useState('')
  const [convertId, setConvertId] = useState(null)
  const [convertPlan, setConvertPlan] = useState('starter')

  const trials = SA_TENANTS.filter(t => t.status === 'Trial' || (t.trialEnd && t.status !== 'Cancelled'))
    .map(t => ({ ...t, daysLeft: daysLeft(t.trialEnd) }))
    .sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99))

  const expiring3  = trials.filter(t => t.daysLeft !== null && t.daysLeft <= 3).length
  const expiring7  = trials.filter(t => t.daysLeft !== null && t.daysLeft <= 7 && t.daysLeft > 3).length
  const expiredToday = trials.filter(t => t.daysLeft !== null && t.daysLeft <= 0).length
  const activeTrials = trials.filter(t => t.daysLeft !== null && t.daysLeft > 0).length

  const CONVERSION_EMAIL = (name, days) =>
    `Hi ${name} team,\n\nYour CustomsFieldPro trial ends in ${days} day${days !== 1 ? 's' : ''}. Upgrade now to keep all your data, clients, and jobs.\n\nUse code WELCOME20 for 20% off your first 3 months.\n\nUpgrade here: https://customsfieldprocrm.com/pricing\n\nBest,\nCustomsFieldPro Team`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <MetricCard label="Active Trials"        value={activeTrials} color="#2563eb" />
        <MetricCard label="Expiring ≤ 3 days"    value={expiring3}   color="#dc2626" sub="⚠ urgent" />
        <MetricCard label="Expiring ≤ 7 days"    value={expiring7}   color="#d97706" />
        <MetricCard label="Expired / Past"        value={expiredToday} color="#9ca3af" />
        <MetricCard label="Converted This Month" value="8"           color="#16a34a" />
        <MetricCard label="Conversion Rate"       value="68%"         color="#16a34a" sub="trial → paid" />
      </div>

      {/* Bulk email bar */}
      <Card>
        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>Bulk actions for expiring trials:</span>
          <Btn variant="primary" size="sm">Send Conversion Email to All Expiring</Btn>
          <Btn variant="outline" size="sm">Export Expiring Trials CSV</Btn>
        </div>
      </Card>

      {/* Trials table */}
      <Card>
        <CardHeader title="All Trials" sub={`${trials.length} trial accounts`} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={{ background: '#f9fafb', fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>
                {['Business', 'Owner', 'Plan', 'Signed Up', 'Trial Ends', 'Days Left', 'Onboarding', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trials.map(t => {
                const d = t.daysLeft
                const rowBg = TrialRowColor(d)
                const urgency = d !== null && d <= 3 ? '#dc2626' : d !== null && d <= 7 ? '#d97706' : '#16a34a'
                return (
                  <>
                    <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6', background: rowBg }}>
                      <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#111827' }}>{t.name}</td>
                      <td style={{ padding: '11px 14px', fontSize: 12, color: '#6b7280' }}>{t.owner}</td>
                      <td style={{ padding: '11px 14px' }}><PlanBadge plan={t.plan} /></td>
                      <td style={{ padding: '11px 14px', fontSize: 12, color: '#9ca3af' }}>{t.joined}</td>
                      <td style={{ padding: '11px 14px', fontSize: 12, color: '#374151' }}>{t.trialEnd || '—'}</td>
                      <td style={{ padding: '11px 14px' }}>
                        {d !== null ? (
                          <span style={{ fontSize: 13, fontWeight: 800, color: urgency }}>
                            {d <= 0 ? 'Expired' : `${d}d`}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 60, height: 6, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ width: `${t.onboarding}%`, height: '100%', background: t.onboarding >= 70 ? '#16a34a' : '#d97706', borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 12, color: '#6b7280' }}>{t.onboarding}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          <Btn variant="outline" size="xs" onClick={() => { setExtendId(extendId === t.id ? null : t.id); setExtendDate('') }}>Extend</Btn>
                          <Btn variant="ghost"   size="xs" onClick={() => { setEmailId(emailId === t.id ? null : t.id); setEmailText(CONVERSION_EMAIL(t.name, d ?? 0)) }}>Email</Btn>
                          <Btn variant="success" size="xs" onClick={() => setConvertId(convertId === t.id ? null : t.id)}>Convert</Btn>
                          <Btn variant="primary" size="xs" onClick={() => setImpersonating(t)}>Login As</Btn>
                        </div>
                      </td>
                    </tr>

                    {/* Extend inline */}
                    {extendId === t.id && (
                      <tr key={t.id + '-ext'} style={{ background: '#f0fdf4' }}>
                        <td colSpan={8} style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>New trial end date:</span>
                            <input type="date" value={extendDate} onChange={e => setExtendDate(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1.5px solid #d1d5db', fontSize: 13, outline: 'none' }} />
                            <Btn variant="success" size="xs" onClick={() => setExtendId(null)}>Save</Btn>
                            <Btn variant="ghost"   size="xs" onClick={() => setExtendId(null)}>Cancel</Btn>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Email compose inline */}
                    {emailId === t.id && (
                      <tr key={t.id + '-email'} style={{ background: '#eff6ff' }}>
                        <td colSpan={8} style={{ padding: '10px 14px' }}>
                          <textarea
                            value={emailText}
                            onChange={e => setEmailText(e.target.value)}
                            rows={5}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #bfdbfe', fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                          />
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <Btn variant="primary" size="xs" onClick={() => setEmailId(null)}>Send Email</Btn>
                            <Btn variant="ghost"   size="xs" onClick={() => setEmailId(null)}>Cancel</Btn>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Convert inline */}
                    {convertId === t.id && (
                      <tr key={t.id + '-conv'} style={{ background: '#f0fdf4' }}>
                        <td colSpan={8} style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>Convert to paid:</span>
                            <select value={convertPlan} onChange={e => setConvertPlan(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1.5px solid #d1d5db', fontSize: 13, outline: 'none', background: '#fff' }}>
                              {['starter', 'professional', 'business', 'enterprise'].map(p => (
                                <option key={p} value={p}>{p} ({p === 'starter' ? '$49' : p === 'professional' ? '$99' : p === 'business' ? '$199' : '$399'}/mo)</option>
                              ))}
                            </select>
                            <Btn variant="success" size="xs" onClick={() => setConvertId(null)}>Process Subscription</Btn>
                            <Btn variant="ghost"   size="xs" onClick={() => setConvertId(null)}>Cancel</Btn>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
