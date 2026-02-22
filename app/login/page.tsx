'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-sm w-full space-y-2">
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-muted-foreground">
            We sent a magic link to <span className="font-medium text-foreground">{email}</span>.
            Click it to sign in.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-sm w-full space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">Sign in to Taplo</h1>
          <p className="text-muted-foreground text-sm">Enter your email and we&apos;ll send you a magic link.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Sending…' : 'Send magic link'}
          </Button>
        </form>
      </div>
    </main>
  )
}
