// Wraps the Supabase client to enforce tenant isolation and safe query patterns.
// All queries MUST go through this helper on the backend — never build raw
// filter strings from user input.

class DatabaseError extends Error {
  constructor(message, table, operation) {
    super(message)
    this.name    = 'DatabaseError'
    this.table   = table
    this.operation = operation
  }
}

class QueryHelper {
  constructor(supabase, tenantId) {
    // Reject string placeholders that would be passed as a UUID literal to Postgres.
    // Allow actual null/undefined — demo users have no tenant and see all data.
    const INVALID_STRINGS = new Set(['null', 'undefined', 'demo-tenant', ''])
    if (tenantId != null && INVALID_STRINGS.has(String(tenantId))) {
      throw new Error('QueryHelper requires a valid tenant ID')
    }
    this.supabase  = supabase
    this.tenantId  = tenantId ?? null
  }

  // Applies tenant filter only when tenantId is present.
  _scopeTenant(query) {
    return this.tenantId ? query.eq('tenant_id', this.tenantId) : query
  }

  // SELECT — scoped to tenant when tenantId is set
  async findAll(table, filters = {}, options = {}) {
    let query = this._scopeTenant(
      this.supabase
        .from(table)
        .select(options.select || '*', options.count ? { count: 'exact' } : undefined)
    )

    for (const [key, value] of Object.entries(filters)) {
      if (value === null) {
        query = query.is(key, null)
      } else if (value !== undefined) {
        query = query.eq(key, value)
      }
    }

    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false })
    }
    if (options.limit)  query = query.limit(options.limit)
    if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1)

    const { data, error, count } = await query
    if (error) throw new DatabaseError(error.message, table, 'findAll')
    return options.count ? { data, count } : data
  }

  // SELECT single by ID — verifies tenant ownership when tenantId is set
  async findById(table, id, select = '*') {
    const { data, error } = await this._scopeTenant(
      this.supabase.from(table).select(select).eq('id', id)
    ).single()

    if (error) throw new DatabaseError(error.message, table, 'findById')
    return data
  }

  // ILIKE search — uses Supabase .ilike() (parameterized), never concatenation
  async search(table, columns, term, extraFilters = {}, options = {}) {
    const sanitized = term.replace(/[%_\\]/g, c => `\\${c}`)
    let query = this._scopeTenant(
      this.supabase.from(table).select(options.select || '*')
    )

    if (columns.length === 1) {
      query = query.ilike(columns[0], `%${sanitized}%`)
    } else {
      query = query.or(columns.map(c => `${c}.ilike.%${sanitized}%`).join(','))
    }

    for (const [key, value] of Object.entries(extraFilters)) {
      if (value !== undefined && value !== null) query = query.eq(key, value)
    }

    if (options.limit) query = query.limit(options.limit)

    const { data, error } = await query
    if (error) throw new DatabaseError(error.message, table, 'search')
    return data
  }

  // INSERT — stamps tenant_id from server (null when demo), strips client-supplied id/tenant
  async insert(table, inputData) {
    const data = { ...inputData }
    delete data.id          // let DB generate UUID
    delete data.tenant_id   // always set from server
    delete data.created_at

    const record = { ...data, created_at: new Date().toISOString() }
    if (this.tenantId) record.tenant_id = this.tenantId

    const { data: inserted, error } = await this.supabase
      .from(table)
      .insert(record)
      .select()
      .single()

    if (error) throw new DatabaseError(error.message, table, 'insert')
    return inserted
  }

  // UPDATE — verifies tenant ownership when tenantId is set; strips immutable fields
  async update(table, id, inputData) {
    const data = { ...inputData }
    delete data.tenant_id   // cannot change tenant
    delete data.id
    delete data.created_at
    data.updated_at = new Date().toISOString()

    const { data: updated, error } = await this._scopeTenant(
      this.supabase.from(table).update(data).eq('id', id)
    ).select().single()

    if (error) throw new DatabaseError(error.message, table, 'update')
    return updated
  }

  // DELETE — verifies tenant ownership when tenantId is set
  async delete(table, id) {
    const { error } = await this._scopeTenant(
      this.supabase.from(table).delete().eq('id', id)
    )

    if (error) throw new DatabaseError(error.message, table, 'delete')
    return true
  }
}

module.exports = { QueryHelper, DatabaseError }
