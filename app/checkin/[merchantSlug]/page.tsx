'use client'

import React, { useState, useEffect } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface CheckinPageProps {
  params: Promise<{ merchantSlug: string }>
}

type CheckinState = 'idle' | 'loading' | 'success' | 'error'

export default function CheckinPage({ params }: CheckinPageProps) {
  const [merchantSlug, setMerchantSlug] = useState<string | null>(null)
  const [merchant, setMerchant] = useState<{
    id: string
    business_name: string
    logo_url: string | null
  } | null | undefined>(undefined)
  const [email, setEmail] = useState('')
  const [state, setState] = useState<CheckinState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    params.then(({ merchantSlug: slug }) => {
      setMerchantSlug(slug)
      const supabase = createClient()
      supabase
        .from('merchants')
        .select('id, business_name, logo_url')
        .eq('slug', slug)
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

  if (state === 'success') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-sm space-y-2">
          <p className="text-green-600 font-medium text-lg">
            You&apos;re checked in!
          </p>
          <p className="text-muted-foreground text-sm">
            Complete your purchase and your points will appear in your wallet.
          </p>
        </div>
      </main>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')
    setState('loading')

    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantSlug, email }),
    })

    if (res.ok) {
      setState('success')
    } else {
      setErrorMsg('Something went wrong. Please try again.')
      setState('error')
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          {merchant.logo_url && (
            <Image
              src={merchant.logo_url}
              alt={`${merchant.business_name} logo`}
              width={64}
              height={64}
              className="mx-auto mb-4 rounded-full object-cover"
            />
          )}
          <h1 className="text-2xl font-bold">{merchant.business_name}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Enter your email to earn points. Your points will appear after your purchase.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {state === 'error' && (
            <p className="text-destructive text-sm">{errorMsg}</p>
          )}
          <Button type="submit" disabled={state === 'loading'} className="w-full">
            {state === 'loading' ? 'Checking in...' : 'Check in'}
          </Button>
        </form>
      </div>
    </main>
  )
}
