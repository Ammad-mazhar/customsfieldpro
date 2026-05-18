import { useState } from 'react'
import { getSettings, saveSettings } from '../data/store'
import { TECH_COLORS, buildTechColorCache } from '../utils/techColors'
import { useTenantConfig } from '../hooks/useTenantConfig'
import SignatureCapture from '../components/SignatureCapture'
import { DEFAULT_FIELD_RULES } from '../utils/techValidation'
import { DEFAULT_REVIEW_SETTINGS } from '../utils/reviewRequests'
import { replacePlaceholders } from '../utils/reviewEmailTemplate'
import { logActivity, ACTIONS } from '../utils/activityLog'
import { getEmailConfig, saveEmailConfig, sendTestEmail } from '../utils/emailService'
import { getStripeConfig, saveStripeConfig } from '../utils/stripePayments'
import { getAIConfig, saveAIConfig } from '../utils/aiEstimator'
import AddressAutocomplete from '../components/AddressAutocomplete'
import { GOOGLE_MAPS_API_KEY, isGoogleMapsConfigured } from '../lib/googleMaps'

// ── Constants ─────────────────────────────────────────────────────────────────
const TABS        = ['Company', 'Technicians', 'Services', 'Notifications', 'Payments', 'AI', 'Integrations', 'Reviews', 'Field Rules', 'Signatures', 'Customize']
const CURRENCIES  = ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
const SPECIALTIES = ['HVAC', 'Plumbing', 'Electrical', 'Appliance Repair', 'General']
const blankTech = { id: '', name: '', email: '', phone: '', specialty: 'HVAC', color: '#2563EB', colorLight: '#EFF6FF', colorName: 'Ocean Blue' }
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

