'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { RedemptionModal } from '@/components/merchant/RedemptionModal'
import { useEffect } from 'react'

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
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto p-6">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-black mb-6 inline-block">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold mb-2">Redeem Points</h1>
        <p className="text-gray-500 mb-8">Look up a customer by email and redeem a reward.</p>

        <button
          type="button"
          disabled={!merchantId}
          onClick={() => setShowModal(true)}
          className="w-full py-4 bg-black text-white rounded-xl font-medium text-lg hover:bg-gray-800 disabled:opacity-40 transition"
        >
          Start redemption
        </button>

        {showModal && merchantId && (
          <RedemptionModal merchantId={merchantId} onClose={() => setShowModal(false)} />
        )}
      </div>
    </main>
  )
}
