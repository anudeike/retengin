import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { buildOAuthUrl } from '@/lib/square/oauth'

export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify the caller is a merchant
  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (roleRow?.role !== 'merchant') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { url, state } = buildOAuthUrl()

  // Store state in an httpOnly cookie for CSRF verification in /callback
  const cookieStore = await cookies()
  cookieStore.set('square_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  return NextResponse.redirect(url)
}
