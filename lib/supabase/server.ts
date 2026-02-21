import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

/**
 * Service-role client — bypasses RLS.
 * Use ONLY in server-side API routes (webhooks, auth callback, admin actions).
 * Never expose this client to the browser.
 */
export function createServiceRoleClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}

/**
 * Server-side client using the user's session cookie.
 * Safe for server components and route handlers that need RLS enforcement.
 */
export async function createServerClient() {
  const { createServerClient: createSSRServerClient } = await import('@supabase/ssr')
  const { cookies } = await import('next/headers')

  const cookieStore = await cookies()

  return createSSRServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component — cookies cannot be set.
            // Middleware handles session refresh.
          }
        },
      },
    },
  )
}
