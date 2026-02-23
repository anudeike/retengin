import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock } from '@/tests/mocks/supabase'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens } from '@/lib/square/oauth'
import { encrypt } from '@/lib/utils/crypto'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient:      vi.fn(),
  createServiceRoleClient: vi.fn(),
}))

vi.mock('@/lib/square/oauth', () => ({
  exchangeCodeForTokens: vi.fn(),
  buildOAuthUrl:         vi.fn(),
  refreshAccessToken:    vi.fn(),
}))

vi.mock('@/lib/utils/crypto', () => ({
  encrypt: vi.fn().mockReturnValue('encrypted-value'),
  decrypt: vi.fn().mockReturnValue('decrypted-value'),
}))

const mockCookieStore = {
  get:    vi.fn(),
  set:    vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn().mockReturnValue([]),
}

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}))

import { GET } from '@/app/api/square/callback/route'

const AUTH_USER_ID = 'user-oauth-abc'

function makeRequest(search: string) {
  return new Request(`http://localhost/api/square/callback${search}`)
}

const mockTokens = {
  access_token:  'sq-access-token',
  refresh_token: 'sq-refresh-token',
  expires_at:    '2027-01-01T00:00:00Z',
  merchant_id:   'sq-merchant-123',
  token_type:    'bearer',
}

describe('GET /api/square/callback', () => {
  let userClient:    ReturnType<typeof createSupabaseMock>
  let serviceClient: ReturnType<typeof createSupabaseMock>

  beforeEach(() => {
    userClient    = createSupabaseMock()
    serviceClient = createSupabaseMock()

    vi.mocked(createServerClient).mockResolvedValue(userClient as never)
    vi.mocked(createServiceRoleClient).mockReturnValue(serviceClient as never)

    userClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: AUTH_USER_ID } },
      error: null,
    })

    // State cookie matches
    mockCookieStore.get = vi.fn().mockReturnValue({ value: 'valid-state-123' })

    vi.mocked(exchangeCodeForTokens).mockResolvedValue(mockTokens)

    // Mock fetch for locations API
    vi.mocked(global.fetch).mockResolvedValue({
      ok:   true,
      json: vi.fn().mockResolvedValue({ locations: [{ id: 'loc-1' }] }),
    } as never)
  })

  it('redirects when error query param is present', async () => {
    const res = await GET(makeRequest('?error=access_denied&state=valid-state-123'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=access_denied')
  })

  it('redirects to connect?error=missing_params when code or state absent', async () => {
    const res = await GET(makeRequest('?state=valid-state-123')) // no code
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=missing_params')
  })

  it('redirects to connect?error=invalid_state on CSRF state mismatch', async () => {
    const res = await GET(makeRequest('?code=some-code&state=wrong-state'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=invalid_state')
  })

  it('redirects to connect?error=invalid_state when cookie is absent', async () => {
    mockCookieStore.get = vi.fn().mockReturnValue(undefined)
    const res = await GET(makeRequest('?code=some-code&state=valid-state-123'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=invalid_state')
  })

  it('updates merchant record with encrypted tokens, square_merchant_id, location_id, status=active', async () => {
    await GET(makeRequest('?code=some-code&state=valid-state-123'))

    expect(serviceClient._chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        square_merchant_id:     mockTokens.merchant_id,
        square_access_token:    'encrypted-value',
        square_refresh_token:   'encrypted-value',
        square_location_id:     'loc-1',
        status:                 'active',
      }),
    )
  })

  it('redirects to /dashboard/connect?success=true on success', async () => {
    const res = await GET(makeRequest('?code=some-code&state=valid-state-123'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/dashboard/connect?success=true')
  })

  it('redirects to connect?error=token_exchange_failed when token exchange throws', async () => {
    vi.mocked(exchangeCodeForTokens).mockRejectedValue(new Error('Square API error'))
    const res = await GET(makeRequest('?code=some-code&state=valid-state-123'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=token_exchange_failed')
  })

  it('deletes the square_oauth_state cookie after reading it', async () => {
    await GET(makeRequest('?code=some-code&state=valid-state-123'))
    expect(mockCookieStore.delete).toHaveBeenCalledWith('square_oauth_state')
  })
})
