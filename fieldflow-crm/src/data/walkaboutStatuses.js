// FieldFlow CRM — Walkabout-style alphanumeric status codes
// These codes map the service call workflow to Walkabout CRM's numbering system.

export const WALKABOUT_STATUSES = [
  { code: '01',   label: '01 New Call',           color: '#6B7280', bgColor: '#F3F4F6' },
  { code: '01A',  label: '01A Scheduled',          color: '#2563EB', bgColor: '#EFF6FF' },
  { code: '02',   label: '02 Dispatched',          color: '#7C3AED', bgColor: '#F5F3FF' },
  { code: '02A',  label: '02A Parts Research',     color: '#D97706', bgColor: '#FEF3C7' },
  { code: '02B',  label: '02B Submitted',          color: '#0891B2', bgColor: '#ECFEFF' },
  { code: '02C',  label: '02C Parts Ordered',      color: '#EA580C', bgColor: '#FFF7ED' },
  { code: '02D',  label: '02D Parts Received',     color: '#7C3AED', bgColor: '#F5F3FF' },
  { code: '03',   label: '03 Ready to Schedule',   color: '#2563EB', bgColor: '#EFF6FF' },
  { code: '03A',  label: '03A Repair Scheduled',   color: '#0284C7', bgColor: '#F0F9FF' },
  { code: '03B',  label: '03B Repair Dispatched',  color: '#7C3AED', bgColor: '#EDE9FE' },
  { code: '04',   label: '04 Repair Complete',     color: '#16A34A', bgColor: '#F0FDF4' },
  { code: '04A',  label: '04A Ready to Bill',      color: '#059669', bgColor: '#ECFDF5' },
  { code: '04B',  label: '04B Invoice Sent',       color: '#0891B2', bgColor: '#ECFEFF' },
  { code: '04C',  label: '04C Billed',             color: '#16A34A', bgColor: '#F0FDF4' },
  { code: '05',   label: '05 Closed',              color: '#6B7280', bgColor: '#F9FAFB' },
  { code: '05A',  label: '05A No Fault Found',     color: '#6B7280', bgColor: '#F3F4F6' },
  { code: '05B',  label: '05B Not Repairable',     color: '#DC2626', bgColor: '#FEF2F2' },
  { code: '05C',  label: '05C Customer Refused',   color: '#DC2626', bgColor: '#FEF2F2' },
  { code: '06',   label: '06 On Hold',             color: '#B45309', bgColor: '#FFFBEB' },
  { code: 'DISP', label: 'Dispatched',             color: '#7C3AED', bgColor: '#F5F3FF' },
  { code: 'BILL', label: 'Billed',                 color: '#16A34A', bgColor: '#F0FDF4' },
]

// Maps internal pipeline keys and legacy label strings → Walkabout code
export const STATUS_MAP = {
  // Internal snake_case keys (from jobStatuses.js pipeline)
  'new':                '01',
  'scheduled':          '01A',
  'dispatched':         '02',
  'diagnosis_required': '02A',
  'material_required':  '02A',
  'waiting_on_parts':   '02C',
  'parts_received':     '02D',
  'ready_to_schedule':  '03',
  'ready_for_repair':   '03A',
  'in_progress':        '03B',
  'completed':          '04',
  'ready_to_bill':      '04A',
  'invoice_sent':       '04B',
  'billed':             '04C',
  'closed':             '05',
  'no_fault_found':     '05A',
  'not_repairable':     '05B',
  'customer_refused':   '05C',
  'on_hold':            '06',
  'cancelled':          '05',
  // Legacy label strings (old ServiceCalls.jsx pipeline)
  'New Request':         '01',
  'Quote Sent':          '01A',
  'Awaiting Scheduling': '03',
  'Dispatched':          '02',
  'In Progress':         '03B',
  'Completed':           '04',
  'Invoice Sent':        '04B',
  'Paid':                '04C',
  'Cancelled':           '05',
}

/**
 * Returns the full status definition for a Walkabout code.
 * Falls back gracefully if code is unknown.
 */
export function getStatusByCode(code) {
  if (!code) return WALKABOUT_STATUSES[0]
  const found = WALKABOUT_STATUSES.find(s => s.code === code)
  if (found) return found
  // Legacy string — try mapping first
  const mapped = STATUS_MAP[code]
  if (mapped) return WALKABOUT_STATUSES.find(s => s.code === mapped) || WALKABOUT_STATUSES[0]
  return { code, label: code, color: '#6B7280', bgColor: '#F3F4F6' }
}

/**
 * Converts any status value (legacy string or Walkabout code) → Walkabout code string.
 */
export function mapToWalkabout(status) {
  if (!status) return '01'
  // Already a Walkabout code?
  if (WALKABOUT_STATUSES.some(s => s.code === status)) return status
  return STATUS_MAP[status] || '01'
}
