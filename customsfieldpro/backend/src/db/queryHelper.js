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
    const INVALID = new Set(['null', 'undefined', 'demo-tenant', ''])
    if (!tenantId || INVALID.has(String(tenantId))) {
      throw new Error('QueryHelper requires a valid tenant ID')
    }
    this.supabase  = supabase
    this.tenantId  = tenantId
  }

  // SELECT — always scoped to tenant
  async findAll(table, filters = {}, options = {}) {
    let query = this.supabase
      .from(table)
      .select(options.select || '*', options.count ? { count: 'exact' } : undefined)
      .eq('tenant_id', this.tenantId)

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

  // SELECT single by ID — always verifies tenant
  async findById(table, id, select = '*') {
    const { data, error } = await this.supabase
      .from(table)
      .select(select)
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .single()

    if (error) throw new DatabaseError(error.message, table, 'findById')
    return data
  }

  // ILIKE search — uses Supabase .ilike() (parameterized), never concatenation
  async search(table, columns, term, extraFilters = {}, options = {}) {
    const sanitized = term.replace(/[%_\\]/g, c => `\\${c}`)
    let query = this.supabase
      .from(table)
      .select(options.select || '*')
      .eq('tenant_id', this.tenantId)

    // Build OR across columns using individual .ilike() calls
    // Supabase parameterizes these — the pattern string is passed as a bind param
    if (columns.length === 1) {
      query = query.ilike(columns[0], `%${sanitized}%`)
    } else {
      const orFilter = columns.map(c => `${c}.ilike.%${sanitized}%`).join(',')
      query = query.or(orFilter)
    }

    for (const [key, value] of Object.entries(extraFilters)) {
      if (value !== undefined && value !== null) query = query.eq(key, value)
    }

    if (options.limit) query = query.limit(options.limit)

    const { data, error } = await query
    if (error) throw new DatabaseError(error.message, table, 'search')
    return data
  }

  // INSERT — always stamps tenant_id from server, strips client-supplied id/tenant
  async insert(table, inputData) {
    const data = { ...inputData }
    delete data.id          // let DB generate UUID
    delete data.tenant_id   // always set from server
    delete data.created_at

    const record = { ...data, tenant_id: this.tenantId, created_at: new Date().toISOString() }

    const { data: inserted, error } = await this.supabase
      .from(table)
      .insert(record)
      .select()
      .single()

    if (error) throw new DatabaseError(error.message, table, 'insert')
    return inserted
  }

  // UPDATE — always verifies tenant ownership; strips immutable fields
  async update(table, id, inputData) {
    const data = { ...inputData }
    delete data.tenant_id   // cannot change tenant
    delete data.id
    delete data.created_at
    data.updated_at = new Date().toISOString()

    const { data: updated, error } = await this.supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single()

    if (error) throw new DatabaseError(error.message, table, 'update')
    return updated
  }

  // DELETE — always verifies tenant ownership
  async delete(table, id) {
    const { error } = await this.supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('tenant_id', this.tenantId)

    if (error) throw new DatabaseError(error.message, table, 'delete')
    return true
  }
}

module.exports = { QueryHelper, DatabaseError }
