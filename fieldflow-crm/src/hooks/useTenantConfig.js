import { useState, useCallback } from 'react'

const DEFAULT_CONFIGS = {
  HVAC: {
    services: [
      { id: 's1', name: 'AC Installation',     rate: 150, unit: 'job',  taxable: true },
      { id: 's2', name: 'AC Repair',            rate: 95,  unit: 'hour', taxable: true },
      { id: 's3', name: 'Furnace Tune-Up',      rate: 120, unit: 'job',  taxable: true },
      { id: 's4', name: 'Duct Cleaning',        rate: 200, unit: 'job',  taxable: true },
      { id: 's5', name: 'Filter Replacement',   rate: 35,  unit: 'job',  taxable: true },
      { id: 's6', name: 'Refrigerant Recharge', rate: 85,  unit: 'job',  taxable: true },
    ],
    equipmentTypes: [
      { id: 'e1', name: 'Central AC Unit' },
      { id: 'e2', name: 'Heat Pump' },
      { id: 'e3', name: 'Gas Furnace' },
      { id: 'e4', name: 'Mini-Split System' },
      { id: 'e5', name: 'Air Handler' },
      { id: 'e6', name: 'Thermostat' },
    ],
  },
  'Appliance Repair': {
    services: [
      { id: 's1', name: 'Appliance Diagnosis',  rate: 75,  unit: 'job',  taxable: true },
      { id: 's2', name: 'Washer Repair',         rate: 120, unit: 'job',  taxable: true },
      { id: 's3', name: 'Dryer Repair',          rate: 110, unit: 'job',  taxable: true },
      { id: 's4', name: 'Refrigerator Repair',   rate: 130, unit: 'job',  taxable: true },
      { id: 's5', name: 'Oven/Range Repair',     rate: 115, unit: 'job',  taxable: true },
      { id: 's6', name: 'Dishwasher Repair',     rate: 100, unit: 'job',  taxable: true },
    ],
    equipmentTypes: [
      { id: 'e1', name: 'Washer' },
      { id: 'e2', name: 'Dryer' },
      { id: 'e3', name: 'Refrigerator' },
      { id: 'e4', name: 'Oven / Range' },
      { id: 'e5', name: 'Dishwasher' },
      { id: 'e6', name: 'Microwave' },
    ],
  },
  Cleaning: {
    services: [
      { id: 's1', name: 'Standard Cleaning',    rate: 120, unit: 'job',  taxable: false },
      { id: 's2', name: 'Deep Cleaning',        rate: 220, unit: 'job',  taxable: false },
      { id: 's3', name: 'Move-In/Out Clean',    rate: 280, unit: 'job',  taxable: false },
      { id: 's4', name: 'Window Cleaning',      rate: 80,  unit: 'job',  taxable: false },
      { id: 's5', name: 'Carpet Cleaning',      rate: 150, unit: 'job',  taxable: false },
      { id: 's6', name: 'Post-Construction',    rate: 350, unit: 'job',  taxable: false },
    ],
    equipmentTypes: [],
  },
  General: {
    services: [
      { id: 's1', name: 'Service Call',         rate: 85,  unit: 'job',  taxable: true },
      { id: 's2', name: 'Labour',               rate: 65,  unit: 'hour', taxable: true },
      { id: 's3', name: 'Parts & Materials',    rate: 0,   unit: 'job',  taxable: true },
    ],
    equipmentTypes: [],
  },
}

const DEFAULT_JOB_STATUSES = [
  { id: 'js1', name: 'New',         color: '#6b7280', order: 1 },
  { id: 'js2', name: 'Scheduled',   color: '#2563eb', order: 2 },
  { id: 'js3', name: 'In Progress', color: '#d97706', order: 3 },
  { id: 'js4', name: 'On Hold',     color: '#7c3aed', order: 4 },
  { id: 'js5', name: 'Completed',   color: '#16a34a', order: 5 },
  { id: 'js6', name: 'Cancelled',   color: '#dc2626', order: 6 },
]

const DEFAULT_BUSINESS_HOURS = {
  monday:    { open: true,  from: '08:00', to: '17:00' },
  tuesday:   { open: true,  from: '08:00', to: '17:00' },
  wednesday: { open: true,  from: '08:00', to: '17:00' },
  thursday:  { open: true,  from: '08:00', to: '17:00' },
  friday:    { open: true,  from: '08:00', to: '17:00' },
  saturday:  { open: false, from: '09:00', to: '13:00' },
  sunday:    { open: false, from: '09:00', to: '13:00' },
}

