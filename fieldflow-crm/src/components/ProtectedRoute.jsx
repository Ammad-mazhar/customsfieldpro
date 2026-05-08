import { useState } from 'react'
import { Navigate, Routes, Route } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import TrialBanner from './TrialBanner'
import OnboardingChecklist from './OnboardingChecklist'
import Referrals from '../pages/Referrals'
import MobileBottomNav from './MobileBottomNav'
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
import PurchaseOrders from '../pages/admin/PurchaseOrders'
import TimeSheets from '../pages/admin/TimeSheets'
import RouteOptimizer from '../pages/RouteOptimizer'
import ServiceCalls from '../pages/ServiceCalls'
import Notes from '../pages/Notes'
import Aging from '../pages/Aging'
import PartsStatus from '../pages/PartsStatus'
import WarrantyClaims from '../pages/WarrantyClaims'
import MaintenanceCalls from '../pages/MaintenanceCalls'
import Equipment from '../pages/Equipment'
import Warranty from '../pages/Warranty'
import Leads from '../pages/Leads'
import Billing from '../pages/Billing'
import AIReceptionist from '../pages/admin/AIReceptionist'
import BillingSuccess from '../pages/billing/BillingSuccess'
import BillingCancelled from '../pages/billing/BillingCancelled'
import Inbox from '../pages/Inbox'

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

const isMobileApp = () => document.body.classList.contains('is-mobile-app')

export default function ProtectedRoute() {
  const { user, isAdmin, hasPermission } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const mobileApp = isMobileApp()

  if (!user) return <Navigate to="/login" replace />

  const perm = (permission) => hasPermission(permission)

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-area">
        <Topbar onMenuToggle={() => setSidebarOpen(o => !o)} />
        <TrialBanner />
        <main className="page-content">
          <OnboardingChecklist />
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
            {isAdmin && <Route path="/maintenance"       element={<Maintenance />} />}
            {isAdmin && <Route path="/route-optimizer"  element={<RouteOptimizer />} />}
            {isAdmin && <Route path="/service-calls"      element={<ServiceCalls />} />}
            {isAdmin && <Route path="/notes"             element={<Notes />} />}
            {isAdmin && <Route path="/aging"             element={<Aging />} />}
            {isAdmin && <Route path="/parts-status"      element={<PartsStatus />} />}
            {isAdmin && <Route path="/warranty"          element={<WarrantyClaims />} />}
            {isAdmin && <Route path="/maintenance-calls" element={<MaintenanceCalls />} />}
            {isAdmin && <Route path="/equipment"           element={<Equipment />} />}
            {isAdmin && <Route path="/warranty-claims"   element={<Warranty />} />}
            {isAdmin && <Route path="/leads"             element={<Leads />} />}
            {isAdmin && <Route path="/inbox"             element={<Inbox />} />}
            {isAdmin && <Route path="/billing"           element={<Billing />} />}
            {isAdmin && <Route path="/billing/success"   element={<BillingSuccess />} />}
            {isAdmin && <Route path="/billing/cancelled" element={<BillingCancelled />} />}
            {isAdmin && <Route path="/ratings"         element={<Ratings />} />}
            {isAdmin && <Route path="/inventory"        element={<Inventory />} />}
            {isAdmin && <Route path="/purchase-orders" element={<PurchaseOrders />} />}
            {isAdmin && <Route path="/time-sheets"       element={<TimeSheets />} />}
            {isAdmin && <Route path="/ai-receptionist" element={<AIReceptionist />} />}
            {isAdmin && <Route path="/referrals"       element={<Referrals />} />}

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
      {mobileApp && <MobileBottomNav />}
    </div>
  )
}
