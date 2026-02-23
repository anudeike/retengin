import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RedemptionModal } from '@/components/merchant/RedemptionModal'

const MERCHANT_ID = 'merchant-uuid-001'
const onClose = vi.fn()

function makeCustomerResponse(balance: number, rewards = [
  { id: 'rw-1', name: 'Free Coffee', points_required: 100 },
  { id: 'rw-2', name: 'Free Cake',   points_required: 500 },
]) {
  return { customerId: 'cust-001', balance, rewards }
}

describe('RedemptionModal', () => {
  beforeEach(() => {
    onClose.mockClear()
  })

  it('starts on email input step', () => {
    render(<RedemptionModal merchantId={MERCHANT_ID} onClose={onClose} />)
    expect(screen.getByLabelText(/Customer email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Look up customer/i })).toBeInTheDocument()
  })

  it('calls /api/merchant/lookup-customer on submit and transitions to confirm step', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok:   true,
      json: vi.fn().mockResolvedValue(makeCustomerResponse(250)),
    } as never)

    render(<RedemptionModal merchantId={MERCHANT_ID} onClose={onClose} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Customer email/i), 'jane@example.com')
    await user.click(screen.getByRole('button', { name: /Look up customer/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/merchant/lookup-customer',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    await waitFor(() => {
      expect(screen.getByText(/250/)).toBeInTheDocument() // balance shown
    })
  })

  it('shows error when lookup returns non-ok response', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok:   false,
      json: vi.fn().mockResolvedValue({ error: 'No Taplo account found for this email' }),
    } as never)

    render(<RedemptionModal merchantId={MERCHANT_ID} onClose={onClose} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Customer email/i), 'nobody@example.com')
    await user.click(screen.getByRole('button', { name: /Look up customer/i }))

    await waitFor(() => {
      expect(screen.getByText(/No Taplo account found/i)).toBeInTheDocument()
    })
  })

  it('disables reward button when customer balance < points_required', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok:   true,
      json: vi.fn().mockResolvedValue(makeCustomerResponse(50)), // only 50 pts
    } as never)

    render(<RedemptionModal merchantId={MERCHANT_ID} onClose={onClose} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Customer email/i), 'jane@example.com')
    await user.click(screen.getByRole('button', { name: /Look up customer/i }))

    await waitFor(() => screen.getByText('jane@example.com'))

    // Both rewards (100 and 500 pts) are disabled for a 50-pt balance
    const rewardButtons = screen.getAllByRole('button', { name: /Free Coffee|Free Cake/i })
    rewardButtons.forEach((btn) => expect(btn).toBeDisabled())
  })

  it('enables reward button when customer balance >= points_required', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok:   true,
      json: vi.fn().mockResolvedValue(makeCustomerResponse(200)), // 200 pts
    } as never)

    render(<RedemptionModal merchantId={MERCHANT_ID} onClose={onClose} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Customer email/i), 'jane@example.com')
    await user.click(screen.getByRole('button', { name: /Look up customer/i }))

    await waitFor(() => screen.getByText(/200/))

    // Free Coffee (100 pts) should be enabled
    const coffeeBtns = screen.getAllByRole('button', { name: /Free Coffee/i })
    const coffeeBtn = coffeeBtns.find((b) => !b.hasAttribute('disabled') || b.getAttribute('disabled') === null)
    expect(coffeeBtn).not.toBeDisabled()
  })

  it('calls /api/merchant/redeem and transitions to done step on success', async () => {
    // First call: lookup
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok:   true,
        json: vi.fn().mockResolvedValue(makeCustomerResponse(200)),
      } as never)
      // Second call: redeem
      .mockResolvedValueOnce({
        ok:   true,
        json: vi.fn().mockResolvedValue({ redemptionId: 'rdm-123' }),
      } as never)

    render(<RedemptionModal merchantId={MERCHANT_ID} onClose={onClose} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Customer email/i), 'jane@example.com')
    await user.click(screen.getByRole('button', { name: /Look up customer/i }))

    await waitFor(() => screen.getByText(/200/))

    // Select Free Coffee (100 pts, enabled at 200 balance)
    const coffeeButtons = screen.getAllByRole('button', { name: /Free Coffee/i })
    const enabledCoffee = coffeeButtons.find((b) => !b.disabled)!
    await user.click(enabledCoffee)

    await user.click(screen.getByRole('button', { name: /Confirm redemption/i }))

    await waitFor(() => {
      expect(screen.getByText(/Redeemed!/i)).toBeInTheDocument()
    })
  })

  it('shows error on failed redemption', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok:   true,
        json: vi.fn().mockResolvedValue(makeCustomerResponse(200)),
      } as never)
      .mockResolvedValueOnce({
        ok:   false,
        json: vi.fn().mockResolvedValue({ error: 'Insufficient points' }),
      } as never)

    render(<RedemptionModal merchantId={MERCHANT_ID} onClose={onClose} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Customer email/i), 'jane@example.com')
    await user.click(screen.getByRole('button', { name: /Look up customer/i }))

    await waitFor(() => screen.getByText(/200/))

    const coffeeButtons = screen.getAllByRole('button', { name: /Free Coffee/i })
    const enabledCoffee = coffeeButtons.find((b) => !b.disabled)!
    await user.click(enabledCoffee)
    await user.click(screen.getByRole('button', { name: /Confirm redemption/i }))

    await waitFor(() => {
      expect(screen.getByText(/Insufficient points/i)).toBeInTheDocument()
    })
  })
})
