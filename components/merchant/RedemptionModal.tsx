'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Reward {
  id: string
  name: string
  points_required: number
}

interface ReferralGrant {
  id: string
  reward_type: string
  reward_title: string
  reward_value: number | null
  granted_at: string
  role: string
}

interface CustomerData {
  customerId: string
  balance: number
  rewards: Reward[]
  referralGrants: ReferralGrant[]
}

interface RedemptionModalProps {
  merchantId: string
  onClose: () => void
}

export function RedemptionModal({ merchantId, onClose }: RedemptionModalProps) {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<'email' | 'confirm' | 'done'>('email')
  const [customerData, setCustomerData] = useState<CustomerData | null>(null)
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
  const [selectedGrant, setSelectedGrant] = useState<ReferralGrant | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function lookupCustomer(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
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
    setCustomerData({ ...data, referralGrants: data.referralGrants ?? [] })
    setStep('confirm')
  }

  async function confirmRedemption() {
    if (!customerData) return
    setError('')
    setLoading(true)

    if (selectedGrant) {
      const res = await fetch('/api/merchant/redeem-referral-grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantId: selectedGrant.id, merchantId }),
      })
      setLoading(false)
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'Redemption failed')
        return
      }
    } else {
      if (!selectedReward) return
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
    }

    setStep('done')
  }

  function selectReward(r: Reward) {
    setSelectedReward(r)
    setSelectedGrant(null)
  }

  function selectGrant(g: ReferralGrant) {
    setSelectedGrant(g)
    setSelectedReward(null)
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Redeem Points</DialogTitle>
        </DialogHeader>

        {step === 'email' && (
          <form onSubmit={lookupCustomer} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="redeem-email">Customer email</Label>
              <Input
                id="redeem-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Looking up...' : 'Look up customer'}
            </Button>
          </form>
        )}

        {step === 'confirm' && customerData && (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{email}</p>
              <p className="text-2xl font-bold mt-1">{customerData.balance.toLocaleString()} pts</p>
            </div>

            {/* Regular rewards */}
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
                      onClick={() => selectReward(r)}
                      className={`w-full text-left px-3 py-2.5 border rounded-lg transition text-sm ${
                        selectedReward?.id === r.id
                          ? 'border-foreground bg-foreground text-background'
                          : canRedeem
                            ? 'border-border hover:border-foreground/50'
                            : 'border-border/50 text-muted-foreground cursor-not-allowed'
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

            {/* Referral reward grants */}
            {customerData.referralGrants.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Referral Rewards</p>
                <div className="space-y-2">
                  {customerData.referralGrants.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => selectGrant(g)}
                      className={`w-full text-left px-3 py-2.5 border rounded-lg transition text-sm ${
                        selectedGrant?.id === g.id
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border hover:border-foreground/50'
                      }`}
                    >
                      <span className="font-medium">{g.reward_title}</span>
                      <span className="text-xs ml-2 opacity-70 capitalize">
                        ({g.role} reward)
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button
              type="button"
              disabled={(!selectedReward && !selectedGrant) || loading}
              onClick={confirmRedemption}
              className="w-full"
            >
              {loading ? 'Redeeming...' : 'Confirm redemption'}
            </Button>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-4">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-bold text-lg">Redeemed!</p>
            {selectedGrant ? (
              <p className="text-muted-foreground text-sm mt-1">
                {selectedGrant.reward_title} applied
              </p>
            ) : (
              <p className="text-muted-foreground text-sm mt-1">
                {selectedReward?.points_required.toLocaleString()} pts deducted for{' '}
                {selectedReward?.name}
              </p>
            )}
            <Button variant="outline" onClick={onClose} className="mt-4">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
