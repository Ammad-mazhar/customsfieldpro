import { useState } from 'react'
import { getSettings, saveSettings } from '../data/store'
import { logActivity, ACTIONS } from '../utils/activityLog'
import { getEmailConfig, saveEmailConfig, sendTestEmail } from '../utils/emailService'
import { getStripeConfig, saveStripeConfig } from '../utils/stripePayments'
import { getAIConfig, saveAIConfig } from '../utils/aiEstimator'

// ── Constants ─────────────────────────────────────────────────────────────────
const TABS        = ['Company', 'Technicians', 'Services', 'Notifications', 'Payments', 'AI']
const CURRENCIES  = ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
const SPECIALTIES = ['HVAC', 'Plumbing', 'Electrical', 'Appliance Repair', 'General']
const SWATCH_COLORS = [
  '#2563eb','#16a34a','#d97706','#7c3aed',
  '#dc2626','#0891b2','#db2777','#ea580c',
  '#0d9488','#6b7280','#1a1d23','#b45309',
]

const blankTech = { id: '', name: '', email: '', phone: '', specialty: 'HVAC', color: '#2563eb' }
const blankSvc  = { id: '', name: '', rate: '' }

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

function SectionHead({ title }) {
  return <p style={{ fontSize: 11.5, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 18px', paddingBottom: 10, borderBottom: '1px solid #f0f1f3' }}>{title}</p>
}

function SavedBanner({ show }) {
  if (!show) return null
  return (
    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: 8, padding: '10px 16px', fontSize: 13.5, fontWeight: 600, marginBottom: 20 }}>
      ✓ Settings saved.
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', padding: 2,
        background: checked ? '#2563eb' : '#d1d5db',
        transition: 'background 0.2s', display: 'flex', alignItems: 'center', flexShrink: 0,
      }}
    >
      <span style={{
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transform: checked ? 'translateX(20px)' : 'translateX(0)',
        transition: 'transform 0.2s',
        display: 'block',
      }} />
    </button>
  )
}

function ColorSwatch({ selected, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 6 }}>
      {SWATCH_COLORS.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          style={{
            width: 26, height: 26, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', padding: 0,
            outline: selected === c ? `3px solid ${c}` : '2px solid transparent',
            outlineOffset: 2, transition: 'outline 0.12s',
          }}
        />
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Settings() {
  const [tab,      setTab]      = useState('Company')
  const [settings, setSettings] = useState(() => getSettings())
  const [saved,    setSaved]    = useState(false)

  function persist(newSettings, section = tab) {
    saveSettings(newSettings)
    setSettings(newSettings)
    logActivity(ACTIONS.SETTINGS_UPDATED, 'Settings', section.toLowerCase(), `${section} Settings`, `${section} settings saved.`)
    setSaved(true)
    setTimeout(() => setSaved(false), 2800)
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e8e9ec' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '12px 22px', fontSize: 13.5, fontWeight: tab === t ? 600 : 500,
                color: tab === t ? '#2563eb' : '#6b7280', background: 'none', border: 'none',
                borderBottom: `2px solid ${tab === t ? '#2563eb' : 'transparent'}`,
                cursor: 'pointer', marginBottom: -1, whiteSpace: 'nowrap',
              }}>
              {t}
            </button>
          ))}
        </div>

        <div style={{ padding: 28 }}>
          <SavedBanner show={saved} />
          {tab === 'Company'       && <CompanyTab       settings={settings} onSave={persist} />}
          {tab === 'Technicians'   && <TechniciansTab   settings={settings} onSave={persist} />}
          {tab === 'Services'      && <ServicesTab      settings={settings} onSave={persist} />}
          {tab === 'Notifications' && <NotificationsTab settings={settings} onSave={persist} />}
          {tab === 'Payments'     && <PaymentsTab />}
          {tab === 'AI'           && <AITab />}
        </div>
      </div>
    </div>
  )
}

