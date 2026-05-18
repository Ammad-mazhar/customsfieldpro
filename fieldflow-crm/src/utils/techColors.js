// Technician color system — single source of truth for all tech color rendering.
// All 12 swatches chosen to be visually distinct and accessible at both full and light weight.

export const TECH_COLORS = [
  { name: 'Ocean Blue',    hex: '#2563EB', light: '#EFF6FF' },
  { name: 'Forest Green',  hex: '#16A34A', light: '#F0FDF4' },
  { name: 'Sunset Orange', hex: '#EA580C', light: '#FFF7ED' },
  { name: 'Royal Purple',  hex: '#7C3AED', light: '#F5F3FF' },
  { name: 'Ruby Red',      hex: '#DC2626', light: '#FEF2F2' },
  { name: 'Sky Teal',      hex: '#0891B2', light: '#ECFEFF' },
  { name: 'Golden Amber',  hex: '#D97706', light: '#FFFBEB' },
  { name: 'Rose Pink',     hex: '#DB2777', light: '#FDF2F8' },
  { name: 'Slate',         hex: '#475569', light: '#F1F5F9' },
  { name: 'Teal',          hex: '#0D9488', light: '#F0FDFA' },
  { name: 'Indigo',        hex: '#4F46E5', light: '#EEF2FF' },
  { name: 'Coral',         hex: '#E11D48', light: '#FFF1F2' },
]

const CACHE_KEY    = 'customsfieldpro_tech_colors'
const SETTINGS_KEY = 'customsfieldpro_settings'

// Build / read the quick-lookup cache { [techId]: { hex, light, name } }
export function buildTechColorCache() {
  try {
    const raw  = localStorage.getItem(SETTINGS_KEY)
    const data = raw ? JSON.parse(raw) : null
    const techs = data?.technicians ?? []
    const cache = {}
    techs.forEach((t, idx) => {
      const fallback = TECH_COLORS[idx % TECH_COLORS.length]
      cache[t.id] = {
        hex:  t.color      ?? fallback.hex,
        light: t.colorLight ?? fallback.light,
        name:  t.colorName  ?? fallback.name,
      }
    })
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    return cache
  } catch {
    return {}
  }
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Returns { hex, light, name } for a given techId.
// Falls back to a deterministic colour so UI is never blank.
export function getTechColor(techId) {
  if (!techId) return { hex: '#6B7280', light: '#F3F4F6', name: 'Gray' }
  const cache = readCache() ?? buildTechColorCache()
  if (cache[techId]) return cache[techId]
  // Deterministic fallback based on string hash
  const hash = [...String(techId)].reduce((h, c) => Math.imul(31, h) + c.charCodeAt(0) | 0, 0)
  return TECH_COLORS[Math.abs(hash) % TECH_COLORS.length]
}

// Returns the full cache map { [techId]: { hex, light, name } }
export function getAllTechColors() {
  return readCache() ?? buildTechColorCache()
}

// Returns a color swatch entry by hex string (case-insensitive).
export function getTechColorByHex(hex) {
  return TECH_COLORS.find(c => c.hex.toLowerCase() === hex?.toLowerCase()) ?? null
}

// Returns an inline style object for the given variant:
//   'block'  — coloured left-border card (background: light, borderLeft: hex)
//   'dot'    — small circle indicator (background: hex)
//   'badge'  — pill tag (background: light, color: hex)
//   'avatar' — circle avatar (background: hex, color: #fff)
//   'row'    — subtle table-row tint (background: light + 50% opacity)
export function techColorStyle(techId, variant = 'dot') {
  const { hex, light } = getTechColor(techId)
  switch (variant) {
    case 'block':
      return { background: light, borderLeft: `3px solid ${hex}` }
    case 'dot':
      return { width: 8, height: 8, borderRadius: '50%', background: hex, display: 'inline-block', flexShrink: 0 }
    case 'badge':
      return { background: light, color: hex, borderRadius: 20, padding: '2px 8px', fontSize: 11.5, fontWeight: 700, display: 'inline-block' }
    case 'avatar':
      return { background: hex, color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }
    case 'row':
      return { background: light + '80' }
    default:
      return { background: hex }
  }
}
