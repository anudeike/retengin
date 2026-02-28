import { NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  grantId: z.string().uuid(),
  merchantId: z.string().uuid(),
})

export async function POST(request: Request) {
  // Auth check
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

  const { grantId, merchantId } = parsed.data

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

  // Mark grant as redeemed via service role (bypasses RLS)
  const service = createServiceRoleClient()
  const { error, count } = await service
    .from('referral_reward_grants')
    .update({ status: 'redeemed', redeemed_at: new Date().toISOString() })
    .eq('id', grantId)
    .eq('merchant_id', merchantId)
    .eq('status', 'pending')

  if (error) {
    console.error('[redeem-referral-grant] Update error:', error)
    return NextResponse.json({ error: 'Redemption failed' }, { status: 500 })
  }

  if (count === 0) {
    return NextResponse.json(
      { error: 'Grant not found or already redeemed' },
      { status: 404 },
    )
  }

  return NextResponse.json({ success: true })
}
