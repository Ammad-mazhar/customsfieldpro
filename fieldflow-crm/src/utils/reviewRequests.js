import { getSettings } from '../data/store'
import { logActivity, ACTIONS } from './activityLog'
import { addInboxMessage } from '../data/store'
import { replacePlaceholders } from './reviewEmailTemplate'

const REQUESTS_KEY = 'fieldflow_review_requests'

// ─── Storage helpers ──────────────────────────────────────────────────────────
export function getReviewRequests() {
  try { return JSON.parse(localStorage.getItem(REQUESTS_KEY) || '[]') } catch { return [] }
}

function saveReviewRequests(arr) {
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(arr))
}

export function markReviewRequested(clientId, jobId, channel = 'sms', status = 'sent') {
  const requests = getReviewRequests()
  requests.push({
    id: `rr-${Date.now()}`,
    clientId, jobId, channel, status,
    sentAt: Date.now(),
    clickedAt: null,
  })
  saveReviewRequests(requests)
}

export function markReviewClicked(clientId) {
  const all = getReviewRequests()
  const cutoff = Date.now() - 90 * 86400000
  const updated = all.map(r =>
    r.clientId === clientId && r.sentAt > cutoff && !r.clickedAt
      ? { ...r, clickedAt: Date.now(), status: 'clicked' }
      : r
  )
  saveReviewRequests(updated)
}

export function checkRecentReviewRequest(clientId, days = 90) {
  const requests = getReviewRequests()
  const cutoff = Date.now() - days * 86400000
  return requests.some(r => r.clientId === clientId && r.sentAt > cutoff)
}

export function getReviewRequestsForClient(clientId) {
  return getReviewRequests().filter(r => r.clientId === clientId)
    .sort((a, b) => b.sentAt - a.sentAt)
}

export function getReviewStats() {
  const all = getReviewRequests()
  const now = Date.now()
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const thisMonth = all.filter(r => r.sentAt >= monthStart.getTime())
  const clicked   = thisMonth.filter(r => r.status === 'clicked').length
  return {
    sentThisMonth:    thisMonth.length,
    totalSent:        all.length,
    clickedThisMonth: clicked,
    estimatedNewReviews: Math.round(thisMonth.length * 0.35),
    conversionPct:    thisMonth.length ? Math.round((clicked / thisMonth.length) * 100) : 35,
  }
}

// ─── Delay helpers ────────────────────────────────────────────────────────────
function getDelayMs(setting) {
  const delays = {
    immediately:  0,
    '30min':      30 * 60 * 1000,
    '1hour':      60 * 60 * 1000,
    '2hours':     2 * 60 * 60 * 1000,
    '24hours':    24 * 60 * 60 * 1000,
    next_morning: getMsUntilNextMorning(),
  }
  return delays[setting] ?? delays['1hour']
}

function getMsUntilNextMorning() {
  const t = new Date()
  t.setDate(t.getDate() + 1)
  t.setHours(9, 0, 0, 0)
  return t.getTime() - Date.now()
}

// ─── Should-skip checks ───────────────────────────────────────────────────────
function shouldSkip(job, client, reviewSettings) {
  // Opted-out client
  if (client?.reviewOptedOut) return { skip: true, reason: 'opted_out' }

  // Already sent recently
  const dayLimit = reviewSettings.skipIfRecentDays ?? 90
  if (checkRecentReviewRequest(client?.id || client?.clientId, dayLimit))
    return { skip: true, reason: 'recent_request' }

  // Bad statuses
  const badStatuses = new Set(['05B', '05C', 'not_repairable', 'customer_refused', 'Cancelled'])
  if (badStatuses.has(job?.status)) return { skip: true, reason: 'bad_status' }

  // Low rating
  if (reviewSettings.onlyHighRatings && job?.rating?.overall) {
    if (job.rating.overall <= 2) return { skip: true, reason: 'low_rating' }
    if (job.rating.overall === 3) return { skip: true, reason: 'neutral_rating' }
  }

  return { skip: false }
}

