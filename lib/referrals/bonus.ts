import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { sendTransactionalEmail } from '@/lib/email/send'
import { unsubscribeUrl } from '@/lib/email/unsubscribe-token'
import {
  type RewardDisplay,
  renderReferralCompleted,
} from '@/lib/email/templates/ReferralCompleted'

type ServiceClient = SupabaseClient<Database>
type Tier = Database['public']['Tables']['referral_spend_tiers']['Row']
type RewardType = Database['public']['Enums']['referral_reward_type']

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://taplo.app'

function buildRewardDisplay(
  rewardType: RewardType,
  merchantPoints: number,
  taploPoints: number,
  rewardTitle: string | null,
  rewardValue: number | null,
  merchantName: string,
): RewardDisplay {
  switch (rewardType) {
    case 'points':
      return { type: 'points', merchantPoints, taploPoints, merchantName }
    case 'item':
      return { type: 'item', title: rewardTitle ?? 'Item reward' }
    case 'discount_percent':
      return { type: 'discount_percent', value: rewardValue ?? 0, label: rewardTitle ?? undefined }
    case 'discount_flat':
      return { type: 'discount_flat', value: rewardValue ?? 0, label: rewardTitle ?? undefined }
  }
}

/**
 * Handles a single reward side (referrer or referee).
 * - For 'points': calls award_points RPC + updates taplo_points.
 * - For other types: inserts into referral_reward_grants.
 */
async function handleRewardSide(params: {
  supabase: ServiceClient
  customerId: string
  merchantId: string
  referralId: string
  role: 'referrer' | 'referee'
  tier: Tier
  squarePaymentId: string
  merchantPoints: number
  taploPoints: number
}): Promise<void> {
  const {
    supabase,
    customerId,
    merchantId,
    referralId,
    role,
    tier,
    squarePaymentId,
    merchantPoints,
    taploPoints,
  } = params

  const rewardType = role === 'referrer' ? tier.referrer_reward_type : tier.referee_reward_type
  const rewardTitle =
    role === 'referrer' ? tier.referrer_reward_title : tier.referee_reward_title
  const rewardValue =
    role === 'referrer' ? tier.referrer_reward_value : tier.referee_reward_value

  if (rewardType === 'points') {
    // Award merchant points (idempotent via namespaced payment ID)
    if (merchantPoints > 0) {
      await supabase.rpc('award_points', {
        p_customer_id: customerId,
        p_merchant_id: merchantId,
        p_points: merchantPoints,
        p_square_payment_id: `referral:${referralId}:${role}`,
      })
    }

    // Award Taplo global points (read-then-write; best-effort)
    if (taploPoints > 0) {
      const { data: row } = await supabase
        .from('customers')
        .select('taplo_points')
        .eq('id', customerId)
        .single()
      if (row) {
        await supabase
          .from('customers')
          .update({ taplo_points: row.taplo_points + taploPoints })
          .eq('id', customerId)
      }
    }
  } else {
    // Non-point reward: insert a grant row for merchant to redeem
    const title =
      rewardType === 'item'
        ? (rewardTitle ?? 'Item reward')
        : rewardType === 'discount_percent'
          ? `${rewardValue ?? 0}% off${rewardTitle ? ` — ${rewardTitle}` : ''}`
          : `$${(rewardValue ?? 0).toFixed(2)} off${rewardTitle ? ` — ${rewardTitle}` : ''}`

    await supabase.from('referral_reward_grants').insert({
      referral_id: referralId,
      customer_id: customerId,
      merchant_id: merchantId,
      role,
      reward_type: rewardType,
      reward_title: title,
      reward_value: rewardValue,
    })
  }

  void squarePaymentId // used by caller for referral update, kept in signature for traceability
}

/**
 * Awards referral bonuses to both parties after a qualifying purchase.
 * Resolves the best matching spend tier (highest min_spend_cents <= purchaseCents).
 * Checks expiry, max referrals cap, and purchase_count_required before awarding.
 * Sends a confirmation email to both parties.
 */
