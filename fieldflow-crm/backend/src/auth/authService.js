// Auth service — wraps Supabase Auth with progressive lockout,
// token version tracking, and session management.
const crypto   = require('crypto')
const supabase = require('../utils/supabase')
const { logSecurityEvent, EVENTS } = require('../utils/securityLogger')

// ── Progressive lockout thresholds ───────────────────────────────────────────
// [failCount, lockDurationMinutes]
const LOCKOUT_THRESHOLDS = [
  [3,  5],
  [5,  15],
  [10, 60],
  [20, 24 * 60],
]

function getLockDuration(failCount) {
  for (let i = LOCKOUT_THRESHOLDS.length - 1; i >= 0; i--) {
    const [threshold, minutes] = LOCKOUT_THRESHOLDS[i]
    if (failCount >= threshold) return minutes
  }
  return 0
}

// ── Fail tracking ─────────────────────────────────────────────────────────────
// Stored in user_credentials table:
//   failed_attempts INTEGER DEFAULT 0
//   locked_until    TIMESTAMPTZ

async function getCredentialRecord(userId) {
  const { data } = await supabase
    .from('user_credentials')
    .select('id, failed_attempts, locked_until, token_version')
    .eq('user_id', userId)
    .single()
  return data
}

async function ensureCredentialRecord(userId) {
  let rec = await getCredentialRecord(userId)
  if (!rec) {
    const { data } = await supabase
      .from('user_credentials')
      .insert({ user_id: userId, failed_attempts: 0, token_version: 0 })
      .select()
      .single()
    rec = data
  }
  return rec
}

// ── Lockout checks ────────────────────────────────────────────────────────────

async function isAccountLocked(userId) {
  const rec = await getCredentialRecord(userId)
  if (!rec?.locked_until) return false
  return new Date(rec.locked_until) > new Date()
}

async function getLockoutInfo(userId) {
  const rec = await getCredentialRecord(userId)
  if (!rec?.locked_until) return null
  const lockedUntil = new Date(rec.locked_until)
  if (lockedUntil <= new Date()) return null
  return {
    lockedUntil,
    minutesRemaining: Math.ceil((lockedUntil - Date.now()) / 60000),
    failedAttempts:   rec.failed_attempts,
  }
}

async function recordFailedAttempt(userId, req) {
  const rec = await ensureCredentialRecord(userId)
  const newCount = (rec.failed_attempts || 0) + 1
  const lockMins = getLockDuration(newCount)
  const lockedUntil = lockMins > 0
    ? new Date(Date.now() + lockMins * 60 * 1000).toISOString()
    : null

  await supabase
    .from('user_credentials')
    .update({ failed_attempts: newCount, locked_until: lockedUntil, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (lockedUntil) {
    logSecurityEvent(EVENTS.ACCOUNT_LOCKED, req, {
      userId,
      failedAttempts: newCount,
      lockedUntilMinutes: lockMins,
    })
  }

  return { newCount, lockedUntil }
}

async function clearFailedAttempts(userId) {
  await supabase
    .from('user_credentials')
    .update({ failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
}

// ── Token version — increment to invalidate all existing tokens ───────────────

async function incrementTokenVersion(userId) {
  const rec = await ensureCredentialRecord(userId)
  const next = (rec?.token_version || 0) + 1
  await supabase
    .from('user_credentials')
    .update({ token_version: next, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  return next
}

async function getTokenVersion(userId) {
  const rec = await getCredentialRecord(userId)
  return rec?.token_version ?? 0
}

// ── Refresh token management ──────────────────────────────────────────────────
// Store SHA-256 hash of the refresh token, never the token itself.

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

async function storeRefreshToken(userId, rawToken, userAgent, ip) {
  const hash      = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  await supabase.from('refresh_tokens').insert({
    user_id:    userId,
    token_hash: hash,
    user_agent: userAgent,
    ip_address: ip,
    expires_at: expiresAt,
  })
}

async function verifyAndRotateRefreshToken(rawToken, userId) {
  const hash = hashToken(rawToken)

  const { data: stored } = await supabase
    .from('refresh_tokens')
    .select('id, expires_at, revoked')
    .eq('token_hash', hash)
    .eq('user_id', userId)
    .single()

  if (!stored) return false
  if (stored.revoked) return false
  if (new Date(stored.expires_at) < new Date()) return false

  // Revoke this token — it will be replaced with a new one (rotation)
  await supabase
    .from('refresh_tokens')
    .update({ revoked: true })
    .eq('id', stored.id)

  return true
}

async function revokeAllUserSessions(userId) {
  await supabase
    .from('refresh_tokens')
    .update({ revoked: true })
    .eq('user_id', userId)
    .eq('revoked', false)
  await incrementTokenVersion(userId)
}

async function revokeSession(rawToken) {
  const hash = hashToken(rawToken)
  await supabase
    .from('refresh_tokens')
    .update({ revoked: true })
    .eq('token_hash', hash)
}

module.exports = {
  isAccountLocked,
  getLockoutInfo,
  recordFailedAttempt,
  clearFailedAttempts,
  incrementTokenVersion,
  getTokenVersion,
  storeRefreshToken,
  verifyAndRotateRefreshToken,
  revokeAllUserSessions,
  revokeSession,
  hashToken,
}
