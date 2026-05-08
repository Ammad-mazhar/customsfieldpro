-- ============================================================
-- FieldFlow CRM — Multi-tenant Database Schema
-- Run in Supabase SQL Editor
-- ============================================================

-- TENANTS (each business is a tenant)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  zip VARCHAR(20),
  country VARCHAR(100) DEFAULT 'US',
  logo_url TEXT,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  plan VARCHAR(50) DEFAULT 'trial',
  trial_ends_at TIMESTAMP DEFAULT (NOW() + INTERVAL '5 months'),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- USERS (belong to a tenant)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  auth_id UUID UNIQUE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(50) NOT NULL DEFAULT 'staff',
  specialty VARCHAR(100),
  color VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- CLIENTS
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  zip VARCHAR(20),
  property_type VARCHAR(50),
  client_type VARCHAR(50) DEFAULT 'residential',
  notes TEXT,
  portal_access BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- JOBS
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  job_number VARCHAR(50) NOT NULL,
  client_id UUID REFERENCES clients(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  service_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'new',
  priority VARCHAR(50) DEFAULT 'normal',
  assigned_to UUID REFERENCES users(id),
  scheduled_start TIMESTAMP,
  scheduled_end TIMESTAMP,
  actual_start TIMESTAMP,
  actual_end TIMESTAMP,
  equipment JSONB DEFAULT '[]',
  line_items JSONB DEFAULT '[]',
  photos JSONB DEFAULT '{}',
  completion_checklist JSONB DEFAULT '[]',
  signature TEXT,
  signature_name VARCHAR(255),
  completion_notes TEXT,
  rating JSONB,
  recurrence JSONB,
  branch_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, job_number)
);

-- INVOICES
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) NOT NULL,
  client_id UUID REFERENCES clients(id),
  job_id UUID REFERENCES jobs(id),
  line_items JSONB DEFAULT '[]',
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  issue_date DATE,
  due_date DATE,
  paid_date DATE,
  payment_method VARCHAR(50),
  stripe_payment_id VARCHAR(255),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, invoice_number)
);

-- QUOTES
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  quote_number VARCHAR(50) NOT NULL,
  client_id UUID REFERENCES clients(id),
  title VARCHAR(255),
  line_items JSONB DEFAULT '[]',
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  valid_until DATE,
  notes TEXT,
  approved_at TIMESTAMP,
  approved_by_client BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, quote_number)
);

-- REQUESTS
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  service_type VARCHAR(100),
  description TEXT,
  priority VARCHAR(50) DEFAULT 'normal',
  status VARCHAR(50) DEFAULT 'new',
  preferred_time TEXT,
  internal_notes TEXT,
  converted_to VARCHAR(50),
  converted_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- TIME ENTRIES
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id),
  user_id UUID REFERENCES users(id),
  clock_in TIMESTAMP,
  clock_out TIMESTAMP,
  total_hours DECIMAL(5,2),
  clock_in_lat DECIMAL(10,8),
  clock_in_lng DECIMAL(11,8),
  clock_out_lat DECIMAL(10,8),
  clock_out_lng DECIMAL(11,8),
  distance_from_site DECIMAL(8,4),
  labor_cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ACTIVITY LOG
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100),
  module VARCHAR(50),
  record_id UUID,
  record_label VARCHAR(255),
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES users(id),
  type VARCHAR(100),
  title VARCHAR(255),
  description TEXT,
  related_module VARCHAR(50),
  related_record_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- INVENTORY
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  category VARCHAR(100),
  description TEXT,
  in_stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  unit_cost DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  supplier VARCHAR(255),
  supplier_contact VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- BRANCHES
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  manager_id UUID REFERENCES users(id),
  is_main BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- MAINTENANCE PLANS
CREATE TABLE maintenance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  name VARCHAR(255),
  service_type VARCHAR(100),
  equipment JSONB DEFAULT '[]',
  frequency VARCHAR(50),
  start_date DATE,
  end_date DATE,
  preferred_day VARCHAR(20),
  preferred_time VARCHAR(20),
  assigned_to UUID REFERENCES users(id),
  price_per_visit DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- SUBSCRIPTION PLANS (SaaS billing tiers)
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  max_users INTEGER,
  max_clients INTEGER,
  max_jobs_per_month INTEGER,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Default subscription plans
INSERT INTO subscription_plans (name, slug, price_monthly, price_yearly, max_users, max_clients, max_jobs_per_month, features) VALUES
('Trial',        'trial',        0,    0,    5,  50,   50,   '["All features","5 months free","Up to 5 users"]'),
('Starter',      'starter',      49,   470,  3,  100,  100,  '["All core features","3 users","Email support"]'),
('Professional', 'professional', 99,   950,  10, 500,  500,  '["All features","10 users","Priority support","AI Estimator"]'),
('Business',     'business',     199,  1900, 25, 2000, 2000, '["All features","25 users","Phone support","Custom branding"]'),
('Enterprise',   'enterprise',   399,  3830, -1, -1,   -1,   '["Unlimited everything","Dedicated support","Custom integrations","SLA guarantee"]');

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory          ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_plans  ENABLE ROW LEVEL SECURITY;

-- RLS Policies (tenant isolation via JWT claim)
CREATE POLICY tenant_isolation ON clients          USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);
CREATE POLICY tenant_isolation ON jobs             USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);
CREATE POLICY tenant_isolation ON invoices         USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);
CREATE POLICY tenant_isolation ON quotes           USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);
CREATE POLICY tenant_isolation ON requests         USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);
CREATE POLICY tenant_isolation ON users            USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);
CREATE POLICY tenant_isolation ON time_entries     USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);
CREATE POLICY tenant_isolation ON activity_log     USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);
CREATE POLICY tenant_isolation ON notifications    USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);
CREATE POLICY tenant_isolation ON inventory        USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);
CREATE POLICY tenant_isolation ON branches         USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);
CREATE POLICY tenant_isolation ON maintenance_plans USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['tenants','users','clients','jobs','invoices','quotes','requests','inventory','maintenance_plans']
  LOOP
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
  END LOOP;
END $$;

-- ============================================================
-- INDEXES (performance)
-- ============================================================

CREATE INDEX idx_clients_tenant     ON clients(tenant_id);
CREATE INDEX idx_jobs_tenant        ON jobs(tenant_id);
CREATE INDEX idx_jobs_client        ON jobs(client_id);
CREATE INDEX idx_jobs_assigned      ON jobs(assigned_to);
CREATE INDEX idx_jobs_status        ON jobs(status);
CREATE INDEX idx_invoices_tenant    ON invoices(tenant_id);
CREATE INDEX idx_invoices_client    ON invoices(client_id);
CREATE INDEX idx_invoices_status    ON invoices(status);
CREATE INDEX idx_quotes_tenant      ON quotes(tenant_id);
CREATE INDEX idx_requests_tenant    ON requests(tenant_id);
CREATE INDEX idx_time_entries_job   ON time_entries(job_id);
CREATE INDEX idx_time_entries_user  ON time_entries(user_id);
CREATE INDEX idx_notifications_user ON notifications(target_user_id);
CREATE INDEX idx_activity_tenant    ON activity_log(tenant_id);
CREATE INDEX idx_inventory_tenant   ON inventory(tenant_id);
