import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens } from '@/lib/square/oauth'
import { encrypt } from '@/lib/utils/crypto'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')

  if (errorParam) {
    return NextResponse.redirect(`${origin}/dashboard/connect?error=${errorParam}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/dashboard/connect?error=missing_params`)
  }

  // CSRF check
  const cookieStore = await cookies()
  const savedState = cookieStore.get('square_oauth_state')?.value
  cookieStore.delete('square_oauth_state')

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${origin}/dashboard/connect?error=invalid_state`)
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/?error=unauthenticated`)
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Encrypt tokens before storing
    const encryptedAccess = encrypt(tokens.access_token)
    const encryptedRefresh = encrypt(tokens.refresh_token)

    // Fetch Square location ID
    const squareBaseUrl =
      process.env.SQUARE_ENVIRONMENT === 'production'
        ? 'https://connect.squareup.com'
        : 'https://connect.squareupsandbox.com'

    const locResponse = await fetch(`${squareBaseUrl}/v2/locations`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Square-Version': '2024-01-18',
      },
    })

    let locationId: string | null = null
    if (locResponse.ok) {
      const locData = await locResponse.json()
      locationId = locData.locations?.[0]?.id ?? null
    }

    // Use service role to update merchant record
    const serviceClient = createServiceRoleClient()
    await serviceClient
      .from('merchants')
      .update({
        square_merchant_id: tokens.merchant_id,
        square_access_token: encryptedAccess,
        square_refresh_token: encryptedRefresh,
        square_token_expires_at: tokens.expires_at,
        square_location_id: locationId,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('auth_user_id', user.id)

    // /dashboard/connect/done is a client page that posts postMessage to the opener tab and closes itself
    return NextResponse.redirect(`${origin}/dashboard/connect/done`)
  } catch (err) {
    console.error('[square/callback] error:', err)
    return NextResponse.redirect(`${origin}/dashboard/connect?error=token_exchange_failed`)
  }
}
