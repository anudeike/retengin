import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock } from '@/tests/mocks/supabase'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient:      vi.fn(),
  createServiceRoleClient: vi.fn(),
}))

import { POST } from '@/app/api/merchant/redeem/route'

// Use proper RFC 4122 v4 UUIDs (version nibble 4, variant nibble b)
const MERCHANT_ID  = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const CUSTOMER_ID  = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'
const REWARD_ID    = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'
const AUTH_USER_ID = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/merchant/redeem', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

const validBody = {
  customerId: CUSTOMER_ID,
  merchantId: MERCHANT_ID,
  rewardId:   REWARD_ID,
  points:     100,
}

describe('POST /api/merchant/redeem', () => {
  let userClient:    ReturnType<typeof createSupabaseMock>
  let serviceClient: ReturnType<typeof createSupabaseMock>

  beforeEach(() => {
    userClient    = createSupabaseMock()
    serviceClient = createSupabaseMock()

    vi.mocked(createServerClient).mockResolvedValue(userClient as never)
    vi.mocked(createServiceRoleClient).mockReturnValue(serviceClient as never)

    // Authenticated user
    userClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: AUTH_USER_ID } },
      error: null,
    })
    // Merchant ownership check passes
    userClient._setResponse('merchants', { data: { id: MERCHANT_ID }, error: null })
    // Redemption RPC succeeds
    serviceClient._setRpcResponse('redeem_points', { data: 'redemption-uuid-123', error: null })
  })

  it('returns 401 when unauthenticated', async () => {
    userClient.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
  })

  it('returns 403 when merchant ownership check fails', async () => {
    userClient._setResponse('merchants', { data: null, error: null })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(403)
  })

  it('returns 400 for non-positive points (Zod validation)', async () => {
    const res = await POST(makeRequest({ ...validBody, points: 0 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for negative points', async () => {
    const res = await POST(makeRequest({ ...validBody, points: -10 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing required fields', async () => {
    const res = await POST(makeRequest({ merchantId: MERCHANT_ID, points: 100 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid UUID merchantId', async () => {
    const res = await POST(makeRequest({ ...validBody, merchantId: 'not-a-uuid' }))
    expect(res.status).toBe(400)
  })

  it('returns 422 with "Insufficient points" when RPC error message contains insufficient_points', async () => {
    serviceClient._setRpcResponse('redeem_points', {
      data: null,
      error: { message: 'insufficient_points: balance too low', code: 'P0001' },
    })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toBe('Insufficient points')
  })

  it('returns 200 with redemptionId on success', async () => {
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.redemptionId).toBe('redemption-uuid-123')
  })

  it('calls redeem_points RPC with correct args', async () => {
    await POST(makeRequest(validBody))
    expect(serviceClient.rpc).toHaveBeenCalledWith('redeem_points', {
      p_customer_id: CUSTOMER_ID,
      p_merchant_id: MERCHANT_ID,
      p_reward_id:   REWARD_ID,
      p_points:      100,
    })
  })

  it('returns 500 on unexpected RPC error', async () => {
    serviceClient._setRpcResponse('redeem_points', {
      data:  null,
      error: { message: 'some unexpected db error', code: 'PXXXX' },
    })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(500)
  })
})
