import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Navbar } from '@/components/ui/Navbar'

const mockPush = vi.fn()
const mockSignOut = vi.fn().mockResolvedValue({})

vi.mock('next/navigation', () => ({
  useRouter:    vi.fn(() => ({ push: mockPush, replace: vi.fn(), back: vi.fn() })),
  redirect:     vi.fn(),
  usePathname:  vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: { signOut: mockSignOut },
  })),
  createServerClient: vi.fn(),
}))

describe('Navbar', () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockSignOut.mockClear()
  })

  it('renders the section name', () => {
    render(<Navbar section="Merchant Dashboard" homeHref="/dashboard" />)
    expect(screen.getByText('Merchant Dashboard')).toBeInTheDocument()
  })

  it('homeHref link points to correct href', () => {
    render(<Navbar section="Admin" homeHref="/admin" />)
    const link = screen.getByRole('link', { name: /Taplo/i })
    expect(link).toHaveAttribute('href', '/admin')
  })

  it('clicking "Sign out" calls supabase.auth.signOut() then router.push("/")', async () => {
    render(<Navbar section="Customer" homeHref="/wallet" />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Sign out/i }))

    expect(mockSignOut).toHaveBeenCalledOnce()
    // Wait for the async signOut to resolve then router.push is called
    await vi.waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'))
  })
})
