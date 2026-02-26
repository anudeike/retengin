'use server'

import { createServiceRoleClient, createServerClient } from '@/lib/supabase/server'

export async function sendAdminMagicLink(email: string): Promise<{ error?: string }> {
  const adminSupabase = createServiceRoleClient()

  // Step 1: Look up the user by email via the Supabase admin REST API.
  // The JS client has no getUserByEmail method, so we use fetch directly.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const usersResponse = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}&per_page=1`,
    {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    },
  )

  if (!usersResponse.ok) {
    return { error: 'Unable to verify admin status. Please try again.' }
  }

  const body = (await usersResponse.json()) as { users?: Array<{ id: string }> }
  const user = body.users?.[0]

  if (!user) {
    return { error: "This email isn't registered as an admin account." }
  }

  // Step 2: Confirm the user has the admin role in our user_roles table.
  const { data: roleRecord, error: roleError } = await adminSupabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle()

  if (roleError) {
    return { error: 'Unable to verify admin status. Please try again.' }
  }

  if (!roleRecord) {
    return { error: "This email isn't registered as an admin account." }
  }

  // Step 3: All checks passed — send the magic link.
  const supabase = await createServerClient()
  const { error: otpError } = await supabase.auth.signInWithOtp({ email })

  if (otpError) {
    return { error: otpError.message }
  }

  return {}
}
