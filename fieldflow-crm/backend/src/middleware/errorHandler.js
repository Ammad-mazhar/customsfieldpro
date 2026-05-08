const { logger } = require('../utils/securityLogger')

// Operational errors that can be exposed to clients
const OPERATIONAL_ERRORS = new Set([
  'ValidationError',
  'DatabaseError',
  'AuthError',
  'PlanError',
])

module.exports = function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500
  const requestId  = req.id || 'unknown'

  logger.error('Unhandled error', {
    requestId,
    method:     req.method,
    path:       req.path,
    statusCode,
    errorName:  err.name,
    message:    err.message,
    stack:      process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    userId:     req.user?.id,
    tenantId:   req.tenantId,
  })

  const isProd = process.env.NODE_ENV === 'production'
  const isOperational = OPERATIONAL_ERRORS.has(err.name)

  if (isProd) {
    // In production: only expose message for known operational errors
    return res.status(statusCode).json({
      error:     isOperational ? err.message : 'Internal server error',
      requestId,
    })
  }

  // Development: full error detail
  res.status(statusCode).json({
    error:     err.message,
    name:      err.name,
    requestId,
    stack:     err.stack?.split('\n').slice(0, 6),
  })
}
