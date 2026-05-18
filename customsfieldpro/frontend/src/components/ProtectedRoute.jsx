import { useState } from 'react'
import { Navigate, Routes, Route, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import TrialBanner from './TrialBanner'
import Dashboard from '../pages/Dashboard'
import Jobs from '../pages/Jobs'
import Clients from '../pages/Clients'
import Invoices from '../pages/Invoices'
import Quotes from '../pages/Quotes'
import Requests from '../pages/Requests'
import Scheduler from '../pages/Scheduler'
import Profile from '../pages/Profile'
import Settings from '../pages/Settings'
import UserManagement from '../pages/admin/UserManagement'
import Permissions from '../pages/admin/Permissions'
import Reports from '../pages/Reports'
import ActivityLog from '../pages/admin/ActivityLog'
import Maintenance from '../pages/Maintenance'
import MyJobs from '../pages/staff/MyJobs'
import Ratings from '../pages/admin/Ratings'
import Inventory from '../pages/admin/Inventory'
import TimeSheets from '../pages/admin/TimeSheets'
import Billing from '../pages/Billing'

// ─── Impersonation banner ─────────────────────────────────────────────────────

function ImpersonationBanner() {
  const navigate  = useNavigate()
  const { logout } = useAuth()

  let imp = null
  try { imp = JSON.parse(localStorage.getItem('customsfieldpro_impersonation')) } catch { /* ignore */ }
  if (!imp?.active) return null

  function handleExit() {
    localStorage.removeItem('customsfieldpro_impersonation')
    logout()
    navigate('/superadmin', { replace: true })
  }

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 200,
      background: '#ea580c',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: '9px 20px',
      fontSize: 13.5,
      fontWeight: 600,
      flexWrap: 'wrap',
    }}>
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2" strokeLinecap="round"/>
      </svg>
      <span>You are impersonating <strong>{imp.tenantName}</strong></span>
      <button onClick={handleExit}
        style={{ height: 28, padding: '0 14px', background: 'rgba(255,255,255,0.25)', color: '#fff', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
        Exit Impersonation
      </button>
    </div>
  )
}

// ─── Access Denied fallback ───────────────────────────────────────────────────

function AccessDenied() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" strokeLinecap="round"/>
        </svg>
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Access Denied</h2>
      <p style={{ fontSize: 14, color: '#9ca3af', margin: 0, maxWidth: 340 }}>
        You don't have permission to view this page. Contact your administrator to request access.
      </p>
    </div>
  )
}

// ─── Permission-gated route element ──────────────────────────────────────────

function Guard({ permission, isAdmin, hasPermission, children }) {
  if (isAdmin) return children
  if (!permission || hasPermission(permission)) return children
  return <AccessDenied />
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────

export default function ProtectedRoute() {
  const { user, isAdmin, hasPermission } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!user) return <Navigate to="/login" replace />

  const perm = (permission) => hasPermission(permission)

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-area">
        <ImpersonationBanner />
        <TrialBanner />
        <Topbar onMenuToggle={() => setSidebarOpen(o => !o)} />
        <main className="page-content">
          <Routes>
            <Route path="/"           element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"  element={<Dashboard />} />
            <Route path="/jobs"       element={<Jobs />} />
            <Route path="/my-jobs"    element={<MyJobs />} />
            <Route path="/scheduler"  element={<Scheduler />} />
            <Route path="/profile"    element={<Profile />} />

            {/* Permission-gated routes: admins always get in, staff need the permission */}
            {(isAdmin || perm('view_clients'))  && <Route path="/clients"  element={<Guard permission="view_clients"  isAdmin={isAdmin} hasPermission={hasPermission}><Clients /></Guard>} />}
            {(isAdmin || perm('view_invoices')) && <Route path="/invoices" element={<Guard permission="view_invoices" isAdmin={isAdmin} hasPermission={hasPermission}><Invoices /></Guard>} />}
            {(isAdmin || perm('view_quotes'))   && <Route path="/quotes"   element={<Guard permission="view_quotes"   isAdmin={isAdmin} hasPermission={hasPermission}><Quotes /></Guard>} />}
            {(isAdmin || perm('view_requests')) && <Route path="/requests" element={<Guard permission="view_requests" isAdmin={isAdmin} hasPermission={hasPermission}><Requests /></Guard>} />}

            {/* Admin-only routes */}
            {isAdmin && <Route path="/settings"        element={<Settings />} />}
            {isAdmin && <Route path="/user-management" element={<UserManagement />} />}
            {isAdmin && <Route path="/permissions"     element={<Permissions />} />}
            {isAdmin && <Route path="/reports"         element={<Reports />} />}
            {isAdmin && <Route path="/activity-log"   element={<ActivityLog />} />}
            {isAdmin && <Route path="/maintenance"     element={<Maintenance />} />}
            {isAdmin && <Route path="/ratings"         element={<Ratings />} />}
            {isAdmin && <Route path="/inventory"       element={<Inventory />} />}
            {isAdmin && <Route path="/time-sheets"    element={<TimeSheets />} />}
            <Route path="/billing" element={<Billing />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
