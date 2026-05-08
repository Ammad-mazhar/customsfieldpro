import { getMaintenancePlans, getJobs } from '../data/store'
import { createNotification, notifyAdmins, NOTIF_TYPES } from './notifications'

const DEDUP_KEY = 'ff_maintenance_reminder_last_run'

// ── Check if we need to run (max once per hour) ───────────────────────────────
function shouldRun() {
  const last = localStorage.getItem(DEDUP_KEY)
  if (!last) return true
  return Date.now() - Number(last) > 60 * 60 * 1000
}

// ── Get next occurrence date for a plan from today onwards ────────────────────
function getNextOccurrence(plan) {
  const today = new Date(); today.setHours(0,0,0,0)
  let cursor = plan.startDate ? new Date(plan.startDate) : new Date(today)
  cursor.setHours(0,0,0,0)

  let limit = 500
  while (cursor < today && limit-- > 0) {
    cursor = advance(cursor, plan.frequency)
  }
  return cursor
}

function advance(date, frequency) {
  const d = new Date(date)
  if (frequency === 'Weekly')       d.setDate(d.getDate() + 7)
  else if (frequency === 'Monthly') d.setMonth(d.getMonth() + 1)
  else if (frequency === 'Quarterly') d.setMonth(d.getMonth() + 3)
  else if (frequency === 'Semi-Annual') d.setMonth(d.getMonth() + 6)
  else if (frequency === 'Annual')  d.setFullYear(d.getFullYear() + 1)
  else d.setDate(d.getDate() + 30)
  return d
}

function daysFromNow(date) {
  const today = new Date(); today.setHours(0,0,0,0)
  const d = new Date(date); d.setHours(0,0,0,0)
  return Math.round((d - today) / 86400000)
}

// ── Main check ────────────────────────────────────────────────────────────────
export function checkMaintenanceReminders() {
  if (!shouldRun()) return
  localStorage.setItem(DEDUP_KEY, String(Date.now()))

  const plans = getMaintenancePlans().filter(p => p.status === 'Active')
  if (!plans.length) return

  const jobs = getJobs()

  plans.forEach(plan => {
    const nextDate  = getNextOccurrence(plan)
    const days      = daysFromNow(nextDate)
    const nextISO   = nextDate.toISOString().split('T')[0]

    // Check if a scheduled job already exists for this plan on or near this date
    const hasJob = jobs.some(j =>
      j.maintenancePlanId === plan.id &&
      j.startDate === nextISO &&
      j.status !== 'Cancelled'
    )

    // Due in next 7 days with no scheduled job
    if (days >= 0 && days <= 7 && !hasJob) {
      const daysLabel = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`
      notifyAdmins(
        NOTIF_TYPES.JOB_ASSIGNED,
        `Maintenance Due: ${plan.clientName}`,
        `${plan.planName} is due ${daysLabel}. No job has been scheduled yet.`,
        'Maintenance',
        plan.id
      )
    }

    // Overdue: next occurrence is in the past with no completed job
    if (days < 0) {
      const overdueDate = new Date(nextDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const hasCompleted = jobs.some(j =>
        j.maintenancePlanId === plan.id &&
        j.status === 'Completed'
      )
      // Only notify if no completed job exists for this plan recently
      if (!hasCompleted) {
        notifyAdmins(
          NOTIF_TYPES.NEW_REQUEST,
          `OVERDUE: ${plan.clientName} Maintenance`,
          `${plan.planName} was due ${overdueDate} and has not been completed.`,
          'Maintenance',
          plan.id
        )
      }
    }
  })
}
