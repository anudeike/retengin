import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createSupabaseMock } from '@/tests/mocks/supabase'
import { createServiceRoleClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(),
  createServerClient:      vi.fn(),
}))

// Mock @supabase/ssr — the route builds its own client directly from this package
const mockSsrClient = {
  auth: {
    exchangeCodeForSession: vi.fn(),
  },
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockImplementation((_url: string, _key: string, opts: {
    cookies?: { setAll?: (cookies: Array<{ name: string; value: string; options: object }>) => void }
  }) => {
    // Simulate Supabase setting a session cookie so pendingCookies is populated
    if (opts?.cookies?.setAll) {
      opts.cookies.setAll([{ name: 'sb-access-token', value: 'tok-abc', options: { httpOnly: true } }])
    }
    return mockSsrClient
  }),
  createBrowserClient: vi.fn(() => ({ auth: { signOut: vi.fn().mockResolvedValue({}) } })),
}))

import { GET } from '@/app/api/auth/callback/route'

function makeRequest(search: string) {
  return new NextRequest(`http://localhost/api/auth/callback${search}`)
}

describe('GET /api/auth/callback', () => {
  let adminClient: ReturnType<typeof createSupabaseMock>
  const USER = { id: 'user-abc', email: 'test@example.com' }

  beforeEach(() => {
    adminClient = createSupabaseMock()
    vi.mocked(createServiceRoleClient).mockReturnValue(adminClient as never)

    // Default: exchange succeeds with a new user
    mockSsrClient.auth.exchangeCodeForSession = vi.fn().mockResolvedValue({
      data: { user: USER },
      error: null,
    })
    // Default: no existing role (new user)
    adminClient._setResponse('user_roles', { data: null, error: null })
    // Default: no existing customer stub
    adminClient._setResponse('customers', { data: null, error: null })
  })

  it('redirects to /?error=missing_code when no code param', async () => {
    const res = await GET(makeRequest('?role=customer'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=missing_code')
  })

  it('redirects to /?error=auth_failed when exchangeCodeForSession returns error', async () => {
    mockSsrClient.auth.exchangeCodeForSession = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid code' },
    })
    const res = await GET(makeRequest('?code=bad-code'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=auth_failed')
  })

  it('redirects new customer to /wallet', async () => {
    const res = await GET(makeRequest('?code=valid-code&role=customer'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/wallet')
  })

  it('inserts user_role row and customers row for new customer', async () => {
    await GET(makeRequest('?code=valid-code&role=customer'))

    expect(adminClient._chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER.id, role: 'customer' }),
    )
    expect(adminClient._chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ email: USER.email, auth_user_id: USER.id }),
    )
  })

  it('links auth_user_id to existing customer stub via update when stub exists', async () => {
    adminClient._setResponse('customers', { data: { id: 'existing-cust-id' }, error: null })
    await GET(makeRequest('?code=valid-code&role=customer'))

    expect(adminClient._chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ auth_user_id: USER.id }),
    )
  })

  it('redirects new merchant to /dashboard', async () => {
    const res = await GET(makeRequest('?code=valid-code&role=merchant'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/dashboard')
  })

  it('calls merchants.update by contact_email for new merchant', async () => {
    await GET(makeRequest('?code=valid-code&role=merchant'))

    expect(adminClient._chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ auth_user_id: USER.id }),
    )
    expect(adminClient._chain.eq).toHaveBeenCalledWith('contact_email', USER.email)
  })

  it('redirects new admin to /admin', async () => {
    const res = await GET(makeRequest('?code=valid-code&role=admin'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/admin')
  })

  it('returning user: redirects to role destination WITHOUT re-inserting role', async () => {
    // Existing role is 'customer'
    adminClient._setResponse('user_roles', { data: { role: 'customer' }, error: null })

    const res = await GET(makeRequest('?code=valid-code&role=customer'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/wallet')
    // user_roles.insert should NOT have been called
    // (insert IS called but only for user_roles if !existingRole)
    // We check from was called on 'user_roles' but insert was NOT called on it
    // The insert is called with user_id when role does not exist
    // Since existingRole is set, the insert block is skipped
    expect(adminClient._chain.insert).not.toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER.id, role: 'customer' }),
    )
  })

  it('sets session cookies from pendingCookies on the redirect response', async () => {
    const res = await GET(makeRequest('?code=valid-code&role=customer'))
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).not.toBeNull()
    expect(setCookie).toContain('sb-access-token=tok-abc')
  })
})
