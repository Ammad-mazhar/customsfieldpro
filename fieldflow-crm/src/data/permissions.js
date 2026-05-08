// FieldFlow CRM — Role Permission Definitions
// Single source of truth for all permission keys, labels, descriptions, and defaults.

export const PERMISSIONS_KEY = 'fieldflow_permissions'

// ─── Staff permissions ────────────────────────────────────────────────────────
export const STAFF_PERMS = [
  { key: 'dashboard',                label: 'Dashboard Access',            desc: 'Can view the dashboard overview',                                    defaultOn: true  },
  { key: 'view_all_jobs',            label: 'View All Jobs',               desc: 'See every job; when off, only own assigned jobs visible',           defaultOn: false },
  { key: 'create_jobs',              label: 'Create Jobs',                 desc: 'Can create and log new job records',                                defaultOn: false },
  { key: 'update_job_status',        label: 'Update Job Status',           desc: 'Can change status from the job detail view',                        defaultOn: true  },
  { key: 'add_job_notes',            label: 'Add Job Notes',               desc: 'Can write internal and completion notes on jobs',                   defaultOn: true  },
  { key: 'upload_job_photos',        label: 'Upload Job Photos',           desc: 'Can attach photos to job records',                                  defaultOn: true  },
  { key: 'view_clients',             label: 'View Clients',                desc: 'Read-only access to client profiles and history',                   defaultOn: true  },
  { key: 'create_clients',           label: 'Create New Clients',          desc: 'Can add new client records',                                        defaultOn: false },
  { key: 'edit_clients',             label: 'Edit Clients',                desc: 'Can modify existing client information and notes',                  defaultOn: false },
  { key: 'view_invoices',            label: 'View Invoices',               desc: 'Can access invoice records and see amounts',                        defaultOn: false },
  { key: 'create_invoices',          label: 'Create Invoices',             desc: 'Can create and draft new invoices',                                 defaultOn: false },
  { key: 'view_quotes',              label: 'View Quotes',                 desc: 'Can see quote records and pricing',                                 defaultOn: false },
  { key: 'create_quotes',            label: 'Create Quotes',               desc: 'Can create and draft new quotes',                                   defaultOn: false },
  { key: 'view_requests',            label: 'View Requests',               desc: 'Can see inbound service requests',                                  defaultOn: false },
  { key: 'create_requests',          label: 'Create Requests',             desc: 'Can log and submit new service requests',                           defaultOn: false },
  { key: 'access_scheduler',         label: 'Access Scheduler',            desc: 'Can view the schedule calendar and map',                            defaultOn: true  },
  { key: 'view_all_technicians_map', label: 'View All Technicians on Map', desc: 'When off, only own jobs and location are visible on the map',      defaultOn: false },
  { key: 'access_reports',           label: 'Access Reports',              desc: 'Can view analytics and performance report data',                    defaultOn: false },
]

// ─── Technician permissions ───────────────────────────────────────────────────
export const TECH_PERMS = [
  { key: 'dashboard',             label: 'Dashboard Access',          desc: 'Can view the dashboard overview',                             defaultOn: true,  locked: true  },
  { key: 'view_own_jobs',         label: 'View Own Jobs',             desc: 'Access to assigned jobs — always required for technicians',  defaultOn: true,  locked: true  },
  { key: 'update_job_status',     label: 'Update Job Status',         desc: 'Can mark jobs in-progress, completed, etc.',                 defaultOn: true,  locked: true  },
  { key: 'add_completion_notes',  label: 'Add Completion Notes',      desc: 'Can add notes when finishing a job',                         defaultOn: true,  locked: false },
  { key: 'upload_job_photos',     label: 'Upload Job Photos',         desc: 'Can attach photos to job records',                           defaultOn: true,  locked: false },
  { key: 'view_job_location',     label: 'View Job Location on Map',  desc: 'Can see job site pins on the map view',                     defaultOn: true,  locked: false },
  { key: 'view_client_contact',   label: 'View Client Contact Info',  desc: 'Can see client phone and email on job detail',              defaultOn: false, locked: false },
  { key: 'view_invoice_amounts',  label: 'View Invoice Amounts',      desc: 'Can see cost totals and invoice amounts on jobs',            defaultOn: false, locked: false },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getDefaultPermissions() {
  const staff = {}
  STAFF_PERMS.forEach(p => { staff[p.key] = p.defaultOn })
  const technician = {}
  TECH_PERMS.forEach(p => { technician[p.key] = p.defaultOn })
  return { staff, technician }
}

export function readPermissions() {
  try {
    const raw = localStorage.getItem(PERMISSIONS_KEY)
    if (!raw) return getDefaultPermissions()
    const saved = JSON.parse(raw)
    const defaults = getDefaultPermissions()
    return {
      staff:      { ...defaults.staff,      ...(saved.staff      ?? {}) },
      technician: { ...defaults.technician, ...(saved.technician ?? {}) },
    }
  } catch { return getDefaultPermissions() }
}

export function writePermissions(perms) {
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(perms))
}
