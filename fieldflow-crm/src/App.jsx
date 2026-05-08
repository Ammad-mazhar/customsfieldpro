/**
 * FieldFlow CRM — App.jsx
 *
 * ── Mobile Testing Instructions ─────────────────────────────────────────────
 *
 * PREREQUISITES
 *   • Android Studio installed (https://developer.android.com/studio)
 *   • JDK 17+ on PATH
 *   • Android SDK 34 installed via SDK Manager
 *
 * FIRST-TIME SETUP
 *   1. Build the web bundle:          npm run build
 *   2. Sync to native projects:       npx cap sync
 *   3. Open Android Studio:           npx cap open android
 *      (or run both at once:          npm run android)
 *
 * ITERATIVE DEVELOPMENT
 *   1. Make code changes in src/
 *   2. npm run build:mobile           (builds + syncs in one step)
 *   3. Press ▶ Run in Android Studio, or:
 *      npx cap run android            (deploys to connected device/emulator)
 *
 * GENERATE ICONS & SPLASH
 *   npm install -D @capacitor/assets canvas
 *   node scripts/generateIcons.js    (writes resources/icon.png + splash.png)
 *   npx capacitor-assets generate    (resizes for all densities)
 *
 * LIVE RELOAD (dev mode on device)
 *   1. npm run dev                    (start Vite dev server)
 *   2. In capacitor.config.ts add:
 *      server: { url: 'http://<YOUR_LAN_IP>:5173', cleartext: true }
 *   3. npx cap sync && npx cap run android
 *
 * IOS (macOS only)
 *   npx cap add ios
 *   npm run ios                       (builds + opens Xcode)
 *
 * ────────────────────────────────────────────────────────────────────────────
 */

import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { LoadScript } from '@react-google-maps/api'
import { AuthProvider } from './auth/AuthContext'
import { GOOGLE_MAPS_API_KEY, googleMapsLibraries, isGoogleMapsConfigured } from './lib/googleMaps'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import ClientPortal from './pages/ClientPortal'
import LandingPage from './pages/public/LandingPage'
import PricingPage from './pages/public/PricingPage'
import Register from './pages/onboarding/Register'
import ContactPage from './pages/public/ContactPage'
import DemoPage from './pages/public/DemoPage'
import PrivacyPage from './pages/public/PrivacyPage'
import TermsPage from './pages/public/TermsPage'
import ComparePage from './pages/public/ComparePage'
import SuperAdmin from './pages/superadmin/SuperAdmin'
import InstallPWA from './components/InstallPWA'
import OfflineNotice from './components/OfflineNotice'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import GlobalSearch from './components/GlobalSearch'
import { initPushNotifications } from './utils/notifications'
import './App.css'

// ── Capacitor bootstrap ───────────────────────────────────────────────────────
// Detects native environment, adds body class for CSS safe-area rules,
// initialises push notifications, and wires the Keyboard plugin.
async function bootCapacitor() {
  const isNative = !!(window.Capacitor?.isNativePlatform?.())
  if (!isNative) return

  document.body.classList.add('is-mobile-app')

  // Push notifications
  await initPushNotifications()

  // Status bar — set to dark icons on light bg
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#ffffff' })
  } catch (_) { /* web fallback */ }

  // Splash screen — hide after app ready
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide({ fadeOutDuration: 300 })
  } catch (_) { /* web fallback */ }

  // Listen for push-tap navigation events
  window.addEventListener('fieldflow:push-tap', (e) => {
    const { module, recordId } = e.detail || {}
    const routes = {
      Jobs: '/jobs', Invoices: '/invoices', Requests: '/requests',
      Quotes: '/quotes', Clients: '/clients',
    }
    if (routes[module]) window.location.hash = routes[module]
  })
}

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
        window.dispatchEvent(new CustomEvent('fieldflow:search'))
      } else if (ctrl && e.key === 'n') {
        e.preventDefault()
        sessionStorage.setItem('fieldflow_open_new', 'job')
        navigate('/jobs')
      } else if (ctrl && e.key === 'i') {
        e.preventDefault()
        sessionStorage.setItem('fieldflow_open_new', 'invoice')
        navigate('/invoices')
      } else if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('fieldflow:escape'))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  return null
}

export default function App() {
  useEffect(() => { bootCapacitor() }, [])

  const inner = (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <KeyboardShortcuts />
          <OfflineNotice />
          <GlobalSearch />
          <ErrorBoundary>
            <Routes>
              <Route path="/login"            element={<Login />} />
              <Route path="/portal/:clientId" element={<ClientPortal />} />
              <Route path="/"                 element={<LandingPage />} />
              <Route path="/pricing"          element={<PricingPage />} />
              <Route path="/register"         element={<Register />} />
              <Route path="/contact"              element={<ContactPage />} />
              <Route path="/demo"                element={<DemoPage />} />
              <Route path="/privacy"             element={<PrivacyPage />} />
              <Route path="/terms"               element={<TermsPage />} />
              <Route path="/compare/:competitor" element={<ComparePage />} />
              <Route path="/superadmin"       element={<SuperAdmin />} />
              <Route path="/superadmin/*"     element={<SuperAdmin />} />
              <Route path="*"                 element={<ProtectedRoute />} />
            </Routes>
          </ErrorBoundary>
          <InstallPWA />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )

  if (!isGoogleMapsConfigured()) return inner

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={googleMapsLibraries} loadingElement={<></>}>
      {inner}
    </LoadScript>
  )
}
