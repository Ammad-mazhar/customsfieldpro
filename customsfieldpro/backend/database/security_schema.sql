-- ── Security events log — append-only, immutable audit trail ─────────────────
-- Only the backend service role can write to this table.
-- No user can read or modify it directly.

CREATE TABLE IF NOT EXISTS security_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES users(id)   ON DELETE SET NULL,
  event_type  VARCHAR(100) NOT NULL,
  ip_address  INET,
  user_agent  TEXT,
  endpoint    TEXT,
  details     JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_sec_events_tenant    ON security_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sec_events_user      ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sec_events_type      ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sec_events_created   ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_events_ip        ON security_events(ip_address);

-- RLS: nobody can access this table directly.
-- The backend uses the service_role key which bypasses RLS.
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no_direct_access_security_events"
ON security_events FOR ALL
USING (false);

-- ── Refresh tokens — hashed, never store raw tokens ──────────────────────────
-- Store only the SHA-256 hash of each refresh token.
-- Token rotation: on each use, old token is revoked and new hash is stored.

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token_hash  TEXT NOT NULL UNIQUE,   -- SHA-256 hex of the raw token
  user_agent  TEXT,
  ip_address  TEXT,
  revoked     BOOLEAN DEFAULT false,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user    ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash    ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
-- Partial index for active tokens only (most common query)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active  ON refresh_tokens(user_id) WHERE revoked = false;

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no_direct_access_refresh_tokens"
ON refresh_tokens FOR ALL
USING (false);

-- ── User credentials — lockout and token version tracking ────────────────────

CREATE TABLE IF NOT EXISTS user_credentials (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  token_version       INTEGER DEFAULT 0,         -- increment to revoke all sessions
  failed_attempts     INTEGER DEFAULT 0,
  locked_until        TIMESTAMPTZ,               -- null = not locked
  reset_token_hash    TEXT,
  reset_token_expires TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_creds_user        ON user_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_creds_locked_until ON user_credentials(locked_until) WHERE locked_until IS NOT NULL;

ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no_direct_access_user_credentials"
ON user_credentials FOR ALL
USING (false);

-- ── Cleanup job — remove expired/old tokens ───────────────────────────────────
-- Run this periodically (e.g., via pg_cron or a scheduled function)
-- DELETE FROM refresh_tokens WHERE expires_at < NOW() OR (revoked = true AND created_at < NOW() - INTERVAL '30 days');
-- DELETE FROM security_events WHERE created_at < NOW() - INTERVAL '90 days';

-- ── RLS policies for main tables ─────────────────────────────────────────────

ALTER TABLE clients    ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices   ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE users      ENABLE ROW LEVEL SECURITY;

-- Tenant isolation — user can only see their own tenant's data.
-- Backend service_role bypasses these.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_clients') THEN
    CREATE POLICY "tenant_isolation_clients" ON clients FOR ALL
    USING (tenant_id = (SELECT tenant_id FROM users WHERE auth_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_jobs') THEN
    CREATE POLICY "tenant_isolation_jobs" ON jobs FOR ALL
    USING (tenant_id = (SELECT tenant_id FROM users WHERE auth_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_invoices') THEN
    CREATE POLICY "tenant_isolation_invoices" ON invoices FOR ALL
    USING (tenant_id = (SELECT tenant_id FROM users WHERE auth_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_users') THEN
    CREATE POLICY "tenant_isolation_users" ON users FOR ALL
    USING (tenant_id = (SELECT tenant_id FROM users WHERE auth_id = auth.uid()));
  END IF;
END $$;

-- Technicians can only read their own assigned jobs (in addition to tenant isolation)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tech_own_jobs_select') THEN
    CREATE POLICY "tech_own_jobs_select" ON jobs FOR SELECT
    USING (
      tenant_id = (SELECT tenant_id FROM users WHERE auth_id = auth.uid())
      AND (
        (SELECT role FROM users WHERE auth_id = auth.uid()) IN ('admin', 'staff')
        OR assigned_to = (SELECT id FROM users WHERE auth_id = auth.uid())
      )
    );
  END IF;
END $$;

-- Prevent technicians from creating/updating other users' records
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_admin_only_write') THEN
    CREATE POLICY "users_admin_only_write" ON users FOR INSERT
    WITH CHECK (
      (SELECT role FROM users WHERE auth_id = auth.uid()) IN ('admin', 'staff')
    );
  END IF;
END $$;