// onChange receives { hex, light, name }
function ColorSwatch({ selected, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 6 }}>
      {TECH_COLORS.map(c => {
        const isSelected = selected?.toLowerCase() === c.hex.toLowerCase()
        return (
          <button
            key={c.hex}
            title={c.name}
            onClick={() => onChange(c)}
            style={{
              width: 28, height: 28, borderRadius: '50%', background: c.hex, border: 'none', cursor: 'pointer', padding: 0,
              outline: isSelected ? `3px solid ${c.hex}` : '2px solid transparent',
              outlineOffset: 2, transition: 'outline 0.12s', position: 'relative',
            }}
          >
            {isSelected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        )
      })}
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
          {tab === 'Payments'      && <PaymentsTab />}
          {tab === 'AI'            && <AITab />}
          {tab === 'Integrations'  && <IntegrationsTab />}
          {tab === 'Reviews'       && <ReviewsTab       settings={settings} onSave={persist} />}
          {tab === 'Field Rules'   && <FieldRulesTab    settings={settings} onSave={persist} />}
          {tab === 'Signatures'    && <SignaturesTab    settings={settings} onSave={persist} />}
          {tab === 'Customize'     && <CustomizeTab />}
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
          <AddressAutocomplete
            value={co.address}
            placeholder="123 Main Street"
            onChange={fields => setCo(p => ({
              ...p,
              ...(fields.address !== undefined ? { address: fields.address } : {}),
              ...(fields.city  ? { city: fields.city }  : {}),
              ...(fields.zip   ? { zip: fields.zip }    : {}),
              ...(fields.lat   ? { lat: fields.lat }    : {}),
              ...(fields.lng   ? { lng: fields.lng }    : {}),
            }))}
          />
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
  function setNColor(c) { setNewTech(p => ({ ...p, color: c.hex, colorLight: c.light, colorName: c.name })) }
  function setEColor(c) { setEditData(p => ({ ...p, color: c.hex, colorLight: c.light, colorName: c.name })) }

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
    buildTechColorCache()
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
    buildTechColorCache()
    setEditId(null)
  }

  function deleteTech(id) {
    if (!window.confirm('Remove this technician?')) return
    const updated = techs.filter(t => t.id !== id)
    setTechs(updated)
    onSave({ ...settings, technicians: updated })
    buildTechColorCache()
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
            <ColorSwatch selected={newTech.color} onChange={setNColor} />
            {newTech.colorName && <p style={{ fontSize: 11.5, color: '#6b7280', marginTop: 5 }}>{newTech.colorName}</p>}
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
                      <ColorSwatch selected={editData.color} onChange={setEColor} />
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

// ── Tab 7 — Integrations ──────────────────────────────────────────────────────
function IntegrationsTab() {
  const [mapsKey,     setMapsKey]     = useState(GOOGLE_MAPS_API_KEY || '')
  const [testStatus,  setTestStatus]  = useState(null)   // null | 'testing' | 'ok' | 'error'
  const [testMsg,     setTestMsg]     = useState('')
  const [showKey,     setShowKey]     = useState(false)
  const configured = isGoogleMapsConfigured()

  async function handleTestMaps() {
    if (!mapsKey.trim()) { setTestStatus('error'); setTestMsg('Enter an API key first.'); return }
    setTestStatus('testing')
    setTestMsg('')
    // Load a tiny static map to verify the key works
    try {
      const url = `https://maps.googleapis.com/maps/api/staticmap?center=0,0&zoom=1&size=1x1&key=${mapsKey.trim()}`
      const res = await fetch(url)
      if (res.ok && res.headers.get('content-type')?.includes('image')) {
        setTestStatus('ok')
        setTestMsg('Google Maps API key is valid.')
      } else {
        const text = await res.text()
        const match = text.match(/<error>(.*?)<\/error>/)
        setTestStatus('error')
        setTestMsg(match ? match[1] : 'Invalid API key or Maps API not enabled.')
      }
    } catch (e) {
      setTestStatus('error')
      setTestMsg('Network error — could not reach Google APIs.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Google Maps ─────────────────────────────────────────────────────── */}
      <div>
        <SectionHead title="Google Maps & Places" />

        {/* Status chip */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 20, marginBottom: 18,
          background: configured ? '#f0fdf4' : '#f3f4f6', border: `1px solid ${configured ? '#bbf7d0' : '#e8e9ec'}` }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: configured ? '#16a34a' : '#d1d5db', flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: configured ? '#16a34a' : '#6b7280' }}>
            {configured ? 'Google Maps Connected' : 'Not configured'}
          </span>
        </div>

        {/* Setup guide */}
        <div style={{ background: '#f8faff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', margin: '0 0 10px' }}>Quick Setup Guide</p>
          <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              <>Go to <strong>console.cloud.google.com</strong> and create or select a project</>,
              'Enable "Maps JavaScript API" and "Places API" from APIs & Services → Library',
              'Go to APIs & Services → Credentials → Create Credentials → API Key',
              'Restrict the key to "Maps JavaScript API" and "Places API" (recommended)',
              'Copy the key and paste it below, then click Test Connection',
              <>Add <code style={{ fontSize: 12, background: '#eff6ff', padding: '1px 5px', borderRadius: 4 }}>VITE_GOOGLE_MAPS_API_KEY=your_key</code> to your <code style={{ fontSize: 12, background: '#eff6ff', padding: '1px 5px', borderRadius: 4 }}>.env</code> file for permanent use</>,
            ].map((step, i) => (
              <li key={i} style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{step}</li>
            ))}
          </ol>
        </div>

        {/* Key input */}
        <div style={{ marginBottom: 16 }}>
          <label style={LB}>API Key</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={mapsKey}
              onChange={e => { setMapsKey(e.target.value); setTestStatus(null) }}
              placeholder="AIzaSy…"
              style={{ ...INP, flex: 1, fontFamily: showKey ? 'inherit' : 'monospace' }}
            />
            <button
              type="button"
              onClick={() => setShowKey(s => !s)}
              style={{ height: 38, padding: '0 12px', background: '#f3f4f6', border: '1px solid #e8e9ec', borderRadius: 7, cursor: 'pointer', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '5px 0 0' }}>
            Stored locally in your browser. To persist across sessions, add it to your <code style={{ fontSize: 11 }}>.env</code> file.
          </p>
        </div>

        {/* Test button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={handleTestMaps}
            disabled={testStatus === 'testing'}
            style={{ height: 38, padding: '0 18px', background: '#f8faff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {testStatus === 'testing'
              ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Testing…</>
              : 'Test Connection'
            }
          </button>
          {testStatus && testStatus !== 'testing' && (
            <span style={{ fontSize: 13, color: testStatus === 'ok' ? '#16a34a' : '#dc2626', fontWeight: 500 }}>
              {testStatus === 'ok' ? '✓' : '✗'} {testMsg}
            </span>
          )}
        </div>
      </div>

      {/* ── What Google Maps enables ─────────────────────────────────────────── */}
      <div style={{ background: '#fafafa', border: '1px solid #e8e9ec', borderRadius: 10, padding: '16px 20px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px' }}>Features Unlocked</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { icon: '📍', title: 'Address Autocomplete', desc: 'Smart address suggestions when adding clients, jobs, or requests — auto-fills city, state, and ZIP.' },
            { icon: '🗺️', title: 'Route Optimizer', desc: 'Optimize daily job routes using Google Directions API for real drive-time calculation.' },
            { icon: '📡', title: 'Tech Location Map', desc: 'Live technician positions on the Scheduler map panel, updated every 30 seconds.' },
          ].map(f => (
            <div key={f.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23', margin: '0 0 2px' }}>{f.title}</p>
                <p style={{ fontSize: 12.5, color: '#6b7280', margin: 0 }}>{f.desc}</p>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 10, flexShrink: 0,
                background: configured ? '#f0fdf4' : '#f3f4f6', color: configured ? '#16a34a' : '#9ca3af' }}>
                {configured ? 'Active' : 'Needs key'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Tab 8 — Reviews ───────────────────────────────────────────────────────────
function ReviewsTab({ settings, onSave }) {
  const rev0 = { ...DEFAULT_REVIEW_SETTINGS, ...(settings.reviews || {}) }
  const [rev,       setRev]       = useState(rev0)
  const [preview,   setPreview]   = useState(false)
  const [testStatus, setTestStatus] = useState(null)

  function set(f, v) { setRev(p => ({ ...p, [f]: v })) }

  function handleSave() {
    onSave({ ...settings, reviews: rev }, 'Reviews')
  }

  const DELAY_OPTIONS = [
    { value: 'immediately',  label: 'Immediately after completion' },
    { value: '30min',        label: '30 minutes after completion'  },
    { value: '1hour',        label: '1 hour after completion'      },
    { value: '2hours',       label: '2 hours after completion'     },
    { value: '24hours',      label: '24 hours after completion'    },
    { value: 'next_morning', label: 'Next morning at 9:00 AM'      },
  ]
  const DAY_OPTIONS = [
    { value: 30,  label: '30 days'  },
    { value: 60,  label: '60 days'  },
    { value: 90,  label: '90 days'  },
    { value: 180, label: '180 days' },
    { value: 365, label: '1 year'   },
  ]

  const smsPreview = replacePlaceholders(rev.smsTemplate, {
    client_name:   'Martha',
    company_name:  settings.company?.name || 'CustomsFieldPro Services',
    tech_name:     'D. Moore',
    review_link:   rev.googleReviewUrl || 'https://g.page/r/your-review-link',
    job_number:    'JOB-0042',
  })
  const smsLen = (rev.smsTemplate || '').length

  function testLink() {
    if (!rev.googleReviewUrl) { setTestStatus('nourl'); return }
    window.open(rev.googleReviewUrl, '_blank')
    setTestStatus('opened')
    setTimeout(() => setTestStatus(null), 3000)
  }

  const rowStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '13px 16px', border: '1px solid #e8e9ec', borderRadius: 10,
    background: '#fafafa',
  }

  return (
    <div>
      {/* ── Google Business Profile ────────────────────────────────── */}
      <SectionHead title="Google Business Profile" />
      <div style={{ marginBottom: 20 }}>
        <label style={LB}>Google Review URL</label>
        <p style={{ fontSize: 12.5, color: '#9ca3af', margin: '0 0 8px' }}>
          Paste your Google review link (from Google Business Profile → "Get more reviews").
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={rev.googleReviewUrl}
            onChange={e => set('googleReviewUrl', e.target.value)}
            placeholder="https://g.page/r/your-link/review"
            style={{ ...INP, flex: 1 }}
          />
          <button onClick={testLink} style={{ ...BTN_GHOST, whiteSpace: 'nowrap', height: 38 }}>
            {testStatus === 'opened' ? '✓ Opened' : 'Test Link'}
          </button>
        </div>
        {testStatus === 'nourl' && (
          <p style={{ fontSize: 12.5, color: '#dc2626', margin: '5px 0 0' }}>Please enter a Google Review URL first.</p>
        )}
        {rev.googleReviewUrl && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
            <span style={{ fontSize: 12.5, color: '#16a34a', fontWeight: 600 }}>Review URL configured</span>
          </div>
        )}
      </div>

      <div style={{ height: 1, background: '#f0f1f3', margin: '20px 0' }} />

      {/* ── Automation Toggles ─────────────────────────────────────── */}
      <SectionHead title="Review Request Automation" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        <div style={{ ...rowStyle, background: rev.enabled ? '#f8faff' : '#fafafa' }}>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23', margin: '0 0 2px' }}>Enable Automatic Review Requests</p>
            <p style={{ fontSize: 12.5, color: '#9ca3af', margin: 0 }}>Automatically send review requests when a job is completed</p>
          </div>
          <Toggle checked={!!rev.enabled} onChange={v => set('enabled', v)} />
        </div>
        <div style={{ ...rowStyle, opacity: rev.enabled ? 1 : 0.5 }}>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23', margin: '0 0 2px' }}>Send via SMS</p>
            <p style={{ fontSize: 12.5, color: '#9ca3af', margin: 0 }}>Send review request as a text message to the client's phone</p>
          </div>
          <Toggle checked={!!rev.sendViaSMS} onChange={v => set('sendViaSMS', v)} />
        </div>
        <div style={{ ...rowStyle, opacity: rev.enabled ? 1 : 0.5 }}>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23', margin: '0 0 2px' }}>Send via Email</p>
            <p style={{ fontSize: 12.5, color: '#9ca3af', margin: 0 }}>Send review request to the client's email address</p>
          </div>
          <Toggle checked={!!rev.sendViaEmail} onChange={v => set('sendViaEmail', v)} />
        </div>
        <div style={{ ...rowStyle, opacity: rev.enabled ? 1 : 0.5 }}>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23', margin: '0 0 2px' }}>Only for High Ratings (4–5 stars)</p>
            <p style={{ fontSize: 12.5, color: '#9ca3af', margin: 0 }}>Skip review requests for jobs rated 3 stars or below</p>
          </div>
          <Toggle checked={!!rev.onlyHighRatings} onChange={v => set('onlyHighRatings', v)} />
        </div>
      </div>

      {/* ── Timing & Frequency ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, opacity: rev.enabled ? 1 : 0.5 }}>
        <div>
          <label style={LB}>Send Delay</label>
          <select value={rev.sendAfter} onChange={e => set('sendAfter', e.target.value)} style={SEL}>
            {DELAY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={LB}>Don't Re-send If Sent Within</label>
          <select value={rev.skipIfRecentDays} onChange={e => set('skipIfRecentDays', Number(e.target.value))} style={SEL}>
            {DAY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ height: 1, background: '#f0f1f3', margin: '20px 0' }} />

      {/* ── SMS Template ──────────────────────────────────────────── */}
      <SectionHead title="SMS Template" />
      <p style={{ fontSize: 12.5, color: '#9ca3af', margin: '-10px 0 12px' }}>
        Available variables: <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>{'{{client_name}}'}</code>{' '}
        <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>{'{{company_name}}'}</code>{' '}
        <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>{'{{tech_name}}'}</code>{' '}
        <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>{'{{review_link}}'}</code>
      </p>
      <div style={{ position: 'relative' }}>
        <textarea
          value={rev.smsTemplate}
          onChange={e => set('smsTemplate', e.target.value)}
          rows={5}
          style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e8e9ec', borderRadius: 7, padding: '10px 12px', fontSize: 13.5, color: '#374151', resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
        />
        <span style={{
          position: 'absolute', bottom: 10, right: 12, fontSize: 11.5, fontWeight: 600,
          color: smsLen > 320 ? '#dc2626' : smsLen > 160 ? '#d97706' : '#9ca3af',
        }}>
          {smsLen} chars {smsLen > 160 ? `(${Math.ceil(smsLen / 160)} SMS)` : '(1 SMS)'}
        </span>
      </div>

      {/* ── Email Subject ─────────────────────────────────────────── */}
      <div style={{ marginTop: 16 }}>
        <label style={LB}>Email Subject</label>
        <input
          value={rev.emailSubject}
          onChange={e => set('emailSubject', e.target.value)}
          placeholder="How did we do, {{client_name}}? ⭐"
          style={INP}
        />
      </div>

      {/* ── Preview ───────────────────────────────────────────────── */}
      <div style={{ marginTop: 20 }}>
        <button onClick={() => setPreview(p => !p)} style={{ ...BTN_GHOST, height: 34, fontSize: 13 }}>
          {preview ? 'Hide Preview' : 'Preview SMS Message'}
        </button>
        {preview && (
          <div style={{ marginTop: 14, background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 10, padding: '16px 18px' }}>
            <p style={{ fontSize: 11.5, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>Preview — as seen by client</p>
            <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 8, padding: '12px 14px', fontSize: 13.5, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {smsPreview}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f0f1f3' }}>
        <button onClick={handleSave} style={BTN}>Save Review Settings</button>
      </div>
    </div>
  )
}

// ── Tab 9 — Field Rules ───────────────────────────────────────────────────────
function FieldRulesTab({ settings, onSave }) {
  const [rules, setRules] = useState({ ...DEFAULT_FIELD_RULES, ...(settings.fieldRules || {}) })

  function toggle(key) { setRules(r => ({ ...r, [key]: !r[key] })) }
  function setNum(key, val) {
    const n = parseInt(val, 10)
    if (!isNaN(n) && n >= 0) setRules(r => ({ ...r, [key]: n }))
  }

  function handleSave() {
    onSave({ ...settings, fieldRules: rules }, 'Field Rules')
  }

  function RuleToggle({ label, desc, k }) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '12px 0', borderBottom: '1px solid #f0f1f3' }}>
        <div>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23', margin: '0 0 3px' }}>{label}</p>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{desc}</p>
        </div>
        <button type="button" onClick={() => toggle(k)}
          style={{
            flexShrink: 0, width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: rules[k] ? '#2563eb' : '#d1d5db', position: 'relative', transition: 'background 0.2s',
          }}>
          <span style={{
            position: 'absolute', top: 3, left: rules[k] ? 22 : 2, width: 18, height: 18,
            borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
      </div>
    )
  }

  function NumField({ label, desc, k, unit = 'minutes' }) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '12px 0', borderBottom: '1px solid #f0f1f3' }}>
        <div>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23', margin: '0 0 3px' }}>{label}</p>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{desc}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <input type="number" min={0} value={rules[k]}
            onChange={e => setNum(k, e.target.value)}
            style={{ width: 72, height: 34, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 10px', fontSize: 13.5, textAlign: 'right', outline: 'none' }} />
          <span style={{ fontSize: 12, color: '#9ca3af' }}>{unit}</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <SectionHead title="Photo Requirements" />
      <RuleToggle k="requireBeforePhotos"       label="Require Before Photos"        desc="Technician must upload at least 1 before photo to complete a job." />
      <RuleToggle k="requireAfterPhotos"        label="Require After Photos"         desc="Technician must upload at least 1 after photo to complete a job." />
      <RuleToggle k="requirePhotosForDiagnosis" label="Require Diagnosis Photos"     desc="Technician must upload at least 1 photo when submitting a diagnosis report." />
      <RuleToggle k="requirePhotosForParts"     label="Require Parts Photos"         desc="Technician must upload a photo when confirming parts received." />
      <div style={{ padding: '12px 0', borderBottom: '1px solid #f0f1f3', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23', margin: '0 0 3px' }}>Minimum Photos Required</p>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Minimum number of photos needed to satisfy any photo requirement.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <input type="number" min={1} value={rules.minPhotos}
            onChange={e => setNum('minPhotos', e.target.value)}
            style={{ width: 72, height: 34, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 10px', fontSize: 13.5, textAlign: 'right', outline: 'none' }} />
          <span style={{ fontSize: 12, color: '#9ca3af' }}>photos</span>
        </div>
      </div>

      <SectionHead title="Job Lock Rules" />
      <RuleToggle k="lockNextJobUntilSubmitted" label="Lock Next Job Until Submitted" desc="Prevent technicians from accessing other jobs until the current one is fully submitted." />
      <RuleToggle k="lockForInProgress"         label="Lock When In Progress"          desc="Lock other jobs when a job is marked In Progress and not yet submitted." />
      <RuleToggle k="lockForDiagnosisRequired"  label="Lock When Diagnosis Required"   desc="Lock other jobs when a diagnosis report is pending." />
      <RuleToggle k="lockForPartsReceived"      label="Lock When Parts Received"       desc="Lock other jobs until the technician confirms parts receipt." />

      <SectionHead title="Notification Rules" />
      <NumField k="remindTechAfterMinutes"   label="Remind Tech After"        desc="Send an in-app reminder to the technician after this many minutes of inactivity on an active job." />
      <NumField k="notifyAdminAfterMinutes"  label="Notify Admin After"       desc="Notify the admin if a job submission is overdue by this many minutes." />
      <NumField k="gracePeriodMinutes"       label="Grace Period"             desc="Allow this many minutes before counting a job as overdue for notification purposes." />
      <RuleToggle k="sendSmsReminder"        label="Send SMS Reminders"       desc="Send an SMS text message reminder to the technician for overdue submissions (requires SMS integration)." />

      <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f0f1f3' }}>
        <button onClick={handleSave} style={BTN}>Save Field Rules</button>
      </div>
    </div>
  )
}

// ── Tab 10 — Signatures ───────────────────────────────────────────────────────
const SIG_DEFAULTS = {
  requireClientSig:   true,
  requireTechSig:     true,
  requireQuoteSig:    true,
  requireInvoiceSig:  false,
  clientAgreementText: 'I confirm that the work described has been completed to my satisfaction and authorize payment for services rendered.',
  techCertText:        'I certify that all work was performed according to industry standards, company policies, and any applicable local codes.',
  quoteLegalText:      'By signing, I approve this quote and authorize the work to proceed as described above.',
}

function SignaturesTab({ settings, onSave }) {
  const [cfg, setCfg] = useState(() => ({ ...SIG_DEFAULTS, ...(settings.signatures || {}) }))
  const [saved, setSaved] = useState(false)
  const [previewSig, setPreviewSig] = useState('')

  function set(k, v) { setCfg(p => ({ ...p, [k]: v })) }

  function handleSave() {
    onSave({ ...settings, signatures: cfg }, 'Signatures')
    setSaved(true)
    setTimeout(() => setSaved(false), 2800)
  }

  const toggleRow = (k, label, desc) => (
    <div key={k} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: '1px solid #f0f1f3' }}>
      <div>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23', margin: '0 0 2px' }}>{label}</p>
        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{desc}</p>
      </div>
      <Toggle checked={!!cfg[k]} onChange={v => set(k, v)} />
    </div>
  )

  return (
    <div>
      <SavedBanner show={saved} />
      <SectionHead title="Signature Requirements" />
      {toggleRow('requireClientSig',  'Require Client Signature on Job Completion', 'Client must sign before job can be marked complete.')}
      {toggleRow('requireTechSig',    'Require Technician Signature on Job Completion', 'Technician must certify work before submitting completion.')}
      {toggleRow('requireQuoteSig',   'Require Signature to Approve Quotes', 'Client must sign quote before work can begin.')}
      {toggleRow('requireInvoiceSig', 'Require Signature to Authorize Payment', 'Collect a signature when presenting an invoice for payment.')}

      <div style={{ height: 1, background: '#f0f1f3', margin: '24px 0' }} />
      <SectionHead title="Agreement Text Templates" />
      <p style={{ fontSize: 12.5, color: '#9ca3af', margin: '-10px 0 16px' }}>These texts appear above the signature canvas and become part of the signed document.</p>

      {[
        { k: 'clientAgreementText', label: 'Client Confirmation Statement' },
        { k: 'techCertText',        label: 'Technician Certification Statement' },
        { k: 'quoteLegalText',      label: 'Quote Approval Statement' },
      ].map(({ k, label }) => (
        <div key={k} style={{ marginBottom: 16 }}>
          <label style={LB}>{label}</label>
          <textarea
            value={cfg[k] || ''}
            onChange={e => set(k, e.target.value)}
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e8e9ec', borderRadius: 7, padding: '10px 12px', fontSize: 13.5, color: '#374151', resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
          />
        </div>
      ))}

      <div style={{ height: 1, background: '#f0f1f3', margin: '24px 0' }} />
      <SectionHead title="Signature Preview" />
      <p style={{ fontSize: 12.5, color: '#9ca3af', margin: '-10px 0 16px' }}>Test how the signature canvas looks and feels.</p>
      <SignatureCapture
        title="Test Signature"
        subtitle="Try it out"
        onSign={url => setPreviewSig(url || '')}
        onClear={() => setPreviewSig('')}
        existingSignature={previewSig}
      />
      {previewSig && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12.5, color: '#15803d', fontWeight: 500 }}>
          ✓ Signature captured — {Math.round(previewSig.length / 1024)}KB PNG
        </div>
      )}

      <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f0f1f3' }}>
        <button onClick={handleSave} style={BTN}>Save Signature Settings</button>
      </div>
    </div>
  )
}

