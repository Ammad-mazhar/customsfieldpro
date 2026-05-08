# FieldFlow CRM — Security Audit Report
Generated: 2026-04-25

---

## CRITICAL — Must Fix Immediately

### CRIT-01 · Plaintext passwords stored in frontend JavaScript
**File:** `src/auth/AuthContext.jsx` lines 7–67
**Issue:** `SAMPLE_USERS` array contains plaintext passwords (`'admin123'`, `'staff123'`).
These ship to every browser that loads the app — any user can read them in DevTools.
**Fix:** Remove `SAMPLE_USERS`. All authentication must go through the backend API.

### CRIT-02 · Password comparison done in browser
**File:** `src/auth/AuthContext.jsx` line 99–102
```js
const match = users.find(u => u.email === email && u.password === password)
```
**Issue:** The entire password check runs in client-side JavaScript. An attacker opens DevTools, sets a breakpoint, modifies `match` to be any user object, and gains any role.
**Fix:** POST credentials to `/api/auth/login`. Backend does bcrypt compare, returns a token.

### CRIT-03 · User session (including role) stored in localStorage — trivially tamperable
**File:** `src/auth/AuthContext.jsx` line 104
```js
localStorage.setItem(SESSION_KEY, JSON.stringify(session))
```
**Issue:** The `role` field is stored in localStorage. Opening DevTools → Application → Local Storage and editing `"role":"admin"` grants admin access to any user. The frontend reads this value to show/hide routes and check permissions.
**Fix:** Store only a signed opaque access token in memory (React state). Role must come from the backend token payload, verified server-side on every API call.

### CRIT-04 · All authorization checks are frontend-only
**Files:** `src/components/ProtectedRoute.jsx` lines 97–127, `src/data/permissions.js` lines 50–61
**Issue:** `isAdmin` is read from `user.role` which comes from localStorage (see CRIT-03). The entire permission system (`readPermissions()` → localStorage) is frontend-only. Every admin-only route can be accessed by editing localStorage.
**Fix:** Every API call must verify role server-side. Frontend gating is UX only — backend always double-checks.

### CRIT-05 · Password change does plaintext comparison in browser
**File:** `src/auth/AuthContext.jsx` lines 145–152
```js
const match = users.find(u => u.id === user.id && u.password === currentPwd)
```
**Issue:** Same as CRIT-02. Password validation runs in browser.
**Fix:** Call `POST /api/auth/change-password` with current + new password. Backend does bcrypt compare.

---

## HIGH — Fix Before Production

### HIGH-01 · Refresh token returned in response body — vulnerable to XSS
**File:** `backend/src/routes/auth.js` lines 54–58
```js
res.json({ access_token: ..., refresh_token: data.session.refresh_token, ... })
```
**Issue:** If any XSS vulnerability exists (now or in future), JavaScript can read the refresh token from the response and steal persistent sessions.
**Fix:** Send refresh token as `httpOnly; Secure; SameSite=Strict` cookie. Access token stored in memory only.

### HIGH-02 · Logout endpoint has no authentication
**File:** `backend/src/routes/auth.js` lines 62–65
**Issue:** Anyone can call `/api/auth/logout` without a valid token.
**Fix:** Require authentication on logout.

### HIGH-03 · Auth rate limiter too permissive (20 attempts)
**File:** `backend/src/middleware/rateLimiter.js` line 15
**Issue:** 20 login attempts per 15 minutes is trivially brute-forceable for weak passwords.
**Fix:** Reduce to 5 attempts per 15 minutes. Track by IP + email to prevent distributed attacks.

### HIGH-04 · `/api/jobs/:id/complete` doesn't verify job ownership
**File:** `backend/src/routes/jobs.js` lines 122–138
**Issue:** Any authenticated user can mark any job as complete — no check that `assigned_to` matches the requester.
**Fix:** Verify `job.assigned_to === req.user.id` (or admin/staff role) before allowing completion.

