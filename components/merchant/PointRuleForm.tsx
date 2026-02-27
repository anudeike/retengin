'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

interface PointRuleFormProps {
  initialValues?: {
    points_per_dollar: number
    min_spend_cents: number
    min_redemption_points: number
    is_active: boolean
    messaging_style?: 'points_away' | 'spend_more'
  }
  onSave: (values: {
    points_per_dollar: number
    min_spend_cents: number
    min_redemption_points: number
    is_active: boolean
    messaging_style: 'points_away' | 'spend_more'
  }) => Promise<void>
}

export function PointRuleForm({ initialValues, onSave }: PointRuleFormProps) {
  const [pointsPerDollar, setPointsPerDollar] = useState(String(initialValues?.points_per_dollar ?? 1))
  const [minSpendDollars, setMinSpendDollars] = useState(String((initialValues?.min_spend_cents ?? 0) / 100))
  const [minRedemption, setMinRedemption] = useState(String(initialValues?.min_redemption_points ?? 100))
  const [isActive, setIsActive] = useState(initialValues?.is_active ?? true)
  const [messagingStyle, setMessagingStyle] = useState<'points_away' | 'spend_more'>(
    initialValues?.messaging_style ?? 'points_away'
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaved(false)
    setSaving(true)
    const ppd = parseFloat(pointsPerDollar)
    const minCents = Math.round(parseFloat(minSpendDollars) * 100)
    const minPts = parseInt(minRedemption, 10)
    if (isNaN(ppd) || ppd <= 0) { setError('Points per dollar must be > 0'); setSaving(false); return }
    if (isNaN(minCents) || minCents < 0) { setError('Min spend must be ≥ $0'); setSaving(false); return }
    if (isNaN(minPts) || minPts < 0) { setError('Min redemption must be ≥ 0'); setSaving(false); return }
    try {
      await onSave({
        points_per_dollar: ppd,
        min_spend_cents: minCents,
        min_redemption_points: minPts,
        is_active: isActive,
        messaging_style: messagingStyle,
      })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="ppd">Points per dollar spent</Label>
        <Input id="ppd" type="number" step="0.01" min="0.01" value={pointsPerDollar} onChange={(e) => setPointsPerDollar(e.target.value)} />
        <p className="text-xs text-muted-foreground">e.g. 1 = 1 point per dollar</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="min-spend">Minimum spend ($) to earn points</Label>
        <Input id="min-spend" type="number" step="0.01" min="0" value={minSpendDollars} onChange={(e) => setMinSpendDollars(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="min-redemption">Minimum points required to redeem</Label>
        <Input id="min-redemption" type="number" step="1" min="0" value={minRedemption} onChange={(e) => setMinRedemption(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Reward progress messaging</Label>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="messaging_style"
              value="points_away"
              checked={messagingStyle === 'points_away'}
              onChange={() => setMessagingStyle('points_away')}
              className="accent-foreground"
            />
            <span className="text-sm">
              <span className="font-medium">X pts to go</span>
              <span className="text-muted-foreground ml-1">(e.g. "50 pts to go")</span>
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="messaging_style"
              value="spend_more"
              checked={messagingStyle === 'spend_more'}
              onChange={() => setMessagingStyle('spend_more')}
              className="accent-foreground"
            />
            <span className="text-sm">
              <span className="font-medium">Spend $X more</span>
              <span className="text-muted-foreground ml-1">(e.g. "Spend $5.00 more")</span>
            </span>
          </label>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox id="is-active" checked={isActive} onCheckedChange={(checked) => setIsActive(checked === true)} />
        <Label htmlFor="is-active">Points program is active</Label>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {saved && <p className="text-green-600 text-sm">Saved successfully!</p>}
      <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save rules'}</Button>
    </form>
  )
}