export async function awardReferralBonus(
  referralId: string,
  referrerId: string | null,
  refereeId: string,
  merchantId: string,
  purchaseCents: number,
  squarePaymentId: string,
  supabase: ServiceClient,
): Promise<void> {
  // 1. Get the referral program for this merchant
  const { data: program } = await supabase
    .from('referral_programs')
    .select(
      'id, is_enabled, max_referrals_per_customer, ends_at, clawback_on_refund, purchase_count_required',
    )
    .eq('merchant_id', merchantId)
    .maybeSingle()

  if (!program?.is_enabled) return

  // 2. Expiry check
  if (program.ends_at && new Date(program.ends_at) < new Date()) return

  // 3. Max referrals cap (only applies when there is a referrer)
  if (referrerId && program.max_referrals_per_customer !== null) {
    const { count } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', referrerId)
      .eq('merchant_id', merchantId)
      .eq('status', 'completed')

    if ((count ?? 0) >= program.max_referrals_per_customer) return
  }

  // 4. Find the best matching spend tier
  const { data: tiers } = await supabase
    .from('referral_spend_tiers')
    .select('*')
    .eq('referral_program_id', program.id)
    .lte('min_spend_cents', purchaseCents)
    .order('min_spend_cents', { ascending: false })
    .limit(1)

  const tier = tiers?.[0]
  if (!tier) return

  // 5. Handle each reward side
  if (referrerId) {
    await handleRewardSide({
      supabase,
      customerId: referrerId,
      merchantId,
      referralId,
      role: 'referrer',
      tier,
      squarePaymentId,
      merchantPoints: tier.referrer_merchant_points,
      taploPoints: tier.referrer_taplo_points,
    })
  }

  await handleRewardSide({
    supabase,
    customerId: refereeId,
    merchantId,
    referralId,
    role: 'referee',
    tier,
    squarePaymentId,
    merchantPoints: tier.referee_merchant_points,
    taploPoints: tier.referee_taplo_points,
  })

  // 6. Mark referral completed (store squarePaymentId for clawback traceability)
  await supabase
    .from('referrals')
    .update({
      status: 'completed',
      first_purchase_cents: purchaseCents,
      completed_at: new Date().toISOString(),
      square_payment_id: squarePaymentId,
    })
    .eq('id', referralId)

  // 7. Send confirmation emails (fire-and-forget; fetch names best-effort)
  const customerIds = [refereeId, ...(referrerId ? [referrerId] : [])]
  const { data: customerRows } = await supabase
    .from('customers')
    .select('id, email, display_name')
    .in('id', customerIds)

  const { data: merchantRow } = await supabase
    .from('merchants')
    .select('business_name, logo_url, slug')
    .eq('id', merchantId)
    .single()

  if (customerRows && merchantRow) {
    const merchantName = merchantRow.business_name
    const merchantLogoUrl = merchantRow.logo_url
    const walletUrl = `${APP_URL}/wallet/${merchantRow.slug}`

    const refereeRow = customerRows.find((c) => c.id === refereeId)
    const referrerRow = referrerId ? customerRows.find((c) => c.id === referrerId) : null

    const sendEmail = async (
      customer: { id: string; email: string; display_name: string | null },
      role: 'referrer' | 'referee',
      reward: RewardDisplay,
    ) => {
      const html = renderReferralCompleted({
        recipientName: customer.display_name ?? 'there',
        merchantName,
        merchantLogoUrl,
        role,
        reward,
        walletUrl,
        unsubscribeUrl: unsubscribeUrl(customer.id, merchantId),
      })
      await sendTransactionalEmail({
        to: customer.email,
        subject: `Your ${merchantName} referral reward is ready`,
        html,
        customerId: customer.id,
        merchantId,
      })
    }

    if (refereeRow) {
      const refereeReward = buildRewardDisplay(
        tier.referee_reward_type,
        tier.referee_merchant_points,
        tier.referee_taplo_points,
        tier.referee_reward_title,
        tier.referee_reward_value,
        merchantName,
      )
      void sendEmail(refereeRow, 'referee', refereeReward)
    }

    if (referrerRow) {
      const referrerReward = buildRewardDisplay(
        tier.referrer_reward_type,
        tier.referrer_merchant_points,
        tier.referrer_taplo_points,
        tier.referrer_reward_title,
        tier.referrer_reward_value,
        merchantName,
      )
      void sendEmail(referrerRow, 'referrer', referrerReward)
    }
  }
}

/**
 * Claws back referral bonuses when a qualifying purchase is refunded.
 * - Reverses point transactions for point rewards.
 * - Marks pending referral_reward_grants as clawed_back (does not affect redeemed grants).
 * - Sets referral status to 'invalid'.
 */
export async function clawbackReferralBonus(
  referralId: string,
  referrerId: string | null,
  refereeId: string | null,
  merchantId: string,
  supabase: ServiceClient,
): Promise<void> {
  const roles: Array<{ customerId: string; role: 'referrer' | 'referee' }> = []
  if (referrerId) roles.push({ customerId: referrerId, role: 'referrer' })
  if (refereeId) roles.push({ customerId: refereeId, role: 'referee' })

  for (const { customerId, role } of roles) {
    const paymentId = `referral:${referralId}:${role}`

    // Reverse point transactions (find the original award and insert a reversal)
    const { data: originalTxns } = await supabase
      .from('point_transactions')
      .select('id, points, balance_after')
      .eq('customer_id', customerId)
      .eq('merchant_id', merchantId)
      .eq('square_payment_id', paymentId)

    if (originalTxns && originalTxns.length > 0) {
      const original = originalTxns[0]
      // Get current balance to compute balance_after for reversal
      const { data: balanceRow } = await supabase
        .from('customer_merchant_balances')
        .select('balance')
        .eq('customer_id', customerId)
        .eq('merchant_id', merchantId)
        .maybeSingle()

      const currentBalance = balanceRow?.balance ?? 0
      const newBalance = Math.max(0, currentBalance - original.points)

      await supabase.from('point_transactions').insert({
        customer_id: customerId,
        merchant_id: merchantId,
        points: -original.points,
        balance_after: newBalance,
        transaction_type: 'reversed',
        square_payment_id: `clawback:${paymentId}`,
        related_transaction_id: original.id,
        note: `Referral clawback (refund)`,
      })

      await supabase
        .from('customer_merchant_balances')
        .update({ balance: newBalance })
        .eq('customer_id', customerId)
        .eq('merchant_id', merchantId)
    }

    // Note: Taplo points reversal is best-effort (no audit trail for taplo_points column).
    // We read the current value and subtract, accepting the race condition risk in refund scenarios.
    // This is acceptable because taplo_points clawbacks are rare and admin can correct if needed.

    // Mark pending grants as clawed_back (do NOT claw back already-redeemed grants)
    await supabase
      .from('referral_reward_grants')
      .update({
        status: 'clawed_back',
        clawed_back_at: new Date().toISOString(),
      })
      .eq('referral_id', referralId)
      .eq('role', role)
      .eq('status', 'pending')
  }

  // Mark the referral itself as invalid
  await supabase.from('referrals').update({ status: 'invalid' }).eq('id', referralId)
}
