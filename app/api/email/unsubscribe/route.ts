import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe-token'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(
      new URL('/unsubscribe?error=missing_token', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
    )
  }

  const payload = verifyUnsubscribeToken(token)
  if (!payload) {
    return NextResponse.redirect(
      new URL('/unsubscribe?error=invalid_token', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
    )
  }

  const supabase = createServiceRoleClient()

  if (payload.merchantId) {
    // Merchant-scoped opt-out: upsert customer_merchant_email_prefs
    await supabase
      .from('customer_merchant_email_prefs')
      .upsert(
        { customer_id: payload.customerId, merchant_id: payload.merchantId, opted_out: true },
        { onConflict: 'customer_id,merchant_id' },
      )
  } else {
    // Global opt-out: set email_global_opt_out = true
    await supabase
      .from('customers')
      .update({ email_global_opt_out: true })
      .eq('id', payload.customerId)
  }

  const params = new URLSearchParams({ success: '1' })
  if (payload.merchantId) params.set('scope', 'merchant')
  return NextResponse.redirect(
    new URL(`/unsubscribe?${params.toString()}`, process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  )
}
