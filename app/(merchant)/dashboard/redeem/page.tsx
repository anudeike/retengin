'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { RedemptionModal } from '@/components/merchant/RedemptionModal'
import { Button } from '@/components/ui/button'

export default function RedeemPage() {
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('merchants')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setMerchantId(data.id)
        })
    })
  }, [])

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-6">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/dashboard">← Dashboard</Link>
        </Button>
        <h1 className="text-2xl font-bold mb-2">Redeem Points</h1>
        <p className="text-muted-foreground mb-8">Look up a customer by email and redeem a reward.</p>

        <Button
          size="lg"
          className="w-full py-4 text-lg"
          disabled={!merchantId}
          onClick={() => setShowModal(true)}
        >
          Start redemption
        </Button>

        {showModal && merchantId && (
          <RedemptionModal merchantId={merchantId} onClose={() => setShowModal(false)} />
        )}
      </div>
    </main>
  )
}
