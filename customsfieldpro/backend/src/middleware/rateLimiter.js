const rateLimit  = require('express-rate-limit')
const slowDown   = require('express-slow-down')
const { logSecurityEvent, EVENTS } = require('../utils/securityLogger')

// ── IP blocklist (populated at runtime) ──────────────────────────────────────
const blockedIPs = new Set()

function blockIP(ip) { blockedIPs.add(ip) }
function isBlocked(ip) { return blockedIPs.has(ip) }

// Middleware that checks the blocklist first
function ipBlocklist(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress
  if (isBlocked(ip)) {
    logSecurityEvent(EVENTS.IP_BLOCKED, req, { ip })
    return res.status(403).json({ error: 'Access denied' })
  }
  next()
}

// ── Bot detection ─────────────────────────────────────────────────────────────
const BOT_UA_PATTERNS = [
  /bot/i, /crawler/i, /spider/i, /scraper/i, /scan/i,
  /masscan/i, /nikto/i, /sqlmap/i, /nmap/i, /curl/i, /python-requests/i,
]

function botDetector(req, res, next) {
  const ua = req.headers['user-agent'] || ''

  // No user-agent at all on a POST is suspicious
  if (!ua && req.method === 'POST') {
    logSecurityEvent(EVENTS.BOT_DETECTED, req, { reason: 'no_user_agent' })
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (BOT_UA_PATTERNS.some(p => p.test(ua))) {
    logSecurityEvent(EVENTS.BOT_DETECTED, req, { reason: 'suspicious_ua', ua })
    return res.status(403).json({ error: 'Forbidden' })
  }

  next()
}

// ── Rate limit helpers ────────────────────────────────────────────────────────
function onLimitReached(req, res, options) {
  logSecurityEvent(EVENTS.RATE_LIMIT_HIT, req, {
    limit:  options.max,
    window: options.windowMs,
    path:   req.path,
  })
}

// ── Limiters ──────────────────────────────────────────────────────────────────

// Global API — 120 req/min per IP
const apiLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             120,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Too many requests, please slow down.' },
  handler(req, res, next, options) {
    onLimitReached(req, res, options)
    res.status(options.statusCode).json(options.message)
  },
})

// Auth — 10 attempts per 15 min, keyed by IP + email
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => `${req.ip}_${(req.body?.email || '').toLowerCase().trim()}`,
  message:         { error: 'Too many login attempts. Try again in 15 minutes.' },
  handler(req, res, next, options) {
    onLimitReached(req, res, options)
    res.status(options.statusCode).json(options.message)
  },
})

// Password reset — 3 per hour per IP
const resetLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             3,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Too many reset requests. Try again in an hour.' },
})

// Registration — 5 per hour per IP
const registerLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Too many registration attempts.' },
})

// Write operations — 60 per min per IP (create/update/delete)
const writeLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             60,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Too many write operations. Please wait.' },
})

// Speed limiter — progressive delay after 50 req/min
const speedLimiter = slowDown({
  windowMs:          60 * 1000,
  delayAfter:        50,
  delayMs:           () => 200,
  maxDelayMs:        2000,
})

module.exports = {
  apiLimiter,
  authLimiter,
  resetLimiter,
  registerLimiter,
  writeLimiter,
  speedLimiter,
  ipBlocklist,
  botDetector,
  blockIP,
  isBlocked,
  blockedIPs,
}