// ─── Main trigger ─────────────────────────────────────────────────────────────
export function triggerReviewRequest(job, client, technician) {
  const settings = getSettings()
  const reviewSettings = settings.reviews

  if (!reviewSettings?.enabled) return
  if (!reviewSettings?.googleReviewUrl) return

  const clientObj = client || {
    id: job.clientId,
    firstName: (job.clientName || '').split(' ')[0],
    name: job.clientName,
    phone: job.clientPhone,
    email: job.clientEmail,
    reviewOptedOut: false,
  }

  const { skip, reason } = shouldSkip(job, clientObj, reviewSettings)
  if (skip) {
    if (reason === 'neutral_rating') {
      // Log neutral rating — admin should follow up
      try {
        logActivity(
          'REVIEW_REQUEST_SKIPPED',
          'Jobs', job.id, job.id,
          `Neutral rating (3★) from ${clientObj.firstName || clientObj.name} — consider follow-up.`
        )
      } catch {}
    }
    return
  }

  const delayMs = getDelayMs(reviewSettings.sendAfter || '1hour')
  setTimeout(() => {
    sendReviewRequest(job, clientObj, technician, reviewSettings, settings)
  }, Math.max(0, delayMs))
}

async function sendReviewRequest(job, client, technician, reviewSettings, fullSettings) {
  const companyName = fullSettings?.company?.name || 'FieldFlow CRM'
  const companyAddress = fullSettings?.company?.address || ''
  const techName = technician?.name || job?.techName || 'our technician'
  const clientFirstName = client?.firstName || (client?.name || '').split(' ')[0] || 'Valued Customer'

  const templateVars = {
    client_name:   clientFirstName,
    company_name:  companyName,
    company_address: companyAddress,
    company_tagline: fullSettings?.company?.tagline || '',
    tech_name:     techName,
    job_type:      job?.type || job?.serviceType || 'service',
    review_link:   reviewSettings.googleReviewUrl,
    job_number:    job?.id || job?.callId || '',
  }

  const smsTemplate = reviewSettings.smsTemplate ||
    `Hi {{client_name}}, thank you for choosing {{company_name}}! We hope {{tech_name}} took great care of you. If you're happy, we'd love a quick Google review: {{review_link}} — it only takes 30 seconds! 🌟`

  const smsBody = replacePlaceholders(smsTemplate, templateVars)
  let channel = 'sms'

  // Send to inbox as outgoing SMS
  if (reviewSettings.sendViaSMS !== false && (client.phone || job.clientPhone)) {
    try {
      addInboxMessage({
        clientId:     client.id || client.clientId || job.clientId,
        clientName:   client.name || job.clientName,
        direction:    'outgoing',
        channel:      'sms',
        body:         smsBody,
        linkedJobId:  job.id || job.callId,
        linkedJobNumber: job.id || job.callId,
        sentBy:       null,
        sentByName:   'FieldFlow (Auto)',
        isRead:       true,
        isInternal:   false,
        status:       'sent',
      })
    } catch {}
    channel = 'sms'
  }

  // Send email to inbox
  if (reviewSettings.sendViaEmail !== false && (client.email || job.clientEmail)) {
    const emailSubject = replacePlaceholders(
      reviewSettings.emailSubject || `How did we do, {{client_name}}? ⭐`,
      templateVars
    )
    try {
      addInboxMessage({
        clientId:     client.id || client.clientId || job.clientId,
        clientName:   client.name || job.clientName,
        direction:    'outgoing',
        channel:      'email',
        subject:      emailSubject,
        body:         smsBody,
        linkedJobId:  job.id || job.callId,
        linkedJobNumber: job.id || job.callId,
        sentBy:       null,
        sentByName:   'FieldFlow (Auto)',
        isRead:       true,
        isInternal:   false,
        status:       'sent',
      })
    } catch {}
    channel = 'email'
  }

  // Mark as sent
  markReviewRequested(
    client.id || client.clientId || job.clientId,
    job.id || job.callId,
    channel,
    'sent'
  )

  // Activity log
  try {
    logActivity(
      'REVIEW_REQUEST_SENT',
      'Jobs',
      job.id || job.callId,
      job.id || job.callId,
      `Google review request sent to ${clientFirstName} via ${reviewSettings.sendViaSMS !== false ? 'SMS' : ''}${reviewSettings.sendViaEmail !== false ? '+Email' : ''}.`
    )
  } catch {}
}

// ─── Default review settings (merged into store settings) ────────────────────
export const DEFAULT_REVIEW_SETTINGS = {
  enabled:              true,
  googleReviewUrl:      '',
  sendViaSMS:           true,
  sendViaEmail:         true,
  sendAfter:            '1hour',
  onlyHighRatings:      true,
  minRatingToSend:      4,
  skipIfRecentDays:     90,
  smsTemplate:          `Hi {{client_name}}, thank you for choosing {{company_name}}!\nWe hope {{tech_name}} took great care of you today.\nIf you're happy with the service, we'd love a quick Google review:\n{{review_link}}\nIt only takes 30 seconds and means the world to us! 🌟`,
  emailSubject:         `How did we do, {{client_name}}? ⭐`,
}
