// FieldFlow CRM — Job Status Pipeline
// Single source of truth for all job statuses, transitions, and metadata.

export const JOB_STATUSES = [
  {
    key: 'new',
    label: 'New',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: '📋',
    description: 'Job just created',
    allowedNextStatuses: ['diagnosis_required', 'ready_for_repair', 'cancelled'],
    requiresAction: false,
  },
  {
    key: 'diagnosis_required',
    label: 'Diagnosis Required',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
    icon: '🔍',
    description: 'Technician needs to diagnose the issue',
    allowedNextStatuses: ['material_required', 'ready_for_repair', 'cancelled'],
    requiresAction: true,
    actionLabel: 'Submit Diagnosis Report',
    actionModal: 'diagnosis',
  },
  {
    key: 'material_required',
    label: 'Material Required',
    color: '#D97706',
    bgColor: '#FEF3C7',
    icon: '🔩',
    description: 'Parts or materials needed before repair',
    allowedNextStatuses: ['waiting_on_parts', 'ready_for_repair', 'cancelled'],
    requiresAction: true,
    actionLabel: 'Add Required Parts',
    actionModal: 'parts',
  },
  {
    key: 'waiting_on_parts',
    label: 'Waiting on Parts',
    color: '#EA580C',
    bgColor: '#FFF7ED',
    icon: '📦',
    description: 'Parts ordered — waiting for delivery',
    allowedNextStatuses: ['parts_received', 'cancelled'],
    requiresAction: true,
    actionLabel: 'Confirm Parts Received',
    actionModal: 'parts_received',
  },
  {
    key: 'parts_received',
    label: 'Parts Received',
    color: '#0891B2',
    bgColor: '#ECFEFF',
    icon: '✅',
    description: 'Parts arrived — ready to schedule repair',
    allowedNextStatuses: ['ready_to_schedule', 'cancelled'],
    requiresAction: false,
  },
  {
    key: 'ready_to_schedule',
    label: 'Ready to Schedule',
    color: '#2563EB',
    bgColor: '#EFF6FF',
    icon: '📅',
    description: 'All materials ready — schedule the repair',
    allowedNextStatuses: ['scheduled', 'cancelled'],
    requiresAction: true,
    actionLabel: 'Schedule Repair',
    actionModal: 'schedule',
  },
  {
    key: 'ready_for_repair',
    label: 'Ready for Repair',
    color: '#059669',
    bgColor: '#ECFDF5',
    icon: '🔧',
    description: 'No parts needed — ready to repair now',
    allowedNextStatuses: ['scheduled', 'cancelled'],
    requiresAction: false,
  },
  {
    key: 'scheduled',
    label: 'Scheduled',
    color: '#0284C7',
    bgColor: '#F0F9FF',
    icon: '🗓️',
    description: 'Repair appointment scheduled',
    allowedNextStatuses: ['dispatched', 'cancelled'],
    requiresAction: false,
  },
  {
    key: 'dispatched',
    label: 'Dispatched',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    icon: '🚗',
    description: 'Technician on the way',
    allowedNextStatuses: ['in_progress', 'cancelled'],
    requiresAction: false,
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    color: '#B45309',
    bgColor: '#FFFBEB',
    icon: '⚙️',
    description: 'Repair currently underway',
    allowedNextStatuses: ['completed', 'diagnosis_required', 'material_required'],
    requiresAction: false,
  },
  {
    key: 'completed',
    label: 'Completed',
    color: '#16A34A',
    bgColor: '#F0FDF4',
    icon: '✅',
    description: 'Job completed successfully',
    allowedNextStatuses: [],
    requiresAction: true,
    actionLabel: 'Submit Completion Report',
    actionModal: 'completion',
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    color: '#DC2626',
    bgColor: '#FEF2F2',
    icon: '❌',
    description: 'Job cancelled',
    allowedNextStatuses: [],
    requiresAction: false,
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Look up a status definition by key (case-insensitive, also handles legacy label strings). */
export function getStatusDef(keyOrLabel) {
  if (!keyOrLabel) return null
  const normalized = keyOrLabel.toLowerCase().replace(/\s+/g, '_')
  return (
    JOB_STATUSES.find(s => s.key === normalized) ||
    JOB_STATUSES.find(s => s.label.toLowerCase() === keyOrLabel.toLowerCase()) ||
    null
  )
}

/** Normalize a raw status string (legacy labels like "In Progress") to the new key format. */
export function normalizeStatus(raw) {
  if (!raw) return 'new'
  // Already a key?
  if (JOB_STATUSES.find(s => s.key === raw)) return raw
  // Try matching by label
  const byLabel = JOB_STATUSES.find(s => s.label.toLowerCase() === raw.toLowerCase())
  if (byLabel) return byLabel.key
  // Legacy mappings
  const LEGACY = {
    'In Progress':  'in_progress',
    'Scheduled':    'scheduled',
    'Completed':    'completed',
    'Cancelled':    'cancelled',
    'New':          'new',
  }
  return LEGACY[raw] || 'new'
}

/** Return display label for a status key (or fallback to the raw value). */
export function statusLabel(key) {
  const def = getStatusDef(key)
  return def ? def.label : key
}

/** Return {color, bgColor} for badge rendering. */
export function statusStyle(key) {
  const def = getStatusDef(key)
  return def ? { color: def.color, bg: def.bgColor } : { color: '#6B7280', bg: '#F3F4F6' }
}

// Flat arrays for backwards-compatible dropdown lists
export const STATUS_KEYS    = JOB_STATUSES.map(s => s.key)
export const STATUS_LABELS  = JOB_STATUSES.map(s => s.label)

// Statuses that should appear in "active jobs" counts
export const ACTIVE_STATUSES = [
  'new', 'diagnosis_required', 'material_required', 'waiting_on_parts',
  'parts_received', 'ready_to_schedule', 'ready_for_repair',
  'scheduled', 'dispatched', 'in_progress',
]

// Statuses that block scheduling
export const BLOCKED_STATUSES = ['waiting_on_parts', 'material_required', 'diagnosis_required']

// Statuses ready to put on the calendar
export const SCHEDULABLE_STATUSES = ['ready_to_schedule', 'ready_for_repair', 'parts_received']
