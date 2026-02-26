'use client'

import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
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
      title="Sign in to Taplo"
      description="Enter your email and we'll send you a magic link."
      onSubmit={handleSubmit}
      footer={
        <>
          <Link href="/login/merchant" className="underline underline-offset-4 hover:text-foreground">
            Sign in as a merchant
          </Link>
          {' · '}
          <Link href="/login/admin" className="underline underline-offset-4 hover:text-foreground">
            Sign in as an admin
          </Link>
        </>
      }
    />
  )
}
