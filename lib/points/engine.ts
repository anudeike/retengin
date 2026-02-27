import { createServiceRoleClient } from '@/lib/supabase/server'
import { awardReferralBonus } from '@/lib/referrals/bonus'

// Square payment type (simplified subset of the full SDK type)
interface SquarePayment {
  id: string
  order_id?: string | null
  buyer_email_address?: string | null
  amount_money?: {
    amount?: bigint | number | null
    currency?: string | null
  } | null
}

// Square refund type
interface SquareRefund {
  id: string
  payment_id: string
  amount_money?: {
    amount?: bigint | number | null
  } | null
}

/**
 * Processes a Square `payment.completed` event:
 * 1. Resolves the merchant by Square merchant ID.
 * 2. Looks up/creates the customer by email.
 * 3. Calculates points from merchant rules.
 * 4. Atomically awards points via the `award_points` Postgres RPC.
 */
export async function handlePaymentCompleted(
  squareMerchantId: string,
  payment: SquarePayment,
): Promise<void> {
  const supabase = createServiceRoleClient()

  // 1. Resolve merchant (must be active)
  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, status')
    .eq('square_merchant_id', squareMerchantId)
    .maybeSingle()

  if (!merchant || merchant.status !== 'active') {
    return
  }

  // 2. Get customer email from payment
  const email = payment.buyer_email_address?.toLowerCase().trim()
  if (!email) {
    return // No email = no points
  }

  // 3. Upsert customer stub
  const { data: customer } = await supabase
    .from('customers')
    .upsert({ email }, { onConflict: 'email' })
    .select('id')
    .single()

  if (!customer) {
    console.error('[engine] Failed to upsert customer for email:', email)
    return
  }

  // 4. Get merchant point rules
  const { data: rules } = await supabase
    .from('merchant_point_rules')
    .select('points_per_dollar, min_spend_cents, is_active')
    .eq('merchant_id', merchant.id)
    .maybeSingle()

  if (!rules?.is_active) {
    return
  }

  // 5. Calculate points
  const amountCents = Number(payment.amount_money?.amount ?? 0)
  if (amountCents < rules.min_spend_cents) {
    return
  }

  const pointsEarned = Math.floor((amountCents / 100) * Number(rules.points_per_dollar))
  if (pointsEarned <= 0) {
    return
  }

  // 6. Atomically award points (idempotent via unique index on square_payment_id)
  const { error } = await supabase.rpc('award_points', {
    p_customer_id: customer.id,
    p_merchant_id: merchant.id,
    p_points: pointsEarned,
    p_square_payment_id: payment.id,
    p_square_order_id: payment.order_id ?? undefined,
  })

  if (error) {
    // Duplicate key = already processed — safe to ignore
    if (error.code === '23505') {
      return
    }
    console.error('[engine] award_points error:', error)
  }

  // Check for an open referral (status=wallet_created) for this customer at this merchant.
  // Only fires on first earned transaction — the referral status change to 'completed'
  // prevents it from firing again.
  const { data: openReferral } = await supabase
    .from('referrals')
    .select('id, referrer_id')
    .eq('referee_id', customer.id)
    .eq('merchant_id', merchant.id)
    .eq('status', 'wallet_created')
    .maybeSingle()

  if (openReferral) {
    await awardReferralBonus(
      openReferral.id,
      openReferral.referrer_id,
      customer.id,
      merchant.id,
      amountCents,
      supabase,
    )
  }
}

/**
 * Processes a Square `refund.created` event:
 * 1. Finds the original point_transaction by square_payment_id.
 * 2. Inserts a `reversed` transaction with negative points.
 * 3. Updates the cached balance (floored at 0).
 */
export async function handleRefundCreated(
  squareMerchantId: string,
  refund: SquareRefund,
): Promise<void> {
  const supabase = createServiceRoleClient()

  // 1. Resolve merchant
  const { data: merchant } = await supabase
    .from('merchants')
    .select('id')
    .eq('square_merchant_id', squareMerchantId)
    .maybeSingle()

  if (!merchant) {
    return
  }

  // 2. Find the original earned transaction for this payment
  const { data: original } = await supabase
    .from('point_transactions')
    .select('id, customer_id, points')
    .eq('square_payment_id', refund.payment_id)
    .eq('merchant_id', merchant.id)
    .eq('transaction_type', 'earned')
    .maybeSingle()

  if (!original) {
    return // No original transaction — nothing to reverse
  }

  const reversalPoints = -Math.abs(original.points)

  // 3. Get current balance
  const { data: balanceRow } = await supabase
    .from('customer_merchant_balances')
    .select('balance')
    .eq('customer_id', original.customer_id)
    .eq('merchant_id', merchant.id)
    .maybeSingle()

  const currentBalance = balanceRow?.balance ?? 0
  const newBalance = Math.max(0, currentBalance + reversalPoints)

  // 4. Update cached balance
  await supabase
    .from('customer_merchant_balances')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('customer_id', original.customer_id)
    .eq('merchant_id', merchant.id)

  // 5. Insert reversal ledger entry
  await supabase.from('point_transactions').insert({
    customer_id: original.customer_id,
    merchant_id: merchant.id,
    transaction_type: 'reversed',
    points: reversalPoints,
    balance_after: newBalance,
    related_transaction_id: original.id,
    square_payment_id: refund.payment_id,
    note: `Refund ${refund.id}`,
  })
}
