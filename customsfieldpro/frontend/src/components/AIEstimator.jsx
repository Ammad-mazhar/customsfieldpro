import { useState } from 'react'
import { getJobEstimate, isAIEnabled } from '../utils/aiEstimator'

const PROPERTY_TYPES = ['Residential', 'Commercial', 'Industrial']
const PROPERTY_SIZES = ['Small', 'Medium', 'Large', 'Extra Large']
const URGENCY_LEVELS = ['Normal', 'Urgent', 'Emergency']

const URGENCY_COLORS = {
  Normal:    { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  Urgent:    { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  Emergency: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
}

export default function AIEstimator({ serviceType = '', equipment = '', onUseEstimate, onClose }) {
  const [form, setForm] = useState({
    serviceType,
    equipment,
    description: '',
    propertyType: 'Residential',
    propertySize: 'Medium',
    urgency: 'Normal',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [result, setResult]   = useState(null)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleEstimate() {
    if (!form.description.trim()) {
      setError('Please describe the issue before requesting an estimate.')
      return
    }
    setError('')
    setLoading(true)
    setResult(null)
    try {
      const res = await getJobEstimate(form)
      setResult(res)
    } catch (e) {
      setError(e.message || 'Failed to get estimate. Check your API key in Settings → AI.')
    } finally {
      setLoading(false)
    }
  }

  function handleUse(keepOpen = false) {
    if (!result?.lineItems) return
    onUseEstimate(result.lineItems)
    if (!keepOpen) onClose()
  }

  const urgencyStyle = result ? URGENCY_COLORS[form.urgency] || URGENCY_COLORS.Normal : null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: 680,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f1f3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 6v6l4 2" /><circle cx="18" cy="6" r="3" fill="#fff" stroke="none" />
              </svg>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a1d23' }}>AI Job Estimator</p>
              <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Powered by Claude AI</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e8e9ec', background: '#f9fafb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#6b7280' }}>×</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* Input Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={LB}>Service Type</label>
              <input value={form.serviceType} onChange={e => set('serviceType', e.target.value)}
                placeholder="e.g. HVAC Repair" style={INP} />
            </div>
            <div>
              <label style={LB}>Equipment / Appliance</label>
              <input value={form.equipment} onChange={e => set('equipment', e.target.value)}
                placeholder="e.g. Carrier AC Unit, 5-ton" style={INP} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={LB}>Issue Description <span style={{ color: '#dc2626' }}>*</span></label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Describe the problem in detail — symptoms, error codes, when it started…"
              style={{ ...INP, height: 'auto', resize: 'vertical', padding: '10px 12px', lineHeight: 1.5 }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={LB}>Property Type</label>
              <select value={form.propertyType} onChange={e => set('propertyType', e.target.value)} style={SEL}>
                {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={LB}>Property Size</label>
              <select value={form.propertySize} onChange={e => set('propertySize', e.target.value)} style={SEL}>
                {PROPERTY_SIZES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={LB}>Urgency</label>
              <select value={form.urgency} onChange={e => set('urgency', e.target.value)} style={SEL}>
                {URGENCY_LEVELS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div style={{ borderTop: '1px solid #f0f1f3', paddingTop: 20 }}>
              <p style={{ fontSize: 11.5, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 14px' }}>AI Estimate Results</p>

              {/* Diagnosis */}
              <div style={{ background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>Diagnosis</p>
                <p style={{ margin: 0, fontSize: 13.5, color: '#1e3a8a', lineHeight: 1.5 }}>{result.diagnosis}</p>
              </div>

              {/* Estimate Range */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Estimate Range</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#15803d' }}>
                    ${(result.totalEstimate?.low || 0).toFixed(0)} – ${(result.totalEstimate?.high || 0).toFixed(0)}
                  </p>
                </div>
                <div style={{ flex: 1, background: '#f8f9fa', border: '1px solid #e8e9ec', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Est. Labor Hours</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#374151' }}>{result.estimatedHours || '—'}</p>
                </div>
                <div style={{ flex: 1, background: '#f8f9fa', border: '1px solid #e8e9ec', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Labor Cost</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#374151' }}>${(result.laborCost || 0).toFixed(2)}</p>
                </div>
              </div>

              {/* Line Items Table */}
              {result.lineItems?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', margin: '0 0 8px' }}>Line Items Breakdown</p>
                  <div style={{ border: '1px solid #f0f1f3', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 90px 90px', background: '#f8f9fa', padding: '8px 12px', fontSize: 11.5, fontWeight: 600, color: '#9ca3af' }}>
                      <span>Description</span><span style={{ textAlign: 'center' }}>Qty</span><span style={{ textAlign: 'right' }}>Unit</span><span style={{ textAlign: 'right' }}>Total</span>
                    </div>
                    {result.lineItems.map((li, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 90px 90px', padding: '8px 12px', borderTop: '1px solid #f3f4f6', fontSize: 13, color: '#374151' }}>
                        <span>{li.description}</span>
                        <span style={{ textAlign: 'center' }}>{li.qty}</span>
                        <span style={{ textAlign: 'right' }}>${(li.unit || 0).toFixed(2)}</span>
                        <span style={{ textAlign: 'right', fontWeight: 600 }}>${(li.total || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parts Needed */}
              {result.partsNeeded?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', margin: '0 0 6px' }}>Parts / Materials Needed</p>
                  <ul style={{ margin: 0, padding: '0 0 0 18px' }}>
                    {result.partsNeeded.map((p, i) => (
                      <li key={i} style={{ fontSize: 13, color: '#374151', marginBottom: 3 }}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Urgency Note */}
              {result.urgencyNote && (
                <div style={{ background: urgencyStyle.bg, border: `1px solid ${urgencyStyle.border}`, color: urgencyStyle.color, borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
                  <strong>Note:</strong> {result.urgencyNote}
                </div>
              )}

              {/* Additional Notes */}
              {result.notes && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', marginBottom: 4 }}>
                  <strong>Recommendations:</strong> {result.notes}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f1f3', display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onClose} style={{ height: 38, padding: '0 18px', background: '#f3f4f6', color: '#374151', border: '1px solid #e8e9ec', borderRadius: 8, fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}>
            Cancel
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            {!result ? (
              <button onClick={handleEstimate} disabled={loading}
                style={{ height: 38, padding: '0 22px', background: loading ? '#c7d2fe' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                {loading ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Analyzing…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" /></svg>
                    Get AI Estimate
                  </>
                )}
              </button>
            ) : (
              <>
                <button onClick={handleEstimate} disabled={loading}
                  style={{ height: 38, padding: '0 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #e8e9ec', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  Re-estimate
                </button>
                <button onClick={() => handleUse(true)}
                  style={{ height: 38, padding: '0 18px', background: '#f3f4f6', color: '#374151', border: '1px solid #6366f1', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', color: '#6366f1' }}>
                  Adjust & Use
                </button>
                <button onClick={() => handleUse(false)}
                  style={{ height: 38, padding: '0 22px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                  Use This Estimate
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const LB  = { display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }
const INP = { width: '100%', boxSizing: 'border-box', height: 38, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#374151', outline: 'none', background: '#fff' }
const SEL = { width: '100%', height: 38, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#374151', background: '#fff' }
