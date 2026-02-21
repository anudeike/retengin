'use client'

import { useState } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface JoinPageProps {
  params: Promise<{ slug: string }>
}

// Merchant data fetching is done client-side via Supabase anon key
// (merchant_point_rules with is_active=true are publicly readable per RLS)
export default function JoinPage({ params }: JoinPageProps) {
  return <JoinPageContent params={params} />
}

function JoinPageContent({ params }: JoinPageProps) {
  return <JoinPageInner params={params} />
}

import React from 'react'

function JoinPageInner({ params }: JoinPageProps) {
  const [slug, setSlug] = React.useState<string | null>(null)
  const [merchant, setMerchant] = React.useState<{
    id: string
    business_name: string
    logo_url: string | null
  } | null | undefined>(undefined)
  const [email, setEmail] = React.useState('')
  const [submitted, setSubmitted] = React.useState(false)
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
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
        <div className="animate-pulse text-gray-400">Loading...</div>
      </main>
    )
  }

  if (merchant === null) {
    notFound()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${appUrl}/api/auth/callback?role=customer`,
      },
    })

    setLoading(false)

    if (otpError) {
      setError(otpError.message)
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-sm">
          <div className="text-4xl mb-4">✉️</div>
          <h1 className="text-2xl font-bold mb-2">Check your email</h1>
          <p className="text-gray-600">
            We sent a magic link to <strong>{email}</strong>. Click it to access your Taplo wallet.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        {/* Merchant branding */}
        <div className="text-center mb-8">
          {merchant.logo_url && (
            <Image
              src={merchant.logo_url}
              alt={`${merchant.business_name} logo`}
              width={80}
              height={80}
              className="mx-auto mb-4 rounded-full object-cover"
            />
          )}
          <p className="text-sm text-gray-500 mb-1">Earn points at</p>
          <h1 className="text-2xl font-bold">{merchant.business_name}</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Enter your email to start earning Taplo points on every purchase.
          </p>
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">Email address</label>
            <input
              id="email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-base"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {loading ? 'Sending...' : 'Get my magic link'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          By continuing you agree to receive loyalty emails from Taplo.
        </p>
      </div>
    </main>
  )
}
