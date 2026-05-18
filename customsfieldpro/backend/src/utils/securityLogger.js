const path    = require('path')
const winston = require('winston')
const rfs     = require('rotating-file-stream')
const supabase = require('./supabase')

// ── Event type catalogue ──────────────────────────────────────────────────────
const EVENTS = {
  // Auth
  LOGIN_SUCCESS:          'LOGIN_SUCCESS',
  LOGIN_FAILED:           'LOGIN_FAILED',
  LOGOUT:                 'LOGOUT',
  TOKEN_REFRESH:          'TOKEN_REFRESH',
  TOKEN_REFRESH_FAILED:   'TOKEN_REFRESH_FAILED',
  TOKEN_INVALID:          'TOKEN_INVALID',
  TOKEN_EXPIRED:          'TOKEN_EXPIRED',
  SESSION_REVOKED:        'SESSION_REVOKED',
  // Account
  REGISTER:               'REGISTER',
  PASSWORD_CHANGED:       'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_USED:    'PASSWORD_RESET_USED',
  ACCOUNT_LOCKED:         'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED:       'ACCOUNT_UNLOCKED',
  ACCOUNT_DEACTIVATED:    'ACCOUNT_DEACTIVATED',
  // Access control
  UNAUTHORIZED_ACCESS:    'UNAUTHORIZED_ACCESS',
  PERMISSION_DENIED:      'PERMISSION_DENIED',
  TENANT_VIOLATION:       'TENANT_VIOLATION',
  // Abuse
  RATE_LIMIT_HIT:         'RATE_LIMIT_HIT',
  BOT_DETECTED:           'BOT_DETECTED',
  IP_BLOCKED:             'IP_BLOCKED',
  SUSPICIOUS_ACTIVITY:    'SUSPICIOUS_ACTIVITY',
  // Admin
  USER_CREATED:           'USER_CREATED',
  USER_DELETED:           'USER_DELETED',
  ROLE_CHANGED:           'ROLE_CHANGED',
  PLAN_UPGRADED:          'PLAN_UPGRADED',
  DATA_EXPORTED:          'DATA_EXPORTED',
}

const WARN_EVENTS = new Set([
  EVENTS.LOGIN_FAILED,
  EVENTS.TOKEN_INVALID,
  EVENTS.TOKEN_EXPIRED,
  EVENTS.TOKEN_REFRESH_FAILED,
  EVENTS.UNAUTHORIZED_ACCESS,
  EVENTS.PERMISSION_DENIED,
  EVENTS.TENANT_VIOLATION,
  EVENTS.RATE_LIMIT_HIT,
  EVENTS.BOT_DETECTED,
  EVENTS.IP_BLOCKED,
  EVENTS.SUSPICIOUS_ACTIVITY,
  EVENTS.ACCOUNT_LOCKED,
  EVENTS.ACCOUNT_DEACTIVATED,
])

// ── Winston logger ────────────────────────────────────────────────────────────
const logDir = path.join(__dirname, '..', '..', 'logs')

// Rotating file stream for security log (1 file per day, keep 30 days)
const securityStream = rfs.createStream('security-%Y-%m-%d.log', {
  path:     logDir,
  interval: '1d',
  maxFiles: 30,
  compress: 'gzip',
})

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Stream({ stream: securityStream, level: 'info' }),
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''
          return `${timestamp} [${level}] ${message}${metaStr}`
        }),
      ),
    }),
  ],
})

// ── IP extraction ─────────────────────────────────────────────────────────────
function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  )
}

// ── Main logging function ─────────────────────────────────────────────────────
async function logSecurityEvent(eventType, req, details = {}) {
  const ip        = getClientIp(req)
  const userAgent = req.headers['user-agent'] || 'unknown'
  const userId    = req.user?.id    || null
  const tenantId  = req.tenantId    || req.user?.tenant_id || null
  const requestId = req.id          || null

  const payload = {
    event:     eventType,
    ip,
    userId,
    tenantId,
    requestId,
    endpoint:  `${req.method} ${req.path}`,
    ...details,
  }

  // Winston log — never include passwords/tokens in details
  const isWarn = WARN_EVENTS.has(eventType)
  if (isWarn) {
    logger.warn(eventType, payload)
  } else {
    logger.info(eventType, payload)
  }

  // DB persistence — fire and forget, never block the request
  supabase
    .from('security_events')
    .insert({
      tenant_id:  tenantId,
      user_id:    userId,
      event_type: eventType,
      ip_address: ip,
      user_agent: userAgent,
      endpoint:   `${req.method} ${req.path}`,
      details:    { requestId, ...details },
    })
    .then(() => {})
    .catch(err => logger.error('Failed to persist security event', { error: err.message, eventType }))
}

module.exports = { logSecurityEvent, EVENTS, logger }
