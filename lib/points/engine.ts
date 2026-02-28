import { createServiceRoleClient } from '@/lib/supabase/server'
import { awardReferralBonus, clawbackReferralBonus } from '@/lib/referrals/bonus'
import { sendTransactionalEmail } from '@/lib/email/send'
import { unsubscribeUrl } from '@/lib/email/unsubscribe-token'
import { render } from '@react-email/render'
import { PointsEarned } from '@/lib/email/templates/PointsEarned'
import { RewardUnlocked } from '@/lib/email/templates/RewardUnlocked'
import React from 'react'

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

// Square invoice type (subset used by invoice.payment_made)
interface SquareInvoice {
  id: string
  order_id?: string | null
  primary_recipient?: {
    email_address?: string | null
  } | null
  payment_requests?: Array<{
    total_completed_amount_money?: {
      amount?: bigint | number | null
    } | null
  }> | null
}

/**
 * Processes a Square `payment.updated` (status=COMPLETED) event:
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
    .select('id, status, business_name, logo_url, slug')
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

  // 6. Capture previous balance (needed for reward-unlock detection)
  const { data: prevBalanceRow } = await supabase
    .from('customer_merchant_balances')
    .select('balance')
    .eq('customer_id', customer.id)
    .eq('merchant_id', merchant.id)
    .maybeSingle()
  const previousBalance = prevBalanceRow?.balance ?? 0

  // 7. Atomically award points (idempotent via unique index on square_payment_id)
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
      console.log(`[engine] payment ${payment.id} already processed — skipping`)
      return
    }
    console.error('[engine] award_points error:', error)
    return
  }

  console.log(
    `[engine] +${pointsEarned} pts awarded — customer: ${email} (${customer.id}), payment: ${payment.id}, amount: $${(amountCents / 100).toFixed(2)}`,
  )

  const newBalance = previousBalance + pointsEarned

  // 8. Fire transactional emails (fire-and-forget — don't block webhook response)
  void (async () => {
    const { data: fullCustomer } = await supabase
      .from('customers')
      .select('email, display_name')
      .eq('id', customer.id)
      .single()
    if (!fullCustomer) return

    const customerName = fullCustomer.display_name ?? fullCustomer.email
    const unsub = unsubscribeUrl(customer.id, merchant.id)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const walletUrl = `${appUrl}/wallet/${merchant.slug ?? ''}`

    // PointsEarned email
    const pointsHtml = await render(
      React.createElement(PointsEarned, {
        customerName,
        merchantName: merchant.business_name,
        merchantLogoUrl: merchant.logo_url,
        pointsEarned,
        newBalance,
        walletUrl,
        unsubscribeUrl: unsub,
      }),
    )
    await sendTransactionalEmail({
      to: fullCustomer.email,
      subject: `You earned ${pointsEarned} points at ${merchant.business_name}`,
      html: pointsHtml,
      customerId: customer.id,
      merchantId: merchant.id,
    })

    // RewardUnlocked emails — any reward whose threshold was crossed by this payment
    const { data: rewards } = await supabase
      .from('rewards')
      .select('id, name, points_required')
      .eq('merchant_id', merchant.id)
      .eq('is_active', true)
      .gt('points_required', previousBalance)
      .lte('points_required', newBalance)

    for (const reward of rewards ?? []) {
      const unlockedHtml = await render(
        React.createElement(RewardUnlocked, {
          customerName,
          merchantName: merchant.business_name,
          merchantLogoUrl: merchant.logo_url,
          rewardName: reward.name,
          walletUrl,
          unsubscribeUrl: unsub,
        }),
      )
      await sendTransactionalEmail({
        to: fullCustomer.email,
        subject: `Reward unlocked at ${merchant.business_name}: ${reward.name}`,
        html: unlockedHtml,
        customerId: customer.id,
        merchantId: merchant.id,
      })
    }
  })()

  // Check for an open referral (status=wallet_created) for this customer at this merchant.
  const { data: openReferral } = await supabase
    .from('referrals')
    .select('id, referrer_id, purchase_count')
    .eq('referee_id', customer.id)
    .eq('merchant_id', merchant.id)
    .eq('status', 'wallet_created')
    .maybeSingle()

  if (openReferral) {
    // Fetch purchase_count_required from the referral program
    const { data: program } = await supabase
      .from('referral_programs')
      .select('purchase_count_required')
      .eq('merchant_id', merchant.id)
      .maybeSingle()

    const required = program?.purchase_count_required ?? 1
    const newCount = (openReferral.purchase_count ?? 0) + 1

    // Increment purchase_count on every qualifying payment
    await supabase.from('referrals').update({ purchase_count: newCount }).eq('id', openReferral.id)

    // Only fire bonus on the Nth qualifying purchase
    if (newCount >= required) {
      await awardReferralBonus(
        openReferral.id,
        openReferral.referrer_id,
        customer.id,
        merchant.id,
        amountCents,
        payment.id,
        supabase,
      )
    }
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

  console.log(
    `[engine] ${reversalPoints} pts reversed — customer: ${original.customer_id}, refund: ${refund.id}, new balance: ${newBalance}`,
  )

  // 6. Clawback referral bonus if the refunded payment triggered one
  const { data: completedReferral } = await supabase
    .from('referrals')
    .select('id, referrer_id, referee_id')
    .eq('square_payment_id', refund.payment_id)
    .eq('merchant_id', merchant.id)
    .eq('status', 'completed')
    .maybeSingle()

  if (completedReferral) {
    const { data: program } = await supabase
      .from('referral_programs')
      .select('clawback_on_refund')
      .eq('merchant_id', merchant.id)
      .maybeSingle()

    if (program?.clawback_on_refund) {
      await clawbackReferralBonus(
        completedReferral.id,
        completedReferral.referrer_id,
        completedReferral.referee_id,
        merchant.id,
        supabase,
      )
    }
  }
}

/**
 * Processes a Square `invoice.payment_made` event.
 * Same flow as handlePaymentCompleted but reads email and amount from the invoice object.
 *
 * Double-fire guard: Square also sends a payment.updated (status=COMPLETED) for invoice
 * payments. We check square_order_id in point_transactions — whichever event fires first
 * awards the points; the second is skipped.
 */
