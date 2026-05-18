import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  getClients,
  getInvoices,
  getJobs,
  getQuotes,
  saveRequest,
  saveQuote,
  getSettings,
} from '../data/store'
import { generateInvoicePDF } from '../utils/generateInvoicePDF'
import { generateQuotePDF } from '../utils/generateQuotePDF'
import { getStripeConfig, generatePaymentLink, isStripeConfigured } from '../utils/stripePayments'

// ─── Colour maps ──────────────────────────────────────────────────────────────

const JOB_SC = {
  'In Progress': { bg: '#eff6ff', color: '#2563eb' },
  Scheduled:     { bg: '#ecfeff', color: '#0891b2' },
  Completed:     { bg: '#f0fdf4', color: '#16a34a' },
  Cancelled:     { bg: '#fef2f2', color: '#dc2626' },
}
const INV_SC = {
  Paid:    { bg: '#f0fdf4', color: '#16a34a' },
  Overdue: { bg: '#fef2f2', color: '#dc2626' },
  Draft:   { bg: '#f3f4f6', color: '#6b7280' },
  Sent:    { bg: '#eff6ff', color: '#2563eb' },
}
const QUO_SC = {
  Sent:     { bg: '#eff6ff', color: '#2563eb' },
  Approved: { bg: '#f0fdf4', color: '#16a34a' },
  Declined: { bg: '#fef2f2', color: '#dc2626' },
  Draft:    { bg: '#f3f4f6', color: '#6b7280' },
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Badge({ label, map }) {
  const c = map[label] ?? { bg: '#f3f4f6', color: '#6b7280' }
  return (
    <span style={{
      display: 'inline-block', fontSize: 12, fontWeight: 600,
      padding: '3px 9px', borderRadius: 20,
      background: c.bg, color: c.color,
    }}>
      {label}
    </span>
  )
}

function Section({ title, children }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e8e9ec',
      borderRadius: 10, overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid #f0f1f3',
        fontSize: 13, fontWeight: 700, color: '#6b7280',
        letterSpacing: '0.5px', textTransform: 'uppercase',
      }}>
        {title}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

