import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SECRET = 'fieldflow2026'

const DEFAULT_USERS = [
  { id: 'user-1', email: 'admin@fieldflow.com', password: 'admin123', name: 'Admin User', role: 'admin', technicianId: null },
  { id: 'user-2', email: 'moore@fieldflow.com', password: 'staff123', name: 'D. Moore', role: 'staff', technicianId: 'tech-1' },
  { id: 'user-3', email: 'torres@fieldflow.com', password: 'staff123', name: 'A. Torres', role: 'staff', technicianId: 'tech-2' },
  { id: 'user-4', email: 'singh@fieldflow.com', password: 'staff123', name: 'R. Singh', role: 'staff', technicianId: 'tech-3' },
]

const AUTH_KEYS = [
  'fieldflow_session',
  'fieldflow_users',
  'fieldflow_permissions',
]

export default function ResetDemo() {
  const navigate = useNavigate()
  const [code, setCode]       = useState('')
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)

  function handleReset() {
    if (code !== SECRET) {
      setError('Incorrect secret code.')
      return
    }
    setError('')

    // Clear auth-related localStorage keys
    AUTH_KEYS.forEach(k => localStorage.removeItem(k))

    // Write default users
    localStorage.setItem('fieldflow_users', JSON.stringify(DEFAULT_USERS))

    setSuccess(true)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f8f9fb', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.07)', padding: 40, width: '100%', maxWidth: 420,
      }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1d23', margin: '0 0 6px' }}>
            Reset Demo Data
          </h1>
          <p style={{ fontSize: 13.5, color: '#6b7280', margin: 0 }}>
            Restore default users and passwords for the demo environment.
          </p>
        </div>

        {!success ? (
          <>
            {/* Warning */}
            <div style={{
              background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
              padding: '12px 14px', marginBottom: 24, display: 'flex', gap: 10,
            }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#d97706" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
              <p style={{ fontSize: 13, color: '#92400e', margin: 0, lineHeight: 1.5 }}>
                This will reset all users and passwords to default. Any custom accounts will be removed.
              </p>
            </div>

            {/* Secret code field */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Secret Code
              </label>
              <input
                type="password"
                placeholder="Enter secret code"
                value={code}
                onChange={e => { setCode(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleReset()}
                style={{
                  width: '100%', boxSizing: 'border-box', height: 40,
                  border: `1px solid ${error ? '#dc2626' : '#e8e9ec'}`,
                  borderRadius: 8, padding: '0 12px', fontSize: 14,
                  color: '#1a1d23', outline: 'none',
                }}
                autoFocus
              />
              {error && (
                <p style={{ fontSize: 12.5, color: '#dc2626', margin: '5px 0 0' }}>{error}</p>
              )}
            </div>

            {/* Reset button */}
            <button
              onClick={handleReset}
              style={{
                width: '100%', height: 42, background: '#dc2626', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', marginBottom: 12,
              }}
            >
              Reset Now
            </button>

            <button
              onClick={() => navigate('/login')}
              style={{
                width: '100%', height: 42, background: 'transparent', color: '#6b7280',
                border: '1px solid #e8e9ec', borderRadius: 8, fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Cancel — Go to Login
            </button>
          </>
        ) : (
          <>
            {/* Success */}
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
              padding: '14px 16px', marginBottom: 24, display: 'flex', gap: 10,
            }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 1 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
              <p style={{ fontSize: 13, color: '#15803d', margin: 0, fontWeight: 600 }}>
                Demo data reset successfully!
              </p>
            </div>

            {/* Default credentials */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 10px' }}>
                Default credentials:
              </p>
              {[
                { label: 'Admin', email: 'admin@fieldflow.com', password: 'admin123' },
                { label: 'Staff', email: 'moore@fieldflow.com', password: 'staff123' },
              ].map(({ label, email, password }) => (
                <div key={label} style={{
                  background: '#f8f9fb', border: '1px solid #e8e9ec', borderRadius: 8,
                  padding: '10px 14px', marginBottom: 8,
                }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</p>
                  <p style={{ fontSize: 13, color: '#1a1d23', margin: '0 0 2px', fontFamily: 'monospace' }}>{email}</p>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: 0, fontFamily: 'monospace' }}>Password: {password}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/login')}
              style={{
                width: '100%', height: 42, background: '#2563eb', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  )
}
