// ── Activity Log Utility ──────────────────────────────────────────────────────
// All activity is stored in localStorage under 'ff_activity_log'
// Log entries are pruned after 90 days.

const LOG_KEY    = 'ff_activity_log'
const SESSION_KEY = 'fieldflow_user'
const MAX_AGE_MS  = 90 * 24 * 60 * 60 * 1000   // 90 days

// ── Action type constants (export for use across the app) ─────────────────────
export const ACTIONS = {
  USER_LOGIN:          'USER_LOGIN',
  USER_LOGOUT:         'USER_LOGOUT',
  CLIENT_CREATED:      'CLIENT_CREATED',
  CLIENT_UPDATED:      'CLIENT_UPDATED',
  CLIENT_DELETED:      'CLIENT_DELETED',
  JOB_CREATED:         'JOB_CREATED',
  JOB_UPDATED:         'JOB_UPDATED',
  JOB_STATUS_UPDATED:  'JOB_STATUS_UPDATED',
  JOB_DELETED:         'JOB_DELETED',
  INVOICE_CREATED:     'INVOICE_CREATED',
  INVOICE_PAID:        'INVOICE_PAID',
  INVOICE_SENT:        'INVOICE_SENT',
  INVOICE_DELETED:     'INVOICE_DELETED',
  QUOTE_CREATED:       'QUOTE_CREATED',
  QUOTE_SENT:          'QUOTE_SENT',
  QUOTE_APPROVED:      'QUOTE_APPROVED',
  QUOTE_CONVERTED:     'QUOTE_CONVERTED',
  REQUEST_CREATED:     'REQUEST_CREATED',
  REQUEST_CONVERTED:   'REQUEST_CONVERTED',
  USER_CREATED:        'USER_CREATED',
  USER_UPDATED:        'USER_UPDATED',
  USER_DELETED:        'USER_DELETED',
  PERMISSION_CHANGED:       'PERMISSION_CHANGED',
  SETTINGS_UPDATED:         'SETTINGS_UPDATED',
  // Diagnosis & Parts workflow
  JOB_DIAGNOSIS_SUBMITTED:  'JOB_DIAGNOSIS_SUBMITTED',
  PARTS_ADDED:              'PARTS_ADDED',
  PARTS_RECEIVED:           'PARTS_RECEIVED',
  JOB_PIPELINE_ADVANCED:    'JOB_PIPELINE_ADVANCED',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function readLog() {
  try {
    const raw = localStorage.getItem(LOG_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function writeLog(entries) {
  localStorage.setItem(LOG_KEY, JSON.stringify(entries))
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Log an activity. Call this after any significant data change.
 *
 * @param {string} action      - One of ACTIONS.*
 * @param {string} module      - 'Jobs' | 'Clients' | 'Invoices' | 'Quotes' | 'Requests' | 'Users' | 'Settings' | 'Auth'
 * @param {string} recordId    - ID of the affected record (e.g. 'JOB-1042')
 * @param {string} recordLabel - Human-readable label (e.g. 'Job #JOB-1042 - Martha Reynolds')
 * @param {string} details     - Free-text description of what changed
 * @param {object} [userOverride] - Optional: pass user explicitly (used for login before state is set)
 */
export function logActivity(action, module, recordId, recordLabel, details, userOverride = null) {
  try {
    const user = userOverride || getCurrentUser()
    const entry = {
      id:          `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp:   Date.now(),
      userId:      user?.id   || 'system',
      userName:    user?.name || 'System',
      userRole:    user?.role || 'unknown',
      action,
      module,
      recordId:    recordId    || '',
      recordLabel: recordLabel || '',
      details:     details     || '',
      ipAddress:   'N/A',
    }
    const existing = readLog()
    writeLog([entry, ...existing])
  } catch {
    // Never throw — logging should never break app flow
  }
}

/**
 * Get filtered activity log.
 *
 * @param {object} filters
 * @param {string}  [filters.dateRange]  - 'today' | '7days' | '30days' | 'custom'
 * @param {string}  [filters.customFrom] - ISO date string (for custom range)
 * @param {string}  [filters.customTo]   - ISO date string (for custom range)
 * @param {string}  [filters.userId]     - Filter by user ID
 * @param {string}  [filters.module]     - Filter by module name
 * @param {string}  [filters.action]     - Filter by action type
 * @param {string}  [filters.search]     - Free-text search on details / recordLabel
 */
export function getActivityLog(filters = {}) {
  const entries = readLog()
  const now = Date.now()

  return entries.filter(entry => {
    // Date range
    if (filters.dateRange && filters.dateRange !== 'all') {
      let cutoff = 0
      if (filters.dateRange === 'today') {
        const today = new Date(); today.setHours(0, 0, 0, 0)
        cutoff = today.getTime()
      } else if (filters.dateRange === '7days') {
        cutoff = now - 7  * 24 * 60 * 60 * 1000
      } else if (filters.dateRange === '30days') {
        cutoff = now - 30 * 24 * 60 * 60 * 1000
      } else if (filters.dateRange === 'custom') {
        const from = filters.customFrom ? new Date(filters.customFrom).getTime() : 0
        const to   = filters.customTo   ? new Date(filters.customTo + 'T23:59:59').getTime() : now
        if (entry.timestamp < from || entry.timestamp > to) return false
        return true
      }
      if (entry.timestamp < cutoff) return false
    }

    if (filters.userId && filters.userId !== 'all' && entry.userId !== filters.userId) return false
    if (filters.module && filters.module !== 'All'  && entry.module !== filters.module) return false
    if (filters.action && filters.action !== 'All'  && entry.action !== filters.action) return false

    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!entry.details?.toLowerCase().includes(q) &&
          !entry.recordLabel?.toLowerCase().includes(q) &&
          !entry.userName?.toLowerCase().includes(q)) return false
    }

    return true
  })
}

/**
 * Remove log entries older than 90 days and return the number removed.
 */
export function clearOldLogs() {
  const cutoff = Date.now() - MAX_AGE_MS
  const entries = readLog()
  const fresh = entries.filter(e => e.timestamp >= cutoff)
  writeLog(fresh)
  return entries.length - fresh.length
}

/**
 * Wipe the entire log (used in dev/testing).
 */
export function clearAllLogs() {
  writeLog([])
}