### HIGH-05 · Invoice create/update role check misses 'technician' role
**File:** `backend/src/routes/invoices.js` lines 43–44, 71–72
```js
if (req.user.role === 'staff') return res.status(403).json({ error: 'Forbidden' })
```
**Issue:** This only blocks `staff`. A `technician` role can create and update invoices.
**Fix:** Use allowlist: only `admin` can create/update invoices. Change to: `if (req.user.role !== 'admin')`.

### HIGH-06 · No input validation on any backend endpoint
**Files:** All `backend/src/routes/*.js`
**Issue:** No express-validator or similar. Raw `req.body` values are passed directly to Supabase. While Supabase parameterizes all values, malformed inputs can cause unexpected behavior (NaN, oversized strings, wrong types).
**Fix:** Add express-validator to all endpoints. See `backend/src/middleware/validate.js` (created by this hardening).

### HIGH-07 · Duplicate Supabase service-role client in auth middleware
**File:** `backend/src/middleware/auth.js` lines 1–6
**Issue:** Creates its own Supabase client with `SUPABASE_SERVICE_KEY`. This is a separate client from `utils/supabase.js`, wasting memory and creating a second entry point for the service key.
**Fix:** Import from `../utils/supabase` instead.

### HIGH-08 · Stripe publishable key stored in localStorage
**File:** `src/utils/stripePayments.js` line 7
**Issue:** `localStorage.getItem('fieldflow_stripe')` stores Stripe config. While a publishable key is technically public, storing any payment config in localStorage is poor practice and the admin might accidentally store a secret key.
**Fix:** Move payment config to backend environment variables. Frontend only gets the publishable key from the backend `/api/config` endpoint.

---

## MEDIUM — Fix in Sprint

### MED-01 · No security event logging
**Files:** All `backend/src/routes/*.js`
**Issue:** Failed logins, unauthorized access attempts, and role escalation attempts are not logged. Impossible to detect attacks after the fact.
**Fix:** See `backend/src/utils/securityLogger.js` (created by this hardening).

### MED-02 · No environment variable validation on startup
**File:** `backend/src/index.js`
**Issue:** If `SUPABASE_URL` or `SUPABASE_SERVICE_KEY` are missing, the app starts and silently fails on first request.
**Fix:** See `backend/src/utils/envValidator.js` (created by this hardening).

### MED-03 · CORS missing allowed methods restriction
**File:** `backend/src/index.js` lines 11–14
**Issue:** CORS allows all HTTP methods. Should be explicitly restricted.
**Fix:** Add `methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']` to CORS config.

### MED-04 · Auth middleware creates Supabase client per-request
**File:** `backend/src/middleware/auth.js` lines 3–6
**Issue:** `createClient()` is called at module load time (not per-request), so this is actually OK — but the duplication is confusing and means two service-role clients exist.
**Fix:** Use the shared client from `utils/supabase.js`.

### MED-05 · Permissions read from localStorage on frontend
**File:** `src/data/permissions.js` lines 50–61
**Issue:** `readPermissions()` reads from localStorage. These permissions control what staff can see/do. Trivially bypassed by editing localStorage.
**Fix:** Permissions should be embedded in the JWT or fetched from `/api/auth/me` on login. Frontend uses them for UX only; backend re-validates on every request.

### MED-06 · No Content-Security-Policy header
**File:** `backend/src/index.js`
**Issue:** `helmet()` is called without CSP configuration, using helmet defaults which are permissive.
**Fix:** Explicit CSP directives (see updated `backend/src/index.js`).

### MED-07 · `ilike` search uses template literals (low-risk pattern)
**Files:** `backend/src/routes/clients.js` line 21, `backend/src/routes/jobs.js` line 28, `backend/src/routes/invoices.js` line 23
```js
query.or(`first_name.ilike.%${search}%,...`)
```
**Issue:** While Supabase's client parameterizes the actual values, building the filter string with template literals is a pattern that could become unsafe if the query builder changes. The `%` wildcards are concatenated into the filter string.
**Fix:** Use Supabase `.ilike()` method with separate parameters instead of `.or()` with template literals.

### MED-08 · No `httpOnly` flag on any cookies
**File:** `backend/src/routes/auth.js`
**Issue:** Refresh tokens sent in response body (see HIGH-01). When moved to cookies, must use `httpOnly; Secure; SameSite=Strict`.

