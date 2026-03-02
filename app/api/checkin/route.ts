import { z } from 'zod'
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

const schema = z.object({
  merchantSlug: z.string().min(1),
  email: z.string().email(),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { merchantSlug, email } = parsed.data
  const supabase = createServiceRoleClient()

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id')
    .eq('slug', merchantSlug)
    .eq('status', 'active')
    .maybeSingle()

  if (!merchant) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
  }

  await supabase.from('loyalty_checkins').insert({
    merchant_id: merchant.id,
    email: email.toLowerCase().trim(),
  })

  return NextResponse.json({ success: true })
}
