import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock } from '@/tests/mocks/supabase'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient:      vi.fn(),
  createServiceRoleClient: vi.fn(),
}))

import { POST } from '@/app/api/admin/correct-points/route'

// Use proper RFC 4122 v4 UUIDs (version nibble 4, variant nibble b)
const MERCHANT_ID  = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const CUSTOMER_ID  = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'
const AUTH_USER_ID = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/admin/correct-points', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

const validBody = {
  merchantId:    MERCHANT_ID,
  customerEmail: 'customer@example.com',
  delta:         50,
  note:          'Manual correction by admin',
}

describe('POST /api/admin/correct-points', () => {
  let userClient:    ReturnType<typeof createSupabaseMock>
  let serviceClient: ReturnType<typeof createSupabaseMock>

  beforeEach(() => {
    userClient    = createSupabaseMock()
    serviceClient = createSupabaseMock()

    vi.mocked(createServerClient).mockResolvedValue(userClient as never)
    vi.mocked(createServiceRoleClient).mockReturnValue(serviceClient as never)

    // Authenticated admin user
    userClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: AUTH_USER_ID } },
      error: null,
    })
    // Admin role check passes
    userClient._setResponse('user_roles', { data: { role: 'admin' }, error: null })
    // Customer found
    serviceClient._setResponse('customers', { data: { id: CUSTOMER_ID }, error: null })
    // RPC succeeds
    serviceClient._setRpcResponse('admin_correct_points', { data: null, error: null })
  })

  it('returns 401 when getUser returns null user', async () => {
    userClient.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
  })

  it("returns 403 when user_roles.role is not 'admin'", async () => {
    userClient._setResponse('user_roles', { data: { role: 'merchant' }, error: null })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(403)
  })

  it('returns 403 when no role row found', async () => {
    userClient._setResponse('user_roles', { data: null, error: null })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(403)
  })

  it('returns 400 when delta = 0', async () => {
    const res = await POST(makeRequest({ ...validBody, delta: 0 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when note is empty string', async () => {
    const res = await POST(makeRequest({ ...validBody, note: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest({ delta: 10, note: 'hi' })) // missing merchantId, customerEmail
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid merchantId UUID', async () => {
    const res = await POST(makeRequest({ ...validBody, merchantId: 'not-a-uuid' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid customerEmail', async () => {
    const res = await POST(makeRequest({ ...validBody, customerEmail: 'not-an-email' }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when customer email not found', async () => {
    serviceClient._setResponse('customers', { data: null, error: null })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(404)
  })

  it('returns 200 and calls admin_correct_points RPC with correct args', async () => {
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)

    expect(serviceClient.rpc).toHaveBeenCalledWith('admin_correct_points', {
      p_customer_id: CUSTOMER_ID,
      p_merchant_id: MERCHANT_ID,
      p_delta:       50,
      p_note:        'Manual correction by admin',
    })
  })

  it('performs case-insensitive email lookup via .eq()', async () => {
    await POST(makeRequest({ ...validBody, customerEmail: 'CUSTOMER@EXAMPLE.COM' }))

    // Route does .eq('email', customerEmail.toLowerCase())
    expect(serviceClient._chain.eq).toHaveBeenCalledWith('email', 'customer@example.com')
  })

  it('returns 500 on RPC error', async () => {
    serviceClient._setRpcResponse('admin_correct_points', {
      data:  null,
      error: { message: 'RPC failed', code: 'PXXXX' },
    })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(500)
  })
})
