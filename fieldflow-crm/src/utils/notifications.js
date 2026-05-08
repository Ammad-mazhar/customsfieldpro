// ── Notifications Utility ─────────────────────────────────────────────────────
// Stores all notifications in localStorage under 'fieldflow_notifications'

const NOTIF_KEY   = 'fieldflow_notifications'
const SESSION_KEY = 'fieldflow_user'

// ── Notification type constants ───────────────────────────────────────────────
export const NOTIF_TYPES = {
  NEW_REQUEST:              'NEW_REQUEST',
  JOB_ASSIGNED:             'JOB_ASSIGNED',
  JOB_COMPLETED:            'JOB_COMPLETED',
  INVOICE_OVERDUE:          'INVOICE_OVERDUE',
  QUOTE_APPROVED:           'QUOTE_APPROVED',
  USER_CREATED:             'USER_CREATED',
  // Diagnosis & Parts pipeline
  JOB_DIAGNOSIS_SUBMITTED:  'JOB_DIAGNOSIS_SUBMITTED',
  PARTS_REQUIRED:           'PARTS_REQUIRED',
  PARTS_ORDERED:            'PARTS_ORDERED',
  PARTS_RECEIVED:           'PARTS_RECEIVED',
  JOB_READY_TO_SCHEDULE:    'JOB_READY_TO_SCHEDULE',
  JOB_STATUS_CHANGED:       'JOB_STATUS_CHANGED',
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
    const raw = localStorage.getItem('fieldflow_users')
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

// ── Job status-change notification helpers ────────────────────────────────────

/**
 * Fire the right notification(s) when a job moves to a new status.
 * Call this from Jobs.jsx / MyJobs.jsx whenever job.status changes.
 */
export function notifyJobStatusChange(job, newStatus, tech = null, extraData = {}) {
  const id      = job.id
  const client  = job.clientName || 'Client'
  const techName = tech?.name || job.techName || 'Technician'
  const address = job.clientAddress || ''

  switch (newStatus) {
    case 'diagnosis_required':
      if (tech?.userId) {
        createNotification(
          NOTIF_TYPES.JOB_STATUS_CHANGED,
          'Diagnosis Required',
          `Job ${id} for ${client} requires diagnosis. Address: ${address}`,
          tech.userId, 'Jobs', id
        )
      }
      break

    case 'material_required':
      notifyAdmins(NOTIF_TYPES.PARTS_REQUIRED, `Parts Needed — ${client}`,
        `${techName} reported parts needed for ${id}. Review required parts.`, 'Jobs', id)
      if (tech?.userId) {
        createNotification(NOTIF_TYPES.PARTS_REQUIRED, 'Parts Order Confirmed',
          `Parts for ${id} have been noted. You will be notified when they arrive.`,
          tech.userId, 'Jobs', id)
      }
      break

    case 'waiting_on_parts': {
      const partCount    = extraData.partCount || 1
      const expectedDate = extraData.expectedDate || 'TBD'
      const expectedTime = extraData.expectedTime || ''
      const location     = extraData.location || ''
      notifyAdmins(NOTIF_TYPES.PARTS_ORDERED,
        `Job Waiting on Parts — ${id}`,
        `${partCount} part(s) needed for ${client}. Expected arrival: ${expectedDate}`,
        'Jobs', id)
      if (tech?.userId) {
        createNotification(NOTIF_TYPES.PARTS_ORDERED, 'Parts Ordered for Your Job',
          `Parts for ${client} have been ordered. Expected arrival: ${expectedDate}${expectedTime ? ' at ' + expectedTime : ''}. Location: ${location || 'TBD'}.`,
          tech.userId, 'Jobs', id)
      }
      break
    }

    case 'parts_received':
      notifyAdmins(NOTIF_TYPES.PARTS_RECEIVED,
        `📦 Parts Received — ${id} Ready to Schedule`,
        `All parts for ${client} received by ${techName}. Job is ready to schedule.`,
        'Jobs', id)
      if (tech?.userId) {
        createNotification(NOTIF_TYPES.PARTS_RECEIVED, 'Parts Confirmed',
          `Parts receipt confirmed for ${id}. Admin will schedule your repair visit.`,
          tech.userId, 'Jobs', id)
      }
      break

    case 'ready_to_schedule':
      notifyAdmins(NOTIF_TYPES.JOB_READY_TO_SCHEDULE,
        `🗓️ Ready to Schedule — ${client}`,
        `${id} is ready to schedule. All parts available. Click to schedule now.`,
        'Jobs', id)
      break

    case 'scheduled': {
      const date = extraData.date || job.date || ''
      const time = extraData.time || job.time || ''
      if (tech?.userId) {
        createNotification(NOTIF_TYPES.JOB_ASSIGNED, 'Repair Job Scheduled',
          `${id} for ${client} scheduled for ${date}${time ? ' at ' + time : ''}. Address: ${address}`,
          tech.userId, 'Jobs', id)
      }
      break
    }

    case 'completed':
      notifyAdmins(NOTIF_TYPES.JOB_COMPLETED,
        `✅ Job Completed — ${client}`,
        `${id} completed by ${techName}. Review and send invoice.`,
        'Jobs', id)
      break

    default:
      break
  }
}

/**
 * Check if any parts are expected today or tomorrow and fire SMS-style
 * in-app reminders. Call on app load from App.jsx.
 */
export function checkPartsReminders() {
  try {
    const raw  = localStorage.getItem('ff_jobs')
    const jobs = raw ? JSON.parse(raw) : []
    const today    = new Date(); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)

    jobs.forEach(job => {
      ;(job.partsRequired || []).forEach(part => {
        if (!part.expectedDate || part.status === 'received') return
        const d = new Date(part.expectedDate + 'T00:00:00'); d.setHours(0,0,0,0)
        const isTomorrow = d.getTime() === tomorrow.getTime()
        const isToday    = d.getTime() === today.getTime()
        if (!isTomorrow && !isToday) return

        const adminIds = getAdminIds()
        adminIds.forEach(uid => {
          const msg = isTomorrow
            ? `📦 Parts reminder: "${part.partName}" for ${job.clientName} (${job.id}) arrives TOMORROW${part.expectedTime ? ' at ' + part.expectedTime : ''} at ${part.location || 'TBD'}.`
            : `📦 Parts arriving today: "${part.partName}" for ${job.clientName} (${job.id})${part.expectedTime ? ' at ' + part.expectedTime : ''} at ${part.location || 'TBD'}.`
          createNotification(NOTIF_TYPES.PARTS_ORDERED, 'Parts Reminder', msg, uid, 'Jobs', job.id)
        })
      })
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

// ── Capacitor Push Notifications ─────────────────────────────────────────────

const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())

/**
 * Initialize Capacitor push notifications.
 * Requests permission, registers device token, and wires up tap handler.
 * Call once from App.jsx after app mounts.
 */
export async function initPushNotifications() {
  if (!isNative()) return

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    // Request permission
    const permResult = await PushNotifications.requestPermissions()
    if (permResult.receive !== 'granted') return

    // Register with APNs / FCM
    await PushNotifications.register()

    // Registration token (send to your server for targeting — localStorage for now)
    PushNotifications.addListener('registration', token => {
      localStorage.setItem('fieldflow_push_token', token.value)
    })

    PushNotifications.addListener('registrationError', err => {
      console.error('[push] registration error:', err)
    })

    // Foreground push received
    PushNotifications.addListener('pushNotificationReceived', notification => {
      // Store it as an in-app notification so it appears in the bell
      const user = getCurrentUser()
      if (user) {
        createNotification(
          notification.data?.type || NOTIF_TYPES.NEW_REQUEST,
          notification.title || 'New Notification',
          notification.body || '',
          user.id,
          notification.data?.module || '',
          notification.data?.recordId || ''
        )
      }
    })

    // User tapped a push notification
    PushNotifications.addListener('pushNotificationActionPerformed', action => {
      const data = action.notification.data || {}
      if (data.module && data.recordId) {
        // Navigate to the relevant page — dispatched as a custom event
        window.dispatchEvent(new CustomEvent('fieldflow:push-tap', { detail: data }))
      }
    })
  } catch (err) {
    console.error('[push] init error:', err)
  }
}

/**
 * Schedule a local notification (e.g. appointment reminder).
 * @param {object} opts - { title, body, id, scheduleAt: Date }
 */
export async function scheduleLocalNotification({ title, body, id, scheduleAt }) {
  if (!isNative()) return

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const permResult = await LocalNotifications.requestPermissions()
    if (permResult.display !== 'granted') return

    await LocalNotifications.schedule({
      notifications: [{
        title,
        body,
        id: id || Math.floor(Math.random() * 100000),
        schedule: { at: scheduleAt instanceof Date ? scheduleAt : new Date(scheduleAt) },
        sound: 'default',
        smallIcon: 'ic_stat_icon_config_sample',
        iconColor: '#2563eb',
      }],
    })
  } catch (err) {
    console.error('[local-notif] schedule error:', err)
  }
}

// Run seed + overdue check + maintenance reminders on import
import { checkMaintenanceReminders } from './maintenanceReminders'
seedDemoNotifications()
checkOverdueInvoices()
checkMaintenanceReminders()
