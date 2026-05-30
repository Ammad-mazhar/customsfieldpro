const supabase = require('./supabase')

/**
 * logActivity(req, action, module, recordId, recordName, opts)
 *
 * opts.field     — field name that changed
 * opts.oldValue  — previous value (stringified)
 * opts.newValue  — new value (stringified)
 *
 * Never throws — logging must never fail a request.
 */
async function logActivity(req, action, module, recordId, recordName, opts = {}) {
  try {
    await supabase.from('activity_logs').insert({
      tenant_id:     req.tenantId                              || null,
      user_id:       req.user?.id                              || null,
      user_name:     req.user?.full_name || req.user?.email    || null,
      action_type:   action,
      module,
      record_id:     recordId   != null ? String(recordId)   : null,
      record_name:   recordName != null ? String(recordName) : null,
      field_changed: opts.field                                || null,
      old_value:     opts.oldValue != null ? String(opts.oldValue) : null,
      new_value:     opts.newValue != null ? String(opts.newValue) : null,
      ip_address:    req.ip                                    || null,
      user_agent:    req.headers?.['user-agent']               || null,
    })
  } catch (e) {
    console.error('[activityLogger]', e.message)
  }
}

module.exports = { logActivity }
