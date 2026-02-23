import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock } from '@/tests/mocks/supabase'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { refreshAccessToken } from '@/lib/square/oauth'
import { decrypt, encrypt } from '@/lib/utils/crypto'

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(),
  createServerClient:      vi.fn(),
}))

vi.mock('@/lib/square/oauth', () => ({
  buildOAuthUrl:         vi.fn(),
  exchangeCodeForTokens: vi.fn(),
  refreshAccessToken:    vi.fn(),
}))

vi.mock('@/lib/utils/crypto', () => ({
  encrypt: vi.fn().mockReturnValue('encrypted-token'),
  decrypt: vi.fn().mockReturnValue('plain-access-token'),
}))

// vi.hoisted ensures these variables are defined before the hoisted vi.mock() call runs
const { MockSquareClient, mockSquareClientInstance } = vi.hoisted(() => {
  const instance = { payments: {}, orders: {} }
  const Ctor = vi.fn().mockImplementation(() => instance)
  return { MockSquareClient: Ctor, mockSquareClientInstance: instance }
})

vi.mock('square', () => ({
  SquareClient:      MockSquareClient,
  SquareEnvironment: { Sandbox: 'sandbox', Production: 'production' },
  WebhooksHelper:    { verifySignature: vi.fn() },
}))

import { getSquareClientForMerchant } from '@/lib/square/client'

const MERCHANT_ID = 'merchant-uuid-123'

function makeMerchantData(overrides: Record<string, unknown> = {}) {
  return {
    square_access_token:     'encrypted-access-token',
    square_refresh_token:    'encrypted-refresh-token',
    square_token_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    ...overrides,
  }
}

describe('getSquareClientForMerchant', () => {
  let mockClient: ReturnType<typeof createSupabaseMock>

  beforeEach(() => {
    mockClient = createSupabaseMock()
    vi.mocked(createServiceRoleClient).mockReturnValue(mockClient as never)
    mockClient._setResponse('merchants', { data: makeMerchantData(), error: null })
  })

  it('throws when merchant record not found (error returned)', async () => {
    mockClient._setResponse('merchants', { data: null, error: { message: 'not found' } })
    await expect(getSquareClientForMerchant(MERCHANT_ID)).rejects.toThrow(
      /No Square credentials/,
    )
  })

  it('throws when square_access_token is null (no credentials)', async () => {
    mockClient._setResponse('merchants', {
      data:  { ...makeMerchantData(), square_access_token: null },
      error: null,
    })
    await expect(getSquareClientForMerchant(MERCHANT_ID)).rejects.toThrow(
      /No Square credentials/,
    )
  })

  it('creates SquareClient with decrypted token when not near expiry', async () => {
    const client = await getSquareClientForMerchant(MERCHANT_ID)

    expect(decrypt).toHaveBeenCalledWith('encrypted-access-token')
    expect(MockSquareClient).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'plain-access-token' }),
    )
    expect(client).toBe(mockSquareClientInstance)
  })

  it('does NOT call refreshAccessToken when token expires more than 5 minutes from now', async () => {
    await getSquareClientForMerchant(MERCHANT_ID) // 1 hour from now
    expect(refreshAccessToken).not.toHaveBeenCalled()
  })

  it('calls refreshAccessToken when token expires within 5 minutes', async () => {
    const soonExpiry = new Date(Date.now() + 2 * 60 * 1000).toISOString() // 2 min from now
    mockClient._setResponse('merchants', {
      data:  makeMerchantData({ square_token_expires_at: soonExpiry }),
      error: null,
    })
    vi.mocked(refreshAccessToken).mockResolvedValue({
      access_token:  'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_at:    new Date(Date.now() + 7200 * 1000).toISOString(),
      merchant_id:   'sq-merchant-123',
      token_type:    'bearer',
    })

    await getSquareClientForMerchant(MERCHANT_ID)

    // decrypt is called for both access and refresh token; refresh called with decrypted refresh token
    expect(refreshAccessToken).toHaveBeenCalledWith('plain-access-token')
  })

  it('updates merchants table with newly encrypted tokens after refresh', async () => {
    const soonExpiry = new Date(Date.now() + 2 * 60 * 1000).toISOString()
    mockClient._setResponse('merchants', {
      data:  makeMerchantData({ square_token_expires_at: soonExpiry }),
      error: null,
    })
    vi.mocked(refreshAccessToken).mockResolvedValue({
      access_token:  'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_at:    new Date(Date.now() + 7200 * 1000).toISOString(),
      merchant_id:   'sq-merchant-123',
      token_type:    'bearer',
    })

    await getSquareClientForMerchant(MERCHANT_ID)

    expect(mockClient._chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        square_access_token:  'encrypted-token',
        square_refresh_token: 'encrypted-token',
      }),
    )
  })

  it('uses SquareEnvironment.Sandbox when SQUARE_ENVIRONMENT=sandbox', async () => {
    await getSquareClientForMerchant(MERCHANT_ID)
    expect(MockSquareClient).toHaveBeenCalledWith(
      expect.objectContaining({ environment: 'sandbox' }),
    )
  })
})
