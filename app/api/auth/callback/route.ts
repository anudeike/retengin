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
  const roleParam = (searchParams.get('role') ?? 'customer') as AppRole

  if (!code) {
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

  const {
    data: { user },
    error,
  } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user) {
    console.error('[auth/callback] exchangeCodeForSession error:', error)
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
