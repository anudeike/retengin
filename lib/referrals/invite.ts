import { createServiceRoleClient } from '@/lib/supabase/server'
import { resend } from '@/lib/email/client'
import { renderReferralInvite } from '@/lib/email/templates/ReferralInvite'

const FROM = process.env.RESEND_FROM_EMAIL ?? 'loyalty@taplo.app'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://taplo.app'

/**
 * Sends a merchant-initiated invite email to a new (non-account) customer.
 * Bypasses opt-out checks — the recipient has no account yet.
 * Inserts a referrals row with invited_by_merchant=true so that when
 * the recipient signs up, the referral is linked to their account.
 */
export async function sendMerchantInviteEmail(
  toEmail: string,
  merchantId: string,
  merchantName: string,
  merchantSlug: string,
): Promise<void> {
  const supabase = createServiceRoleClient()

  // Fetch logo + program name/description
  const [{ data: merchant }, { data: program }] = await Promise.all([
    supabase.from('merchants').select('logo_url').eq('id', merchantId).single(),
    supabase
      .from('referral_programs')
      .select('name, description')
      .eq('merchant_id', merchantId)
      .maybeSingle(),
  ])

  const joinUrl = `${APP_URL}/join/${merchantSlug}`
  const programPageUrl = `${APP_URL}/join/${merchantSlug}/referral`

  const html = renderReferralInvite({
    merchantName,
    merchantLogoUrl: merchant?.logo_url ?? null,
    programName: program?.name ?? null,
    programDescription: program?.description ?? null,
    joinUrl,
    programPageUrl,
  })

  // Insert a pending referral row so we can link it when the recipient signs up
  await supabase.from('referrals').upsert(
    {
      referrer_id: null,
      referee_email: toEmail.toLowerCase(),
      merchant_id: merchantId,
      status: 'pending',
      invited_by_merchant: true,
    },
    {
      onConflict: 'referee_email,merchant_id',
      ignoreDuplicates: true, // don't overwrite an existing real referral
    },
  )

  try {
    await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: `${merchantName} invited you to join their loyalty program`,
      html,
    })
  } catch (err) {
    console.error('[referral-invite] Failed to send invite email to', toEmail, err)
  }
}
