export const PLAN_LIMITS = {
  trial:        { users: 5,   clients: 50,   jobsPerMonth: 50   },
  starter:      { users: 3,   clients: 100,  jobsPerMonth: 100  },
  professional: { users: 10,  clients: 500,  jobsPerMonth: 500  },
  business:     { users: 25,  clients: 2000, jobsPerMonth: -1   },
  enterprise:   { users: -1,  clients: -1,   jobsPerMonth: -1   },
  cancelled:    { users: 1,   clients: 10,   jobsPerMonth: 10   },
}

export const PLAN_NAMES = {
  trial:        'Free Trial',
  starter:      'Starter',
  professional: 'Professional',
  business:     'Business',
  enterprise:   'Enterprise',
  cancelled:    'Cancelled',
}

/**
 * Returns { allowed, limit, current, percentage }
 * limit === -1 means unlimited
 */
export function checkLimit(plan, resource, currentCount) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.trial
  const limit = limits[resource]
  if (limit === undefined || limit === -1) {
    return { allowed: true, limit: -1, current: currentCount, percentage: 0 }
  }
  const percentage = Math.round((currentCount / limit) * 100)
  return {
    allowed: currentCount < limit,
    limit,
    current: currentCount,
    percentage,
    nearLimit: percentage >= 80 && percentage < 100,
    atLimit: currentCount >= limit,
  }
}

export function getNextPlan(current) {
  const order = ['trial', 'starter', 'professional', 'business', 'enterprise']
  const idx = order.indexOf(current)
  if (idx === -1 || idx === order.length - 1) return null
  return order[idx + 1]
}

export const PLAN_FEATURES = {
  starter: {
    route_optimization: false, ai_estimator: false, ai_receptionist: false,
    multi_branch: false, custom_branding: false, api_access: false,
    advanced_reports: false, equipment_history: true, warranty_module: true,
    client_portal: true, inventory: true, purchase_orders: true, leads: true,
    max_users: 3, max_clients: 100, max_jobs_month: 100, storage_gb: 5
  },
  professional: {
    route_optimization: true, ai_estimator: true, ai_receptionist: false,
    multi_branch: false, custom_branding: false, api_access: false,
    advanced_reports: true, equipment_history: true, warranty_module: true,
    client_portal: true, inventory: true, purchase_orders: true, leads: true,
    max_users: 10, max_clients: 500, max_jobs_month: 500, storage_gb: 20
  },
  business: {
    route_optimization: true, ai_estimator: true, ai_receptionist: true,
    multi_branch: true, custom_branding: true, api_access: false,
    advanced_reports: true, equipment_history: true, warranty_module: true,
    client_portal: true, inventory: true, purchase_orders: true, leads: true,
    max_users: 25, max_clients: 2000, max_jobs_month: -1, storage_gb: 50
  },
  enterprise: {
    route_optimization: true, ai_estimator: true, ai_receptionist: true,
    multi_branch: true, custom_branding: true, api_access: true,
    advanced_reports: true, equipment_history: true, warranty_module: true,
    client_portal: true, inventory: true, purchase_orders: true, leads: true,
    max_users: -1, max_clients: -1, max_jobs_month: -1, storage_gb: -1
  },
  trial: {
    route_optimization: true, ai_estimator: true, ai_receptionist: true,
    multi_branch: true, custom_branding: true, api_access: true,
    advanced_reports: true, max_users: 5, max_clients: 50, max_jobs_month: 50, storage_gb: 5
  }
}

export function hasFeature(plan, feature) {
  return PLAN_FEATURES[plan]?.[feature] ?? PLAN_FEATURES.trial?.[feature] ?? false
}
