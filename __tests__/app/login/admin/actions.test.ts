import { describe, it, expect, vi, beforeEach } from 'vitest'

// Build a chainable Supabase query mock that handles:
// .from().select().eq().eq().maybeSingle()
function makeQueryChain(resolvedValue: { data: unknown; error: null }) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(resolvedValue),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  return chain
}

const mockSignInWithOtp = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({ from: mockFrom }),
  createServerClient: async () => ({ auth: { signInWithOtp: mockSignInWithOtp } }),
}))

// Import after mocks are set up
const { sendAdminMagicLink } = await import('@/app/login/admin/actions')

beforeEach(() => {
  vi.clearAllMocks()
  mockSignInWithOtp.mockResolvedValue({ error: null })
})

describe('sendAdminMagicLink', () => {
  it('returns error when the Supabase admin API call fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false })

    const result = await sendAdminMagicLink('any@example.com')

    expect(result).toEqual({ error: 'Unable to verify admin status. Please try again.' })
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
  })

  it('returns error when email is not in auth.users', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ users: [] }),
    })

    const result = await sendAdminMagicLink('nobody@example.com')

    expect(result).toEqual({ error: "This email isn't registered as an admin account." })
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
  })

  it('returns error when the user exists but is not assigned the admin role', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ users: [{ id: 'user-123' }] }),
    })
    mockFrom.mockReturnValue(makeQueryChain({ data: null, error: null }))

    const result = await sendAdminMagicLink('notadmin@example.com')

    expect(result).toEqual({ error: "This email isn't registered as an admin account." })
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
  })

  it('sends OTP and returns success for a known admin email', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ users: [{ id: 'admin-456' }] }),
    })
    mockFrom.mockReturnValue(makeQueryChain({ data: { role: 'admin' }, error: null }))

    const result = await sendAdminMagicLink('admin@example.com')

    expect(result).toEqual({})
    expect(mockSignInWithOtp).toHaveBeenCalledWith({ email: 'admin@example.com' })
  })

  it('returns error when the OTP send fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ users: [{ id: 'admin-456' }] }),
    })
    mockFrom.mockReturnValue(makeQueryChain({ data: { role: 'admin' }, error: null }))
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'Rate limited' } })

    const result = await sendAdminMagicLink('admin@example.com')

    expect(result).toEqual({ error: 'Rate limited' })
  })
})
