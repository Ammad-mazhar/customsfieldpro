// Shared mock data and constants for all Super Admin pages

export const SA_TENANTS = [
  { id: 't1',  name: 'Blue Ridge HVAC',      email: 'admin@blueridgehvac.com', owner: 'John Muir',      plan: 'professional', status: 'Active',    trialEnd: null,         renewal: '2026-06-01', users: 7,  usersLimit: 10, jobs: 42, mrr: 99,  joined: '2025-11-10', lastActive: '2026-05-07', onboarding: 100, churnScore: 12 },
  { id: 't2',  name: 'Metro Plumbing Co',     email: 'admin@metroplumbing.com',  owner: 'Sarah Chen',     plan: 'business',     status: 'Active',    trialEnd: null,         renewal: '2026-05-20', users: 18, usersLimit: 25, jobs: 128, mrr: 199, joined: '2025-09-05', lastActive: '2026-05-07', onboarding: 100, churnScore: 8  },
  { id: 't3',  name: 'Apex Electrical',       email: 'admin@apexelectrical.com', owner: 'Mike Torres',    plan: 'starter',      status: 'Trial',     trialEnd: '2026-05-09', renewal: null,         users: 2,  usersLimit: 3,  jobs: 5,   mrr: 0,   joined: '2026-04-25', lastActive: '2026-05-05', onboarding: 45,  churnScore: 72 },
  { id: 't4',  name: 'Sunrise HVAC & Air',    email: 'admin@sunrisehvac.com',    owner: 'Lisa Park',      plan: 'professional', status: 'Active',    trialEnd: null,         renewal: '2026-05-28', users: 9,  usersLimit: 10, jobs: 67, mrr: 99,  joined: '2025-12-01', lastActive: '2026-05-06', onboarding: 100, churnScore: 21 },
  { id: 't5',  name: 'Greenfield Electric',   email: 'ceo@greenfield.com',       owner: 'David Kim',      plan: 'enterprise',   status: 'Active',    trialEnd: null,         renewal: '2026-07-01', users: 34, usersLimit: 100, jobs: 312, mrr: 399, joined: '2025-08-20', lastActive: '2026-05-07', onboarding: 100, churnScore: 5  },
  { id: 't6',  name: 'FastFix Appliance',     email: 'tom@fastfix.com',          owner: 'Tom Brady',      plan: 'starter',      status: 'Past Due',  trialEnd: null,         renewal: '2026-04-30', users: 1,  usersLimit: 3,  jobs: 8,   mrr: 49,  joined: '2026-02-14', lastActive: '2026-04-28', onboarding: 60,  churnScore: 89 },
  { id: 't7',  name: 'Coastal Cooling',       email: 'admin@coastalcooling.com', owner: 'Amy Johnson',    plan: 'professional', status: 'Trial',     trialEnd: '2026-05-11', renewal: null,         users: 4,  usersLimit: 10, jobs: 12,  mrr: 0,   joined: '2026-04-27', lastActive: '2026-05-04', onboarding: 70,  churnScore: 61 },
  { id: 't8',  name: 'ProDrain Plumbing',     email: 'admin@prodrain.com',       owner: 'Carlos Ruiz',    plan: 'business',     status: 'Active',    trialEnd: null,         renewal: '2026-06-10', users: 14, usersLimit: 25, jobs: 95, mrr: 199, joined: '2025-10-12', lastActive: '2026-05-07', onboarding: 100, churnScore: 15 },
  { id: 't9',  name: 'Alpine HVAC',           email: 'info@alpinehvac.com',      owner: 'Robert White',   plan: 'starter',      status: 'Cancelled', trialEnd: null,         renewal: null,         users: 0,  usersLimit: 3,  jobs: 0,   mrr: 0,   joined: '2026-01-08', lastActive: '2026-03-15', onboarding: 30,  churnScore: 100},
  { id: 't10', name: 'Valley Electric LLC',   email: 'ceo@valleyelectric.com',   owner: 'Nancy Drew',     plan: 'professional', status: 'Trial',     trialEnd: '2026-05-12', renewal: null,         users: 3,  usersLimit: 10, jobs: 8,   mrr: 0,   joined: '2026-05-02', lastActive: '2026-05-07', onboarding: 55,  churnScore: 58 },
  { id: 't11', name: 'Summit Services LLC',   email: 'ops@summitservices.com',   owner: 'James Berg',     plan: 'business',     status: 'Active',    trialEnd: null,         renewal: '2026-06-15', users: 11, usersLimit: 25, jobs: 74, mrr: 199, joined: '2025-12-20', lastActive: '2026-05-06', onboarding: 100, churnScore: 18 },
  { id: 't12', name: 'ClearView Glass',       email: 'admin@clearview.com',      owner: 'Emma Stone',     plan: 'starter',      status: 'Trial',     trialEnd: '2026-05-14', renewal: null,         users: 2,  usersLimit: 3,  jobs: 3,   mrr: 0,   joined: '2026-04-30', lastActive: '2026-05-03', onboarding: 35,  churnScore: 67 },
]

