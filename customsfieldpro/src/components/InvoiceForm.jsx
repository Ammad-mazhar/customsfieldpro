import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { saveInvoice, getJobs, getSettings, clientDisplayName } from '../data/store'
import { getNextNumber, formatInvoiceNumber } from '../utils/numberGenerator'
import { logActivity, ACTIONS } from '../utils/activityLog'
import { notifyAdmins, NOTIF_TYPES } from '../utils/notifications'
import { sendInvoiceEmail } from '../utils/emailService'

const BLANK_LINE = () => ({ id: Date.now() + Math.random(), description: '', qty: 1, unit: 0, total: 0 })
const LB = { display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }
const ET = { fontSize: 11, color: '#dc2626', margin: '4px 0 0' }

export default function InvoiceForm({ clientId, clientName, clientPhone, clientEmail, clientAddress, onClose, onSuccess }) {
  const [settings] = useState(() => getSettings())
  const [jobs, setJobs] = useState(() => getJobs().filter(j => j.clientId === clientId))
  const [form, setForm] = useState({
    jobRef: '', issued: new Date().toISOString().split('T')[0], due: '',
    taxRate: '0', notes: '', paymentMethod: '', datePaid: '', amountPaid: '', transactionId: '', paymentNotes: '',
  })
  const [lines, setLines] = useState([BLANK_LINE()])
  const [errs, setErrs] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [banner, setBanner] = useState('')

  useEffect(() => {
    api.getJobs().then(res => {
      const list = res?.data || []
      setJobs(list.filter(j => j.client_id === clientId || j.clientId === clientId))
    }).catch(() => {})
  }, [clientId])

  function flash(msg) { setBanner(msg); setTimeout(() => setBanner(''), 3000) }

  function updateLine(id, field, val) {
    setLines(p => p.map(li => {
      if (li.id !== id) return li
      const u = { ...li, [field]: val }
      if (field === 'qty' || field === 'unit') u.total = parseFloat(u.qty || 0) * parseFloat(u.unit || 0)
      return u
    }))
  }

  function calcTotals() {
    const sub = lines.reduce((s, l) => s + (parseFloat(l.total) || 0), 0)
    const tax = sub * (parseFloat(form.taxRate || 0) / 100)
    return { sub, tax, grand: sub + tax }
  }

  function validate() {
    const e = {}
    if (!form.due) e.due = 'Required'
    if (!lines.some(l => l.description.trim())) e.lines = 'At least one line item required'
    return e
  }

  async function submit() {
    const e = validate()
    if (Object.keys(e).length) { setErrs(e); return }
    if (submitting) return
    setSubmitting(true)
    try {
      const { sub, tax, grand } = calcTotals()
      const amountPaid = parseFloat(form.amountPaid) || 0
      const autoStatus = form.paymentMethod && amountPaid >= grand ? 'Paid' : 'Draft'
      const n = {
        id: formatInvoiceNumber(getNextNumber('invoices')),
        clientId, clientName, clientPhone: clientPhone || '', clientEmail: clientEmail || '',
        clientAddress: clientAddress || '',
        jobRef: form.jobRef, linkedJobId: form.jobRef || null,
        linkedQuoteNumber: null, linkedQuoteId: null,
        issued: form.issued, due: form.due, status: autoStatus,
        lineItems: lines.filter(l => l.description.trim()),
        subtotal: sub, taxRate: parseFloat(form.taxRate || 0), total: grand, notes: form.notes,
        paymentMethod: form.paymentMethod || null,
        datePaid: form.datePaid || null,
        amountPaid,
        transactionId: form.transactionId || null,
        paymentNotes: form.paymentNotes || null,
      }
      saveInvoice(n)
      api.createInvoice({
        client_id: clientId, subtotal: sub,
        tax_rate: parseFloat(form.taxRate || 0),
        line_items: lines.filter(l => l.description.trim()),
        notes: form.notes || null,
      }).catch(() => {})
      logActivity(ACTIONS.INVOICE_CREATED, 'Invoices', n.id, `${n.id} – ${clientName}`, `Invoice created as ${autoStatus}.`)
      if (autoStatus === 'Draft') {
        notifyAdmins(NOTIF_TYPES.INVOICE_CREATED, { invoiceId: n.id, clientName })
      }
      if (settings.notifications?.emailOnInvoiceSent && clientEmail) sendInvoiceEmail(n, { email: clientEmail, name: clientName })
      onSuccess?.()
      onClose?.()
    } catch (err) {
      flash(`Error: ${err.message}`)
      setSubmitting(false)
    }
  }

  const { sub, tax, grand } = calcTotals()

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 720, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', margin: 'auto', flexShrink: 0 }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f1f3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1d23' }}>Create Invoice</h3>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#9ca3af' }}>{clientName}</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', background: '#f3f4f6', borderRadius: 8, fontSize: 20, cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {banner && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '10px 16px', fontSize: 13, marginBottom: 16 }}>{banner}</div>}

          {/* Client locked */}
          <div style={{ marginBottom: 16 }}>
            <label style={LB}>Client</label>
            <div style={{ height: 38, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#374151', background: '#f9fafb', display: 'flex', alignItems: 'center' }}>{clientName}</div>
          </div>

          {/* Job Reference */}
          <div style={{ marginBottom: 16 }}>
            <label style={LB}>Job Reference <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional — auto-fills line items)</span></label>
            <select value={form.jobRef} onChange={e => {
              const jid = e.target.value
              setForm(p => ({ ...p, jobRef: jid }))
              const j = jobs.find(x => x.id === jid)
              if (j && j.lineItems?.length) setLines(j.lineItems.map(li => ({ ...li, id: Date.now() + Math.random() })))
            }} style={{ width: '100%', height: 38, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#374151', background: '#fff' }}>
              <option value="">— None —</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.id} — {j.title}</option>)}
            </select>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={LB}>Issue Date</label>
              <input type="date" value={form.issued} onChange={e => setForm(p => ({ ...p, issued: e.target.value }))}
                style={{ width: '100%', boxSizing: 'border-box', height: 38, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#374151', outline: 'none' }} />
            </div>
            <div>
              <label style={LB}>Due Date <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="date" value={form.due} onChange={e => { setForm(p => ({ ...p, due: e.target.value })); setErrs(p => ({ ...p, due: undefined })) }}
                style={{ width: '100%', boxSizing: 'border-box', height: 38, border: `1px solid ${errs.due ? '#dc2626' : '#e8e9ec'}`, borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#374151', outline: 'none' }} />
              {errs.due && <p style={ET}>Required</p>}
            </div>
          </div>

          {/* Line Items */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ ...LB, margin: 0 }}>Line Items</label>
              <button onClick={() => setLines(p => [...p, BLANK_LINE()])} style={{ fontSize: 12.5, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>+ Add Line Item</button>
            </div>
            {errs.lines && <p style={ET}>{errs.lines}</p>}
            <div style={{ border: '1px solid #f0f1f3', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 90px 90px 32px', background: '#f8f9fa', padding: '8px 12px', fontSize: 11.5, fontWeight: 600, color: '#9ca3af' }}>
                <span>Description</span><span style={{ textAlign: 'center' }}>Qty</span><span style={{ textAlign: 'right' }}>Unit $</span><span style={{ textAlign: 'right' }}>Total</span><span />
              </div>
              {lines.map(li => (
                <div key={li.id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 90px 90px 32px', gap: 6, padding: '8px 12px', borderTop: '1px solid #f3f4f6', alignItems: 'center' }}>
                  <input value={li.description} onChange={e => updateLine(li.id, 'description', e.target.value)} placeholder="Description"
                    style={{ height: 34, border: '1px solid #e8e9ec', borderRadius: 6, padding: '0 8px', fontSize: 13, color: '#374151', outline: 'none' }} />
                  <input type="number" min="1" value={li.qty} onChange={e => updateLine(li.id, 'qty', e.target.value)}
                    style={{ height: 34, border: '1px solid #e8e9ec', borderRadius: 6, padding: '0 6px', fontSize: 13, color: '#374151', outline: 'none', textAlign: 'center' }} />
                  <input type="number" min="0" value={li.unit} onChange={e => updateLine(li.id, 'unit', e.target.value)}
                    style={{ height: 34, border: '1px solid #e8e9ec', borderRadius: 6, padding: '0 8px', fontSize: 13, color: '#374151', outline: 'none', textAlign: 'right' }} />
                  <div style={{ height: 34, background: '#f8f9fa', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, fontSize: 13, fontWeight: 600, color: '#1a1d23' }}>${(parseFloat(li.total) || 0).toFixed(2)}</div>
                  <button onClick={() => lines.length > 1 && setLines(p => p.filter(x => x.id !== li.id))} style={{ height: 28, width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: lines.length > 1 ? '#9ca3af' : '#e8e9ec', cursor: lines.length > 1 ? 'pointer' : 'default', fontSize: 16 }}>×</button>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <div style={{ width: 300, background: '#f8f9fa', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#6b7280', marginBottom: 6 }}><span>Subtotal</span><span>${sub.toFixed(2)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#6b7280', marginBottom: 6, alignItems: 'center' }}>
                  <span>Tax %</span>
                  <input type="number" min="0" max="100" value={form.taxRate} onChange={e => setForm(p => ({ ...p, taxRate: e.target.value }))}
                    style={{ width: 60, height: 28, border: '1px solid #e8e9ec', borderRadius: 5, padding: '0 6px', fontSize: 13, textAlign: 'right', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#6b7280', marginBottom: 8 }}><span>Tax Amount</span><span>${tax.toFixed(2)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: '#1a1d23', borderTop: '1px solid #e8e9ec', paddingTop: 8, marginBottom: parseFloat(form.amountPaid) > 0 ? 6 : 0 }}><span>Invoice Total</span><span>${grand.toFixed(2)}</span></div>
                {parseFloat(form.amountPaid) > 0 && <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#16a34a', marginBottom: 6 }}><span>Amount Paid</span><span>− ${parseFloat(form.amountPaid).toFixed(2)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: Math.max(0, grand - parseFloat(form.amountPaid || 0)) < 0.01 ? '#16a34a' : '#dc2626', borderTop: '1px solid #e8e9ec', paddingTop: 8 }}><span>Balance Due</span><span>${Math.max(0, grand - parseFloat(form.amountPaid || 0)).toFixed(2)}</span></div>
                </>}
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div style={{ marginBottom: 20, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#15803d', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Record Payment <span style={{ fontSize: 11, fontWeight: 400, color: '#6b7280', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={LB}>Payment Method</label>
                <select value={form.paymentMethod} onChange={e => setForm(p => ({ ...p, paymentMethod: e.target.value }))}
                  style={{ width: '100%', height: 38, border: '1px solid #d1fae5', borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#374151', background: '#fff' }}>
                  <option value="">— Not yet paid —</option>
                  {['Cash', 'Check', 'Credit Card', 'Debit Card', 'Zelle', 'Venmo', 'Bank Transfer', 'Other'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={LB}>Date Paid</label>
                <input type="date" value={form.datePaid} onChange={e => setForm(p => ({ ...p, datePaid: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box', height: 38, border: '1px solid #d1fae5', borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#374151', outline: 'none' }} />
              </div>
              <div>
                <label style={LB}>Amount Paid ($)</label>
                <input type="number" min="0" step="0.01" value={form.amountPaid} onChange={e => setForm(p => ({ ...p, amountPaid: e.target.value }))}
                  placeholder="0.00"
                  style={{ width: '100%', boxSizing: 'border-box', height: 38, border: '1px solid #d1fae5', borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#374151', outline: 'none', textAlign: 'right' }} />
              </div>
              <div>
                <label style={LB}>Transaction / Reference #</label>
                <input value={form.transactionId} onChange={e => setForm(p => ({ ...p, transactionId: e.target.value }))}
                  placeholder="Check #, confirmation code…"
                  style={{ width: '100%', boxSizing: 'border-box', height: 38, border: '1px solid #d1fae5', borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#374151', outline: 'none' }} />
              </div>
            </div>
            {form.paymentMethod && (
              <div style={{ marginTop: 12 }}>
                <label style={LB}>Payment Notes</label>
                <textarea value={form.paymentNotes} onChange={e => setForm(p => ({ ...p, paymentNotes: e.target.value }))} rows={2}
                  placeholder="Any additional payment notes…"
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1fae5', borderRadius: 7, padding: '10px 12px', fontSize: 13.5, color: '#374151', resize: 'vertical', outline: 'none' }} />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label style={LB}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
              placeholder="Payment terms, thank you message…"
              style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e8e9ec', borderRadius: 7, padding: '10px 12px', fontSize: 13.5, color: '#374151', resize: 'vertical', outline: 'none' }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f1f3', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
          <button onClick={onClose} style={{ height: 40, padding: '0 20px', background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
          <button onClick={submit} disabled={submitting}
            style={{ height: 40, padding: '0 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Creating…' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  )
}
