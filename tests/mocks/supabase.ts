import { vi } from 'vitest'

export function createSupabaseMock() {
  const responses: Record<string, { data: unknown; error: unknown }> = {}
  const rpcResponses: Record<string, { data: unknown; error: unknown }> = {}
  let currentTable = ''

  const chain = {
    select:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    neq:         vi.fn().mockReturnThis(),
    gt:          vi.fn().mockReturnThis(),
    gte:         vi.fn().mockReturnThis(),
    lt:          vi.fn().mockReturnThis(),
    lte:         vi.fn().mockReturnThis(),
    in:          vi.fn().mockReturnThis(),
    order:       vi.fn().mockImplementation(() =>
      Promise.resolve(responses[currentTable] ?? { data: null, error: null }),
    ),
    limit:       vi.fn().mockReturnThis(),
    ilike:       vi.fn().mockReturnThis(),
    update:      vi.fn().mockReturnThis(),
    upsert:      vi.fn().mockReturnThis(),
    insert:      vi.fn().mockImplementation(() =>
      Promise.resolve(responses[currentTable] ?? { data: null, error: null }),
    ),
    single:      vi.fn().mockImplementation(() =>
      Promise.resolve(responses[currentTable] ?? { data: null, error: null }),
    ),
    maybeSingle: vi.fn().mockImplementation(() =>
      Promise.resolve(responses[currentTable] ?? { data: null, error: null }),
    ),
  }

  const client = {
    // Test helpers
    _setResponse(table: string, r: { data: unknown; error: unknown }) {
      responses[table] = r
    },
    _setRpcResponse(fn: string, r: { data: unknown; error: unknown }) {
      rpcResponses[fn] = r
    },
    _chain: chain,
    // Client API
    from: vi.fn().mockImplementation((table: string) => {
      currentTable = table
      return chain
    }),
    rpc: vi.fn().mockImplementation((fn: string) =>
      Promise.resolve(rpcResponses[fn] ?? { data: null, error: null }),
    ),
    auth: {
      getUser:                vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut:                vi.fn().mockResolvedValue({ error: null }),
    },
  }

  return client
}
