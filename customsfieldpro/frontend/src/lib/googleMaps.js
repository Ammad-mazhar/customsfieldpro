const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

let loadPromise = null

/**
 * Lazily loads the Google Maps JS SDK (places library).
 * Returns true if loaded successfully, false if no API key or load failed.
 * Calling this multiple times is safe — it reuses the same promise.
 */
export function loadGoogleMaps() {
  if (window.google?.maps?.places) return Promise.resolve(true)
  if (!API_KEY) return Promise.resolve(false)
  if (loadPromise) return loadPromise
  loadPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[data-google-maps]')
    if (existing) { existing.addEventListener('load', () => resolve(true)); return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`
    script.async = true
    script.setAttribute('data-google-maps', '1')
    script.onload  = () => resolve(true)
    script.onerror = () => { loadPromise = null; resolve(false) }
    document.head.appendChild(script)
  })
  return loadPromise
}
