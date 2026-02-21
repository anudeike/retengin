import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

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

  return NextResponse.json({ redemptionId })
}
