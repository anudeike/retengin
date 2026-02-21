import { NextResponse } from 'next/server'
import { verifySquareWebhookSignature } from '@/lib/square/webhooks'
import { handlePaymentCompleted, handleRefundCreated } from '@/lib/points/engine'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Must read raw body for HMAC verification
export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-square-hmacsha256-signature') ?? ''
  const notificationUrl = process.env.SQUARE_WEBHOOK_URL ?? request.url

  // 1. Verify signature
  if (!(await verifySquareWebhookSignature({ rawBody, signature, notificationUrl }))) {
    console.warn('[webhook] Invalid Square signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventId = event['event_id'] as string | undefined
  const eventType = event['type'] as string | undefined
  const merchantId = event['merchant_id'] as string | undefined

  if (!eventId) {
    return NextResponse.json({ error: 'Missing event_id' }, { status: 400 })
  }

  // 2. Idempotency check — return 200 immediately for already-processed events
  const supabase = createServiceRoleClient()
  const { error: insertError } = await supabase
    .from('processed_webhook_events')
    .insert({ event_id: eventId })

  if (insertError) {
    if (insertError.code === '23505') {
      // Duplicate — already processed
      return NextResponse.json({ received: true })
    }
    console.error('[webhook] idempotency insert error:', insertError)
  }

  // 3. Route event to handler (fire-and-forget so we return 200 quickly)
  const data = (event['data'] as Record<string, unknown>) ?? {}
  const object = (data['object'] as Record<string, unknown>) ?? {}

  if (merchantId) {
    if (eventType === 'payment.completed') {
      const payment = object['payment'] as Record<string, unknown>
      handlePaymentCompleted(merchantId, payment as never).catch((err) =>
        console.error('[webhook] handlePaymentCompleted error:', err),
      )
    } else if (eventType === 'refund.created') {
      const refund = object['refund'] as Record<string, unknown>
      handleRefundCreated(merchantId, refund as never).catch((err) =>
        console.error('[webhook] handleRefundCreated error:', err),
      )
    }
  }

  // 4. Return 200 immediately to prevent Square retry
  return NextResponse.json({ received: true })
}
