import { createServiceRoleClient } from '@/lib/supabase/server'
import { resend } from '@/lib/email/client'

const FROM = process.env.RESEND_FROM_EMAIL ?? 'loyalty@taplo.app'

/**
 * Sends a transactional email after checking three opt-out layers:
 * 1. customers.email_global_opt_out
 * 2. merchants.emails_enabled
 * 3. customer_merchant_email_prefs.opted_out for (customer_id, merchant_id)
 *
 * Silently skips (no error) if any opt-out is active or RESEND_API_KEY is missing.
 */
export async function sendTransactionalEmail({
  to,
  subject,
  html,
  customerId,
  merchantId,
}: {
  to: string
  subject: string
  html: string
  customerId: string
  merchantId: string
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return

  const supabase = createServiceRoleClient()

  // 1. Global opt-out
  const { data: customer } = await supabase
    .from('customers')
    .select('email_global_opt_out')
    .eq('id', customerId)
    .single()
  if (customer?.email_global_opt_out) return

  // 2. Merchant kill-switch
  const { data: merchant } = await supabase
    .from('merchants')
    .select('emails_enabled')
    .eq('id', merchantId)
    .single()
  if (merchant?.emails_enabled === false) return

  // 3. Per-merchant opt-out
  const { data: pref } = await supabase
    .from('customer_merchant_email_prefs')
    .select('opted_out')
    .eq('customer_id', customerId)
    .eq('merchant_id', merchantId)
    .maybeSingle()
  if (pref?.opted_out) return

  const { error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) {
    console.error('[email] send error:', error)
  }
}
