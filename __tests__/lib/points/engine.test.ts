import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock } from '@/tests/mocks/supabase'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handlePaymentCompleted, handleRefundCreated } from '@/lib/points/engine'

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(),
  createServerClient: vi.fn(),
}))

const MERCHANT_ID = 'merchant-uuid-123'
const SQUARE_MERCHANT_ID = 'sq-merchant-123'
const CUSTOMER_ID = 'customer-uuid-456'

function makePayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'payment-id-001',
    order_id: 'order-id-001',
    buyer_email_address: 'customer@example.com',
    amount_money: { amount: 1000, currency: 'USD' },
    ...overrides,
  }
}

describe('handlePaymentCompleted', () => {
  let mockClient: ReturnType<typeof createSupabaseMock>

  beforeEach(() => {
    mockClient = createSupabaseMock()
    vi.mocked(createServiceRoleClient).mockReturnValue(mockClient as never)

    // Default: active merchant found
    mockClient._setResponse('merchants', {
      data: { id: MERCHANT_ID, status: 'active' },
      error: null,
    })
    // Default: customer upserted
    mockClient._setResponse('customers', {
      data: { id: CUSTOMER_ID },
      error: null,
    })
    // Default: active rule, 1 point per dollar, no min spend
    mockClient._setResponse('merchant_point_rules', {
      data: { points_per_dollar: 1, min_spend_cents: 0, is_active: true },
      error: null,
    })
    // Default: RPC succeeds
    mockClient._setRpcResponse('award_points', { data: null, error: null })
  })

  it('awards correct points for valid payment (floor(amountCents/100 * points_per_dollar))', async () => {
    // 1000 cents / 100 * 1 = 10 points
    await handlePaymentCompleted(SQUARE_MERCHANT_ID, makePayment({ amount_money: { amount: 1000 } }))

    expect(mockClient.rpc).toHaveBeenCalledWith('award_points', expect.objectContaining({
      p_customer_id: CUSTOMER_ID,
      p_merchant_id: MERCHANT_ID,
      p_points: 10,
      p_square_payment_id: 'payment-id-001',
    }))
  })

  it('floors fractional points (1500 cents at 0.5 pts/dollar = 7 pts)', async () => {
    mockClient._setResponse('merchant_point_rules', {
      data: { points_per_dollar: 0.5, min_spend_cents: 0, is_active: true },
      error: null,
    })
    await handlePaymentCompleted(SQUARE_MERCHANT_ID, makePayment({ amount_money: { amount: 1500 } }))

    expect(mockClient.rpc).toHaveBeenCalledWith('award_points', expect.objectContaining({ p_points: 7 }))
  })

  it('normalizes email to lowercase before upsert', async () => {
    await handlePaymentCompleted(
      SQUARE_MERCHANT_ID,
      makePayment({ buyer_email_address: 'UPPER@Example.COM' }),
    )
    expect(mockClient._chain.upsert).toHaveBeenCalledWith(
      { email: 'upper@example.com' },
      expect.anything(),
    )
  })

  it('returns early when merchant not found (data: null)', async () => {
    mockClient._setResponse('merchants', { data: null, error: null })
    await handlePaymentCompleted(SQUARE_MERCHANT_ID, makePayment())
    expect(mockClient.rpc).not.toHaveBeenCalled()
  })

  it("returns early when merchant status is 'pending'", async () => {
    mockClient._setResponse('merchants', { data: { id: MERCHANT_ID, status: 'pending' }, error: null })
    await handlePaymentCompleted(SQUARE_MERCHANT_ID, makePayment())
    expect(mockClient.rpc).not.toHaveBeenCalled()
  })

  it('returns early when buyer_email_address is null', async () => {
    await handlePaymentCompleted(
      SQUARE_MERCHANT_ID,
      makePayment({ buyer_email_address: null }),
    )
    expect(mockClient._chain.upsert).not.toHaveBeenCalled()
    expect(mockClient.rpc).not.toHaveBeenCalled()
  })

  it('returns early when point rules not found (data: null)', async () => {
    mockClient._setResponse('merchant_point_rules', { data: null, error: null })
    await handlePaymentCompleted(SQUARE_MERCHANT_ID, makePayment())
    expect(mockClient.rpc).not.toHaveBeenCalled()
  })

  it('returns early when point rules is_active=false', async () => {
    mockClient._setResponse('merchant_point_rules', {
      data: { points_per_dollar: 1, min_spend_cents: 0, is_active: false },
      error: null,
    })
    await handlePaymentCompleted(SQUARE_MERCHANT_ID, makePayment())
    expect(mockClient.rpc).not.toHaveBeenCalled()
  })

  it('returns early when amountCents < min_spend_cents', async () => {
    mockClient._setResponse('merchant_point_rules', {
      data: { points_per_dollar: 1, min_spend_cents: 2000, is_active: true },
      error: null,
    })
    // 1000 cents < 2000 min spend
    await handlePaymentCompleted(SQUARE_MERCHANT_ID, makePayment({ amount_money: { amount: 1000 } }))
    expect(mockClient.rpc).not.toHaveBeenCalled()
  })

  it('returns early when calculated pointsEarned <= 0 (very small amount)', async () => {
    mockClient._setResponse('merchant_point_rules', {
      data: { points_per_dollar: 0.01, min_spend_cents: 0, is_active: true },
      error: null,
    })
    // 50 cents * 0.01 pts/dollar = 0.005 points → floor = 0
    await handlePaymentCompleted(SQUARE_MERCHANT_ID, makePayment({ amount_money: { amount: 50 } }))
    expect(mockClient.rpc).not.toHaveBeenCalled()
  })

  it('swallows 23505 error from award_points RPC (duplicate payment)', async () => {
    mockClient._setRpcResponse('award_points', { data: null, error: { code: '23505', message: 'duplicate key' } })
    await expect(handlePaymentCompleted(SQUARE_MERCHANT_ID, makePayment())).resolves.toBeUndefined()
  })

  it('passes p_square_order_id as undefined when payment.order_id is null', async () => {
    await handlePaymentCompleted(
      SQUARE_MERCHANT_ID,
      makePayment({ order_id: null }),
    )
    expect(mockClient.rpc).toHaveBeenCalledWith('award_points', expect.objectContaining({
      p_square_order_id: undefined,
    }))
  })

  it('handles bigint amount_money.amount correctly via Number() conversion', async () => {
    await handlePaymentCompleted(
      SQUARE_MERCHANT_ID,
      makePayment({ amount_money: { amount: BigInt(2000) } }),
    )
    expect(mockClient.rpc).toHaveBeenCalledWith('award_points', expect.objectContaining({
      p_points: 20, // 2000 cents / 100 * 1 = 20
    }))
  })

  it('uses check-in fallback when buyer_email_address is absent and a recent unclaimed check-in exists', async () => {
    const CHECKIN_ID = 'checkin-uuid-001'
    const CHECKIN_EMAIL = 'checkin@example.com'

    mockClient._setResponse('loyalty_checkins', {
      data: { id: CHECKIN_ID, email: CHECKIN_EMAIL },
      error: null,
    })
    // customer response for the checkin email
    mockClient._setResponse('customers', { data: { id: CUSTOMER_ID }, error: null })

    await handlePaymentCompleted(
      SQUARE_MERCHANT_ID,
      makePayment({ buyer_email_address: null }),
    )

    // Points should be awarded to the check-in email
    expect(mockClient._chain.upsert).toHaveBeenCalledWith(
      { email: CHECKIN_EMAIL },
      expect.anything(),
    )
    expect(mockClient.rpc).toHaveBeenCalledWith('award_points', expect.objectContaining({
      p_customer_id: CUSTOMER_ID,
      p_merchant_id: MERCHANT_ID,
    }))
    // loyalty_checkins update called to mark as claimed
    expect(mockClient._chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ payment_id: 'payment-id-001' }),
    )
  })

  it('does not query loyalty_checkins when buyer_email_address is present', async () => {
    await handlePaymentCompleted(SQUARE_MERCHANT_ID, makePayment())

    expect(mockClient.from).not.toHaveBeenCalledWith('loyalty_checkins')
  })

  it('returns early without awarding points when both buyer_email_address and check-in are absent', async () => {
    mockClient._setResponse('loyalty_checkins', { data: null, error: null })

    await handlePaymentCompleted(
      SQUARE_MERCHANT_ID,
      makePayment({ buyer_email_address: null }),
    )

    expect(mockClient._chain.upsert).not.toHaveBeenCalled()
    expect(mockClient.rpc).not.toHaveBeenCalled()
  })
})