// ── Tab 1 — Company ───────────────────────────────────────────────────────────
function CompanyTab({ settings, onSave }) {
  const [co, setCo] = useState({ ...settings.company })

  function set(f, v) { setCo(p => ({ ...p, [f]: v })) }

  function handleSave(e) {
    e.preventDefault()
    onSave({ ...settings, company: co })
  }

  return (
    <form onSubmit={handleSave}>
      <SectionHead title="Company Information" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={LB}>Company Name</label>
          <input value={co.name} onChange={e => set('name', e.target.value)} placeholder="Your company name" style={INP} />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={LB}>Street Address</label>
          <input value={co.address} onChange={e => set('address', e.target.value)} placeholder="123 Main Street" style={INP} />
        </div>
        <div>
          <label style={LB}>City</label>
          <input value={co.city} onChange={e => set('city', e.target.value)} placeholder="Springfield" style={INP} />
        </div>
        <div>
          <label style={LB}>ZIP Code</label>
          <input value={co.zip} onChange={e => set('zip', e.target.value)} placeholder="22150" style={INP} />
        </div>
        <div>
          <label style={LB}>Phone</label>
          <input value={co.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" style={INP} />
        </div>
        <div>
          <label style={LB}>Email</label>
          <input type="email" value={co.email} onChange={e => set('email', e.target.value)} placeholder="info@yourcompany.com" style={INP} />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={LB}>Website</label>
          <input value={co.website} onChange={e => set('website', e.target.value)} placeholder="www.yourcompany.com" style={INP} />
        </div>
      </div>

      <div style={{ height: 1, background: '#f0f1f3', margin: '24px 0' }} />
      <SectionHead title="Financial Settings" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={LB}>Default Tax Rate (%)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number" min={0} max={100} step={0.1}
              value={co.taxRate} onChange={e => set('taxRate', parseFloat(e.target.value) || 0)}
              style={{ ...INP, width: 100 }}
            />
            <span style={{ fontSize: 13.5, color: '#6b7280' }}>% — applied to all new invoices and quotes</span>
          </div>
        </div>
        <div>
          <label style={LB}>Currency</label>
          <select value={co.currency} onChange={e => set('currency', e.target.value)} style={SEL}>
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f0f1f3' }}>
        <button type="submit" style={BTN}>Save Company Settings</button>
      </div>
    </form>
  )
}

// ── Tab 2 — Technicians ───────────────────────────────────────────────────────
function TechniciansTab({ settings, onSave }) {
  const [techs,     setTechs]     = useState(settings.technicians)
  const [showAdd,   setShowAdd]   = useState(false)
  const [newTech,   setNewTech]   = useState({ ...blankTech })
  const [editId,    setEditId]    = useState(null)
  const [editData,  setEditData]  = useState({})
  const [errors,    setErrors]    = useState({})

  function setN(f, v) { setNewTech(p => ({ ...p, [f]: v })); setErrors(p => ({ ...p, [f]: undefined })) }
  function setE(f, v) { setEditData(p => ({ ...p, [f]: v })) }

  function validateTech(t) {
    const e = {}
    if (!t.name.trim()) e.name = 'Required'
    return e
  }

  function addTech() {
    const e = validateTech(newTech)
    if (Object.keys(e).length) { setErrors(e); return }
    const updated = [...techs, { ...newTech, id: newTech.id || uid() }]
    setTechs(updated)
    onSave({ ...settings, technicians: updated })
    setNewTech({ ...blankTech })
    setShowAdd(false)
    setErrors({})
  }

  function startEdit(tech) {
    setEditId(tech.id)
    setEditData({ ...tech })
  }

  function saveEdit() {
    const updated = techs.map(t => t.id === editId ? { ...editData } : t)
    setTechs(updated)
    onSave({ ...settings, technicians: updated })
    setEditId(null)
  }

  function deleteTech(id) {
    if (!window.confirm('Remove this technician?')) return
    const updated = techs.filter(t => t.id !== id)
    setTechs(updated)
    onSave({ ...settings, technicians: updated })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 2px' }}>Technicians</p>
          <p style={{ fontSize: 12.5, color: '#9ca3af', margin: 0 }}>{techs.length} staff members · colors appear on scheduler and map</p>
        </div>
        <button onClick={() => setShowAdd(s => !s)} style={{ ...BTN, background: showAdd ? '#f3f4f6' : '#2563eb', color: showAdd ? '#374151' : '#fff' }}>
          {showAdd ? 'Cancel' : '+ Add Technician'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ background: '#f8faff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '18px 20px', marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', margin: '0 0 14px' }}>New Technician</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LB}>Name <span style={{ color: '#dc2626' }}>*</span></label>
              <input value={newTech.name} onChange={e => setN('name', e.target.value)}
                placeholder="Full name" style={{ ...INP, borderColor: errors.name ? '#dc2626' : '#e8e9ec' }} />
              {errors.name && <p style={ET}>{errors.name}</p>}
            </div>
            <div>
              <label style={LB}>Email</label>
              <input type="email" value={newTech.email} onChange={e => setN('email', e.target.value)} placeholder="tech@company.com" style={INP} />
            </div>
            <div>
              <label style={LB}>Phone</label>
              <input value={newTech.phone} onChange={e => setN('phone', e.target.value)} placeholder="(555) 000-0000" style={INP} />
            </div>
            <div>
              <label style={LB}>Specialty</label>
              <select value={newTech.specialty} onChange={e => setN('specialty', e.target.value)} style={SEL}>
                {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={LB}>Color (used on scheduler &amp; map)</label>
            <ColorSwatch selected={newTech.color} onChange={c => setN('color', c)} />
          </div>
          <div style={{ marginTop: 16 }}>
            <button onClick={addTech} style={BTN}>Add Technician</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ border: '1px solid #e8e9ec', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              {['Color', 'Name', 'Email', 'Phone', 'Specialty', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: '#9ca3af', padding: '10px 14px', borderBottom: '1px solid #e8e9ec', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {techs.map(tech => (
              <tr key={tech.id} style={{ borderBottom: '1px solid #f0f1f3' }}>
                {editId === tech.id ? (
                  <>
                    <td style={TD}>
                      <ColorSwatch selected={editData.color} onChange={c => setE('color', c)} />
                    </td>
                    <td style={TD}><input value={editData.name}      onChange={e => setE('name', e.target.value)}      style={{ ...INP, height: 32, fontSize: 13 }} /></td>
                    <td style={TD}><input value={editData.email}     onChange={e => setE('email', e.target.value)}     style={{ ...INP, height: 32, fontSize: 13 }} /></td>
                    <td style={TD}><input value={editData.phone}     onChange={e => setE('phone', e.target.value)}     style={{ ...INP, height: 32, fontSize: 13 }} /></td>
                    <td style={TD}>
                      <select value={editData.specialty} onChange={e => setE('specialty', e.target.value)} style={{ ...SEL, height: 32, fontSize: 13 }}>
                        {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                      <button onClick={saveEdit}       style={{ ...BTN,       height: 30, padding: '0 12px', fontSize: 12.5, marginRight: 6 }}>Save</button>
                      <button onClick={() => setEditId(null)} style={{ ...BTN_GHOST, height: 30, padding: '0 12px', fontSize: 12.5 }}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={TD}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: tech.color, border: '2px solid rgba(0,0,0,0.08)' }} />
                    </td>
                    <td style={{ ...TD, fontWeight: 600, color: '#1a1d23' }}>{tech.name}</td>
                    <td style={{ ...TD, color: '#6b7280' }}>{tech.email || '—'}</td>
                    <td style={{ ...TD, color: '#6b7280' }}>{tech.phone || '—'}</td>
                    <td style={TD}>
                      <span style={{ fontSize: 12, fontWeight: 600, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 20 }}>{tech.specialty}</span>
                    </td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                      <button onClick={() => startEdit(tech)} style={BTN_ICON} title="Edit">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => deleteTech(tech.id)} style={{ ...BTN_ICON, color: '#dc2626', background: '#fef2f2' }} title="Delete">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {!techs.length && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 28, color: '#9ca3af', fontSize: 13.5 }}>No technicians yet. Add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Tab 3 — Services ──────────────────────────────────────────────────────────
function ServicesTab({ settings, onSave }) {
  const [services, setServices] = useState(settings.services)
  const [showAdd,  setShowAdd]  = useState(false)
  const [newSvc,   setNewSvc]   = useState({ ...blankSvc })
  const [editId,   setEditId]   = useState(null)
  const [editData, setEditData] = useState({})
  const [errors,   setErrors]   = useState({})

  function setN(f, v) { setNewSvc(p => ({ ...p, [f]: v })); setErrors(p => ({ ...p, [f]: undefined })) }
  function setE(f, v) { setEditData(p => ({ ...p, [f]: v })) }

  function validateSvc(s) {
    const e = {}
    if (!s.name.trim())           e.name = 'Required'
    if (!s.rate && s.rate !== 0)  e.rate = 'Required'
    return e
  }

  function addSvc() {
    const e = validateSvc(newSvc)
    if (Object.keys(e).length) { setErrors(e); return }
    const updated = [...services, { ...newSvc, id: uid(), rate: Number(newSvc.rate) || 0 }]
    setServices(updated)
    onSave({ ...settings, services: updated })
    setNewSvc({ ...blankSvc })
    setShowAdd(false)
    setErrors({})
  }

  function saveEdit() {
    const updated = services.map(s => s.id === editId ? { ...editData, rate: Number(editData.rate) || 0 } : s)
    setServices(updated)
    onSave({ ...settings, services: updated })
    setEditId(null)
  }

  function deleteSvc(id) {
    if (!window.confirm('Remove this service?')) return
    const updated = services.filter(s => s.id !== id)
    setServices(updated)
    onSave({ ...settings, services: updated })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 2px' }}>Service Types</p>
          <p style={{ fontSize: 12.5, color: '#9ca3af', margin: 0 }}>Default hourly rates used when creating line items</p>
        </div>
        <button onClick={() => setShowAdd(s => !s)} style={{ ...BTN, background: showAdd ? '#f3f4f6' : '#2563eb', color: showAdd ? '#374151' : '#fff' }}>
          {showAdd ? 'Cancel' : '+ Add Service'}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: '#f8faff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '18px 20px', marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', margin: '0 0 14px' }}>New Service</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={LB}>Service Name <span style={{ color: '#dc2626' }}>*</span></label>
              <input value={newSvc.name} onChange={e => setN('name', e.target.value)}
                placeholder="e.g. HVAC Inspection" style={{ ...INP, borderColor: errors.name ? '#dc2626' : '#e8e9ec' }} />
              {errors.name && <p style={ET}>{errors.name}</p>}
            </div>
            <div>
              <label style={LB}>Default Rate ($/hr) <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="number" min={0} value={newSvc.rate} onChange={e => setN('rate', e.target.value)}
                placeholder="150" style={{ ...INP, borderColor: errors.rate ? '#dc2626' : '#e8e9ec' }} />
              {errors.rate && <p style={ET}>{errors.rate}</p>}
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <button onClick={addSvc} style={BTN}>Add Service</button>
          </div>
        </div>
      )}

      <div style={{ border: '1px solid #e8e9ec', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              {['Service Name', 'Default Rate / hr', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: '#9ca3af', padding: '10px 16px', borderBottom: '1px solid #e8e9ec' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {services.map(svc => (
              <tr key={svc.id} style={{ borderBottom: '1px solid #f0f1f3' }}>
                {editId === svc.id ? (
                  <>
                    <td style={TD}><input value={editData.name} onChange={e => setE('name', e.target.value)} style={{ ...INP, height: 32, fontSize: 13 }} /></td>
                    <td style={TD}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13.5, color: '#6b7280' }}>$</span>
                        <input type="number" min={0} value={editData.rate} onChange={e => setE('rate', e.target.value)} style={{ ...INP, height: 32, fontSize: 13, width: 90 }} />
                        <span style={{ fontSize: 13, color: '#9ca3af' }}>/hr</span>
                      </div>
                    </td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                      <button onClick={saveEdit}       style={{ ...BTN, height: 30, padding: '0 12px', fontSize: 12.5, marginRight: 6 }}>Save</button>
                      <button onClick={() => setEditId(null)} style={{ ...BTN_GHOST, height: 30, padding: '0 12px', fontSize: 12.5 }}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ ...TD, fontWeight: 600, color: '#1a1d23' }}>{svc.name}</td>
                    <td style={TD}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1d23' }}>${svc.rate}</span>
                      <span style={{ fontSize: 12.5, color: '#9ca3af', marginLeft: 4 }}>/hr</span>
                    </td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                      <button onClick={() => { setEditId(svc.id); setEditData({ ...svc }) }} style={BTN_ICON} title="Edit">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => deleteSvc(svc.id)} style={{ ...BTN_ICON, color: '#dc2626', background: '#fef2f2' }} title="Delete">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {!services.length && (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: 28, color: '#9ca3af', fontSize: 13.5 }}>No services yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Tab 4 — Notifications ─────────────────────────────────────────────────────
function NotificationsTab({ settings, onSave }) {
  const [notif,      setNotif]      = useState({ ...settings.notifications })
  const [ejsCfg,     setEjsCfg]     = useState(() => getEmailConfig())
  const [testEmail,  setTestEmail]  = useState(() => settings.company?.email || '')
  const [testStatus, setTestStatus] = useState(null)   // null | 'sending' | 'ok' | 'error'
  const [testMsg,    setTestMsg]    = useState('')
  const [ejsSaved,   setEjsSaved]   = useState(false)

  const isConfigured = !!(ejsCfg.serviceId && ejsCfg.publicKey)

  function toggle(key) {
    const updated = { ...notif, [key]: !notif[key] }
    setNotif(updated)
    onSave({ ...settings, notifications: updated })
  }

  function setE(f, v) { setEjsCfg(p => ({ ...p, [f]: v })) }

  function handleSaveEjs() {
    saveEmailConfig(ejsCfg)
    setEjsSaved(true)
    setTimeout(() => setEjsSaved(false), 2500)
    logActivity(ACTIONS.SETTINGS_UPDATED, 'Settings', 'emailjs', 'EmailJS Settings', 'EmailJS configuration saved.')
  }

  async function handleTest() {
    if (!testEmail) return
    setTestStatus('sending')
    setTestMsg('')
    const result = await sendTestEmail(testEmail)
    if (result.success) {
      setTestStatus('ok')
      setTestMsg(`Test email sent to ${testEmail}`)
    } else {
      setTestStatus('error')
      setTestMsg(result.reason === 'not_configured' ? 'EmailJS is not configured yet. Fill in Service ID and Public Key first.'
        : result.reason === 'no_template' ? 'No template IDs configured. Add at least one template ID.'
        : `Send failed: ${result.error}`)
    }
  }

  const NOTIF_ITEMS = [
    { key: 'emailOnNewRequest',     title: 'Email on new service request',   desc: 'Send confirmation email to client when a new request is submitted.' },
    { key: 'emailOnJobAssignment',  title: 'Email on job assignment',         desc: 'Notify the assigned technician by email when a job is created.' },
    { key: 'emailOnJobCompletion',  title: 'Email on job completion',         desc: 'Notify the client by email when their job is marked completed.' },
    { key: 'emailOnInvoiceSent',    title: 'Email when invoice is sent',      desc: 'Send the invoice details to the client when an invoice is sent.' },
    { key: 'emailOnQuoteSent',      title: 'Email when quote is sent',        desc: 'Send the quote to the client when a quote is created or sent.' },
  ]

  const TEMPLATE_FIELDS = [
    { key: 'templateId_job_assigned',        label: 'Template: Job Assigned',          vars: '{{technician_name}}, {{job_number}}, {{client_name}}, {{address}}, {{scheduled_time}}, {{service_type}}, {{priority}}' },
    { key: 'templateId_invoice',             label: 'Template: Invoice',               vars: '{{client_name}}, {{invoice_number}}, {{amount}}, {{due_date}}, {{company_name}}' },
    { key: 'templateId_quote',               label: 'Template: Quote',                 vars: '{{client_name}}, {{quote_number}}, {{amount}}, {{valid_until}}, {{service_type}}' },
    { key: 'templateId_request_confirmation',label: 'Template: Request Confirmation',  vars: '{{client_name}}, {{service_type}}, {{reference_number}}, {{preferred_date}}' },
    { key: 'templateId_job_completion',      label: 'Template: Job Completion',        vars: '{{client_name}}, {{job_number}}, {{service_type}}, {{technician_name}}, {{completion_notes}}' },
    { key: 'templateId_password_reset',      label: 'Template: Password Reset',        vars: '{{user_name}}, {{temp_password}}, {{company_name}}' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── EmailJS Configuration ───────────────────────────────────────────── */}
      <div>
        <SectionHead title="EmailJS Configuration" />

        {/* Status chip */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 20, marginBottom: 18,
          background: isConfigured ? '#f0fdf4' : '#fef9ee', border: `1px solid ${isConfigured ? '#bbf7d0' : '#fde68a'}` }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: isConfigured ? '#16a34a' : '#d97706', flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: isConfigured ? '#16a34a' : '#92400e' }}>
            {isConfigured ? 'EmailJS Connected' : 'Not configured'}
          </span>
        </div>

        {/* Setup guide */}
        <div style={{ background: '#f8faff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', margin: '0 0 10px' }}>Quick Setup Guide</p>
          <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              <>Create a free account at <strong>emailjs.com</strong></>,
              'Add an Email Service (Gmail, Outlook, etc.) and copy the Service ID',
              'Create email templates using the variable names shown below for each type',
              'Copy your Public Key from Account → API Keys',
              'Paste all values below and click Save EmailJS Settings',
            ].map((step, i) => (
              <li key={i} style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{step}</li>
            ))}
          </ol>
        </div>

        {/* Credentials */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div>
            <label style={LB}>Public Key</label>
            <input value={ejsCfg.publicKey} onChange={e => setE('publicKey', e.target.value)}
              placeholder="e.g. AbCdEfGhIjKlMnOpQ" style={INP} />
          </div>
          <div>
            <label style={LB}>Service ID</label>
            <input value={ejsCfg.serviceId} onChange={e => setE('serviceId', e.target.value)}
              placeholder="e.g. service_xxxxxxx" style={INP} />
          </div>
        </div>

        {/* Template IDs */}
        <p style={{ fontSize: 12.5, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px' }}>Template IDs</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {TEMPLATE_FIELDS.map(tf => (
            <div key={tf.key} style={{ background: '#fafafa', border: '1px solid #e8e9ec', borderRadius: 9, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ ...LB, marginBottom: 3 }}>{tf.label}</label>
                  <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '0 0 7px', fontFamily: 'monospace' }}>{tf.vars}</p>
                  <input value={ejsCfg[tf.key] || ''} onChange={e => setE(tf.key, e.target.value)}
                    placeholder="template_xxxxxxx" style={{ ...INP, height: 34, fontSize: 13 }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Test + Save */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={LB}>Test — Send to this email</label>
            <input value={testEmail} onChange={e => setTestEmail(e.target.value)}
              placeholder="admin@company.com" type="email" style={{ ...INP, height: 38 }} />
          </div>
          <button onClick={handleTest} disabled={testStatus === 'sending'}
            style={{ ...BTN_GHOST, height: 38, whiteSpace: 'nowrap', opacity: testStatus === 'sending' ? 0.6 : 1 }}>
            {testStatus === 'sending' ? 'Sending…' : 'Test Connection'}
          </button>
          <button onClick={handleSaveEjs} style={{ ...BTN, height: 38, whiteSpace: 'nowrap' }}>
            {ejsSaved ? '✓ Saved' : 'Save EmailJS Settings'}
          </button>
        </div>

        {/* Test result */}
        {testStatus && testStatus !== 'sending' && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8,
            background: testStatus === 'ok' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${testStatus === 'ok' ? '#bbf7d0' : '#fecaca'}`,
            color: testStatus === 'ok' ? '#16a34a' : '#dc2626',
            fontSize: 13, fontWeight: 500 }}>
            {testStatus === 'ok' ? '✓ ' : '✕ '}{testMsg}
          </div>
        )}
      </div>

      {/* ── Notification Triggers ────────────────────────────────────────────── */}
      <div>
        <SectionHead title="Email Notification Triggers" />
        <p style={{ fontSize: 13, color: '#9ca3af', margin: '-10px 0 16px' }}>
          Toggle which events automatically send emails. Requires EmailJS to be configured above.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NOTIF_ITEMS.map(item => (
            <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', border: '1px solid #e8e9ec', borderRadius: 10,
              background: notif[item.key] ? '#f8faff' : '#fafafa',
              opacity: isConfigured ? 1 : 0.6 }}>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23', margin: '0 0 2px' }}>{item.title}</p>
                <p style={{ fontSize: 12.5, color: '#9ca3af', margin: 0 }}>{item.desc}</p>
              </div>
              <Toggle checked={!!notif[item.key]} onChange={() => toggle(item.key)} />
            </div>
          ))}
        </div>
        {!isConfigured && (
          <p style={{ fontSize: 12.5, color: '#9ca3af', margin: '12px 0 0', textAlign: 'center' }}>
            Configure EmailJS above to enable email delivery.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────
// ── Tab 5 — Payments ─────────────────────────────────────────────────────────
function PaymentsTab() {
  const [cfg,      setCfg]      = useState(() => getStripeConfig())
  const [saved,    setSaved]    = useState(false)
  const [copied,   setCopied]   = useState(false)

  const isConfigured = cfg.paymentLinkPrefix &&
    cfg.paymentLinkPrefix.trim() &&
    cfg.paymentLinkPrefix !== 'https://buy.stripe.com/'

  function setF(k, v) { setCfg(p => ({ ...p, [k]: v })) }

  function handleSave() {
    saveStripeConfig(cfg)
    logActivity(ACTIONS.SETTINGS_UPDATED, 'Settings', 'payments', 'Payment Settings', 'Stripe payment settings saved.')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function copyKey() {
    if (!cfg.publishableKey) return
    await navigator.clipboard.writeText(cfg.publishableKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {saved && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: 8, padding: '10px 16px', fontSize: 13.5, fontWeight: 600 }}>✓ Payment settings saved.</div>}

      {/* Status chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: isConfigured ? '#16a34a' : '#d1d5db', flexShrink: 0 }} />
        <span style={{ fontSize: 13.5, fontWeight: 600, color: isConfigured ? '#16a34a' : '#9ca3af' }}>
          {isConfigured ? 'Stripe payment links configured' : 'Not configured — enter your payment link below'}
        </span>
      </div>

      {/* How it works */}
      <div style={{ background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 10, padding: '14px 18px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', margin: '0 0 10px' }}>How Stripe Payment Links work</p>
        <ol style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            'Log in to your Stripe Dashboard at dashboard.stripe.com',
            'Go to Payment Links → Create a payment link',
            'Set the price as a "Customer chooses price" or a fixed amount',
            'Copy the link URL (looks like https://buy.stripe.com/xxxxx)',
            'Paste it in the "Payment Link" field below',
            'Clients can pay directly from their invoice — no backend needed',
          ].map((step, i) => (
            <li key={i} style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.5 }}>{step}</li>
          ))}
        </ol>
      </div>

      {/* Publishable key */}
      <div>
        <SectionHead title="Stripe API" />
        <div style={{ marginBottom: 14 }}>
          <label style={LB}>Publishable Key (pk_live_… or pk_test_…)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="password"
              value={cfg.publishableKey}
              onChange={e => setF('publishableKey', e.target.value)}
              placeholder="pk_live_…"
              style={{ ...INP, flex: 1 }}
            />
            {cfg.publishableKey && (
              <button onClick={copyKey}
                style={{ height: 38, padding: '0 14px', background: '#f3f4f6', border: '1px solid #e8e9ec', borderRadius: 7, fontSize: 13, color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            )}
          </div>
          <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '5px 0 0' }}>Used for future Stripe Elements integration. Not required for payment links.</p>
        </div>
      </div>

      {/* Payment link */}
      <div>
        <SectionHead title="Payment Link" />
        <div style={{ marginBottom: 14 }}>
          <label style={LB}>Payment Link URL <span style={{ color: '#dc2626' }}>*</span></label>
          <input
            value={cfg.paymentLinkPrefix}
            onChange={e => setF('paymentLinkPrefix', e.target.value)}
            placeholder="https://buy.stripe.com/your_link_id"
            style={INP}
          />
          <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '5px 0 0' }}>
            Paste your Stripe Payment Link URL here. Client email and invoice ID will be appended automatically.
          </p>
        </div>
        {isConfigured && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: '#166534' }}>
            ✓ Sample link: <code style={{ fontSize: 12 }}>{cfg.paymentLinkPrefix}?prefilled_email=client@example.com&client_reference_id=INV-001</code>
          </div>
        )}
      </div>

      {/* Toggles */}
      <div>
        <SectionHead title="Display Options" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { key: 'showPayNowButton', label: 'Show "Pay Now" button on invoices', desc: 'Adds a Pay Now button in the Invoice Detail view and invoice list.' },
            { key: 'sendLinkInEmail',  label: 'Include payment link in invoice emails', desc: 'Automatically appends the payment link URL when sending invoices by email.' },
          ].map(({ key, label, desc }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <Toggle checked={!!cfg[key]} onChange={v => setF(key, v)} />
              <div style={{ opacity: isConfigured ? 1 : 0.45 }}>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: '#374151', margin: 0 }}>{label}</p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid #f0f1f3', paddingTop: 20 }}>
        <button onClick={handleSave} style={BTN}>Save Payment Settings</button>
      </div>
    </div>
  )
}

function AITab() {
  const [cfg, setCfg]       = useState(() => getAIConfig())
  const [saved, setSaved]   = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState('')

  const setF = (k, v) => setCfg(p => ({ ...p, [k]: v }))

  function handleSave() {
    saveAIConfig(cfg)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleTest() {
    if (!cfg.apiKey?.trim()) {
      setTestResult('error:Please enter your API key first.')
      return
    }
    setTesting(true)
    setTestResult('')
    const start = Date.now()
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': cfg.apiKey.trim(),
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 20,
          messages: [{ role: 'user', content: 'Reply with: OK' }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `HTTP ${res.status}`)
      }
      const elapsed = ((Date.now() - start) / 1000).toFixed(1)
      setTestResult(`ok:Connected successfully in ${elapsed}s`)
    } catch (e) {
      setTestResult(`error:${e.message}`)
    } finally {
      setTesting(false)
    }
  }

  const isOK     = testResult.startsWith('ok:')
  const isErr    = testResult.startsWith('error:')
  const testMsg  = testResult.replace(/^(ok|error):/, '')
  const enabled  = !!(cfg.enabled && cfg.apiKey?.trim())

  return (
    <div>
      <SavedBanner show={saved} />

      {/* Status chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, padding: '5px 12px', borderRadius: 20, background: enabled ? '#f0fdf4' : '#f3f4f6', color: enabled ? '#16a34a' : '#6b7280', border: `1px solid ${enabled ? '#bbf7d0' : '#e8e9ec'}` }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: enabled ? '#16a34a' : '#9ca3af', display: 'inline-block' }} />
          {enabled ? 'AI Estimator Active' : 'AI Estimator Inactive'}
        </span>
      </div>

      {/* API Key */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '20px', marginBottom: 20 }}>
        <SectionHead title="Anthropic API Key" />
        <div style={{ marginBottom: 14 }}>
          <label style={LB}>API Key</label>
          <input
            type="password"
            value={cfg.apiKey || ''}
            onChange={e => setF('apiKey', e.target.value)}
            placeholder="sk-ant-api03-…"
            style={INP}
          />
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '6px 0 0' }}>
            Your API key is stored locally in your browser and never sent to our servers.
            Get your key at <strong>console.anthropic.com</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={handleTest} disabled={testing}
            style={{ height: 36, padding: '0 16px', background: testing ? '#f3f4f6' : '#f8faff', color: testing ? '#9ca3af' : '#2563eb', border: `1px solid ${testing ? '#e8e9ec' : '#bfdbfe'}`, borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: testing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {testing ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                Testing…
              </>
            ) : 'Test Connection'}
          </button>
          {testMsg && (
            <span style={{ fontSize: 13, color: isOK ? '#16a34a' : '#dc2626', fontWeight: 500 }}>
              {isOK ? '✓' : '✗'} {testMsg}
            </span>
          )}
        </div>
      </div>

      {/* Enable Toggle */}
      <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '20px', marginBottom: 20 }}>
        <SectionHead title="Settings" />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <Toggle checked={!!cfg.enabled} onChange={v => setF('enabled', v)} />
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: '#374151', margin: 0 }}>Enable AI Estimator</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>
              Shows a "Get AI Estimate" button on the Create Job and Create Quote forms. Requires a valid API key.
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>How It Works</p>
        <ol style={{ margin: 0, padding: '0 0 0 18px' }}>
          {[
            'Enter your Anthropic API key above and enable the estimator.',
            'When creating a job or quote, click "Get AI Estimate" below the service type.',
            'Describe the issue, select property type/size and urgency, then click "Get AI Estimate".',
            'Review the diagnosis, cost breakdown, and line items returned by Claude AI.',
            'Click "Use This Estimate" to automatically populate the line items in your form.',
          ].map((step, i) => (
            <li key={i} style={{ fontSize: 13, color: '#1e40af', marginBottom: 6 }}>{step}</li>
          ))}
        </ol>
      </div>

      <div style={{ borderTop: '1px solid #f0f1f3', paddingTop: 20 }}>
        <button onClick={handleSave} style={BTN}>Save AI Settings</button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const LB  = { display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }
const ET  = { fontSize: 11, color: '#dc2626', margin: '4px 0 0' }
const INP = { width: '100%', boxSizing: 'border-box', height: 38, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#374151', outline: 'none', background: '#fff' }
const SEL = { width: '100%', height: 38, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#374151', background: '#fff' }
const TD  = { padding: '12px 14px', fontSize: 13.5, color: '#374151', verticalAlign: 'middle' }
const BTN = { height: 38, padding: '0 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }
const BTN_GHOST = { height: 38, padding: '0 18px', background: '#f3f4f6', color: '#374151', border: '1px solid #e8e9ec', borderRadius: 8, fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }
const BTN_ICON  = { width: 30, height: 30, border: 'none', background: '#f3f4f6', color: '#6b7280', borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: 4 }
