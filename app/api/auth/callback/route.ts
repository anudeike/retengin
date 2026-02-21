import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

type AppRole = 'customer' | 'merchant' | 'admin'

const ROLE_DESTINATIONS: Record<AppRole, string> = {
  customer: '/wallet',
  merchant: '/dashboard',
  admin: '/admin',
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const roleParam = (searchParams.get('role') ?? 'customer') as AppRole

  if (!code) {
    return NextResponse.redirect(new URL('/?error=missing_code', origin))
  }

  const supabase = createServiceRoleClient()

  // Exchange magic-link code for a session
  const {
    data: { user },
    error,
  } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user) {
    console.error('[auth/callback] exchangeCodeForSession error:', error)
    return NextResponse.redirect(new URL('/?error=auth_failed', origin))
  }

  // Check if role already assigned (returning user)
  const { data: existingRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  const role: AppRole = (existingRole?.role as AppRole) ?? roleParam

  if (!existingRole) {
    // Assign role
    await supabase.from('user_roles').insert({ user_id: user.id, role })

    if (role === 'customer') {
      const email = user.email!.toLowerCase()

      // Link auth_user_id to existing stub customer (created by webhook) or create fresh
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('customers')
          .update({ auth_user_id: user.id })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('customers')
          .insert({ email, auth_user_id: user.id })
      }
    }

    if (role === 'merchant') {
      // Merchant record was pre-created by admin — link auth_user_id by contact email
      await supabase
        .from('merchants')
        .update({ auth_user_id: user.id })
        .eq('contact_email', user.email!)
    }
  }

  const destination = ROLE_DESTINATIONS[role] ?? '/wallet'
  return NextResponse.redirect(new URL(destination, origin))
}