export async function handleInvoicePaymentMade(
  squareMerchantId: string,
  invoice: SquareInvoice,
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

  // 2. Get customer email from invoice recipient
  const email = invoice.primary_recipient?.email_address?.toLowerCase().trim()
  if (!email) {
    console.warn(`[engine] invoice ${invoice.id} has no recipient email — skipping`)
    return
  }

  // 3. Double-fire guard: if payment.updated already awarded points for this order, skip
  if (invoice.order_id) {
    const { data: existing } = await supabase
      .from('point_transactions')
      .select('id')
      .eq('square_order_id', invoice.order_id)
      .eq('merchant_id', merchant.id)
      .eq('transaction_type', 'earned')
      .maybeSingle()

    if (existing) {
      console.log(`[engine] invoice ${invoice.id} order already credited via payment.updated — skipping`)
      return
    }
  }

  // 4. Upsert customer stub
  const { data: customer } = await supabase
    .from('customers')
    .upsert({ email }, { onConflict: 'email' })
    .select('id')
    .single()

  if (!customer) {
    console.error('[engine] Failed to upsert customer for email:', email)
    return
  }

  // 5. Get merchant point rules
  const { data: rules } = await supabase
    .from('merchant_point_rules')
    .select('points_per_dollar, min_spend_cents, is_active')
    .eq('merchant_id', merchant.id)
    .maybeSingle()

  if (!rules?.is_active) {
    return
  }

  // 6. Calculate amount — sum total_completed_amount_money across all payment requests
  const amountCents = (invoice.payment_requests ?? []).reduce(
    (sum, req) => sum + Number(req.total_completed_amount_money?.amount ?? 0),
    0,
  )

  if (amountCents < rules.min_spend_cents) {
    return
  }

  const pointsEarned = Math.floor((amountCents / 100) * Number(rules.points_per_dollar))
  if (pointsEarned <= 0) {
    return
  }

  // 7. Award points — use inv:<id> as the payment ID for idempotency
  const invoicePaymentId = `inv:${invoice.id}`
  const { error } = await supabase.rpc('award_points', {
    p_customer_id: customer.id,
    p_merchant_id: merchant.id,
    p_points: pointsEarned,
    p_square_payment_id: invoicePaymentId,
    p_square_order_id: invoice.order_id ?? undefined,
  })

  if (error) {
    if (error.code === '23505') {
      console.log(`[engine] invoice ${invoice.id} already processed — skipping`)
      return
    }
    console.error('[engine] award_points error (invoice):', error)
    return
  }

  console.log(
    `[engine] +${pointsEarned} pts awarded — customer: ${email} (${customer.id}), invoice: ${invoice.id}, amount: $${(amountCents / 100).toFixed(2)}`,
  )

  // 8. Check for open referral (with purchase count tracking, same as payment flow)
  const { data: openReferral } = await supabase
    .from('referrals')
    .select('id, referrer_id, purchase_count')
    .eq('referee_id', customer.id)
    .eq('merchant_id', merchant.id)
    .eq('status', 'wallet_created')
    .maybeSingle()

  if (openReferral) {
    const { data: program } = await supabase
      .from('referral_programs')
      .select('purchase_count_required')
      .eq('merchant_id', merchant.id)
      .maybeSingle()

    const required = program?.purchase_count_required ?? 1
    const newCount = (openReferral.purchase_count ?? 0) + 1

    await supabase.from('referrals').update({ purchase_count: newCount }).eq('id', openReferral.id)

    if (newCount >= required) {
      await awardReferralBonus(
        openReferral.id,
        openReferral.referrer_id,
        customer.id,
        merchant.id,
        amountCents,
        invoicePaymentId,
        supabase,
      )
    }
  }
}
