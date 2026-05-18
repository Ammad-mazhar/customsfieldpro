require('dotenv').config()
require('./utils/envValidator')()   // Exits if required env vars are missing
require('./utils/securityCheck')()  // Logs security checklist on startup
require('express-async-errors')     // Catches async errors automatically

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const cookieParser = require('cookie-parser')
const morgan = require('morgan')
const mongoSanitize = require('express-mongo-sanitize')
const xssClean = require('xss-clean')
const hpp = require('hpp')
const { v4: uuidv4 } = require('uuid')

const { apiLimiter, speedLimiter, ipBlocklist, botDetector } = require('./middleware/rateLimiter')
const { globalSanitize } = require('./middleware/validate')
const errorHandler = require('./middleware/errorHandler')
const { logger } = require('./utils/securityLogger')

const app = express()

// ── Trust proxy (for correct IP behind nginx/load balancer) ──────────────────
app.set('trust proxy', 1)

// ── Request ID — attached to every request for tracing ───────────────────────
app.use((req, res, next) => {
  req.id = uuidv4()
  res.setHeader('X-Request-ID', req.id)
  next()
})

// ── Compression ───────────────────────────────────────────────────────────────
app.use(compression())

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.SUPABASE_URL].filter(Boolean),
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false, // relax for image loading
}))

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);

    // Allow localhost for development
    if (origin.startsWith('http://localhost')) {
      return callback(null, true);
    }

    // Allow all Vercel deployments
    if (origin.includes('vercel.app')) {
      return callback(null, true);
    }

    // Block everything else
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── HTTP request logging ──────────────────────────────────────────────────────
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev'
app.use(morgan(morganFormat, {
  stream: { write: (msg) => logger.info(msg.trim()) },
  skip: (req) => req.path === '/api/health',
}))

// ── Body parsing — tight limits ───────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))
app.use(cookieParser(process.env.COOKIE_SECRET || undefined))

// ── Attack prevention ─────────────────────────────────────────────────────────
app.use(mongoSanitize())   // Strip $ and . from user input (NoSQL injection)
app.use(xssClean())        // Strip XSS from body, query, params
app.use(hpp())             // Remove duplicate query params (HTTP param pollution)
app.use(globalSanitize)    // Null bytes + length limits

// ── IP blocklist + bot detection + global rate limit ─────────────────────────
app.use(ipBlocklist)
app.use(botDetector)
app.use(speedLimiter)
app.use(apiLimiter)

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'))
app.use('/api/tenants', require('./routes/tenants'))
app.use('/api/clients', require('./routes/clients'))
app.use('/api/jobs', require('./routes/jobs'))
app.use('/api/invoices', require('./routes/invoices'))
app.use('/api/quotes', require('./routes/quotes'))
app.use('/api/requests', require('./routes/requests'))
app.use('/api/users', require('./routes/users'))
app.use('/api/inventory', require('./routes/inventory'))
app.use('/api/reports', require('./routes/reports'))
app.use('/api/timesheets', require('./routes/timesheets'))
app.use('/api/equipment', require('./routes/equipment'))

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
}))

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found', requestId: req.id }))

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => logger.info(`CustomsFieldPro API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`))

module.exports = app