describe('handleRefundCreated', () => {
  let mockClient: ReturnType<typeof createSupabaseMock>

  const ORIGINAL_POINTS = 10
  const CURRENT_BALANCE = 50

  function makeRefund(overrides: Record<string, unknown> = {}) {
    return {
      id: 'refund-id-001',
      payment_id: 'payment-id-001',
      amount_money: { amount: 500 },
      ...overrides,
    }
  }

  beforeEach(() => {
    mockClient = createSupabaseMock()
    vi.mocked(createServiceRoleClient).mockReturnValue(mockClient as never)

    // Default: merchant found
    mockClient._setResponse('merchants', { data: { id: MERCHANT_ID }, error: null })
    // Default: original transaction found
    mockClient._setResponse('point_transactions', {
      data: { id: 'tx-001', customer_id: CUSTOMER_ID, points: ORIGINAL_POINTS },
      error: null,
    })
    // Default: balance row exists
    mockClient._setResponse('customer_merchant_balances', {
      data: { balance: CURRENT_BALANCE },
      error: null,
    })
  })

  it('inserts a reversed transaction with negative points', async () => {
    await handleRefundCreated(SQUARE_MERCHANT_ID, makeRefund())

    expect(mockClient._chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction_type: 'reversed',
        points: -ORIGINAL_POINTS,
        customer_id: CUSTOMER_ID,
        merchant_id: MERCHANT_ID,
      }),
    )
  })

  it('updates balance to current minus reversal', async () => {
    // 50 - 10 = 40
    await handleRefundCreated(SQUARE_MERCHANT_ID, makeRefund())

    expect(mockClient._chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ balance: 40 }),
    )
  })

  it('floors balance at 0 when reversal exceeds current balance', async () => {
    mockClient._setResponse('customer_merchant_balances', {
      data: { balance: 5 }, // only 5 pts, but reversing 10
      error: null,
    })
    await handleRefundCreated(SQUARE_MERCHANT_ID, makeRefund())

    expect(mockClient._chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ balance: 0 }),
    )
  })

  it('uses balance: 0 when no balance row exists (balanceRow is null)', async () => {
    mockClient._setResponse('customer_merchant_balances', { data: null, error: null })
    await handleRefundCreated(SQUARE_MERCHANT_ID, makeRefund())

    // 0 - 10 = -10 → clamped to 0
    expect(mockClient._chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ balance: 0 }),
    )
  })

  it('reversal points are always -Math.abs(original.points)', async () => {
    // Even if original.points is somehow negative, reversal is negative absolute value
    mockClient._setResponse('point_transactions', {
      data: { id: 'tx-001', customer_id: CUSTOMER_ID, points: 25 },
      error: null,
    })
    await handleRefundCreated(SQUARE_MERCHANT_ID, makeRefund())

    expect(mockClient._chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ points: -25 }),
    )
  })

  it('returns early when merchant not found', async () => {
    mockClient._setResponse('merchants', { data: null, error: null })
    await handleRefundCreated(SQUARE_MERCHANT_ID, makeRefund())

    expect(mockClient._chain.insert).not.toHaveBeenCalled()
    expect(mockClient._chain.update).not.toHaveBeenCalled()
  })

  it('returns early when no original earned transaction found for payment_id', async () => {
    mockClient._setResponse('point_transactions', { data: null, error: null })
    await handleRefundCreated(SQUARE_MERCHANT_ID, makeRefund())

    expect(mockClient._chain.insert).not.toHaveBeenCalled()
    expect(mockClient._chain.update).not.toHaveBeenCalled()
  })
})
