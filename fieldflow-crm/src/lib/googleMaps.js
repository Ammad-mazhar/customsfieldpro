export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

export const googleMapsLibraries = ['places', 'geometry', 'directions']

export function isGoogleMapsConfigured() {
  return !!(GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.trim() && GOOGLE_MAPS_API_KEY !== 'your_google_maps_api_key')
}

// Haversine distance between two lat/lng points (returns km)
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
