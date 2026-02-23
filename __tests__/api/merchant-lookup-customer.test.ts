import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock } from '@/tests/mocks/supabase'
import { createServerClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient:      vi.fn(),
  createServiceRoleClient: vi.fn(),
}))

import { POST } from '@/app/api/merchant/lookup-customer/route'

// Use proper RFC 4122 v4 UUIDs (version nibble 4, variant nibble b)
const MERCHANT_ID  = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const CUSTOMER_ID  = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'
const AUTH_USER_ID = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/merchant/lookup-customer', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

describe('POST /api/merchant/lookup-customer', () => {
  let mockClient: ReturnType<typeof createSupabaseMock>

  beforeEach(() => {
    mockClient = createSupabaseMock()
    vi.mocked(createServerClient).mockResolvedValue(mockClient as never)

    // Authenticated user
    mockClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: AUTH_USER_ID } },
      error: null,
    })
    // Merchant ownership check passes
    mockClient._setResponse('merchants', { data: { id: MERCHANT_ID }, error: null })
    // Customer found
    mockClient._setResponse('customers', { data: { id: CUSTOMER_ID }, error: null })
    // Balance row exists
    mockClient._setResponse('customer_merchant_balances', { data: { balance: 250 }, error: null })
    // Rewards found
    mockClient._setResponse('rewards', {
      data: [
        { id: 'rw-1', name: 'Free Coffee', points_required: 100 },
        { id: 'rw-2', name: 'Free Pastry', points_required: 200 },
      ],
      error: null,
    })
  })

  it('returns 401 when unauthenticated', async () => {
    mockClient.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })
    const res = await POST(makeRequest({ email: 'c@example.com', merchantId: MERCHANT_ID }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when merchant ownership check fails', async () => {
    mockClient._setResponse('merchants', { data: null, error: null })
    const res = await POST(makeRequest({ email: 'c@example.com', merchantId: MERCHANT_ID }))
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid email format', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email', merchantId: MERCHANT_ID }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid merchantId UUID', async () => {
    const res = await POST(makeRequest({ email: 'c@example.com', merchantId: 'not-uuid' }))
    expect(res.status).toBe(400)
  })

  it('returns 404 with "No Taplo account" when customer not found', async () => {
    mockClient._setResponse('customers', { data: null, error: null })
    const res = await POST(makeRequest({ email: 'c@example.com', merchantId: MERCHANT_ID }))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/No Taplo account/i)
  })

  it('returns 200 with customerId, balance, and rewards for valid lookup', async () => {
    const res = await POST(makeRequest({ email: 'c@example.com', merchantId: MERCHANT_ID }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.customerId).toBe(CUSTOMER_ID)
    expect(body.balance).toBe(250)
    expect(body.rewards).toHaveLength(2)
  })

  it('returns balance: 0 when no customer_merchant_balances row exists', async () => {
    mockClient._setResponse('customer_merchant_balances', { data: null, error: null })
    const res = await POST(makeRequest({ email: 'c@example.com', merchantId: MERCHANT_ID }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.balance).toBe(0)
  })

  it('returns empty rewards array when no rewards found', async () => {
    mockClient._setResponse('rewards', { data: null, error: null })
    const res = await POST(makeRequest({ email: 'c@example.com', merchantId: MERCHANT_ID }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.rewards).toEqual([])
  })

  it('uses .order() on rewards query', async () => {
    await POST(makeRequest({ email: 'c@example.com', merchantId: MERCHANT_ID }))
    expect(mockClient._chain.order).toHaveBeenCalledWith('points_required', { ascending: true })
  })
})