const TH = { textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: '#9ca3af', padding: '9px 14px', borderBottom: '1px solid #f0f1f3', whiteSpace: 'nowrap' }
const TD = { padding: '12px 14px', fontSize: 13.5, color: '#374151', verticalAlign: 'middle' }

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function Tabs({ tabs, active, onSelect }) {
  return (
    <div style={{ display: 'flex', borderBottom: '2px solid #e8e9ec', overflowX: 'auto' }}>
      {tabs.map(t => (
        <button key={t} onClick={() => onSelect(t)}
          style={{
            padding: '13px 22px', fontSize: 14, fontWeight: active === t ? 700 : 500,
            color: active === t ? '#2563eb' : '#6b7280',
            background: 'none', border: 'none',
            borderBottom: `2px solid ${active === t ? '#2563eb' : 'transparent'}`,
            marginBottom: -2, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
          {t}
        </button>
      ))}
    </div>
  )
}

// ─── Request Service form ────────────────────────────────────────────────────

const SERVICE_TYPES = ['HVAC Repair', 'HVAC Maintenance', 'Plumbing', 'Electrical', 'Drain Cleaning', 'Appliance Repair', 'Generator', 'Other']
const TIME_OPTS     = ['Morning 8am–12pm', 'Afternoon 12pm–5pm', 'Evening 5pm–8pm', 'Any Time', 'As soon as possible']

const BLANK_REQ = { serviceType: '', description: '', preferredDate: '', preferredTime: '' }

function RequestForm({ clientId, clientName, clientPhone, onSuccess }) {
  const [form, setForm] = useState(BLANK_REQ)
  const [errs, setErrs] = useState({})
  const [done, setDone] = useState(false)

  function validate() {
    const e = {}
    if (!form.serviceType)   e.serviceType   = 'Required'
    if (!form.description.trim()) e.description = 'Required'
    if (!form.preferredDate) e.preferredDate  = 'Required'
    if (!form.preferredTime) e.preferredTime  = 'Required'
    return e
  }

  function submit(ev) {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrs(e); return }

    const allReqs    = JSON.parse(localStorage.getItem('ff_requests') || '[]')
    const maxNum     = allReqs.reduce((acc, r) => {
      const n = parseInt(r.id?.replace('REQ-', '') || '0', 10)
      return n > acc ? n : acc
    }, 83)
    const newId = `REQ-${String(maxNum + 1).padStart(3, '0')}`

    const now = new Date()
    const received = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

    saveRequest({
      id:           newId,
      clientId,
      clientName,
      clientPhone,
      type:         form.serviceType,
      description:  form.description,
      received,
      priority:     'Normal',
      status:       'Open',
      preferredDate: form.preferredDate,
      preferredTime: form.preferredTime,
      internalNotes: '',
    })

    setDone(true)
    if (onSuccess) onSuccess()
  }

  if (done) {
    return (
      <div style={{
        background: '#f0fdf4', border: '1px solid #bbf7d0',
        borderRadius: 10, padding: '28px 24px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#15803d', margin: '0 0 8px' }}>
          Request Submitted!
        </p>
        <p style={{ fontSize: 14, color: '#166534', margin: 0 }}>
          Your request has been submitted. We will contact you shortly.
        </p>
        <button
          onClick={() => { setForm(BLANK_REQ); setDone(false) }}
          style={{
            marginTop: 20, height: 40, padding: '0 24px',
            background: '#16a34a', color: '#fff', border: 'none',
            borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
          Submit Another Request
        </button>
      </div>
    )
  }

  function inp(field, extra = {}) {
    return {
      style: {
        width: '100%', boxSizing: 'border-box', height: 42,
        border: `1px solid ${errs[field] ? '#dc2626' : '#e8e9ec'}`,
        borderRadius: 8, padding: '0 12px', fontSize: 14,
        color: '#374151', outline: 'none', background: '#fff',
        ...extra,
      },
      value: form[field],
      onChange: e => { setForm(p => ({ ...p, [field]: e.target.value })); setErrs(p => ({ ...p, [field]: undefined })) },
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 560 }}>
      <div>
        <label style={LB}>Service Type</label>
        <select {...inp('serviceType')}>
          <option value="">— Select service type —</option>
          {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {errs.serviceType && <p style={ERR}>{errs.serviceType}</p>}
      </div>

      <div>
        <label style={LB}>Describe the Issue</label>
        <textarea
          value={form.description}
          onChange={e => { setForm(p => ({ ...p, description: e.target.value })); setErrs(p => ({ ...p, description: undefined })) }}
          rows={4}
          placeholder="Please describe the problem or service needed…"
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'vertical',
            border: `1px solid ${errs.description ? '#dc2626' : '#e8e9ec'}`,
            borderRadius: 8, padding: '10px 12px', fontSize: 14,
            color: '#374151', outline: 'none', background: '#fff',
          }}
        />
        {errs.description && <p style={ERR}>{errs.description}</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={LB}>Preferred Date</label>
          <input type="date" {...inp('preferredDate')} />
          {errs.preferredDate && <p style={ERR}>{errs.preferredDate}</p>}
        </div>
        <div>
          <label style={LB}>Preferred Time</label>
          <select {...inp('preferredTime')}>
            <option value="">— Select time —</option>
            {TIME_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {errs.preferredTime && <p style={ERR}>{errs.preferredTime}</p>}
        </div>
      </div>

      <button type="submit"
        style={{
          height: 46, padding: '0 28px', background: '#2563eb', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700,
          cursor: 'pointer', alignSelf: 'flex-start', letterSpacing: '-0.1px',
        }}>
        Submit Request →
      </button>
    </form>
  )
}

const LB  = { display: 'block', fontSize: 12, fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 7 }
const ERR = { fontSize: 12, color: '#dc2626', margin: '4px 0 0' }

// ─── Main component ──────────────────────────────────────────────────────────

export default function ClientPortal() {
  const { clientId } = useParams()
  const id = isNaN(Number(clientId)) ? clientId : Number(clientId)

  const [settings]  = useState(() => getSettings())
  const stripeCfg   = getStripeConfig()
  const stripeReady = isStripeConfigured()
  const client      = getClients().find(c => c.id === id)
  const allInvoices = getInvoices().filter(i => i.clientId === id)
  const allJobs     = getJobs().filter(j => j.clientId === id)
  const [quotes, setQuotes] = useState(() => getQuotes().filter(q => q.clientId === id))
  const [tab, setTab]       = useState('My Invoices')

  // Outstanding balance from overdue invoices
  const overdueTotal = allInvoices
    .filter(i => i.status === 'Overdue')
    .reduce((sum, i) => sum + (i.total || 0), 0)

  function approveQuote(quoteId) {
    const updated = quotes.map(q => q.id === quoteId ? { ...q, status: 'Approved' } : q)
    setQuotes(updated)
    // Also persist to store
    const allQuotes = getQuotes()
    const newAll    = allQuotes.map(q => q.id === quoteId ? { ...q, status: 'Approved' } : q)
    localStorage.setItem('ff_quotes', JSON.stringify(newAll))
  }

  if (!client) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1d23', margin: '0 0 8px' }}>Client Not Found</h2>
          <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>No client matches this portal link. Please contact us for assistance.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f9' }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e9ec', padding: '0 0' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 0 16px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9, background: '#2563eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1d23', letterSpacing: '-0.3px' }}>
                {settings.company.name}
              </span>
              <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 10 }}>Client Portal</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Welcome banner ───────────────────────────────────────────────── */}
      <div style={{ background: '#2563eb', padding: '28px 24px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#93c5fd', margin: '0 0 4px', fontWeight: 500 }}>Welcome back</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            {client.name}
          </h1>
          <p style={{ fontSize: 13, color: '#bfdbfe', margin: 0 }}>
            {client.address}, {client.city}, {client.state} {client.zip}
          </p>
          {overdueTotal > 0 && (
            <div style={{
              marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '8px 14px',
            }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>
                Outstanding balance: ${overdueTotal.toLocaleString()} — payment overdue
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab nav ──────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e9ec' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px' }}>
          <Tabs
            tabs={['My Invoices', 'My Jobs', 'My Quotes', 'Request Service']}
            active={tab}
            onSelect={setTab}
          />
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* ── My Invoices ─────────────────────────────────────────────── */}
        {tab === 'My Invoices' && (
          <Section title="My Invoices">
            {allInvoices.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>No invoices on file.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Invoice #', 'Date Issued', 'Due Date', 'Amount', 'Status', ''].map(h => (
                        <th key={h} style={TH}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allInvoices.map(inv => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #f8f9fa' }}>
                        <td style={TD}>
                          <span style={{ fontFamily: 'monospace', fontSize: 12.5, background: '#f3f4f6', padding: '2px 7px', borderRadius: 4 }}>
                            {inv.id}
                          </span>
                        </td>
                        <td style={TD}>{inv.issued}</td>
                        <td style={{ ...TD, color: inv.status === 'Overdue' ? '#dc2626' : undefined, fontWeight: inv.status === 'Overdue' ? 600 : undefined }}>
                          {inv.due}
                        </td>
                        <td style={{ ...TD, fontWeight: 700, color: '#1a1d23' }}>
                          ${(inv.total || 0).toLocaleString()}
                        </td>
                        <td style={TD}><Badge label={inv.status} map={INV_SC} /></td>
                        <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              onClick={() => generateInvoicePDF(inv, settings)}
                              style={{
                                height: 32, padding: '0 12px', background: '#eff6ff', color: '#2563eb',
                                border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 12.5,
                                fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                              }}>
                              ↓ Download PDF
                            </button>
                            {stripeReady && stripeCfg.showPayNowButton && inv.status !== 'Paid' && (
                              <a
                                href={generatePaymentLink({ ...inv, clientEmail: client?.email })}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff',
                                  border: 'none', borderRadius: 6, fontSize: 12.5, fontWeight: 700,
                                  cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none',
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                }}>
                                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                                Pay Now
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        )}

        {/* ── My Jobs ─────────────────────────────────────────────────── */}
        {tab === 'My Jobs' && (
          <Section title="My Jobs">
            {allJobs.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>No jobs on record.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Job #', 'Service', 'Date', 'Technician', 'Status'].map(h => (
                        <th key={h} style={TH}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allJobs.map(job => (
                      <tr key={job.id} style={{ borderBottom: '1px solid #f8f9fa' }}>
                        <td style={TD}>
                          <span style={{ fontFamily: 'monospace', fontSize: 12.5, background: '#f3f4f6', padding: '2px 7px', borderRadius: 4 }}>
                            {job.id}
                          </span>
                        </td>
                        <td style={TD}>
                          <div style={{ fontWeight: 600, color: '#1a1d23' }}>{job.title || job.type}</div>
                          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{job.type}</div>
                        </td>
                        <td style={{ ...TD, whiteSpace: 'nowrap', color: '#6b7280' }}>
                          {job.date} {job.time && `· ${job.time}`}
                        </td>
                        <td style={{ ...TD, whiteSpace: 'nowrap' }}>{job.techName || '—'}</td>
                        <td style={TD}><Badge label={job.status} map={JOB_SC} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        )}

        {/* ── My Quotes ───────────────────────────────────────────────── */}
        {tab === 'My Quotes' && (
          <Section title="My Quotes">
            {quotes.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>No quotes on file.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Quote #', 'Service', 'Amount', 'Valid Until', 'Status', ''].map(h => (
                        <th key={h} style={TH}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map(q => (
                      <tr key={q.id} style={{ borderBottom: '1px solid #f8f9fa' }}>
                        <td style={TD}>
                          <span style={{ fontFamily: 'monospace', fontSize: 12.5, background: '#f3f4f6', padding: '2px 7px', borderRadius: 4 }}>
                            {q.id}
                          </span>
                        </td>
                        <td style={TD}>
                          <div style={{ fontWeight: 600, color: '#1a1d23' }}>{q.type}</div>
                          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {q.description}
                          </div>
                        </td>
                        <td style={{ ...TD, fontWeight: 700, color: '#1a1d23', whiteSpace: 'nowrap' }}>
                          ${(q.total || 0).toLocaleString()}
                        </td>
                        <td style={{ ...TD, color: '#6b7280', whiteSpace: 'nowrap' }}>{q.expires}</td>
                        <td style={TD}><Badge label={q.status} map={QUO_SC} /></td>
                        <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => generateQuotePDF(q, settings)}
                              style={{
                                height: 32, padding: '0 10px', background: '#f0fdf4', color: '#16a34a',
                                border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 12.5,
                                fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                              }}>
                              ↓ PDF
                            </button>
                            {q.status === 'Sent' && (
                              <button
                                onClick={() => approveQuote(q.id)}
                                style={{
                                  height: 32, padding: '0 12px', background: '#2563eb', color: '#fff',
                                  border: 'none', borderRadius: 6, fontSize: 12.5,
                                  fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                                }}>
                                ✓ Approve
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
          </Section>
        )}

        {/* ── Request Service ──────────────────────────────────────────── */}
        {tab === 'Request Service' && (
          <Section title="Request Service">
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 22px', lineHeight: 1.6 }}>
              Need service? Fill out the form below and our team will be in touch shortly to confirm your appointment.
            </p>
            <RequestForm
              clientId={client.id}
              clientName={client.name}
              clientPhone={client.phone}
            />
          </Section>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid #e8e9ec', background: '#fff',
        padding: '20px 24px', textAlign: 'center',
      }}>
        <p style={{ fontSize: 12.5, color: '#9ca3af', margin: 0 }}>
          {settings.company.name} · {settings.company.phone} · {settings.company.email}
        </p>
      </div>
    </div>
  )
}
