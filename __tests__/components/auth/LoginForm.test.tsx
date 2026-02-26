import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/auth/LoginForm'

describe('LoginForm', () => {
  it('renders the given title and description', () => {
    render(
      <LoginForm title="Merchant Sign In" description="Enter your email." onSubmit={vi.fn()} />,
    )
    expect(screen.getByRole('heading', { name: 'Merchant Sign In' })).toBeInTheDocument()
    expect(screen.getByText('Enter your email.')).toBeInTheDocument()
  })

  it('calls onSubmit with the lowercased, trimmed email', async () => {
    const onSubmit = vi.fn().mockResolvedValue({})
    const user = userEvent.setup()
    render(<LoginForm title="T" description="D" onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('Email'), '  Hello@Example.COM')
    await user.click(screen.getByRole('button', { name: /send magic link/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('hello@example.com'))
  })

  it('shows "Sending…" and disables the button while submitting', async () => {
    let resolveOtp!: (v: { error?: string }) => void
    const onSubmit = vi.fn().mockReturnValue(
      new Promise<{ error?: string }>((r) => { resolveOtp = r }),
    )
    const user = userEvent.setup()
    render(<LoginForm title="T" description="D" onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send magic link/i }))
    expect(await screen.findByRole('button', { name: /sending/i })).toBeDisabled()
    resolveOtp({})
    // wait for the submit cycle to fully complete before the test ends
    expect(await screen.findByRole('heading', { name: /check your email/i })).toBeInTheDocument()
  })

  it('shows the "Check your email" screen after a successful submission', async () => {
    const onSubmit = vi.fn().mockResolvedValue({})
    const user = userEvent.setup()
    render(<LoginForm title="T" description="D" onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send magic link/i }))
    expect(await screen.findByRole('heading', { name: /check your email/i })).toBeInTheDocument()
    expect(screen.getByText(/user@example\.com/)).toBeInTheDocument()
  })

  it('shows the error message when onSubmit returns an error', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      error: "This email isn't registered as an admin account.",
    })
    const user = userEvent.setup()
    render(<LoginForm title="T" description="D" onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('Email'), 'bad@example.com')
    await user.click(screen.getByRole('button', { name: /send magic link/i }))
    expect(
      await screen.findByText(/This email isn't registered as an admin account\./),
    ).toBeInTheDocument()
    // Form is still visible — not replaced by "check your email"
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('re-enables the button after an error', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: 'Something went wrong' })
    const user = userEvent.setup()
    render(<LoginForm title="T" description="D" onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send magic link/i }))
    expect(await screen.findByRole('button', { name: /send magic link/i })).not.toBeDisabled()
  })
})
