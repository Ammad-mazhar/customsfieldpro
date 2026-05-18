// CustomsFieldPro — Central technician submission validation rules
import { getSettings } from '../data/store'

export const DEFAULT_FIELD_RULES = {
  requirePhotosForDiagnosis:   true,
  requireBeforePhotos:         true,
  requireAfterPhotos:          true,
  requirePhotosForParts:       true,
  minPhotos:                   1,
  lockNextJobUntilSubmitted:   true,
  lockForInProgress:           true,
  lockForDiagnosisRequired:    true,
  lockForPartsReceived:        true,
  gracePeriodMinutes:          30,
  remindTechAfterMinutes:      30,
  notifyAdminAfterMinutes:     60,
  sendSmsReminder:             false,
}

export function getFieldRules() {
  try {
    const s = getSettings()
    return { ...DEFAULT_FIELD_RULES, ...(s.fieldRules || {}) }
  } catch {
    return DEFAULT_FIELD_RULES
  }
}

export const TECH_VALIDATION_RULES = {
  diagnosis: {
    requirePhotos:  true,
    minPhotos:      1,
    photoLabel:     'diagnosis photos',
    warningMessage: 'You must upload at least 1 photo of the problem before submitting your diagnosis report.',
    blockingMessage:'Photo Required — Please take a photo of the issue before continuing.',
  },
  jobCompletion: {
    requirePhotos:      true,
    minBeforePhotos:    1,
    minAfterPhotos:     1,
    photoLabel:         'before and after photos',
    warningMessage:     'You must upload at least 1 before photo and 1 after photo before marking this job complete.',
    blockingMessage:    'Photos Required — Before and after photos are mandatory for job completion.',
  },
  partsReceived: {
    requirePhotos:  true,
    minPhotos:      1,
    photoLabel:     'part photos',
    warningMessage: 'You must upload a photo of the received part before confirming receipt.',
    blockingMessage:'Part Photo Required — Please photograph the received part before confirming.',
  },
  visitReport: {
    requirePhotos:  true,
    minPhotos:      1,
    photoLabel:     'visit photos',
    warningMessage: 'At least 1 photo is required to submit your visit report.',
    blockingMessage:'Photo Required — Please add a photo before submitting.',
  },
}

export function validateTechSubmission(type, data) {
  const rules  = TECH_VALIDATION_RULES[type]
  const fieldR = getFieldRules()
  const errors = []

  if (rules.requirePhotos) {
    if (type === 'jobCompletion') {
      const minB = rules.minBeforePhotos
      const minA = rules.minAfterPhotos
      if (fieldR.requireBeforePhotos && (!data.beforePhotos || data.beforePhotos.length < minB)) {
        errors.push({ field: 'beforePhotos', message: `At least ${minB} BEFORE photo is required`, blocking: true })
      }
      if (fieldR.requireAfterPhotos && (!data.afterPhotos || data.afterPhotos.length < minA)) {
        errors.push({ field: 'afterPhotos', message: `At least ${minA} AFTER photo is required`, blocking: true })
      }
    } else if (type === 'diagnosis') {
      if (fieldR.requirePhotosForDiagnosis && (!data.photos || data.photos.length < rules.minPhotos)) {
        errors.push({ field: 'photos', message: rules.warningMessage, blocking: true })
      }
    } else if (type === 'partsReceived') {
      if (fieldR.requirePhotosForParts && (!data.photos || data.photos.length < rules.minPhotos)) {
        errors.push({ field: 'photos', message: rules.warningMessage, blocking: true })
      }
    } else {
      if (!data.photos || data.photos.length < rules.minPhotos) {
        errors.push({ field: 'photos', message: rules.warningMessage, blocking: true })
      }
    }
  }

  return {
    isValid:        errors.length === 0,
    errors,
    blockingErrors: errors.filter(e => e.blocking),
  }
}
