import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

type AppRole = 'customer' | 'merchant' | 'admin'

const ROLE_DESTINATIONS: Record<AppRole, string> = {
  customer: '/wallet',
  merchant: '/dashboard',
  admin: '/admin',
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const roleParam = (searchParams.get('role') ?? 'customer') as AppRole
  const refCode = searchParams.get('ref')
  const merchantSlug = searchParams.get('slug')

  if (!code && !tokenHash) {
    return NextResponse.redirect(new URL('/?error=missing_code', origin))
  }

  // Collect cookies that Supabase wants to write for the session
  const pendingCookies: Array<Parameters<ReturnType<typeof NextResponse.redirect>['cookies']['set']>> = []

  // Must use a cookie-aware anon client to exchange the code so the session
  // tokens are written back to the browser. The service role client has
  // persistSession:false and cannot set cookies.
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            pendingCookies.push([name, value, options]),
          )
        },
      },
    },
  )

  // token_hash flow: used by PKCE magic links and invites (token sent directly in email link)
  // code flow: used by PKCE OAuth and older redirect-based flows
  const { data: { user }, error } = tokenHash && type
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as Parameters<typeof supabase.auth.verifyOtp>[0]['type'] })
    : await supabase.auth.exchangeCodeForSession(code!)

  if (error || !user) {
    console.error('[auth/callback] auth error:', error)
    return NextResponse.redirect(new URL('/?error=auth_failed', origin))
  }

  // Use service role for all privileged DB operations
  const adminSupabase = createServiceRoleClient()

  // Check if role already assigned (returning user)
  const { data: existingRole } = await adminSupabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  const role: AppRole = (existingRole?.role as AppRole) ?? roleParam

  if (!existingRole) {
    // Assign role
    await adminSupabase.from('user_roles').insert({ user_id: user.id, role })

    if (role === 'customer') {
      const email = user.email!.toLowerCase()

      // Link auth_user_id to existing stub customer (created by webhook) or create fresh
      const { data: existing } = await adminSupabase
        .from('customers')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (existing) {
        await adminSupabase
          .from('customers')
          .update({ auth_user_id: user.id })
          .eq('id', existing.id)
      } else {
        await adminSupabase
          .from('customers')
          .insert({ email, auth_user_id: user.id })
      }

      // Resolve customer record (either just created or already existed)
      const { data: customerRecord } = await adminSupabase
        .from('customers')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      // Handle referral if the new customer arrived via a referral link
      if (refCode && merchantSlug && customerRecord) {
        const [{ data: referrer }, { data: merchantRecord }] = await Promise.all([
          adminSupabase
            .from('customers')
            .select('id, email')
            .eq('referral_code', refCode)
            .maybeSingle(),
          adminSupabase
            .from('merchants')
            .select('id')
            .eq('slug', merchantSlug)
            .maybeSingle(),
        ])

        if (referrer && merchantRecord) {
          const isSelfReferral = referrer.email.toLowerCase() === email
          const newStatus = isSelfReferral ? 'invalid' : 'wallet_created'

          // Check for existing merchant-invite row for this email+merchant
          const { data: existingInvite } = await adminSupabase
            .from('referrals')
            .select('id, invited_by_merchant')
            .eq('referee_email', email)
            .eq('merchant_id', merchantRecord.id)
            .maybeSingle()

          if (existingInvite?.invited_by_merchant) {
            // Upgrade the merchant-invite row with the real referrer
            await adminSupabase
              .from('referrals')
              .update({
                referrer_id: referrer.id,
                referee_id: customerRecord.id,
                status: newStatus,
                invited_by_merchant: false,
              })
              .eq('id', existingInvite.id)
          } else {
            // Normal referral insert — unique constraint silently handles duplicates
            await adminSupabase.from('referrals').insert({
              referrer_id: referrer.id,
              referee_id: customerRecord.id,
              merchant_id: merchantRecord.id,
              referee_email: email,
              status: newStatus,
            })
          }
        }
      } else if (!refCode && customerRecord) {
        // No referral link — check if this customer was invited directly by a merchant
        await adminSupabase
          .from('referrals')
          .update({ referee_id: customerRecord.id, status: 'wallet_created' })
          .eq('referee_email', email)
          .eq('status', 'pending')
          .eq('invited_by_merchant', true)
      }
    }

    if (role === 'merchant') {
      // Merchant record was pre-created by admin — link auth_user_id by contact email
      await adminSupabase
        .from('merchants')
        .update({ auth_user_id: user.id })
        .eq('contact_email', user.email!)
    }
  }

  const destination = ROLE_DESTINATIONS[role] ?? '/wallet'
  const response = NextResponse.redirect(new URL(destination, origin))

  // Write the session cookies onto the redirect response so the browser
  // stores them and the middleware can find the session on the next request
  pendingCookies.forEach((args) => response.cookies.set(...args))

  return response
}
