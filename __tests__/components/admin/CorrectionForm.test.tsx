import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CorrectionForm } from '@/components/admin/CorrectionForm'

const merchants = [
  { id: 'merchant-001', business_name: 'Test Merchant' },
]

describe('CorrectionForm', () => {
  it('shows error when delta is 0', async () => {
    const onSubmit = vi.fn()
    render(<CorrectionForm merchants={merchants} onSubmit={onSubmit} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Customer email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/Point delta/i), '0')
    await user.type(screen.getByLabelText(/Note/i), 'some reason')
    await user.click(screen.getByRole('button', { name: /Apply correction/i }))

    await waitFor(() => {
      expect(screen.getByText(/Delta cannot be zero/i)).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows error when note is blank', async () => {
    const onSubmit = vi.fn()
    render(<CorrectionForm merchants={merchants} onSubmit={onSubmit} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Customer email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/Point delta/i), '50')
    // Type a space: satisfies HTML `required` (non-empty) but fails note.trim() check
    await user.type(screen.getByLabelText(/Note/i), ' ')
    await user.click(screen.getByRole('button', { name: /Apply correction/i }))

    await waitFor(() => {
      expect(screen.getByText(/Note is required/i)).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with correct args (merchantId, customerEmail, delta, note)', async () => {
    const onSubmit = vi.fn().mockResolvedValue({})
    render(<CorrectionForm merchants={merchants} onSubmit={onSubmit} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Customer email/i), 'customer@example.com')
    await user.type(screen.getByLabelText(/Point delta/i), '100')
    await user.type(screen.getByLabelText(/Note/i), 'Goodwill gesture')
    await user.click(screen.getByRole('button', { name: /Apply correction/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        merchantId:    'merchant-001',
        customerEmail: 'customer@example.com',
        delta:         100,
        note:          'Goodwill gesture',
      })
    })
  })

  it('shows success message after onSubmit resolves {}', async () => {
    const onSubmit = vi.fn().mockResolvedValue({})
    render(<CorrectionForm merchants={merchants} onSubmit={onSubmit} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Customer email/i), 'customer@example.com')
    await user.type(screen.getByLabelText(/Point delta/i), '-50')
    await user.type(screen.getByLabelText(/Note/i), 'Reversal')
    await user.click(screen.getByRole('button', { name: /Apply correction/i }))

    await waitFor(() => {
      expect(screen.getByText(/Correction applied successfully/i)).toBeInTheDocument()
    })
  })

  it('shows error returned from onSubmit { error: "..." }', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: 'Customer not found' })
    render(<CorrectionForm merchants={merchants} onSubmit={onSubmit} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Customer email/i), 'unknown@example.com')
    await user.type(screen.getByLabelText(/Point delta/i), '10')
    await user.type(screen.getByLabelText(/Note/i), 'Attempt')
    await user.click(screen.getByRole('button', { name: /Apply correction/i }))

    await waitFor(() => {
      expect(screen.getByText(/Customer not found/i)).toBeInTheDocument()
    })
  })
})
