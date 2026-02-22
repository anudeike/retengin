'use client'

import React, { useState, useEffect } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface JoinPageProps {
  params: Promise<{ slug: string }>
}

export default function JoinPage({ params }: JoinPageProps) {
  const [slug, setSlug] = useState<string | null>(null)
  const [merchant, setMerchant] = useState<{
    id: string
    business_name: string
    logo_url: string | null
  } | null | undefined>(undefined)
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    params.then(({ slug: s }) => {
      setSlug(s)
      const supabase = createClient()
      supabase
        .from('merchants')
        .select('id, business_name, logo_url')
        .eq('slug', s)
        .eq('status', 'active')
        .maybeSingle()
        .then(({ data }) => setMerchant(data))
    })
  }, [params])

  if (merchant === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </main>
    )
  }

  if (merchant === null) notFound()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${appUrl}/api/auth/callback?role=customer` },
    })
    setLoading(false)
    if (otpError) { setError(otpError.message); return }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-sm space-y-2">
          <div className="text-4xl mb-4">✉️</div>
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-muted-foreground">
            We sent a magic link to <strong>{email}</strong>. Click it to access your Taplo wallet.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          {merchant.logo_url && (
            <Image
              src={merchant.logo_url}
              alt={`${merchant.business_name} logo`}
              width={80}
              height={80}
              className="mx-auto mb-4 rounded-full object-cover"
            />
          )}
          <p className="text-sm text-muted-foreground mb-1">Earn points at</p>
          <h1 className="text-2xl font-bold">{merchant.business_name}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Enter your email to start earning Taplo points on every purchase.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="join-email" className="sr-only">Email address</Label>
            <Input
              id="join-email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Sending...' : 'Get my magic link'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to receive loyalty emails from Taplo.
        </p>
      </div>
    </main>
  )
}
