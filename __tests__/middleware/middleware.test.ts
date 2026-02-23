import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { middleware } from '@/middleware'

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(),
}))

function makeRequest(pathname: string) {
  return new NextRequest(`http://localhost${pathname}`)
}

const mockUser = { id: 'user-123', email: 'user@example.com' }

describe('middleware', () => {
  const supabaseResponse = NextResponse.next()

  beforeEach(() => {
    vi.mocked(updateSession).mockResolvedValue({
      supabaseResponse,
      user: null,
    } as never)
  })

  it('returns supabaseResponse unchanged for authenticated user on protected route', async () => {
    vi.mocked(updateSession).mockResolvedValue({
      supabaseResponse,
      user: mockUser,
    } as never)

    const req = makeRequest('/wallet')
    const res = await middleware(req)
    expect(res).toBe(supabaseResponse)
  })

  it('redirects unauthenticated user from /wallet to /?redirectedFrom=/wallet', async () => {
    const req = makeRequest('/wallet')
    const res = await middleware(req)
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/')
    expect(location.searchParams.get('redirectedFrom')).toBe('/wallet')
  })

  it('redirects unauthenticated user from /dashboard to /?redirectedFrom=/dashboard', async () => {
    const req = makeRequest('/dashboard')
    const res = await middleware(req)
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/')
    expect(location.searchParams.get('redirectedFrom')).toBe('/dashboard')
  })

  it('redirects unauthenticated user from /admin to /?redirectedFrom=/admin', async () => {
    const req = makeRequest('/admin')
    const res = await middleware(req)
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/')
    expect(location.searchParams.get('redirectedFrom')).toBe('/admin')
  })

  it('redirects unauthenticated user from /dashboard/connect nested route', async () => {
    const req = makeRequest('/dashboard/connect')
    const res = await middleware(req)
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.searchParams.get('redirectedFrom')).toBe('/dashboard/connect')
  })

  it('passes through unauthenticated user on / (public route)', async () => {
    const req = makeRequest('/')
    const res = await middleware(req)
    expect(res).toBe(supabaseResponse)
    expect(res.status).not.toBe(307)
  })

  it('passes through unauthenticated user on /login', async () => {
    const req = makeRequest('/login')
    const res = await middleware(req)
    expect(res).toBe(supabaseResponse)
  })

  it('passes through unauthenticated user on /api/webhooks/square (API route not protected)', async () => {
    const req = makeRequest('/api/webhooks/square')
    const res = await middleware(req)
    expect(res).toBe(supabaseResponse)
  })
})
