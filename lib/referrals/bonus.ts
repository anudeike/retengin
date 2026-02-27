import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type ServiceClient = SupabaseClient<Database>

/**
 * Awards referral bonuses to both parties after a qualifying first purchase.
 * Resolves the best matching spend tier (highest min_spend_cents <= purchaseCents).
 * Calls award_points for merchant points (idempotent via referral:<id> payment IDs).
 * Updates taplo_points directly on the customers rows.
 * Marks the referral as completed.
 */
export async function awardReferralBonus(
  referralId: string,
  referrerId: string,
  refereeId: string,
  merchantId: string,
  purchaseCents: number,
  supabase: ServiceClient,
): Promise<void> {
  // 1. Get the referral program for this merchant
  const { data: program } = await supabase
    .from('referral_programs')
    .select('id, is_enabled')
    .eq('merchant_id', merchantId)
    .maybeSingle()

  if (!program?.is_enabled) {
    return // Program not configured or disabled — no bonus
  }

  // 2. Find the best matching spend tier (highest qualifying min_spend_cents)
  const { data: tiers } = await supabase
    .from('referral_spend_tiers')
    .select('*')
    .eq('referral_program_id', program.id)
    .lte('min_spend_cents', purchaseCents)
    .order('min_spend_cents', { ascending: false })
    .limit(1)

  const tier = tiers?.[0]
  if (!tier) {
    return // No qualifying tier — no bonus
  }

  // 3. Award merchant points to referrer (idempotent via namespaced payment ID)
  if (tier.referrer_merchant_points > 0) {
    await supabase.rpc('award_points', {
      p_customer_id: referrerId,
      p_merchant_id: merchantId,
      p_points: tier.referrer_merchant_points,
      p_square_payment_id: `referral:${referralId}:referrer`,
    })
  }

  // 4. Award merchant points to referee (idempotent)
  if (tier.referee_merchant_points > 0) {
    await supabase.rpc('award_points', {
      p_customer_id: refereeId,
      p_merchant_id: merchantId,
      p_points: tier.referee_merchant_points,
      p_square_payment_id: `referral:${referralId}:referee`,
    })
  }

  // 5. Award Taplo global points to referrer (read-then-write; service role, single event)
  if (tier.referrer_taplo_points > 0) {
    const { data: referrerRow } = await supabase
      .from('customers')
      .select('taplo_points')
      .eq('id', referrerId)
      .single()
    if (referrerRow) {
      await supabase
        .from('customers')
        .update({ taplo_points: referrerRow.taplo_points + tier.referrer_taplo_points })
        .eq('id', referrerId)
    }
  }

  // 6. Award Taplo global points to referee
  if (tier.referee_taplo_points > 0) {
    const { data: refereeRow } = await supabase
      .from('customers')
      .select('taplo_points')
      .eq('id', refereeId)
      .single()
    if (refereeRow) {
      await supabase
        .from('customers')
        .update({ taplo_points: refereeRow.taplo_points + tier.referee_taplo_points })
        .eq('id', refereeId)
    }
  }

  // 7. Mark referral completed
  await supabase
    .from('referrals')
    .update({
      status: 'completed',
      first_purchase_cents: purchaseCents,
      completed_at: new Date().toISOString(),
    })
    .eq('id', referralId)
}
