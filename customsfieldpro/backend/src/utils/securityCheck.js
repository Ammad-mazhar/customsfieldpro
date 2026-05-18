// Startup security checklist — logs warnings for insecure configurations.
// Never blocks startup; only warns. Critical errors handled in envValidator.

module.exports = function runSecurityCheck() {
  const isProd = process.env.NODE_ENV === 'production'
  const warns  = []
  const oks    = []

  function check(condition, okMsg, warnMsg) {
    if (condition) {
      oks.push(`  ✓ ${okMsg}`)
    } else {
      warns.push(`  ⚠ ${warnMsg}`)
    }
  }

  // Environment
  check(isProd, 'NODE_ENV=production', 'NODE_ENV is not "production" — never run dev mode in production')
  check(process.env.COOKIE_SECRET?.length >= 32, 'COOKIE_SECRET is strong', 'COOKIE_SECRET is missing or too short (< 32 chars)')
  check(!!process.env.SUPABASE_SERVICE_KEY, 'SUPABASE_SERVICE_KEY is set', 'SUPABASE_SERVICE_KEY is missing')
  check(!!process.env.FRONTEND_URL, 'FRONTEND_URL is set', 'FRONTEND_URL is missing — CORS will be open')

  // Production-specific
  if (isProd) {
    check(
      process.env.FRONTEND_URL?.startsWith('https://'),
      'FRONTEND_URL uses HTTPS',
      'FRONTEND_URL does not use HTTPS in production',
    )
    check(
      !process.env.SUPABASE_SERVICE_KEY?.includes('test'),
      'SUPABASE_SERVICE_KEY looks like production key',
      'SUPABASE_SERVICE_KEY may be a test/anon key',
    )
  }

  // Logging output
  if (warns.length > 0) {
    console.warn('\n[CustomsFieldPro Security] ⚠ Configuration warnings:')
    warns.forEach(w => console.warn(w))
    console.warn('')
  }

  if (!isProd) {
    console.log('[CustomsFieldPro Security] Startup check (development mode):')
    oks.forEach(o => console.log(o))
    warns.forEach(w => console.log(w))
    console.log('')
  }
}
