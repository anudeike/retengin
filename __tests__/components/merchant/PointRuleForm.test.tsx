import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PointRuleForm } from '@/components/merchant/PointRuleForm'

describe('PointRuleForm', () => {
  it('converts min_spend_cents to dollars for display (500 cents → value "5" in input)', () => {
    render(
      <PointRuleForm
        initialValues={{ points_per_dollar: 1, min_spend_cents: 500, min_redemption_points: 100, is_active: true }}
        onSave={vi.fn()}
      />,
    )
    const minSpendInput = screen.getByLabelText(/Minimum spend/i)
    expect(minSpendInput).toHaveValue(5)
  })

  it('converts dollars back to cents on save (input=7.5 → onSave called with min_spend_cents=750)', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <PointRuleForm
        initialValues={{ points_per_dollar: 1, min_spend_cents: 0, min_redemption_points: 100, is_active: true }}
        onSave={onSave}
      />,
    )
    const user = userEvent.setup()

    const minSpendInput = screen.getByLabelText(/Minimum spend/i)
    await user.clear(minSpendInput)
    await user.type(minSpendInput, '7.5')
    await user.click(screen.getByRole('button', { name: /Save rules/i }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ min_spend_cents: 750 }))
    })
  })

  it('shows validation error when points_per_dollar ≤ 0', async () => {
    const onSave = vi.fn()
    render(<PointRuleForm onSave={onSave} />)
    const user = userEvent.setup()

    const ppdInput = screen.getByLabelText(/Points per dollar/i)
    await user.clear(ppdInput)
    // Leaving the field empty: parseFloat('') → NaN → triggers "must be > 0" without HTML min blocking
    await user.click(screen.getByRole('button', { name: /Save rules/i }))

    await waitFor(() => {
      expect(screen.getByText(/Points per dollar must be > 0/i)).toBeInTheDocument()
    })
    expect(onSave).not.toHaveBeenCalled()
  })

  it('shows "Saved successfully!" after onSave resolves', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<PointRuleForm onSave={onSave} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Save rules/i }))

    await waitFor(() => {
      expect(screen.getByText(/Saved successfully!/i)).toBeInTheDocument()
    })
  })

  it('shows error message when onSave rejects/throws', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('DB write failed'))
    render(<PointRuleForm onSave={onSave} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Save rules/i }))

    await waitFor(() => {
      expect(screen.getByText(/DB write failed/i)).toBeInTheDocument()
    })
  })
})