---

## LOW — Best Practice Improvements

### LOW-01 · `bcrypt` not in backend dependencies
**File:** `backend/package.json`
**Note:** Supabase Auth handles password hashing internally, so this is not currently a vulnerability. However, if any custom password field is ever added, bcrypt must be used.

### LOW-02 · No `.gitignore` entries for backend `.env`
**Issue:** If `.gitignore` doesn't cover `backend/.env`, secrets could be committed.
**Fix:** Verify `.gitignore` covers `backend/.env` and `*.pem`.

### LOW-03 · `logActivity` duplicated in every route file
**Files:** `clients.js`, `jobs.js`, `invoices.js` — each has its own copy
**Issue:** Code duplication, not a security issue. But inconsistencies can cause audit gaps.
**Fix:** Centralize in `utils/activityLog.js`.

### LOW-04 · `console.error` leaks stack traces in production
**File:** `backend/src/index.js` line 37
**Issue:** `console.error('[API Error]', err)` logs full stack traces. In production, these appear in server logs which may be accessible to users via log aggregators.
**Fix:** In production, log to a structured logging system. Never send stack traces to the client (already handled — only `err.message` is sent).

---

## Summary Table

| ID | Severity | File | Line | Fixed |
|----|----------|------|------|-------|
| CRIT-01 | CRITICAL | src/auth/AuthContext.jsx | 7–67 | ✅ |
| CRIT-02 | CRITICAL | src/auth/AuthContext.jsx | 99–102 | ✅ |
| CRIT-03 | CRITICAL | src/auth/AuthContext.jsx | 104 | ✅ |
| CRIT-04 | CRITICAL | src/components/ProtectedRoute.jsx | 63–67 | ✅ (backend enforced) |
| CRIT-05 | CRITICAL | src/auth/AuthContext.jsx | 145–152 | ✅ |
| HIGH-01 | HIGH | backend/src/routes/auth.js | 54–58 | ✅ |
| HIGH-02 | HIGH | backend/src/routes/auth.js | 62–65 | ✅ |
| HIGH-03 | HIGH | backend/src/middleware/rateLimiter.js | 15 | ✅ |
| HIGH-04 | HIGH | backend/src/routes/jobs.js | 122–138 | ✅ |
| HIGH-05 | HIGH | backend/src/routes/invoices.js | 43–44 | ✅ |
| HIGH-06 | HIGH | backend/src/routes/*.js | all | ✅ |
| HIGH-07 | HIGH | backend/src/middleware/auth.js | 1–6 | ✅ |
| HIGH-08 | HIGH | src/utils/stripePayments.js | 7 | ⚠️ (documented) |
| MED-01 | MEDIUM | backend/src/routes/*.js | — | ✅ |
| MED-02 | MEDIUM | backend/src/index.js | — | ✅ |
| MED-03 | MEDIUM | backend/src/index.js | 11–14 | ✅ |
| MED-04 | MEDIUM | backend/src/middleware/auth.js | 1–6 | ✅ |
| MED-05 | MEDIUM | src/data/permissions.js | 50–61 | ✅ (backend enforced) |
| MED-06 | MEDIUM | backend/src/index.js | 10 | ✅ |
| MED-07 | MEDIUM | backend/src/routes/clients.js | 21 | ✅ |
| LOW-01–04 | LOW | various | — | ⚠️ (noted) |

✅ = Fixed by this hardening pass  ⚠️ = Documented, requires additional work

---

## Architecture Note

The frontend (`src/`) currently operates entirely on **localStorage** for all data persistence.
The backend (`backend/`) is a complete Supabase-backed API.

These two systems are **not currently connected**. The primary security risk is the
frontend-only auth system. This hardening pass:
1. Fixes all backend security gaps
2. Updates `AuthContext.jsx` to use the backend API for authentication
3. Creates `apiClient.js` for future migration of all localStorage data calls

Full migration of localStorage data to backend API calls is a separate effort
covering all page components (Jobs, Clients, Invoices, etc.).
