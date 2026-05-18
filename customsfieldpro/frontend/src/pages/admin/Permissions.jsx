import { useState } from 'react'
import { STAFF_PERMS, TECH_PERMS, readPermissions, writePermissions, getDefaultPermissions } from '../../data/permissions'
import { logActivity, ACTIONS } from '../../utils/activityLog'

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({ on, onChange, locked }) {
  return (
    <button
      type="button"
      onClick={locked ? undefined : onChange}
      title={locked ? 'This permission is required and cannot be changed' : undefined}
      style={{
        width: 40, height: 22, borderRadius: 11, flexShrink: 0,
        background: on ? '#2563eb' : '#d1d5db',
        border: 'none', padding: 0,
        cursor: locked ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background 0.18s',
        opacity: locked ? 0.7 : 1,
      }}>
      <span style={{
        position: 'absolute', top: 2,
        left: on ? 20 : 2,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left 0.15s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
        display: 'block',
      }} />
    </button>
  )
}

// ─── Admin checkmark row ──────────────────────────────────────────────────────

function AdminRow({ label, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 18px', borderBottom: '1px solid #f8f9fa' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23', margin: 0 }}>{label}</p>
        <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0', lineHeight: 1.5 }}>{desc}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>Always on</span>
      </div>
    </div>
  )
}

// ─── Toggleable permission row ────────────────────────────────────────────────

function PermRow({ perm, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 18px', borderBottom: '1px solid #f8f9fa' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23', margin: 0 }}>
          {perm.label}
          {perm.locked && (
            <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 700, background: '#f3f4f6', color: '#9ca3af', padding: '1px 6px', borderRadius: 8 }}>
              LOCKED
            </span>
          )}
        </p>
        <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0', lineHeight: 1.5 }}>{perm.desc}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, paddingTop: 2 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: value ? '#2563eb' : '#9ca3af', minWidth: 22, textAlign: 'right' }}>
          {value ? 'On' : 'Off'}
        </span>
        <Toggle on={value} onChange={onChange} locked={!!perm.locked} />
      </div>
    </div>
  )
}

// ─── Column wrapper ───────────────────────────────────────────────────────────

function Column({ title, subtitle, accentColor, headerIcon, children, footer }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: '18px 18px 16px', borderBottom: '2px solid #f0f1f3', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: accentColor + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {headerIcon}
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: 0 }}>{title}</h3>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '3px 0 0', lineHeight: 1.5 }}>{subtitle}</p>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      {footer && (
        <div style={{ padding: '14px 18px', borderTop: '1px solid #f0f1f3' }}>{footer}</div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Permissions() {
  const [perms, setPerms] = useState(() => readPermissions())
  const [saved, setSaved]  = useState('')

  function toggle(role, key) {
    setPerms(prev => {
      const newVal = !prev[role][key]
      const next = {
        ...prev,
        [role]: { ...prev[role], [key]: newVal },
      }
      writePermissions(next)
      logActivity(ACTIONS.PERMISSION_CHANGED, 'Settings', role, `${role.charAt(0).toUpperCase() + role.slice(1)} Role`, `${newVal ? 'Enabled' : 'Disabled'} permission: ${key}.`)
      return next
    })
    setSaved(key)
    setTimeout(() => setSaved(''), 1200)
  }

  function reset(role) {
    if (!window.confirm(`Reset ${role} permissions to defaults?`)) return
    const defaults = getDefaultPermissions()
    setPerms(prev => {
      const next = { ...prev, [role]: defaults[role] }
      writePermissions(next)
      logActivity(ACTIONS.PERMISSION_CHANGED, 'Settings', role, `${role.charAt(0).toUpperCase() + role.slice(1)} Role`, `Permissions reset to defaults.`)
      return next
    })
  }

  const AdminIcon = (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="1.8">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  const StaffIcon = (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth="1.8">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
  const TechIcon = (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#7c3aed" strokeWidth="1.8">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
            Changes save instantly. Staff and Technician users see updated permissions on their next page load.
          </p>
        </div>
        {saved && (
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 12px', borderRadius: 8 }}>
            ✓ Saved
          </span>
        )}
      </div>

      {/* 3-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'start' }}>

        {/* ── Admin column ─────────────────────────────────────────────── */}
        <Column
          title="Admin"
          subtitle="Full access to all features — cannot be restricted"
          accentColor="#16a34a"
          headerIcon={AdminIcon}
        >
          <div style={{ padding: '10px 18px', background: '#f0fdf4', borderBottom: '1px solid #dcfce7', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#15803d' }}>All {STAFF_PERMS.length + TECH_PERMS.length} permissions always enabled</span>
          </div>
          {STAFF_PERMS.map(p => <AdminRow key={p.key} label={p.label} desc={p.desc} />)}
          <div style={{ padding: '8px 18px', background: '#f5f3ff', borderTop: '2px solid #ede9fe', borderBottom: '1px solid #ede9fe' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', letterSpacing: '0.5px', textTransform: 'uppercase' }}>+ Technician Permissions</span>
          </div>
          {TECH_PERMS.map(p => <AdminRow key={p.key} label={p.label} desc={p.desc} />)}
        </Column>

        {/* ── Staff column ──────────────────────────────────────────────── */}
        <Column
          title="Staff"
          subtitle="Field staff and office workers — customize access below"
          accentColor="#2563eb"
          headerIcon={StaffIcon}
          footer={
            <button onClick={() => reset('staff')}
              style={{ height: 34, padding: '0 14px', background: '#fff', border: '1px solid #e8e9ec', borderRadius: 7, fontSize: 12.5, color: '#6b7280', fontWeight: 500, cursor: 'pointer', width: '100%' }}>
              ↺ Reset Staff to Defaults
            </button>
          }
        >
          {STAFF_PERMS.map(p => (
            <PermRow
              key={p.key}
              perm={p}
              value={perms.staff[p.key] ?? p.defaultOn}
              onChange={() => toggle('staff', p.key)}
            />
          ))}
        </Column>

        {/* ── Technician column ─────────────────────────────────────────── */}
        <Column
          title="Technician"
          subtitle="Field technicians — limited permissions with some always required"
          accentColor="#7c3aed"
          headerIcon={TechIcon}
          footer={
            <button onClick={() => reset('technician')}
              style={{ height: 34, padding: '0 14px', background: '#fff', border: '1px solid #e8e9ec', borderRadius: 7, fontSize: 12.5, color: '#6b7280', fontWeight: 500, cursor: 'pointer', width: '100%' }}>
              ↺ Reset Technician to Defaults
            </button>
          }
        >
          {TECH_PERMS.map(p => (
            <PermRow
              key={p.key}
              perm={p}
              value={perms.technician[p.key] ?? p.defaultOn}
              onChange={() => !p.locked && toggle('technician', p.key)}
            />
          ))}
        </Column>
      </div>
    </div>
  )
}