const DEFAULT_NOTIFICATION_TEMPLATES = {
  jobConfirmation: {
    subject: 'Your appointment is confirmed — {{company}}',
    body: 'Hi {{client_name}},\n\nYour service appointment is confirmed for {{appointment_date}} between {{time_window}}.\n\nTechnician: {{tech_name}}\nService: {{service_type}}\n\nQuestions? Call us at {{company_phone}}.\n\n{{company}}',
  },
  jobReminder: {
    subject: 'Reminder: Service tomorrow — {{company}}',
    body: 'Hi {{client_name}},\n\nThis is a reminder that your {{service_type}} appointment is scheduled for tomorrow at {{appointment_time}}.\n\nTechnician: {{tech_name}}\n\n{{company}}',
  },
  invoiceSent: {
    subject: 'Invoice #{{invoice_number}} from {{company}}',
    body: 'Hi {{client_name}},\n\nPlease find your invoice for {{service_type}} completed on {{completion_date}}.\n\nTotal Due: {{invoice_total}}\nDue Date: {{due_date}}\n\nPay online: {{payment_link}}\n\nThank you,\n{{company}}',
  },
  quoteReady: {
    subject: 'Your quote is ready — {{company}}',
    body: 'Hi {{client_name}},\n\nWe have prepared a quote for {{service_type}}.\n\nQuote Total: {{quote_total}}\nValid Until: {{quote_expiry}}\n\nView & approve your quote: {{quote_link}}\n\n{{company}}',
  },
}

const DEFAULT_BRANDING = {
  primaryColor: '#2563eb',
  accentColor:  '#16a34a',
  logoUrl:      '',
  favicon:      '',
  tagline:      '',
  footerText:   '',
  customCss:    '',
}

const DEFAULT_CUSTOM_FIELDS = []

function getStorageKey(tenantId) {
  return `fieldflow_tenant_config_${tenantId || 'default'}`
}

function buildDefault(businessType = 'General') {
  const typeDefaults = DEFAULT_CONFIGS[businessType] || DEFAULT_CONFIGS.General
  return {
    services:               typeDefaults.services,
    equipmentTypes:         typeDefaults.equipmentTypes,
    jobStatuses:            DEFAULT_JOB_STATUSES,
    customFields:           DEFAULT_CUSTOM_FIELDS,
    businessHours:          DEFAULT_BUSINESS_HOURS,
    notificationTemplates:  DEFAULT_NOTIFICATION_TEMPLATES,
    branding:               DEFAULT_BRANDING,
    invoiceTemplate: {
      headerNote: 'Thank you for choosing our services.',
      footerNote: 'Payment due within 30 days.',
      showLogo:   true,
      showTax:    true,
      taxRate:    13,
      currency:   'USD',
    },
    quoteTemplate: {
      headerNote: 'This quote is valid for 30 days.',
      footerNote: 'Terms and conditions apply.',
      showLogo:   true,
      validityDays: 30,
    },
    integrations: {
      googleCalendar: { enabled: false, calendarId: '' },
      quickbooks:     { enabled: false, apiKey: '' },
      stripe:         { enabled: false, publishableKey: '' },
      twilio:         { enabled: false, accountSid: '', authToken: '', fromNumber: '' },
      sendgrid:       { enabled: false, apiKey: '', fromEmail: '' },
      zapier:         { enabled: false, webhookUrl: '' },
    },
  }
}

function loadConfig(tenantId, businessType) {
  try {
    const raw = localStorage.getItem(getStorageKey(tenantId))
    if (!raw) {
      const def = buildDefault(businessType)
      localStorage.setItem(getStorageKey(tenantId), JSON.stringify(def))
      return def
    }
    return JSON.parse(raw)
  } catch {
    return buildDefault(businessType)
  }
}

export function useTenantConfig(tenantId, businessType = 'General') {
  const [config, setConfig] = useState(() => loadConfig(tenantId, businessType))

  const update = useCallback((section, value) => {
    setConfig(prev => {
      const next = { ...prev, [section]: value }
      try { localStorage.setItem(getStorageKey(tenantId), JSON.stringify(next)) } catch {}
      return next
    })
  }, [tenantId])

  const resetSection = useCallback((section) => {
    const def = buildDefault(businessType)
    update(section, def[section])
  }, [businessType, update])

  return { config, update, resetSection }
}