export const PLAN_COLORS = {
  starter:      { bg: '#f3f4f6', color: '#374151',  border: '#d1d5db'  },
  professional: { bg: '#dbeafe', color: '#1d4ed8',  border: '#93c5fd'  },
  business:     { bg: '#ede9fe', color: '#6d28d9',  border: '#c4b5fd'  },
  enterprise:   { bg: '#111827', color: '#f9fafb',  border: '#374151'  },
  trial:        { bg: '#fef3c7', color: '#d97706',  border: '#fde68a'  },
}

export const STATUS_COLORS = {
  Active:       { bg: '#dcfce7', color: '#16a34a' },
  Trial:        { bg: '#dbeafe', color: '#2563eb' },
  'Past Due':   { bg: '#fef9c3', color: '#ca8a04' },
  Suspended:    { bg: '#fee2e2', color: '#dc2626' },
  Cancelled:    { bg: '#f3f4f6', color: '#9ca3af' },
  Open:         { bg: '#fef9c3', color: '#ca8a04' },
  'In Progress':{ bg: '#dbeafe', color: '#2563eb' },
  Resolved:     { bg: '#dcfce7', color: '#16a34a' },
  Closed:       { bg: '#f3f4f6', color: '#9ca3af' },
  Low:          { bg: '#f0fdf4', color: '#16a34a' },
  Medium:       { bg: '#fef9c3', color: '#ca8a04' },
  High:         { bg: '#fee2e2', color: '#dc2626' },
  Urgent:       { bg: '#7f1d1d', color: '#fecaca' },
}

export const MRR_HISTORY = [
  { month: 'Jun 25', mrr: 2800, new: 400, churned: 100 },
  { month: 'Jul 25', mrr: 3100, new: 500, churned: 200 },
  { month: 'Aug 25', mrr: 3400, new: 450, churned: 150 },
  { month: 'Sep 25', mrr: 3700, new: 480, churned: 180 },
  { month: 'Oct 25', mrr: 3900, new: 350, churned: 150 },
  { month: 'Nov 25', mrr: 4100, new: 380, churned: 180 },
  { month: 'Dec 25', mrr: 4200, new: 250, churned: 150 },
  { month: 'Jan 26', mrr: 4350, new: 320, churned: 170 },
  { month: 'Feb 26', mrr: 4500, new: 380, churned: 230 },
  { month: 'Mar 26', mrr: 4650, new: 350, churned: 200 },
  { month: 'Apr 26', mrr: 4800, new: 420, churned: 270 },
  { month: 'May 26', mrr: 4965, new: 380, churned: 215 },
]

