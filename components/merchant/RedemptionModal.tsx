'use client'

import { useState } from 'react'

interface Reward {
  id: string
  name: string
  points_required: number
}

interface RedemptionModalProps {
  merchantId: string
  onClose: () => void
}

export function RedemptionModal({ merchantId, onClose }: RedemptionModalProps) {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<'email' | 'confirm' | 'done'>('email')
  const [customerData, setCustomerData] = useState<{
    customerId: string
    balance: number
    rewards: Reward[]
  } | null>(null)
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function lookupCustomer(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // POST to a lightweight server action endpoint
    const res = await fetch('/api/merchant/lookup-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), merchantId }),
    })

    setLoading(false)

    if (!res.ok) {
      const body = await res.json()
      setError(body.error ?? 'Customer not found')
      return
    }

    const data = await res.json()
    setCustomerData(data)
    setStep('confirm')
  }

  async function confirmRedemption() {
    if (!selectedReward || !customerData) return
    if (customerData.balance < selectedReward.points_required) {
      setError('Insufficient points')
      return
    }

    setError('')
    setLoading(true)

    const res = await fetch('/api/merchant/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: customerData.customerId,
        merchantId,
        rewardId: selectedReward.id,
        points: selectedReward.points_required,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const body = await res.json()
      setError(body.error ?? 'Redemption failed')
      return
    }

    setStep('done')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">Redeem Points</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        {step === 'email' && (
          <form onSubmit={lookupCustomer} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Customer email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition"
            >
              {loading ? 'Looking up...' : 'Look up customer'}
            </button>
          </form>
        )}

        {step === 'confirm' && customerData && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-medium">{email}</p>
              <p className="text-2xl font-bold mt-1">{customerData.balance.toLocaleString()} pts</p>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Select reward</p>
              <div className="space-y-2">
                {customerData.rewards.map((r) => {
                  const canRedeem = customerData.balance >= r.points_required
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={!canRedeem}
                      onClick={() => setSelectedReward(r)}
                      className={`w-full text-left px-3 py-2.5 border rounded-lg transition ${
                        selectedReward?.id === r.id
                          ? 'border-black bg-black text-white'
                          : canRedeem
                          ? 'border-gray-300 hover:border-gray-500'
                          : 'border-gray-100 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      <span className="font-medium">{r.name}</span>
                      <span className="text-xs ml-2 opacity-70">
                        {r.points_required.toLocaleString()} pts
                        {!canRedeem && ' (insufficient)'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="button"
              disabled={!selectedReward || loading}
              onClick={confirmRedemption}
              className="w-full py-2.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition"
            >
              {loading ? 'Redeeming...' : 'Confirm redemption'}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-4">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-bold text-lg">Redeemed!</p>
            <p className="text-gray-500 text-sm mt-1">
              {selectedReward?.points_required.toLocaleString()} pts deducted for {selectedReward?.name}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 px-6 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
