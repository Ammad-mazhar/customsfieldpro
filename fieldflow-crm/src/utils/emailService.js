// ── EmailJS Email Service ──────────────────────────────────────────────────────
// Uses EmailJS (emailjs.com) — no backend required, free tier available.
// Config is stored in localStorage under 'customsfieldpro_emailjs'.

import emailjs from '@emailjs/browser'
import { logActivity, ACTIONS } from './activityLog'
import { getSettings } from '../data/store'

const EMAILJS_KEY = 'customsfieldpro_emailjs'

export const DEFAULT_CONFIG = {
  serviceId:                    '',
  templateId_job_assigned:      '',
  templateId_invoice:           '',
  templateId_quote:             '',
  templateId_request_confirmation: '',
  templateId_job_completion:    '',
  templateId_password_reset:    '',
  publicKey:                    '',
}

// ── Config helpers ─────────────────────────────────────────────────────────────

export function getEmailConfig() {
  try {
    const raw = localStorage.getItem(EMAILJS_KEY)
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG }
  } catch { return { ...DEFAULT_CONFIG } }
}

export function saveEmailConfig(cfg) {
  localStorage.setItem(EMAILJS_KEY, JSON.stringify(cfg))
}

function isConfigured(cfg) {
  return !!(cfg.serviceId && cfg.publicKey)
}

// ── Core send ─────────────────────────────────────────────────────────────────

async function send(templateId, params) {
  const cfg = getEmailConfig()
  if (!isConfigured(cfg)) {
    console.log('[EmailJS] Not configured — skipping email send.')
    return { success: false, reason: 'not_configured' }
  }
  if (!templateId) {
    console.log('[EmailJS] No template ID — skipping email send.')
    return { success: false, reason: 'no_template' }
  }
  try {
    await emailjs.send(cfg.serviceId, templateId, params, cfg.publicKey)
    return { success: true }
  } catch (err) {
    const msg = err?.text || err?.message || String(err)
    console.error('[EmailJS] Send failed:', msg)
    return { success: false, error: msg }
  }
}

// ── Email functions ────────────────────────────────────────────────────────────

/**
 * Send job-assigned email to technician.
 * Template vars: {{technician_name}}, {{job_number}}, {{client_name}}, {{address}},
 *                {{scheduled_time}}, {{service_type}}, {{priority}}, {{company_name}}
 */
export async function sendJobAssignedEmail(job, technician) {
  const cfg = getEmailConfig()
  const settings = getSettings()
  const params = {
    to_email:        technician?.email || '',
    technician_name: technician?.name  || job.techName || '',
    job_number:      job.id,
    client_name:     job.clientName,
    address:         job.clientAddress || '',
    scheduled_time:  job.date ? `${job.date}${job.time ? ' at ' + job.time : ''}` : 'TBD',
    service_type:    job.type,
    priority:        job.priority || 'Normal',
    description:     job.description || '',
    company_name:    settings?.company?.name || 'CustomsFieldPro',
  }
  const result = await send(cfg.templateId_job_assigned, params)
  if (result.success) {
    logActivity(ACTIONS.JOB_ASSIGNED, 'Jobs', job.id, `${job.id} – ${job.clientName}`, `Job assignment email sent to ${params.to_email}.`)
  }
  return result
}

/**
 * Send invoice email to client.
 * Template vars: {{client_name}}, {{invoice_number}}, {{amount}}, {{due_date}}, {{company_name}}
 */
export async function sendInvoiceEmail(invoice, client) {
  const cfg = getEmailConfig()
  const settings = getSettings()
  const params = {
    to_email:       invoice.clientEmail || client?.email || '',
    client_name:    invoice.clientName  || client?.name  || '',
    invoice_number: invoice.id,
    amount:         `$${(invoice.total || 0).toLocaleString()}`,
    due_date:       invoice.due || 'Upon receipt',
    job_reference:  invoice.jobRef || '',
    notes:          invoice.notes || '',
    company_name:   settings?.company?.name  || 'CustomsFieldPro',
    company_phone:  settings?.company?.phone || '',
    company_email:  settings?.company?.email || '',
  }
  const result = await send(cfg.templateId_invoice, params)
  if (result.success) {
    logActivity(ACTIONS.INVOICE_SENT, 'Invoices', invoice.id, `${invoice.id} – ${invoice.clientName}`, `Invoice email sent to ${params.to_email}.`)
  }
  return result
}

/**
 * Send quote email to client.
 * Template vars: {{client_name}}, {{quote_number}}, {{amount}}, {{valid_until}},
 *                {{service_type}}, {{company_name}}
 */
export async function sendQuoteEmail(quote, client) {
  const cfg = getEmailConfig()
  const settings = getSettings()
  const params = {
    to_email:     quote.clientEmail || client?.email || '',
    client_name:  quote.clientName  || client?.name  || '',
    quote_number: quote.id,
    amount:       `$${(quote.total || 0).toLocaleString()}`,
    valid_until:  quote.expires || '',
    service_type: quote.type || '',
    description:  quote.description || '',
    company_name: settings?.company?.name  || 'CustomsFieldPro',
    company_phone:settings?.company?.phone || '',
    company_email:settings?.company?.email || '',
  }
  const result = await send(cfg.templateId_quote, params)
  if (result.success) {
    logActivity(ACTIONS.QUOTE_SENT, 'Quotes', quote.id, `${quote.id} – ${quote.clientName}`, `Quote email sent to ${params.to_email}.`)
  }
  return result
}