export const SA_TICKETS = [
  { id: 'TKT-001', tenant: 't1', business: 'Blue Ridge HVAC', subject: 'Cannot export invoices to PDF', category: 'Bug', priority: 'High',   status: 'Open',        date: '2026-05-06', messages: [{ from: 'tenant', text: 'When I click Export PDF on any invoice, nothing happens. This has been going on for 2 days.', ts: '2026-05-06 10:14' }], internalNotes: [] },
  { id: 'TKT-002', tenant: 't2', business: 'Metro Plumbing Co', subject: 'Route optimizer not showing all technicians', category: 'Bug', priority: 'Medium', status: 'In Progress', date: '2026-05-05', messages: [{ from: 'tenant', text: 'The route optimizer only shows 3 of our 8 technicians.', ts: '2026-05-05 14:22' }, { from: 'admin', text: 'We are investigating this issue. It appears related to a recent update.', ts: '2026-05-05 16:00' }], internalNotes: [] },
  { id: 'TKT-003', tenant: 't3', business: 'Apex Electrical', subject: 'How do I import a client list from CSV?', category: 'Question', priority: 'Low', status: 'Resolved', date: '2026-05-04', messages: [{ from: 'tenant', text: 'Is there a way to import clients from a spreadsheet?', ts: '2026-05-04 09:00' }, { from: 'admin', text: 'Yes! Go to Settings > Data > Import. Format: Name, Email, Phone, Address.', ts: '2026-05-04 11:30' }], internalNotes: [] },
  { id: 'TKT-004', tenant: 't6', business: 'FastFix Appliance', subject: 'Billing failed — need help updating card', category: 'Billing', priority: 'Urgent', status: 'Open',        date: '2026-05-07', messages: [{ from: 'tenant', text: 'My card was declined. How do I update my payment method?', ts: '2026-05-07 08:00' }], internalNotes: [{ text: 'Account has been past due for 7 days. May need suspension.', author: 'superadmin', ts: '2026-05-07 08:30' }] },
  { id: 'TKT-005', tenant: 't7', business: 'Coastal Cooling', subject: 'Trial expiring — can I get an extension?', category: 'Account', priority: 'Normal', status: 'Open', date: '2026-05-07', messages: [{ from: 'tenant', text: "Our trial ends in 4 days and we haven't finished evaluating. Can we get 2 more weeks?", ts: '2026-05-07 07:45' }], internalNotes: [] },
]

export const FEATURE_FLAGS = [
  { key: 'ai_estimator',           label: 'AI Estimator',           desc: 'AI-powered job cost estimation', plans: { starter: false, professional: true, business: true, enterprise: true }, globalOverride: false },
  { key: 'ai_receptionist',        label: 'AI Receptionist',        desc: 'Automated client call handling', plans: { starter: false, professional: false, business: true, enterprise: true }, globalOverride: false },
  { key: 'route_optimization',     label: 'Route Optimization',     desc: 'Optimize technician routes daily', plans: { starter: false, professional: true, business: true, enterprise: true }, globalOverride: false },
  { key: 'multi_branch',           label: 'Multi-Branch',           desc: 'Manage multiple business locations', plans: { starter: false, professional: false, business: true, enterprise: true }, globalOverride: false },
  { key: 'custom_branding',        label: 'Custom Branding',        desc: 'White-label with your logo/colors', plans: { starter: false, professional: true, business: true, enterprise: true }, globalOverride: false },
  { key: 'client_portal',          label: 'Client Portal',          desc: 'Client-facing self-service portal', plans: { starter: false, professional: true, business: true, enterprise: true }, globalOverride: false },
  { key: 'api_access',             label: 'API Access',             desc: 'RESTful API for integrations', plans: { starter: false, professional: false, business: true, enterprise: true }, globalOverride: false },
  { key: 'advanced_reports',       label: 'Advanced Reports',       desc: 'Detailed analytics and exports', plans: { starter: false, professional: true, business: true, enterprise: true }, globalOverride: false },
  { key: 'equipment_history',      label: 'Equipment History',      desc: 'Track equipment service history', plans: { starter: true,  professional: true, business: true, enterprise: true }, globalOverride: false },
  { key: 'digital_signatures',     label: 'Digital Signatures',     desc: 'Capture e-signatures on jobs', plans: { starter: false, professional: true, business: true, enterprise: true }, globalOverride: false },
  { key: 'inventory_module',       label: 'Inventory Module',       desc: 'Track parts and stock levels', plans: { starter: true,  professional: true, business: true, enterprise: true }, globalOverride: false },
  { key: 'google_review_automation', label: 'Review Automation', desc: 'Auto-request Google reviews', plans: { starter: false, professional: true, business: true, enterprise: true }, globalOverride: false },
  { key: 'purchase_orders',        label: 'Purchase Orders',        desc: 'Create and track POs', plans: { starter: false, professional: false, business: true, enterprise: true }, globalOverride: false },
  { key: 'warranty_module',        label: 'Warranty Module',        desc: 'Manage equipment warranties', plans: { starter: false, professional: false, business: true, enterprise: true }, globalOverride: false },
]
