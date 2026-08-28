import { vi, type Mock } from 'vitest'

export interface QueryResult {
  data?: unknown
  error?: unknown
  count?: number | null
}

// A minimal thenable query-builder mock matching how supabase-js chains
// work (.select()/.eq()/.order()/.limit() etc. all return the builder
// itself, and `await builder` resolves via its own .then()). Shared across
// every tools/*.test.ts file so each one doesn't reinvent this. Explicitly
// typed (not Record<string, unknown>) so call sites can assert on
// `builder.eq.mock.calls` etc. without a cast at every use.
export interface MockQueryBuilder {
  select: Mock
  eq: Mock
  in: Mock
  or: Mock
  order: Mock
  limit: Mock
  insert: Mock
  update: Mock
  delete: Mock
  single: Mock
  maybeSingle: Mock
  then: (resolve: (v: QueryResult) => void) => void
}

export function makeQueryBuilder(result: QueryResult): MockQueryBuilder {
  const builder = {} as MockQueryBuilder
  const chain = ['select', 'eq', 'in', 'or', 'order', 'limit', 'insert', 'update', 'delete'] as const
  for (const method of chain) builder[method] = vi.fn(() => builder)
  builder.single = vi.fn(async () => result)
  builder.maybeSingle = vi.fn(async () => result)
  builder.then = (resolve) => resolve(result)
  return builder
}

// supabase.from(table) -> per-table canned builder. Pass a map of
// table name -> result; tables not listed throw clearly instead of
// returning `undefined.select is not a function`.
export function makeSupabaseMock(tableResults: Record<string, QueryResult>) {
  const from = vi.fn((table: string) => {
    if (!(table in tableResults)) {
      throw new Error(`makeSupabaseMock: no canned result configured for table "${table}"`)
    }
    return makeQueryBuilder(tableResults[table])
  })
  return { from }
}
