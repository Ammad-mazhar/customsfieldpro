// User queries — never return password hashes; always tenant-scoped.

const { QueryHelper } = require('../queryHelper')
const supabase = require('../../utils/supabase')

// Fields safe to return to API consumers — never include password_hash
const SAFE_SELECT = 'id, email, full_name, phone, role, specialty, color, is_active, permissions, created_at, tenant_id'

function qh(tenantId) { return new QueryHelper(supabase, tenantId) }

async function getUsers(tenantId, { role, is_active } = {}) {
  let query = supabase
    .from('users')
    .select(SAFE_SELECT)
    .eq('tenant_id', tenantId)
    .order('full_name')

  if (role !== undefined)      query = query.eq('role', role)
  if (is_active !== undefined) query = query.eq('is_active', is_active === 'true' || is_active === true)

  const { data, error } = await query
  if (error) throw error
  return data
}

async function getUserById(tenantId, userId) {
  const { data, error } = await supabase
    .from('users')
    .select(SAFE_SELECT)
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .single()
  if (error) throw error
  return data
}

async function updateUser(tenantId, targetUserId, requestingUserRole, fields) {
  // Role and is_active can only be changed by admin
  const allowed = requestingUserRole === 'admin'
    ? ['full_name', 'phone', 'role', 'specialty', 'color', 'is_active', 'permissions']
    : ['full_name', 'phone', 'specialty', 'color']

  const clean = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)))
  // Strip any attempt to change the password via this endpoint
  delete clean.password_hash
  delete clean.password

  return qh(tenantId).update('users', targetUserId, clean)
}

async function deactivateUser(tenantId, userId) {
  return qh(tenantId).update('users', userId, { is_active: false })
}

async function updatePermissions(tenantId, userId, permissions) {
  return qh(tenantId).update('users', userId, { permissions })
}

module.exports = { getUsers, getUserById, updateUser, deactivateUser, updatePermissions, SAFE_SELECT }
