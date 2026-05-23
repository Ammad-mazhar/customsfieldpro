// CustomsFieldPro — Sequential Number Generator
// Each module has its own independent counter stored in localStorage.
// Counters never reset or reuse numbers even if records are deleted.

const KEYS = {
  jobs:          'customsfieldpro_counter_jobs',
  quotes:        'customsfieldpro_counter_quotes',
  invoices:      'customsfieldpro_counter_invoices',
  service_calls: 'customsfieldpro_counter_service_calls',
  po:            'customsfieldpro_counter_po',
}

/**
 * Increments the counter for the given module and returns the new value.
 * Use this when CREATING a new record.
 */
export function getNextNumber(module) {
  const key     = KEYS[module] || `customsfieldpro_counter_${module}`
  const current = parseInt(localStorage.getItem(key) || '0', 10)
  const next    = current + 1
  localStorage.setItem(key, String(next))
  return next
}

/**
 * Returns the NEXT number without incrementing (for display only).
 * Use this to show a "preview" number in a form before the user saves.
 */
export function peekNextNumber(module) {
  const key = KEYS[module] || `customsfieldpro_counter_${module}`
  return parseInt(localStorage.getItem(key) || '0', 10) + 1
}

// ── Format functions ──────────────────────────────────────────────────────────

export function formatJobNumber(n) {
  return `JOB-${String(n).padStart(4, '0')}`
}

export function formatQuoteNumber(n) {
  return `QT-${String(n).padStart(4, '0')}`
}

export function formatInvoiceNumber(n) {
  return `INV-${String(n).padStart(4, '0')}`
}

export function formatSCNumber(n) {
  // Walkabout-style 6-digit sequential number — first call is 100001
  return String(100000 + n)
}

export function formatPONumber(n) {
  return `PO-${new Date().getFullYear()}-${String(n).padStart(3, '0')}`
}

export function formatRequestNumber(n) {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  return `REQ-${ymd}-${String(n).padStart(3,'0')}`
}

/**
 * Initialize counters on first app load if they are missing.
 * Called once from store.js seedAll().
 */
export function initCounters(defaults = {}) {
  const merged = {
    jobs:          8,
    quotes:        7,
    invoices:      8,
    service_calls: 3730, // 100000 + 3730 = 103730 — next call after sample data (103727 is highest)
    po:            3,
    ...defaults,
  }
  Object.entries(merged).forEach(([module, value]) => {
    const key = KEYS[module] || `customsfieldpro_counter_${module}`
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, String(value))
    }
  })
}
