import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock } from '@/tests/mocks/supabase'
import { createServerClient } from '@/lib/supabase/server'
import { buildOAuthUrl } from '@/lib/square/oauth'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient:      vi.fn(),
  createServiceRoleClient: vi.fn(),
}))

vi.mock('@/lib/square/oauth', () => ({
  buildOAuthUrl:         vi.fn(),
  exchangeCodeForTokens: vi.fn(),
  refreshAccessToken:    vi.fn(),
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

import { GET } from '@/app/api/square/connect/route'

const AUTH_USER_ID = 'user-merchant-abc'

describe('GET /api/square/connect', () => {
  let mockClient: ReturnType<typeof createSupabaseMock>

  beforeEach(() => {
    mockClient = createSupabaseMock()
    vi.mocked(createServerClient).mockResolvedValue(mockClient as never)

    mockClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: AUTH_USER_ID } },
      error: null,
    })
    // Merchant role
    mockClient._setResponse('user_roles', { data: { role: 'merchant' }, error: null })

    vi.mocked(buildOAuthUrl).mockReturnValue({
      url:   'https://connect.squareupsandbox.com/oauth2/authorize?client_id=test-square-app-id',
      state: 'generated-state-xyz',
    })
  })

  it('returns 401 when unauthenticated', async () => {
    mockClient.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns 403 when user role is not 'merchant'", async () => {
    mockClient._setResponse('user_roles', { data: { role: 'customer' }, error: null })
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('returns 403 when no role row found', async () => {
    mockClient._setResponse('user_roles', { data: null, error: null })
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('sets square_oauth_state httpOnly cookie with generated state value', async () => {
    await GET()
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'square_oauth_state',
      'generated-state-xyz',
      expect.objectContaining({ httpOnly: true }),
    )
  })

  it('redirects to the Square OAuth URL', async () => {
    const res = await GET()
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('squareupsandbox')
  })
})
