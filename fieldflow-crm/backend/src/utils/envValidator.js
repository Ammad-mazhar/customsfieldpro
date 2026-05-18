// Validates required environment variables on startup.
// If any are missing the process exits with a clear error — never silently
// continue with undefined secrets.

const REQUIRED = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'FRONTEND_URL',
]

const RECOMMENDED = [
  'SUPABASE_ANON_KEY',
  'COOKIE_SECRET',
  'NODE_ENV',
  'PORT',
]

module.exports = function validateEnv() {
  const missing = REQUIRED.filter(k => !process.env[k])

  if (missing.length > 0) {
    console.error('\n[CustomsFieldPro] FATAL — Missing required environment variables:')
    missing.forEach(k => console.error(`  ✗ ${k}`))
    console.error('\nCopy backend/.env.example to backend/.env and fill in values.\n')
    process.exit(1)
  }

  const absent = RECOMMENDED.filter(k => !process.env[k])
  if (absent.length > 0) {
    console.warn('[CustomsFieldPro] WARNING — Recommended env vars not set:', absent.join(', '))
  }

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.COOKIE_SECRET || process.env.COOKIE_SECRET.length < 32) {
      console.error('[CustomsFieldPro] FATAL — COOKIE_SECRET must be at least 32 chars in production')
      process.exit(1)
    }

    if (!process.env.FRONTEND_URL?.startsWith('https://')) {
      console.error('[CustomsFieldPro] FATAL — FRONTEND_URL must use HTTPS in production')
      process.exit(1)
    }

    if (process.env.SUPABASE_SERVICE_KEY?.startsWith('eyJ') === false) {
      console.warn('[CustomsFieldPro] WARNING — SUPABASE_SERVICE_KEY looks malformed')
    }
  }
}
