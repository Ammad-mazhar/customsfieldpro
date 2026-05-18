import {
  getInboxMessages,
  addInboxMessage,
  markConversationRead,
  getUnreadCount,
  getConversations,
  getClientMessages,
  saveInboxMessages,
} from '../data/store'

// Re-export store functions so callers only import from inboxManager
export {
  getInboxMessages,
  markConversationRead,
  getUnreadCount,
  getConversations,
  getClientMessages,
}

/**
 * Send a message (SMS or email) to a client.
 * Saves to local inbox and returns the saved message.
 */
export function sendMessage({ clientId, clientName, channel, subject = '', body, attachments = [], linkedJobId = null, linkedJobNumber = null, sentBy, sentByName }) {
  if (!body?.trim()) return null
  return addInboxMessage({
    clientId, clientName, channel,
    direction: 'outgoing',
    subject, body: body.trim(), attachments,
    linkedJobId, linkedJobNumber,
    sentBy, sentByName,
    isRead: true,
    isInternal: false,
    status: 'sent',
  })
}

/**
 * Log an internal note (not visible to client).
 */
export function logNote({ clientId, clientName, body, linkedJobId = null, linkedJobNumber = null, sentBy, sentByName }) {
  return addInboxMessage({
    clientId, clientName, channel: 'note',
    direction: 'note',
    subject: '', body, attachments: [],
    linkedJobId, linkedJobNumber,
    sentBy, sentByName,
    isRead: true,
    isInternal: true,
    status: 'sent',
  })
}

/**
 * Log a system/automated event to a client's inbox thread.
 */
export function logSystemEvent({ clientId, clientName, body, linkedJobId = null, linkedJobNumber = null }) {
  return addInboxMessage({
    clientId, clientName, channel: 'system',
    direction: 'system',
    subject: '', body, attachments: [],
    linkedJobId, linkedJobNumber,
    sentBy: null, sentByName: null,
    isRead: true,
    isInternal: false,
    status: 'sent',
  })
}

/**
 * Simulate an incoming reply from a client (for demo/testing).
 */
export function simulateIncomingReply({ clientId, clientName, channel = 'sms', body }) {
  return addInboxMessage({
    clientId, clientName, channel,
    direction: 'incoming',
    subject: channel === 'email' ? `Re: CustomsFieldPro message` : '',
    body, attachments: [],
    linkedJobId: null, linkedJobNumber: null,
    sentBy: null, sentByName: null,
    isRead: false,
    isInternal: false,
    status: 'read',
  })
}

// SMS templates
export const SMS_TEMPLATES = [
  {
    id: 'tpl-1', label: 'Technician On The Way',
    body: 'Hi {{client_name}}, your technician is on the way. ETA approximately 30 minutes. We\'ll call before arriving.',
  },
  {
    id: 'tpl-2', label: 'Appointment Reminder',
    body: 'Hi {{client_name}}, this is a reminder for your appointment tomorrow. Reply YES to confirm or call us to reschedule.',
  },
  {
    id: 'tpl-3', label: 'Job Complete',
    body: 'Hi {{client_name}}, your job {{job_number}} has been completed. Your invoice will follow shortly. Thank you!',
  },
  {
    id: 'tpl-4', label: 'Invoice Sent',
    body: 'Hi {{client_name}}, invoice {{invoice_number}} for ${{amount}} has been sent to your email. Thank you!',
  },
  {
    id: 'tpl-5', label: 'Parts Ordered',
    body: 'Hi {{client_name}}, parts for your job {{job_number}} have been ordered. ETA 2–3 business days. We\'ll update you when they arrive.',
  },
  {
    id: 'tpl-6', label: 'Payment Received',
    body: 'Hi {{client_name}}, we\'ve received your payment of ${{amount}}. Thank you! Receipt will be emailed shortly.',
  },
]

export const EMAIL_TEMPLATES = [
  {
    id: 'etpl-1', label: 'Quote Follow-up',
    subject: 'Following up on your quote',
    body: 'Hi {{client_name}},\n\nI wanted to follow up on the quote we sent over. Do you have any questions or would you like to move forward?\n\nPlease feel free to reply or call us anytime.\n\nBest regards,\nCustomsFieldPro Team',
  },
  {
    id: 'etpl-2', label: 'Invoice Reminder',
    subject: 'Invoice {{invoice_number}} — Payment Reminder',
    body: 'Hi {{client_name}},\n\nThis is a friendly reminder that invoice {{invoice_number}} for ${{amount}} is due for payment.\n\nPlease let us know if you have any questions.\n\nThank you,\nCustomsFieldPro Team',
  },
  {
    id: 'etpl-3', label: 'Job Scheduled Confirmation',
    subject: 'Your appointment is confirmed',
    body: 'Hi {{client_name}},\n\nYour service appointment is confirmed for {{date}} at {{time}}. Your technician will be {{tech_name}}.\n\nIf you need to reschedule, please contact us at least 24 hours in advance.\n\nThank you,\nCustomsFieldPro Team',
  },
]

/**
 * Fill template variables with actual values.
 */
export function fillTemplate(template, vars = {}) {
  const defaults = {
    client_name: vars.clientName || 'Valued Customer',
    job_number: vars.jobNumber || '',
    invoice_number: vars.invoiceNumber || '',
    amount: vars.amount || '',
    tech_name: vars.techName || 'our technician',
    date: vars.date || '',
    time: vars.time || '',
  }
  let result = template
  Object.entries(defaults).forEach(([k, v]) => {
    result = result.replace(new RegExp(`{{${k}}}`, 'g'), v)
  })
  return result
}
