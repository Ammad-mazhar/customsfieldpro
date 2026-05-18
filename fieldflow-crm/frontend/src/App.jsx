import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import ClientPortal from './pages/ClientPortal'
import InstallPWA from './components/InstallPWA'
import OfflineNotice from './components/OfflineNotice'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import GlobalSearch from './components/GlobalSearch'
import Landing from './pages/onboarding/Landing'
import Register from './pages/onboarding/Register'
import ForgotPassword from './pages/onboarding/ForgotPassword'
import SuperAdmin from './pages/superadmin/SuperAdmin'
import './App.css'

// ── Keyboard shortcuts wired at router level ──────────────────────────────────
function KeyboardShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    function handler(e) {
      // Ignore when typing in inputs/textareas
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (document.activeElement?.isContentEditable) return

      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && e.key === 'k') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('customsfieldpro:search'))
      } else if (ctrl && e.key === 'n') {
        e.preventDefault()
        sessionStorage.setItem('customsfieldpro_open_new', 'job')
        navigate('/jobs')
      } else if (ctrl && e.key === 'i') {
        e.preventDefault()
        sessionStorage.setItem('customsfieldpro_open_new', 'invoice')
        navigate('/invoices')
      } else if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('customsfieldpro:escape'))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  return null
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <KeyboardShortcuts />
          <OfflineNotice />
          <GlobalSearch />
          <ErrorBoundary>
            <Routes>
              <Route path="/"                 element={<Landing />} />
              <Route path="/register"         element={<Register />} />
              <Route path="/forgot-password"  element={<ForgotPassword />} />
              <Route path="/login"            element={<Login />} />
              <Route path="/superadmin"       element={<SuperAdmin />} />
              <Route path="/portal/:clientId" element={<ClientPortal />} />
              <Route path="*"                 element={<ProtectedRoute />} />
            </Routes>
          </ErrorBoundary>
          <InstallPWA />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}
