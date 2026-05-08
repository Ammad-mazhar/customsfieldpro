-- Super Admin schema
-- Run after the base schema (schema.sql) and security_schema.sql

-- Super admin accounts (separate from tenant users)
CREATE TABLE IF NOT EXISTS super_admins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'support' CHECK (role IN ('superadmin', 'support', 'finance', 'readonly')),
  password_hash   TEXT NOT NULL,
  mfa_secret      TEXT,
  mfa_enabled     BOOLEAN DEFAULT false,
  last_login_at   TIMESTAMPTZ,
  last_login_ip   TEXT,
  failed_attempts INTEGER DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Notes attached to tenant accounts by super admins
CREATE TABLE IF NOT EXISTS tenant_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  admin_id    UUID NOT NULL REFERENCES super_admins(id),
  text        TEXT NOT NULL,
  priority    TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_notes_tenant_id ON tenant_notes(tenant_id);

-- Manual billing adjustments (credits, refunds, overrides)
CREATE TABLE IF NOT EXISTS billing_adjustments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  admin_id    UUID NOT NULL REFERENCES super_admins(id),
  type        TEXT NOT NULL CHECK (type IN ('credit', 'refund', 'plan_change', 'trial_extension', 'discount')),
  amount_cents INTEGER,
  description TEXT NOT NULL,
  stripe_ref  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_adjustments_tenant_id ON billing_adjustments(tenant_id);

-- Churn risk scores computed per tenant
CREATE TABLE IF NOT EXISTS churn_scores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  score            INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  signals          JSONB DEFAULT '[]',
  computed_at      TIMESTAMPTZ DEFAULT NOW(),
  actioned_by      UUID REFERENCES super_admins(id),
  actioned_at      TIMESTAMPTZ,
  action_note      TEXT
);

CREATE INDEX IF NOT EXISTS idx_churn_scores_tenant_id ON churn_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_churn_scores_score ON churn_scores(score DESC);

-- System health snapshots
CREATE TABLE IF NOT EXISTS system_health_snapshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  services    JSONB NOT NULL,
  metrics     JSONB NOT NULL,
  overall     TEXT NOT NULL CHECK (overall IN ('operational', 'degraded', 'outage')),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support tickets (platform-level, not tenant-level)
CREATE TABLE IF NOT EXISTS support_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
  subject         TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'general',
  priority        TEXT NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'Medium', 'High', 'Urgent')),
  status          TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  assigned_to     UUID REFERENCES super_admins(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  from_type   TEXT NOT NULL CHECK (from_type IN ('tenant', 'admin')),
  sender_id   UUID,
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_ticket_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  admin_id    UUID NOT NULL REFERENCES super_admins(id),
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status     ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority   ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_id  ON support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_ticket_messages(ticket_id);

-- Announcements sent to tenants
CREATE TABLE IF NOT EXISTS announcements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'critical')),
  target_type  TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'plan', 'trial', 'paying')),
  target_plan  TEXT,
  channels     TEXT[] DEFAULT ARRAY['in-app'],
  scheduled_at TIMESTAMPTZ,
  sent_at      TIMESTAMPTZ,
  recipients   INTEGER DEFAULT 0,
  opened       INTEGER DEFAULT 0,
  created_by   UUID REFERENCES super_admins(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Feature flag overrides per tenant (allows plan bypass)
CREATE TABLE IF NOT EXISTS tenant_feature_overrides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled     BOOLEAN NOT NULL,
  set_by      UUID REFERENCES super_admins(id),
  set_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_tenant_feature_overrides_tenant ON tenant_feature_overrides(tenant_id);

-- Row-level security
ALTER TABLE tenant_notes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_adjustments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_scores               ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_snapshots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_notes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_feature_overrides   ENABLE ROW LEVEL SECURITY;

-- Service role bypass policies (all super admin data is accessed via service role only)
CREATE POLICY "service_role_all" ON tenant_notes               FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON billing_adjustments        FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON churn_scores               FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON system_health_snapshots    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON support_tickets            FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON support_ticket_messages    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON support_ticket_notes       FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON announcements              FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON tenant_feature_overrides   FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON super_admins               FOR ALL TO service_role USING (true) WITH CHECK (true);
