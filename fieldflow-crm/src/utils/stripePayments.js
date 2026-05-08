import { getInvoices, saveInvoices } from '../data/store'
import { logActivity, ACTIONS } from './activityLog'

// ─── Config ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'fieldflow_stripe'

export const DEFAULT_STRIPE_CONFIG = {
  publishableKey:      '',
  paymentLinkPrefix:   'https://buy.stripe.com/',
  showPayNowButton:    true,
  sendLinkInEmail:     false,
  webhookConfigured:   false,
}

export function getStripeConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_STRIPE_CONFIG }
    return { ...DEFAULT_STRIPE_CONFIG, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_STRIPE_CONFIG }
  }
}

export function saveStripeConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

/** Returns true when a payment link prefix has been configured */
export function isStripeConfigured() {
  const cfg = getStripeConfig()
  return !!(cfg.paymentLinkPrefix && cfg.paymentLinkPrefix.trim() &&
    cfg.paymentLinkPrefix !== 'https://buy.stripe.com/')
}

// ─── Payment Link ─────────────────────────────────────────────────────────────

/**
 * Generates a Stripe payment link URL for an invoice.
 *
 * Stripe Payment Links support query-string pre-filling:
 *   ?prefilled_email=…  — pre-fills the customer email
 *   ?client_reference_id=… — attaches a reference shown in Stripe dashboard
 *
 * The admin pastes the base URL from their Stripe Dashboard; we append params.
 */
export function generatePaymentLink(invoice) {
  const cfg  = getStripeConfig()
  const base = (cfg.paymentLinkPrefix || '').trim().replace(/\?.*$/, '') // strip existing params

  const params = new URLSearchParams()
  if (invoice.clientEmail) params.set('prefilled_email', invoice.clientEmail)
  if (invoice.id)          params.set('client_reference_id', invoice.id)

  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

// ─── Mark as Paid via Stripe ──────────────────────────────────────────────────

/**
 * Marks an invoice as Paid and records the Stripe payment reference.
 * Returns the updated invoice object, or null if not found.
 */
export function markInvoicePaidViaStripe(invoiceId, stripePaymentId = '') {
  const all = getInvoices()
  const idx = all.findIndex(i => i.id === invoiceId)
  if (idx < 0) return null

  const updated = {
    ...all[idx],
    status:          'Paid',
    paidAt:          new Date().toISOString(),
    stripePaymentId: stripePaymentId || `stripe_${Date.now()}`,
  }
  all[idx] = updated
  saveInvoices(all)
  logActivity(
    ACTIONS.INVOICE_PAID,
    'Invoices',
    invoiceId,
    `${invoiceId} – ${updated.clientName}`,
    `Invoice marked as paid via Stripe${stripePaymentId ? ` (${stripePaymentId})` : ''}.`,
  )
  return updated
}
