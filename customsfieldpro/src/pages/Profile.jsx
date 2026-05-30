import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../services/api'

export default function Profile() {
  const { user, isAdmin, updateProfile, changePassword } = useAuth()

  const [name,  setName]  = useState(user?.name  || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [profileMsg, setProfileMsg] = useState(null) // { type: 'success'|'error', text }

  const [curPwd,  setCurPwd]  = useState('')
  const [newPwd,  setNewPwd]  = useState('')
  const [confPwd, setConfPwd] = useState('')
  const [pwdMsg,  setPwdMsg]  = useState(null)

  function saveProfile(e) {
    e.preventDefault()
    if (!name.trim()) { setProfileMsg({ type: 'error', text: 'Name is required.' }); return }
    updateProfile({ name: name.trim(), phone: phone.trim() })
    if (user?.id) {
      api.updateUser(user.id, { full_name: name.trim(), phone: phone.trim() || undefined }).catch(() => {})
    }
    setProfileMsg({ type: 'success', text: 'Profile updated successfully.' })
    setTimeout(() => setProfileMsg(null), 3000)
  }

  function savePwd(e) {
    e.preventDefault()
    setPwdMsg(null)
    if (!curPwd)        { setPwdMsg({ type: 'error', text: 'Current password is required.' }); return }
    if (!newPwd)        { setPwdMsg({ type: 'error', text: 'New password is required.' }); return }
    if (newPwd.length < 6) { setPwdMsg({ type: 'error', text: 'New password must be at least 6 characters.' }); return }
    if (newPwd !== confPwd) { setPwdMsg({ type: 'error', text: 'Passwords do not match.' }); return }
    const err = changePassword(curPwd, newPwd)
    if (err) { setPwdMsg({ type: 'error', text: err }); return }
    setCurPwd(''); setNewPwd(''); setConfPwd('')
    setPwdMsg({ type: 'success', text: 'Password changed successfully.' })
    setTimeout(() => setPwdMsg(null), 3000)
  }

  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const roleBg   = isAdmin ? '#eff6ff' : '#f0fdf4'
  const roleColor = isAdmin ? '#2563eb' : '#16a34a'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>

      {/* Header card */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#2563eb', color: '#fff', fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {initials}
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1d23', margin: '0 0 4px' }}>{user?.name}</h2>
            <p style={{ fontSize: 13.5, color: '#6b7280', margin: '0 0 6px' }}>{user?.email}</p>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: roleBg, color: roleColor }}>
              {isAdmin ? 'Admin' : 'Staff'}
            </span>
          </div>
        </div>
      </div>

      {/* Profile info */}
      <div style={card}>
        <p style={sectionTitle}>Profile Information</p>
        {profileMsg && <MsgBanner msg={profileMsg} />}
        <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={LB}>Email address</label>
            <input value={user?.email || ''} readOnly
              style={{ ...inputStyle, background: '#f9fafb', color: '#9ca3af', cursor: 'default' }} />
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>Email cannot be changed.</p>
          </div>
          <div>
            <label style={LB}>Role</label>
            <input value={isAdmin ? 'Admin' : 'Staff'} readOnly
              style={{ ...inputStyle, background: '#f9fafb', color: '#9ca3af', cursor: 'default', width: '40%' }} />
          </div>
          <div>
            <label style={LB}>Full name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inputStyle} />
          </div>
          <div>
            <label style={LB}>Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 000-0000" style={{ ...inputStyle, width: '60%' }} />
          </div>
          {user?.technicianId && (
            <div>
              <label style={LB}>Technician ID</label>
              <input value={user.technicianId} readOnly
                style={{ ...inputStyle, background: '#f9fafb', color: '#9ca3af', cursor: 'default', width: '40%', fontFamily: 'monospace' }} />
            </div>
          )}
          <div style={{ paddingTop: 4 }}>
            <button type="submit" style={btn}>Save Changes</button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div style={card}>
        <p style={sectionTitle}>Change Password</p>
        {pwdMsg && <MsgBanner msg={pwdMsg} />}
        <form onSubmit={savePwd} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={LB}>Current password</label>
            <input type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, width: '60%' }} />
          </div>
          <div>
            <label style={LB}>New password</label>
            <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, width: '60%' }} />
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>Minimum 6 characters.</p>
          </div>
          <div>
            <label style={LB}>Confirm new password</label>
            <input type="password" value={confPwd} onChange={e => setConfPwd(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, width: '60%' }} />
          </div>
          <div style={{ paddingTop: 4 }}>
            <button type="submit" style={btn}>Update Password</button>
          </div>
        </form>
      </div>

    </div>
  )
}

function MsgBanner({ msg }) {
  const isErr = msg.type === 'error'
  return (
    <div style={{ background: isErr ? '#fef2f2' : '#f0fdf4', border: `1px solid ${isErr ? '#fecaca' : '#bbf7d0'}`, color: isErr ? '#dc2626' : '#16a34a', borderRadius: 7, padding: '9px 14px', fontSize: 13.5, fontWeight: 500, marginBottom: 14 }}>
      {isErr ? '⚠ ' : '✓ '}{msg.text}
    </div>
  )
}

const card         = { background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, padding: '22px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
const sectionTitle = { fontSize: 12, fontWeight: 700, color: '#9ca3af', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #f0f1f3', paddingBottom: 10 }
const LB           = { display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }
const inputStyle   = { width: '100%', boxSizing: 'border-box', height: 38, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#374151', outline: 'none' }
const btn          = { height: 38, padding: '0 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }
