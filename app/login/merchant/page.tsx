'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'
import { LoginForm } from '@/components/auth/LoginForm'

export default function MerchantLoginPage() {
  async function handleSubmit(email: string) {
    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    })
    if (error) return { error: error.message }
    return {}
  }

  return (
    <LoginForm
      title="Merchant Sign In"
      description="Enter your email to sign in to your merchant dashboard."
      onSubmit={handleSubmit}
    />
  )
}
