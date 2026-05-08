/**
 * location.js — Capacitor-aware geolocation utility
 * Falls back to browser navigator.geolocation on web.
 */

const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())

/**
 * Get the device's current GPS position.
 * Returns { lat, lng, accuracy } (accuracy in meters).
 */
export async function getCurrentLocation() {
  if (isNative()) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation')
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
      })
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }
    } catch (err) {
      throw _mapGeoError(err)
    }
  }

  // Browser fallback
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      err => reject(_mapBrowserGeoError(err)),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )
  })
}

/**
 * Watch the device's location continuously.
 * @param {function} callback - Called with { lat, lng, accuracy } on each update
 * @returns {function} - Call to stop watching
 */
export async function watchLocation(callback) {
  if (isNative()) {
    const { Geolocation } = await import('@capacitor/geolocation')
    const watchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true },
      (pos, err) => {
        if (err) return console.error('[location] watch error:', err)
        if (pos) callback({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
      }
    )
    return () => Geolocation.clearWatch({ id: watchId })
  }

  // Browser fallback
  if (!navigator.geolocation) return () => {}
  const id = navigator.geolocation.watchPosition(
    pos => callback({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
    err => console.error('[location] watch error:', err),
    { enableHighAccuracy: true, maximumAge: 10000 }
  )
  return () => navigator.geolocation.clearWatch(id)
}

/**
 * Request location permission (native only; browser prompts automatically).
 * Returns 'granted' | 'denied' | 'prompt'
 */
export async function requestLocationPermission() {
  if (isNative()) {
    const { Geolocation } = await import('@capacitor/geolocation')
    const status = await Geolocation.requestPermissions()
    return status.location
  }
  return 'prompt'
}

// ─── Error helpers ────────────────────────────────────────────────────────────

function _mapGeoError(err) {
  const msg = err?.message || ''
  if (msg.includes('denied') || msg.includes('permission')) return new Error('Location permission denied. Please allow location access.')
  if (msg.includes('unavailable')) return new Error('Location unavailable. Check your GPS signal.')
  if (msg.includes('timeout')) return new Error('Location request timed out. Try again.')
  return new Error(msg || 'Unknown geolocation error')
}

function _mapBrowserGeoError(err) {
  const MSGS = {
    1: 'Location permission denied. Please allow location access.',
    2: 'Location unavailable. Check your GPS signal.',
    3: 'Location request timed out. Try again.',
  }
  return new Error(MSGS[err.code] || 'Unknown geolocation error')
}
