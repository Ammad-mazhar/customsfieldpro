// ─── GPS Tracking Utilities ───────────────────────────────────────────────────

/**
 * Get the device's current GPS position.
 * Returns { lat, lng, accuracy } (accuracy in meters).
 */
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        lat:      pos.coords.latitude,
        lng:      pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      err => {
        const MSGS = {
          1: 'Location permission denied. Please allow location access.',
          2: 'Location unavailable. Check your GPS signal.',
          3: 'Location request timed out. Try again.',
        }
        reject(new Error(MSGS[err.code] || 'Unknown geolocation error'))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )
  })
}

/**
 * Haversine formula — returns distance in miles between two lat/lng points.
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R    = 3958.8 // Earth radius miles
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Returns true if currentLocation is within radiusMiles of jobLocation.
 * Both params: { lat, lng }
 */
export function isWithinJobSite(currentLocation, jobLocation, radiusMiles = 0.1) {
  if (!currentLocation || !jobLocation) return false
  return calculateDistance(
    currentLocation.lat, currentLocation.lng,
    jobLocation.lat, jobLocation.lng
  ) <= radiusMiles
}

/**
 * Geocodes a human-readable address to { lat, lng } using the OpenStreetMap
 * Nominatim API (free, no API key required).
 * Throws if address cannot be resolved.
 */
export async function geocodeAddress(address) {
  if (!address?.trim()) throw new Error('No address provided')
  const url =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
  const res  = await fetch(url, {
    headers: {
      'Accept-Language': 'en',
      'User-Agent':      'CustomsFieldPro-CRM/1.0',
    },
  })
  if (!res.ok) throw new Error('Geocoding service unavailable')
  const data = await res.json()
  if (!data.length) throw new Error(`Could not locate: "${address}"`)
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
}

/** Human-friendly distance string */
export function formatDistance(miles) {
  if (miles < 0.1) return `${Math.round(miles * 5280)} ft`
  return `${miles.toFixed(2)} mi`
}