/**
 * Send request confirmation email to client.
 * Template vars: {{client_name}}, {{service_type}}, {{reference_number}},
 *                {{preferred_date}}, {{company_name}}
 */
export async function sendRequestConfirmation(request, client) {
  const cfg = getEmailConfig()
  const settings = getSettings()
  const email = client?.email || ''
  if (!email) return { success: false, reason: 'no_email' }
  const params = {
    to_email:         email,
    client_name:      request.clientName || client?.name || '',
    service_type:     request.type,
    reference_number: request.id,
    preferred_date:   request.preferredDate !== '—' ? request.preferredDate : 'To be confirmed',
    priority:         request.priority,
    description:      request.description || '',
    company_name:     settings?.company?.name  || 'CustomsFieldPro',
    company_phone:    settings?.company?.phone || '',
    company_email:    settings?.company?.email || '',
  }
  const result = await send(cfg.templateId_request_confirmation, params)
  if (result.success) {
    logActivity(ACTIONS.REQUEST_CREATED, 'Requests', request.id, `${request.id} – ${request.clientName}`, `Confirmation email sent to ${email}.`)
  }
  return result
}

/**
 * Send job completion notification to client.
 * Template vars: {{client_name}}, {{job_number}}, {{service_type}}, {{technician_name}},
 *                {{completion_notes}}, {{company_name}}
 */
export async function sendJobCompletionEmail(job, client) {
  const cfg = getEmailConfig()
  const settings = getSettings()
  const email = job.clientEmail || client?.email || ''
  if (!email) return { success: false, reason: 'no_email' }
  const params = {
    to_email:         email,
    client_name:      job.clientName || client?.name || '',
    job_number:       job.id,
    service_type:     job.type,
    technician_name:  job.techName || '',
    completion_notes: job.completionNotes || 'Job completed successfully.',
    company_name:     settings?.company?.name  || 'CustomsFieldPro',
    company_phone:    settings?.company?.phone || '',
    company_email:    settings?.company?.email || '',
  }
  const result = await send(cfg.templateId_job_completion, params)
  if (result.success) {
    logActivity(ACTIONS.JOB_STATUS_UPDATED, 'Jobs', job.id, `${job.id} – ${job.clientName}`, `Job completion email sent to ${email}.`)
  }
  return result
}

/**
 * Send temporary password to a user (password reset).
 * Template vars: {{user_name}}, {{temp_password}}, {{company_name}}
 */
export async function sendPasswordResetEmail(user, tempPassword) {
  const cfg = getEmailConfig()
  const settings = getSettings()
  const params = {
    to_email:      user.email || '',
    user_name:     user.name  || user.email || '',
    temp_password: tempPassword,
    company_name:  settings?.company?.name || 'CustomsFieldPro',
  }
  const result = await send(cfg.templateId_password_reset, params)
  if (result.success) {
    logActivity(ACTIONS.SETTINGS_UPDATED, 'Users', user.id, user.name, `Password reset email sent to ${user.email}.`)
  }
  return result
}

/**
 * Send a test email to verify EmailJS is configured correctly.
 */
export async function sendTestEmail(toEmail) {
  const cfg = getEmailConfig()
  if (!isConfigured(cfg)) return { success: false, reason: 'not_configured' }
  const settings = getSettings()

  // Use first available template for the test
  const templateId = cfg.templateId_job_assigned || cfg.templateId_invoice ||
    cfg.templateId_quote || cfg.templateId_request_confirmation ||
    cfg.templateId_job_completion || cfg.templateId_password_reset

  if (!templateId) return { success: false, reason: 'no_template' }

  const params = {
    to_email:        toEmail,
    technician_name: 'Test User',
    job_number:      'TEST-001',
    client_name:     'Test Client',
    address:         '123 Test Street',
    scheduled_time:  'Today',
    service_type:    'Test',
    priority:        'Normal',
    description:     'This is a test email from CustomsFieldPro to verify your EmailJS configuration.',
    company_name:    settings?.company?.name || 'CustomsFieldPro',
    // cover all template vars in case a non-job template is used
    invoice_number:  'TEST-001',
    amount:          '$0.00',
    due_date:        'N/A',
    job_reference:   '',
    notes:           'Test email',
    quote_number:    'TEST-001',
    valid_until:     'N/A',
    reference_number:'TEST-001',
    preferred_date:  'N/A',
    completion_notes:'N/A',
    user_name:       'Test User',
    temp_password:   'N/A',
    company_phone:   settings?.company?.phone || '',
    company_email:   settings?.company?.email || '',
  }

  try {
    await emailjs.send(cfg.serviceId, templateId, params, cfg.publicKey)
    return { success: true }
  } catch (err) {
    const msg = err?.text || err?.message || String(err)
    return { success: false, error: msg }
  }
}
