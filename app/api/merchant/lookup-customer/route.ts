import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  merchantId: z.string().uuid(),
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

  const { email, merchantId } = parsed.data

  // Verify caller is the merchant for this merchantId
  const { data: merchant } = await supabase
    .from('merchants')
    .select('id')
    .eq('id', merchantId)
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!merchant) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Look up customer
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (!customer) {
    return NextResponse.json({ error: 'No Taplo account found for this email' }, { status: 404 })
  }

  // Get balance
  const { data: balanceRow } = await supabase
    .from('customer_merchant_balances')
    .select('balance')
    .eq('customer_id', customer.id)
    .eq('merchant_id', merchantId)
    .maybeSingle()

  // Get active rewards
  const { data: rewards } = await supabase
    .from('rewards')
    .select('id, name, points_required')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)
    .order('points_required', { ascending: true })

  // Get pending referral reward grants for this customer+merchant
  const { data: referralGrants } = await supabase
    .from('referral_reward_grants')
    .select('id, reward_type, reward_title, reward_value, granted_at, role')
    .eq('customer_id', customer.id)
    .eq('merchant_id', merchantId)
    .eq('status', 'pending')

  return NextResponse.json({
    customerId: customer.id,
    balance: balanceRow?.balance ?? 0,
    rewards: rewards ?? [],
    referralGrants: referralGrants ?? [],
  })
}
