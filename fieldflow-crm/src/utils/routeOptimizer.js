import { haversineDistance, isGoogleMapsConfigured } from '../lib/googleMaps'

// ── Haversine-based simple TSP (nearest-neighbor) ─────────────────────────────
function nearestNeighborTSP(origin, jobs) {
  if (!jobs.length) return []
  const remaining = [...jobs]
  const route = []
  let current = origin

  while (remaining.length) {
    let best = null, bestDist = Infinity, bestIdx = -1
    remaining.forEach((job, i) => {
      if (!job.lat || !job.lng) return
      const d = haversineDistance(current.lat, current.lng, job.lat, job.lng)
      if (d < bestDist) { bestDist = d; best = job; bestIdx = i }
    })
    if (!best) { route.push(...remaining); break }
    route.push({ ...best, distFromPrev: bestDist })
    remaining.splice(bestIdx, 1)
    current = best
  }
  return route
}

// ── Google Directions API route optimizer ─────────────────────────────────────
async function googleOptimizeRoute(origin, jobs) {
  return new Promise((resolve, reject) => {
    if (!window.google?.maps) { reject(new Error('Google Maps not loaded')); return }

    const svc = new window.google.maps.DirectionsService()
    const waypoints = jobs.map(j => ({
      location: j.address || `${j.lat},${j.lng}`,
      stopover: true,
    }))

    svc.route(
      {
        origin: origin.address || `${origin.lat},${origin.lng}`,
        destination: origin.address || `${origin.lat},${origin.lng}`, // return to base
        waypoints,
        optimizeWaypoints: true,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status !== window.google.maps.DirectionsStatus.OK) {
          reject(new Error(`Directions API: ${status}`)); return
        }
        const order = result.routes[0].waypoint_order
        const legs = result.routes[0].legs
        const optimized = order.map((origIdx, i) => ({
          ...jobs[origIdx],
          distFromPrev: legs[i].distance.value / 1000,    // km
          durationFromPrev: legs[i].duration.value / 60,  // minutes
          distText: legs[i].distance.text,
          durationText: legs[i].duration.text,
        }))
        resolve({ jobs: optimized, directionsResult: result })
      }
    )
  })
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * optimizeRoute — returns ordered job list with distance/time metadata.
 * Falls back to haversine nearest-neighbor if Google Maps isn't available.
 *
 * @param {{ lat: number, lng: number, address: string }} origin — depot/office location
 * @param {{ id, title, address, lat, lng }[]} jobs — jobs to optimize
 * @returns {{ jobs: [], directionsResult: any|null, method: 'google'|'haversine' }}
 */
export async function optimizeRoute(origin, jobs) {
  const withCoords = jobs.filter(j => j.lat && j.lng)
  const noCoords   = jobs.filter(j => !j.lat || !j.lng)

  if (isGoogleMapsConfigured() && window.google?.maps) {
    try {
      const result = await googleOptimizeRoute(origin, withCoords)
      return { ...result, noCoords, method: 'google' }
    } catch (e) {
      console.warn('Google route optimization failed, falling back to haversine:', e)
    }
  }

  // Fallback: nearest-neighbor
  const ordered = nearestNeighborTSP(origin, withCoords)
  return { jobs: ordered, noCoords, directionsResult: null, method: 'haversine' }
}

/**
 * findClosestTechnician — returns the tech closest to a given lat/lng.
 *
 * @param {{ lat: number, lng: number }} targetLocation
 * @param {{ id, name, lat, lng, status }[]} techLocations
 * @returns {{ tech, distKm, distMiles } | null}
 */
export function findClosestTechnician(targetLocation, techLocations) {
  if (!targetLocation?.lat || !targetLocation?.lng) return null

  let best = null, bestDist = Infinity
  techLocations.forEach(tech => {
    if (!tech.lat || !tech.lng) return
    const d = haversineDistance(targetLocation.lat, targetLocation.lng, tech.lat, tech.lng)
    if (d < bestDist) { bestDist = d; best = tech }
  })

  if (!best) return null
  return {
    tech: best,
    distKm: Math.round(bestDist * 10) / 10,
    distMiles: Math.round(bestDist * 0.621371 * 10) / 10,
  }
}

/**
 * getTechLocations — reads fieldflow_tech_locations from localStorage.
 */
export function getTechLocations() {
  try {
    return JSON.parse(localStorage.getItem('fieldflow_tech_locations')) || {}
  } catch { return {} }
}

/**
 * getTechLocationsArray — returns tech locations as array with id injected.
 */
export function getTechLocationsArray() {
  const locs = getTechLocations()
  return Object.entries(locs).map(([id, loc]) => ({ id, ...loc }))
}
