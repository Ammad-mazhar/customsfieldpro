/**
 * Injects tenant_id into every Supabase query via set_config.
 * Useful when you want RLS to fire on the service-role client.
 */
const supabase = require('../utils/supabase')

module.exports = async (req, res, next) => {
  if (req.tenantId) {
    await supabase.rpc('set_config', {
      setting_name: 'app.tenant_id',
      new_value: req.tenantId,
      is_local: true,
    }).catch(() => {})
  }
  next()
}
