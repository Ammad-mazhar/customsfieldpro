-- CustomsFieldPro — Addendum
-- Run AFTER schema.sql and security_schema.sql.
-- Adds the equipment table, missing columns on existing tables,
-- and the authenticate_user() function used by routes/auth.js.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 — Missing columns on existing tables
-- ─────────────────────────────────────────────────────────────────────────────

-- clients: columns sent by the frontend but absent from the base schema
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS state        TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS country      TEXT DEFAULT 'United States';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS lead_source  TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tags         JSONB NOT NULL DEFAULT '[]';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS balance      NUMERIC(12,2) NOT NULL DEFAULT 0;

-- users: password_hash needed for crypt()-based auth
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- activity_log: record_id must be TEXT (routes pass string IDs, not always UUIDs)
-- Safe to alter only when column type is currently UUID with no data; otherwise skip.
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name = 'activity_log' AND column_name = 'record_id') = 'uuid'
  THEN
    ALTER TABLE activity_log ALTER COLUMN record_id TYPE TEXT USING record_id::TEXT;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 — Equipment table (client-level equipment tracking)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS equipment (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID          NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
  client_id       UUID          NOT NULL REFERENCES clients(id)  ON DELETE CASCADE,
  type            TEXT          NOT NULL,
  brand           TEXT,
  model           TEXT,
  serial_number   TEXT,
  install_date    DATE,
  next_service    DATE,
  warranty_expiry DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_tenant ON equipment(tenant_id);
CREATE INDEX IF NOT EXISTS idx_equipment_client ON equipment(client_id);

-- RLS — backend uses service_role so this is defence-in-depth only
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_equipment'
  ) THEN
    CREATE POLICY "tenant_isolation_equipment" ON equipment FOR ALL
    USING (tenant_id = (SELECT tenant_id FROM users WHERE auth_id = auth.uid()));
  END IF;
END $$;

-- updated_at trigger for equipment
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'equipment'::regclass
  ) THEN
    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON equipment
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 — authenticate_user() RPC
-- Called by POST /api/auth/login via supabase.rpc('authenticate_user', ...)
-- Requires pgcrypto extension and users.password_hash column (TEXT).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION authenticate_user(user_email TEXT, user_password TEXT)
RETURNS TABLE (id UUID, email TEXT, role TEXT, full_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER       -- runs as the function owner, not the caller
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.role, u.full_name
  FROM   users u
  WHERE  u.email         = lower(trim(user_email))
    AND  u.password_hash = crypt(user_password, u.password_hash)
    AND  u.is_active     = true;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4 — Helper: create a hashed password for manual user seeding
--
--   SELECT hash_password('yourpassword');   -- returns the bcrypt hash
--   UPDATE users SET password_hash = hash_password('admin123') WHERE email = 'admin@...';
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION hash_password(raw TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN crypt(raw, gen_salt('bf', 12));
END;
$$;