// ── Tab 11 — Customize ────────────────────────────────────────────────────────
const CUSTOMIZE_TABS = ['Services & Job Types', 'Equipment Types', 'Job Statuses', 'Custom Fields', 'Notification Templates', 'Invoice & Quote', 'Business Hours', 'Branding', 'Integrations']
const STATUS_COLORS = ['#6b7280','#2563eb','#d97706','#7c3aed','#16a34a','#dc2626','#0891b2','#db2777','#ea580c']
const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
const DAY_LABELS = { monday:'Mon',tuesday:'Tue',wednesday:'Wed',thursday:'Thu',friday:'Fri',saturday:'Sat',sunday:'Sun' }
const FIELD_TYPES = ['text','number','date','dropdown','checkbox','textarea']

function CustomizeTab() {
  const [sub, setSub] = useState('Services & Job Types')
  const { config, update } = useTenantConfig('default', 'General')
  const [saved, setSaved] = useState(false)

  function persist(section, value) {
    update(section, value)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div>
      <SavedBanner show={saved} />
      {/* Sub-tab bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 24, padding: '4px', background: '#f3f4f6', borderRadius: 10 }}>
        {CUSTOMIZE_TABS.map(t => (
          <button key={t} onClick={() => setSub(t)} style={{
            padding: '7px 14px', fontSize: 12.5, fontWeight: sub === t ? 700 : 500,
            color: sub === t ? '#fff' : '#6b7280', background: sub === t ? '#2563eb' : 'transparent',
            border: 'none', borderRadius: 7, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
          }}>{t}</button>
        ))}
      </div>

      {sub === 'Services & Job Types'      && <CstServicesTab config={config} persist={persist} />}
      {sub === 'Equipment Types'           && <CstEquipmentTab config={config} persist={persist} />}
      {sub === 'Job Statuses'              && <CstStatusesTab config={config} persist={persist} />}
      {sub === 'Custom Fields'             && <CstCustomFieldsTab config={config} persist={persist} />}
      {sub === 'Notification Templates'    && <CstNotificationsTab config={config} persist={persist} />}
      {sub === 'Invoice & Quote'           && <CstInvoiceQuoteTab config={config} persist={persist} />}
      {sub === 'Business Hours'            && <CstBusinessHoursTab config={config} persist={persist} />}
      {sub === 'Branding'                  && <CstBrandingTab config={config} persist={persist} />}
      {sub === 'Integrations'              && <CstIntegrationsTab config={config} persist={persist} />}
    </div>
  )
}

function CstServicesTab({ config, persist }) {
  const [items, setItems] = useState(config.services || [])
  const [adding, setAdding] = useState(false)
  const [blank, setBlank] = useState({ name: '', rate: '', unit: 'job', taxable: true })
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({})

  function save() { persist('services', items) }

  function add() {
    if (!blank.name.trim()) return
    const next = [...items, { ...blank, id: uid(), rate: parseFloat(blank.rate) || 0 }]
    setItems(next)
    persist('services', next)
    setBlank({ name: '', rate: '', unit: 'job', taxable: true })
    setAdding(false)
  }

  function remove(id) { const next = items.filter(x => x.id !== id); setItems(next); persist('services', next) }

  function saveEdit() {
    const next = items.map(x => x.id === editId ? { ...editData, rate: parseFloat(editData.rate) || 0 } : x)
    setItems(next); persist('services', next); setEditId(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Services & Job Types</p>
        <button onClick={() => setAdding(true)} style={BTN}>+ Add Service</button>
      </div>
      {adding && (
        <div style={{ background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: 10, alignItems: 'end' }}>
            <div>
              <label style={LB}>Service Name</label>
              <input value={blank.name} onChange={e => setBlank(p => ({ ...p, name: e.target.value }))} placeholder="e.g. AC Repair" style={INP} />
            </div>
            <div>
              <label style={LB}>Default Rate ($)</label>
              <input type="number" value={blank.rate} onChange={e => setBlank(p => ({ ...p, rate: e.target.value }))} placeholder="0.00" style={INP} />
            </div>
            <div>
              <label style={LB}>Unit</label>
              <select value={blank.unit} onChange={e => setBlank(p => ({ ...p, unit: e.target.value }))} style={SEL}>
                {['job','hour','sqft','each','day'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 2 }}>
              <input type="checkbox" id="taxable-new" checked={blank.taxable} onChange={e => setBlank(p => ({ ...p, taxable: e.target.checked }))} />
              <label htmlFor="taxable-new" style={{ fontSize: 12.5, color: '#374151' }}>Taxable</label>
            </div>
            <div style={{ display: 'flex', gap: 6, paddingBottom: 2 }}>
              <button onClick={add} style={BTN}>Save</button>
              <button onClick={() => setAdding(false)} style={BTN_GHOST}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ border: '1px solid #e8e9ec', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Service Name','Rate','Unit','Taxable',''].map(h => (
                <th key={h} style={{ padding: '10px 14px', fontSize: 11.5, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'left', borderBottom: '1px solid #e8e9ec' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>No services yet.</td></tr>
            )}
            {items.map((item) => editId === item.id ? (
              <tr key={item.id} style={{ background: '#f8faff' }}>
                <td style={TD}><input value={editData.name || ''} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} style={{ ...INP, height: 32 }} /></td>
                <td style={TD}><input type="number" value={editData.rate || ''} onChange={e => setEditData(p => ({ ...p, rate: e.target.value }))} style={{ ...INP, height: 32 }} /></td>
                <td style={TD}><select value={editData.unit || 'job'} onChange={e => setEditData(p => ({ ...p, unit: e.target.value }))} style={{ ...SEL, height: 32 }}>{['job','hour','sqft','each','day'].map(u => <option key={u}>{u}</option>)}</select></td>
                <td style={TD}><input type="checkbox" checked={!!editData.taxable} onChange={e => setEditData(p => ({ ...p, taxable: e.target.checked }))} /></td>
                <td style={TD}>
                  <button onClick={saveEdit} style={{ ...BTN, height: 30, padding: '0 12px', fontSize: 12 }}>Save</button>
                  <button onClick={() => setEditId(null)} style={{ ...BTN_GHOST, height: 30, padding: '0 10px', fontSize: 12, marginLeft: 4 }}>×</button>
                </td>
              </tr>
            ) : (
              <tr key={item.id} style={{ borderBottom: '1px solid #f0f1f3' }}>
                <td style={TD}>{item.name}</td>
                <td style={TD}>${(item.rate || 0).toFixed(2)}</td>
                <td style={TD}>{item.unit || 'job'}</td>
                <td style={TD}>{item.taxable ? '✓' : '—'}</td>
                <td style={{ ...TD, textAlign: 'right' }}>
                  <button onClick={() => { setEditId(item.id); setEditData({ ...item }) }} style={BTN_ICON} title="Edit">✏️</button>
                  <button onClick={() => remove(item.id)} style={{ ...BTN_ICON, color: '#dc2626' }} title="Remove">🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CstEquipmentTab({ config, persist }) {
  const [items, setItems] = useState(config.equipmentTypes || [])
  const [name, setName] = useState('')
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')

  function add() {
    if (!name.trim()) return
    const next = [...items, { id: uid(), name: name.trim() }]
    setItems(next); persist('equipmentTypes', next); setName('')
  }

  function remove(id) { const next = items.filter(x => x.id !== id); setItems(next); persist('equipmentTypes', next) }

  function saveEdit() {
    const next = items.map(x => x.id === editId ? { ...x, name: editName } : x)
    setItems(next); persist('equipmentTypes', next); setEditId(null)
  }

  return (
    <div>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1d23', margin: '0 0 16px' }}>Equipment Types</p>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="e.g. Central AC Unit" style={{ ...INP, flex: 1 }} />
        <button onClick={add} style={BTN}>+ Add</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.length === 0 && <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>No equipment types yet.</p>}
        {items.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid #e8e9ec', borderRadius: 8, background: '#fff' }}>
            {editId === item.id ? (
              <>
                <input value={editName} onChange={e => setEditName(e.target.value)} style={{ ...INP, flex: 1, height: 32 }} />
                <button onClick={saveEdit} style={{ ...BTN, height: 30, padding: '0 12px', fontSize: 12 }}>Save</button>
                <button onClick={() => setEditId(null)} style={{ ...BTN_GHOST, height: 30, padding: '0 10px', fontSize: 12 }}>Cancel</button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontSize: 13.5, color: '#374151' }}>{item.name}</span>
                <button onClick={() => { setEditId(item.id); setEditName(item.name) }} style={BTN_ICON} title="Edit">✏️</button>
                <button onClick={() => remove(item.id)} style={{ ...BTN_ICON, color: '#dc2626' }} title="Remove">🗑</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function CstStatusesTab({ config, persist }) {
  const [statuses, setStatuses] = useState(config.jobStatuses || [])
  const [adding, setAdding] = useState(false)
  const [blank, setBlank] = useState({ name: '', color: '#6b7280' })

  function add() {
    if (!blank.name.trim()) return
    const next = [...statuses, { ...blank, id: uid(), order: statuses.length + 1 }]
    setStatuses(next); persist('jobStatuses', next); setBlank({ name: '', color: '#6b7280' }); setAdding(false)
  }

  function remove(id) { const next = statuses.filter(x => x.id !== id); setStatuses(next); persist('jobStatuses', next) }

  function moveUp(idx) {
    if (idx === 0) return
    const next = [...statuses]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    setStatuses(next); persist('jobStatuses', next)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Job Statuses</p>
        <button onClick={() => setAdding(true)} style={BTN}>+ Add Status</button>
      </div>
      {adding && (
        <div style={{ background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={LB}>Status Name</label>
              <input value={blank.name} onChange={e => setBlank(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Awaiting Parts" style={INP} />
            </div>
            <div>
              <label style={LB}>Color</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
                {STATUS_COLORS.map(c => (
                  <button key={c} onClick={() => setBlank(p => ({ ...p, color: c }))} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', outline: blank.color === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />
                ))}
              </div>
            </div>
            <button onClick={add} style={BTN}>Save</button>
            <button onClick={() => setAdding(false)} style={BTN_GHOST}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {statuses.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid #e8e9ec', borderRadius: 8, background: '#fff' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13.5, color: '#374151', fontWeight: 500 }}>{s.name}</span>
            <button onClick={() => moveUp(i)} disabled={i === 0} style={{ ...BTN_ICON, opacity: i === 0 ? 0.3 : 1 }} title="Move up">↑</button>
            <button onClick={() => remove(s.id)} style={{ ...BTN_ICON, color: '#dc2626' }} title="Remove">🗑</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function CstCustomFieldsTab({ config, persist }) {
  const [fields, setFields] = useState(config.customFields || [])
  const [adding, setAdding] = useState(false)
  const [blank, setBlank] = useState({ label: '', type: 'text', required: false, placeholder: '', options: '' })

  function add() {
    if (!blank.label.trim()) return
    const next = [...fields, { ...blank, id: uid(), options: blank.options.split(',').map(s => s.trim()).filter(Boolean) }]
    setFields(next); persist('customFields', next)
    setBlank({ label: '', type: 'text', required: false, placeholder: '', options: '' }); setAdding(false)
  }

  function remove(id) { const next = fields.filter(x => x.id !== id); setFields(next); persist('customFields', next) }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Custom Fields</p>
          <p style={{ fontSize: 12.5, color: '#9ca3af', margin: '2px 0 0' }}>Add custom fields to job forms, client profiles, and work orders.</p>
        </div>
        <button onClick={() => setAdding(true)} style={BTN}>+ Add Field</button>
      </div>
      {adding && (
        <div style={{ background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={LB}>Field Label</label>
              <input value={blank.label} onChange={e => setBlank(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Permit Number" style={INP} />
            </div>
            <div>
              <label style={LB}>Field Type</label>
              <select value={blank.type} onChange={e => setBlank(p => ({ ...p, type: e.target.value }))} style={SEL}>
                {FIELD_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={LB}>Placeholder</label>
              <input value={blank.placeholder} onChange={e => setBlank(p => ({ ...p, placeholder: e.target.value }))} placeholder="Hint text" style={INP} />
            </div>
          </div>
          {blank.type === 'dropdown' && (
            <div style={{ marginBottom: 12 }}>
              <label style={LB}>Options (comma-separated)</label>
              <input value={blank.options} onChange={e => setBlank(p => ({ ...p, options: e.target.value }))} placeholder="Option A, Option B, Option C" style={INP} />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
              <input type="checkbox" checked={blank.required} onChange={e => setBlank(p => ({ ...p, required: e.target.checked }))} />
              Required field
            </label>
            <button onClick={add} style={BTN}>Save Field</button>
            <button onClick={() => setAdding(false)} style={BTN_GHOST}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {fields.length === 0 && <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>No custom fields yet.</p>}
        {fields.map(f => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid #e8e9ec', borderRadius: 8, background: '#fff' }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#f3f4f6', color: '#6b7280', textTransform: 'uppercase' }}>{f.type}</span>
            <span style={{ flex: 1, fontSize: 13.5, color: '#374151', fontWeight: 500 }}>{f.label}</span>
            {f.required && <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>required</span>}
            <button onClick={() => remove(f.id)} style={{ ...BTN_ICON, color: '#dc2626' }}>🗑</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function CstNotificationsTab({ config, persist }) {
  const [templates, setTemplates] = useState(config.notificationTemplates || {})
  const [active, setActive] = useState('jobConfirmation')
  const TMPL_KEYS = [
    { key: 'jobConfirmation', label: 'Job Confirmation' },
    { key: 'jobReminder',     label: 'Job Reminder' },
    { key: 'invoiceSent',     label: 'Invoice Sent' },
    { key: 'quoteReady',      label: 'Quote Ready' },
  ]
  const VARS = '{{client_name}} {{company}} {{appointment_date}} {{time_window}} {{tech_name}} {{service_type}} {{invoice_total}} {{due_date}} {{payment_link}} {{quote_total}} {{quote_expiry}} {{quote_link}} {{invoice_number}} {{completion_date}}'

  function setField(k, v) {
    const next = { ...templates, [active]: { ...(templates[active] || {}), [k]: v } }
    setTemplates(next); persist('notificationTemplates', next)
  }

  const current = templates[active] || {}

  return (
    <div>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1d23', margin: '0 0 4px' }}>Notification Templates</p>
      <p style={{ fontSize: 12.5, color: '#9ca3af', margin: '0 0 16px' }}>
        Available variables: {VARS.split(' ').map(v => <code key={v} style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: 4, fontSize: 11, marginRight: 3 }}>{v}</code>)}
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {TMPL_KEYS.map(({ key, label }) => (
          <button key={key} onClick={() => setActive(key)} style={{
            padding: '7px 14px', fontSize: 12.5, fontWeight: active === key ? 700 : 500,
            color: active === key ? '#2563eb' : '#6b7280', background: active === key ? '#eff6ff' : '#f3f4f6',
            border: `1px solid ${active === key ? '#bfdbfe' : '#e8e9ec'}`, borderRadius: 7, cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={LB}>Subject Line</label>
        <input value={current.subject || ''} onChange={e => setField('subject', e.target.value)} placeholder="Email subject…" style={INP} />
      </div>
      <div>
        <label style={LB}>Message Body</label>
        <textarea
          value={current.body || ''}
          onChange={e => setField('body', e.target.value)}
          rows={8}
          style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e8e9ec', borderRadius: 7, padding: '10px 12px', fontSize: 13.5, color: '#374151', resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.6 }}
        />
      </div>
    </div>
  )
}

function CstInvoiceQuoteTab({ config, persist }) {
  const [inv, setInv] = useState(config.invoiceTemplate || {})
  const [qt,  setQt]  = useState(config.quoteTemplate   || {})

  function saveInv() { persist('invoiceTemplate', inv) }
  function saveQt()  { persist('quoteTemplate', qt) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Invoice */}
      <div style={{ border: '1px solid #e8e9ec', borderRadius: 10, padding: 20 }}>
        <SectionHead title="Invoice Template" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={LB}>Tax Rate (%)</label>
            <input type="number" value={inv.taxRate ?? 13} onChange={e => setInv(p => ({ ...p, taxRate: parseFloat(e.target.value) || 0 }))} style={{ ...INP, width: 120 }} />
          </div>
          <div>
            <label style={LB}>Currency</label>
            <select value={inv.currency || 'USD'} onChange={e => setInv(p => ({ ...p, currency: e.target.value }))} style={{ ...SEL, width: 140 }}>
              {['USD','EUR','GBP','CAD','AUD'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Toggle checked={!!inv.showLogo} onChange={v => setInv(p => ({ ...p, showLogo: v }))} />
            <span style={{ fontSize: 13, color: '#374151' }}>Show company logo</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Toggle checked={!!inv.showTax} onChange={v => setInv(p => ({ ...p, showTax: v }))} />
            <span style={{ fontSize: 13, color: '#374151' }}>Show tax line</span>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={LB}>Header Note</label>
          <textarea value={inv.headerNote || ''} onChange={e => setInv(p => ({ ...p, headerNote: e.target.value }))} rows={2} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e8e9ec', borderRadius: 7, padding: '8px 12px', fontSize: 13.5, color: '#374151', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={LB}>Footer Note</label>
          <textarea value={inv.footerNote || ''} onChange={e => setInv(p => ({ ...p, footerNote: e.target.value }))} rows={2} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e8e9ec', borderRadius: 7, padding: '8px 12px', fontSize: 13.5, color: '#374151', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }} />
        </div>
        <button onClick={saveInv} style={BTN}>Save Invoice Template</button>
      </div>

      {/* Quote */}
      <div style={{ border: '1px solid #e8e9ec', borderRadius: 10, padding: 20 }}>
        <SectionHead title="Quote Template" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={LB}>Validity (days)</label>
            <input type="number" value={qt.validityDays ?? 30} onChange={e => setQt(p => ({ ...p, validityDays: parseInt(e.target.value) || 30 }))} style={{ ...INP, width: 120 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Toggle checked={!!qt.showLogo} onChange={v => setQt(p => ({ ...p, showLogo: v }))} />
            <span style={{ fontSize: 13, color: '#374151' }}>Show company logo</span>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={LB}>Header Note</label>
          <textarea value={qt.headerNote || ''} onChange={e => setQt(p => ({ ...p, headerNote: e.target.value }))} rows={2} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e8e9ec', borderRadius: 7, padding: '8px 12px', fontSize: 13.5, color: '#374151', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={LB}>Footer Note</label>
          <textarea value={qt.footerNote || ''} onChange={e => setQt(p => ({ ...p, footerNote: e.target.value }))} rows={2} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e8e9ec', borderRadius: 7, padding: '8px 12px', fontSize: 13.5, color: '#374151', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }} />
        </div>
        <button onClick={saveQt} style={BTN}>Save Quote Template</button>
      </div>
    </div>
  )
}

function CstBusinessHoursTab({ config, persist }) {
  const [hours, setHours] = useState(config.businessHours || {})

  function setDay(day, field, value) {
    const next = { ...hours, [day]: { ...(hours[day] || {}), [field]: value } }
    setHours(next); persist('businessHours', next)
  }

  return (
    <div>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1d23', margin: '0 0 16px' }}>Business Hours</p>
      <div style={{ border: '1px solid #e8e9ec', borderRadius: 10, overflow: 'hidden' }}>
        {DAYS.map((day, i) => {
          const d = hours[day] || { open: false, from: '08:00', to: '17:00' }
          return (
            <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 18px', borderBottom: i < DAYS.length - 1 ? '1px solid #f0f1f3' : 'none', background: d.open ? '#fff' : '#fafafa' }}>
              <div style={{ width: 40, fontSize: 13, fontWeight: 600, color: '#374151' }}>{DAY_LABELS[day]}</div>
              <Toggle checked={!!d.open} onChange={v => setDay(day, 'open', v)} />
              {d.open ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="time" value={d.from || '08:00'} onChange={e => setDay(day, 'from', e.target.value)} style={{ height: 32, border: '1px solid #e8e9ec', borderRadius: 6, padding: '0 8px', fontSize: 13 }} />
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>to</span>
                  <input type="time" value={d.to || '17:00'} onChange={e => setDay(day, 'to', e.target.value)} style={{ height: 32, border: '1px solid #e8e9ec', borderRadius: 6, padding: '0 8px', fontSize: 13 }} />
                </div>
              ) : (
                <span style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>Closed</span>
              )}
            </div>
          )
        })}
      </div>
      <p style={{ fontSize: 12, color: '#9ca3af', margin: '10px 0 0' }}>Changes are saved automatically.</p>
    </div>
  )
}

function CstBrandingTab({ config, persist }) {
  const [brand, setBrand] = useState(config.branding || {})
  const [saved, setSaved] = useState(false)
  const BRAND_COLORS = ['#2563eb','#16a34a','#7c3aed','#dc2626','#d97706','#0891b2','#1a1d23','#db2777']

  function set(k, v) { setBrand(p => ({ ...p, [k]: v })) }

  function save() { persist('branding', brand); setSaved(true); setTimeout(() => setSaved(false), 2500) }

  return (
    <div>
      {saved && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: 8, padding: '10px 16px', fontSize: 13.5, fontWeight: 600, marginBottom: 16 }}>✓ Branding saved.</div>}
      <SectionHead title="Brand Colors" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div>
          <label style={LB}>Primary Color</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {BRAND_COLORS.map(c => (
              <button key={c} onClick={() => set('primaryColor', c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', outline: brand.primaryColor === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input type="color" value={brand.primaryColor || '#2563eb'} onChange={e => set('primaryColor', e.target.value)} style={{ width: 32, height: 32, border: '1px solid #e8e9ec', borderRadius: 6, padding: 2, cursor: 'pointer' }} />
            <input value={brand.primaryColor || '#2563eb'} onChange={e => set('primaryColor', e.target.value)} style={{ ...INP, width: 110, height: 32 }} />
          </div>
        </div>
        <div>
          <label style={LB}>Accent Color</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {BRAND_COLORS.map(c => (
              <button key={c} onClick={() => set('accentColor', c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', outline: brand.accentColor === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input type="color" value={brand.accentColor || '#16a34a'} onChange={e => set('accentColor', e.target.value)} style={{ width: 32, height: 32, border: '1px solid #e8e9ec', borderRadius: 6, padding: 2, cursor: 'pointer' }} />
            <input value={brand.accentColor || '#16a34a'} onChange={e => set('accentColor', e.target.value)} style={{ ...INP, width: 110, height: 32 }} />
          </div>
        </div>
      </div>

      <SectionHead title="Brand Identity" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
        <div>
          <label style={LB}>Logo URL</label>
          <input value={brand.logoUrl || ''} onChange={e => set('logoUrl', e.target.value)} placeholder="https://yourdomain.com/logo.png" style={INP} />
          {brand.logoUrl && <img src={brand.logoUrl} alt="Logo preview" onError={e => e.target.style.display='none'} style={{ marginTop: 8, height: 40, objectFit: 'contain', border: '1px solid #e8e9ec', borderRadius: 6, padding: 4, background: '#fff' }} />}
        </div>
        <div>
          <label style={LB}>Tagline</label>
          <input value={brand.tagline || ''} onChange={e => set('tagline', e.target.value)} placeholder="Your trusted service partner" style={INP} />
        </div>
        <div>
          <label style={LB}>Email Footer Text</label>
          <input value={brand.footerText || ''} onChange={e => set('footerText', e.target.value)} placeholder="© 2026 Your Company. All rights reserved." style={INP} />
        </div>
      </div>

      <button onClick={save} style={BTN}>Save Branding</button>
    </div>
  )
}

function CstIntegrationsTab({ config, persist }) {
  const [integ, setInteg] = useState(config.integrations || {})

  function setI(service, field, value) {
    const next = { ...integ, [service]: { ...(integ[service] || {}), [field]: value } }
    setInteg(next); persist('integrations', next)
  }

  const INTEGRATIONS = [
    { key: 'googleCalendar', name: 'Google Calendar', icon: '📅', desc: 'Sync jobs and appointments to Google Calendar.', fields: [{ k: 'calendarId', label: 'Calendar ID', placeholder: 'your-email@gmail.com' }] },
    { key: 'quickbooks',     name: 'QuickBooks',      icon: '📊', desc: 'Sync invoices and payments with QuickBooks Online.', fields: [{ k: 'apiKey', label: 'API Key', placeholder: 'QB-api-key…' }] },
    { key: 'stripe',         name: 'Stripe Payments', icon: '💳', desc: 'Accept credit card payments via Stripe.', fields: [{ k: 'publishableKey', label: 'Publishable Key', placeholder: 'pk_live_…' }] },
    { key: 'twilio',         name: 'Twilio SMS',      icon: '💬', desc: 'Send SMS notifications to clients and technicians.', fields: [{ k: 'accountSid', label: 'Account SID', placeholder: 'ACxxxxxxx' }, { k: 'authToken', label: 'Auth Token', placeholder: '••••••••' }, { k: 'fromNumber', label: 'From Number', placeholder: '+15551234567' }] },
    { key: 'sendgrid',       name: 'SendGrid Email',  icon: '📧', desc: 'Send transactional emails via SendGrid.', fields: [{ k: 'apiKey', label: 'API Key', placeholder: 'SG.…' }, { k: 'fromEmail', label: 'From Email', placeholder: 'noreply@yourdomain.com' }] },
    { key: 'zapier',         name: 'Zapier',          icon: '⚡', desc: 'Connect CustomsFieldPro to 5,000+ apps via Zapier webhook.', fields: [{ k: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://hooks.zapier.com/…' }] },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {INTEGRATIONS.map(({ key, name, icon, desc, fields }) => {
        const cfg = integ[key] || {}
        const enabled = !!cfg.enabled
        return (
          <div key={key} style={{ border: `1px solid ${enabled ? '#bfdbfe' : '#e8e9ec'}`, borderRadius: 10, overflow: 'hidden', background: enabled ? '#f8faff' : '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: enabled ? '1px solid #dbeafe' : 'none' }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1d23', margin: 0 }}>{name}</p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{desc}</p>
              </div>
              <Toggle checked={enabled} onChange={v => setI(key, 'enabled', v)} />
            </div>
            {enabled && (
              <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {fields.map(f => (
                  <div key={f.k}>
                    <label style={LB}>{f.label}</label>
                    <input
                      type={f.k.toLowerCase().includes('token') || f.k.toLowerCase().includes('key') || f.k.toLowerCase().includes('secret') ? 'password' : 'text'}
                      value={cfg[f.k] || ''}
                      onChange={e => setI(key, f.k, e.target.value)}
                      placeholder={f.placeholder}
                      style={INP}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
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
