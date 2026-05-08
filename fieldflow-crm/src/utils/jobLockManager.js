// FieldFlow CRM — Job lock management
// A technician cannot access the next job until current job is fully submitted.
import { getJobs } from '../data/store'
import { getFieldRules } from './techValidation'
import { normalizeStatus } from '../data/jobStatuses'

function getJobsForTech(technicianId) {
  try {
    return getJobs().filter(j =>
      j.technicianId === technicianId ||
      (j.techIds && j.techIds.includes(technicianId))
    )
  } catch { return [] }
}

export function getBlockingJob(technicianId) {
  const rules = getFieldRules()
  if (!rules.lockNextJobUntilSubmitted) return null

  const jobs = getJobsForTech(technicianId)

  return jobs.find(job => {
    const ns = normalizeStatus(job.status)
    if (rules.lockForInProgress && ns === 'in_progress' && !job.completionSubmitted) return true
    if (rules.lockForDiagnosisRequired && ns === 'diagnosis_required' && !job.diagnosisSubmitted) return true
    if (rules.lockForPartsReceived && ns === 'parts_received' && !job.partsConfirmed) return true
    return false
  }) || null
}

export function isTechBlocked(technicianId) {
  return getBlockingJob(technicianId) !== null
}

export function canAccessJob(technicianId, targetJobId) {
  const blockingJob = getBlockingJob(technicianId)
  if (!blockingJob) return { canAccess: true }
  if (blockingJob.id === targetJobId) return { canAccess: true }
  return { canAccess: false, blockingJob, reason: getBlockingReason(blockingJob) }
}

function getBlockingReason(job) {
  const ns = normalizeStatus(job.status)
  const label = job.id + (job.clientName ? ` — ${job.clientName}` : '')
  if (ns === 'in_progress') return `You must complete and submit ${label} before accessing other jobs.`
  if (ns === 'diagnosis_required') return `You must submit your diagnosis report for ${label} before accessing other jobs.`
  if (ns === 'parts_received') return `You must confirm parts receipt for ${label} before accessing other jobs.`
  return `Please complete ${label} before moving to the next job.`
}

export function getOverduePendingJobs(technicianId) {
  const jobs    = getJobsForTech(technicianId)
  const rules   = getFieldRules()
  const now     = Date.now()
  const result  = []

  for (const job of jobs) {
    const ns = normalizeStatus(job.status)
    if (ns === 'in_progress' && !job.completionSubmitted) {
      const startedAt = job.startedAt || job.updatedAt || now
      const minsElapsed = (now - startedAt) / 60_000
      if (minsElapsed >= rules.remindTechAfterMinutes) {
        result.push({ job, minsElapsed: Math.round(minsElapsed), type: 'completion' })
      }
    }
    if (ns === 'diagnosis_required' && !job.diagnosisSubmitted) {
      const arrivedAt = job.arrivedAt || job.updatedAt || now
      const minsElapsed = (now - arrivedAt) / 60_000
      if (minsElapsed >= rules.remindTechAfterMinutes) {
        result.push({ job, minsElapsed: Math.round(minsElapsed), type: 'diagnosis' })
      }
    }
  }
  return result
}
