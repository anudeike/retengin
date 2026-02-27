import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { sendTransactionalEmail } from '@/lib/email/send'
import { unsubscribeUrl } from '@/lib/email/unsubscribe-token'
import { render } from '@react-email/render'
import { RewardRedeemed } from '@/lib/email/templates/RewardRedeemed'
import React from 'react'

const schema = z.object({
  customerId: z.string().uuid(),
  merchantId: z.string().uuid(),
  rewardId: z.string().uuid(),
  points: z.number().int().positive(),
})

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { customerId, merchantId, rewardId, points } = parsed.data

  // Verify caller owns this merchant
  const { data: merchant } = await supabase
    .from('merchants')
    .select('id')
    .eq('id', merchantId)
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!merchant) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Call redeem_points RPC via service role client (RPC is SECURITY DEFINER)
  const serviceClient = createServiceRoleClient()
  const { data: redemptionId, error } = await serviceClient.rpc('redeem_points', {
    p_customer_id: customerId,
    p_merchant_id: merchantId,
    p_reward_id: rewardId,
    p_points: points,
  })

  if (error) {
    if (error.message.includes('insufficient_points')) {
      return NextResponse.json({ error: 'Insufficient points' }, { status: 422 })
    }
    console.error('[redeem] RPC error:', error)
    return NextResponse.json({ error: 'Redemption failed' }, { status: 500 })
  }

  // Fire RewardRedeemed email (fire-and-forget)
  void (async () => {
    const [customerRes, merchantRes, rewardRes, balanceRes] = await Promise.all([
      serviceClient.from('customers').select('email, display_name').eq('id', customerId).single(),
      serviceClient.from('merchants').select('business_name, logo_url, slug').eq('id', merchantId).single(),
      serviceClient.from('rewards').select('name').eq('id', rewardId).single(),
      serviceClient
        .from('customer_merchant_balances')
        .select('balance')
        .eq('customer_id', customerId)
        .eq('merchant_id', merchantId)
        .maybeSingle(),
    ])

    const customer = customerRes.data
    const merchantInfo = merchantRes.data
    const reward = rewardRes.data
    if (!customer || !merchantInfo || !reward) return

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const walletUrl = `${appUrl}/wallet/${merchantInfo.slug ?? ''}`
    const unsub = unsubscribeUrl(customerId, merchantId)
    const remainingBalance = balanceRes.data?.balance ?? 0

    const html = await render(
      React.createElement(RewardRedeemed, {
        customerName: customer.display_name ?? customer.email,
        merchantName: merchantInfo.business_name,
        merchantLogoUrl: merchantInfo.logo_url,
        rewardName: reward.name,
        pointsSpent: points,
        remainingBalance,
        walletUrl,
        unsubscribeUrl: unsub,
      }),
    )
    await sendTransactionalEmail({
      to: customer.email,
      subject: `Reward redeemed at ${merchantInfo.business_name}: ${reward.name}`,
      html,
      customerId,
      merchantId,
    })
  })()

  return NextResponse.json({ redemptionId })
}
