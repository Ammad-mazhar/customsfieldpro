// ── Notifications Utility ─────────────────────────────────────────────────────
// Stores all notifications in localStorage under 'customsfieldpro_notifications'

const NOTIF_KEY   = 'customsfieldpro_notifications'
const SESSION_KEY = 'customsfieldpro_user'

// ── Notification type constants ───────────────────────────────────────────────
export const NOTIF_TYPES = {
  NEW_REQUEST:       'NEW_REQUEST',
  JOB_ASSIGNED:      'JOB_ASSIGNED',
  JOB_COMPLETED:     'JOB_COMPLETED',
  INVOICE_OVERDUE:   'INVOICE_OVERDUE',
  QUOTE_APPROVED:    'QUOTE_APPROVED',
  USER_CREATED:      'USER_CREATED',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function readAll() {
  try {
    const raw = localStorage.getItem(NOTIF_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function writeAll(arr) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(arr))
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function getAdminIds() {
  try {
    const raw = localStorage.getItem('customsfieldpro_users')
    const users = raw ? JSON.parse(raw) : []
    return users.filter(u => u.role === 'admin').map(u => u.id)
  } catch { return ['user-1'] }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Create a notification for a target user.
 */
export function createNotification(type, title, description, targetUserId, relatedModule, relatedRecordId) {
  try {
    // Prevent duplicates: same type + record already exists unread
    const existing = readAll()
    const isDupe = existing.some(n =>
      n.type === type &&
      n.relatedRecordId === relatedRecordId &&
      n.targetUserId === targetUserId &&
      !n.isRead
    )
    if (isDupe) return null

    const notif = {
      id:              `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      title,
      description,
      targetUserId,
      relatedModule:   relatedModule   || '',
      relatedRecordId: relatedRecordId || '',
      isRead:          false,
      createdAt:       Date.now(),
    }
    writeAll([notif, ...existing])
    return notif
  } catch { return null }
}

/**
 * Create notifications for all admin users.
 */
export function notifyAdmins(type, title, description, relatedModule, relatedRecordId) {
  const adminIds = getAdminIds()
  adminIds.forEach(id => createNotification(type, title, description, id, relatedModule, relatedRecordId))
}

/**
 * Get notifications for a specific user (newest first).
 */
export function getNotifications(userId) {
  if (!userId) return []
  return readAll().filter(n => n.targetUserId === userId)
}

/**
 * Mark a single notification as read.
 */
export function markAsRead(notificationId) {
  const updated = readAll().map(n => n.id === notificationId ? { ...n, isRead: true } : n)
  writeAll(updated)
}

/**
 * Mark all notifications for a user as read.
 */
export function markAllAsRead(userId) {
  const updated = readAll().map(n => n.targetUserId === userId ? { ...n, isRead: true } : n)
  writeAll(updated)
}

/**
 * Get unread count for a user.
 */
export function getUnreadCount(userId) {
  if (!userId) return 0
  return readAll().filter(n => n.targetUserId === userId && !n.isRead).length
}

/**
 * Check for overdue invoices and create admin notifications if not already created.
 * Call on app load.
 */
export function checkOverdueInvoices() {
  try {
    const raw = localStorage.getItem('ff_invoices')
    const invoices = raw ? JSON.parse(raw) : []
    const today = new Date().toISOString().split('T')[0]

    invoices.forEach(inv => {
      if (inv.status === 'Overdue' || (inv.due && inv.due < today && inv.status !== 'Paid' && inv.status !== 'Draft')) {
        notifyAdmins(
          NOTIF_TYPES.INVOICE_OVERDUE,
          'Invoice Overdue',
          `Invoice ${inv.id} is overdue — ${inv.clientName}`,
          'Invoices',
          inv.id
        )
      }
    })
  } catch { /* silent */ }
}

// ── Seed demo notifications ───────────────────────────────────────────────────
export function seedDemoNotifications() {
  if (localStorage.getItem(NOTIF_KEY)) return   // already seeded
  const now = Date.now()
  const demo = [
    {
      id: 'notif-d1', type: 'NEW_REQUEST', title: 'New Service Request',
      description: 'New service request from Harbor Clinic — HVAC Repair, marked Urgent.',
      targetUserId: 'user-1', relatedModule: 'Requests', relatedRecordId: 'REQ-088',
      isRead: false, createdAt: now - 25 * 60 * 1000,
    },
    {
      id: 'notif-d2', type: 'JOB_ASSIGNED', title: 'New Job Assigned',
      description: 'You have been assigned JOB-1042 — Martha Reynolds (HVAC).',
      targetUserId: 'user-2', relatedModule: 'Jobs', relatedRecordId: 'JOB-1042',
      isRead: false, createdAt: now - 1.5 * 60 * 60 * 1000,
    },
    {
      id: 'notif-d3', type: 'JOB_COMPLETED', title: 'Job Completed',
      description: 'JOB-1040 completed by R. Singh — Green Valley School.',
      targetUserId: 'user-1', relatedModule: 'Jobs', relatedRecordId: 'JOB-1040',
      isRead: false, createdAt: now - 3 * 60 * 60 * 1000,
    },
    {
      id: 'notif-d4', type: 'INVOICE_OVERDUE', title: 'Invoice Overdue',
      description: 'Invoice INV-2044 is overdue — Harbor Clinic ($640.00).',
      targetUserId: 'user-1', relatedModule: 'Invoices', relatedRecordId: 'INV-2044',
      isRead: false, createdAt: now - 5 * 60 * 60 * 1000,
    },
    {
      id: 'notif-d5', type: 'QUOTE_APPROVED', title: 'Quote Approved',
      description: 'Quote QUO-508 approved by Sunrise Apartments ($9,750).',
      targetUserId: 'user-1', relatedModule: 'Quotes', relatedRecordId: 'QUO-508',
      isRead: true, createdAt: now - 8 * 60 * 60 * 1000,
    },
    {
      id: 'notif-d6', type: 'INVOICE_OVERDUE', title: 'Invoice Overdue',
      description: 'Invoice INV-2043 is overdue — City Hall Complex ($4,200.00).',
      targetUserId: 'user-1', relatedModule: 'Invoices', relatedRecordId: 'INV-2043',
      isRead: false, createdAt: now - 12 * 60 * 60 * 1000,
    },
    {
      id: 'notif-d7', type: 'JOB_ASSIGNED', title: 'New Job Assigned',
      description: 'You have been assigned JOB-1041 — Sunrise Apartments (Plumbing).',
      targetUserId: 'user-3', relatedModule: 'Jobs', relatedRecordId: 'JOB-1041',
      isRead: true, createdAt: now - 18 * 60 * 60 * 1000,
    },
    {
      id: 'notif-d8', type: 'USER_CREATED', title: 'New Account Created',
      description: 'New account created for K. Patel (Technician).',
      targetUserId: 'user-1', relatedModule: 'Users', relatedRecordId: 'user-5',
      isRead: true, createdAt: now - 26 * 60 * 60 * 1000,
    },
    {
      id: 'notif-d9', type: 'NEW_REQUEST', title: 'New Service Request',
      description: 'New service request from Martha Reynolds — Plumbing leak.',
      targetUserId: 'user-1', relatedModule: 'Requests', relatedRecordId: 'REQ-087',
      isRead: true, createdAt: now - 30 * 60 * 60 * 1000,
    },
    {
      id: 'notif-d10', type: 'JOB_COMPLETED', title: 'Job Completed',
      description: 'JOB-1039 completed by D. Moore — Frank Holloway.',
      targetUserId: 'user-1', relatedModule: 'Jobs', relatedRecordId: 'JOB-1039',
      isRead: true, createdAt: now - 48 * 60 * 60 * 1000,
    },
  ]
  writeAll(demo)
}

// Run seed + overdue check + maintenance reminders on import
import { checkMaintenanceReminders } from './maintenanceReminders'
seedDemoNotifications()
checkOverdueInvoices()
checkMaintenanceReminders()
