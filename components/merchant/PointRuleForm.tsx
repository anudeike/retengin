'use client'

import { useState } from 'react'

interface PointRuleFormProps {
  initialValues?: {
    points_per_dollar: number
    min_spend_cents: number
    min_redemption_points: number
    is_active: boolean
  }
  onSave: (values: {
    points_per_dollar: number
    min_spend_cents: number
    min_redemption_points: number
    is_active: boolean
  }) => Promise<void>
}

export function PointRuleForm({ initialValues, onSave }: PointRuleFormProps) {
  const [pointsPerDollar, setPointsPerDollar] = useState(
    String(initialValues?.points_per_dollar ?? 1),
  )
  const [minSpendDollars, setMinSpendDollars] = useState(
    String((initialValues?.min_spend_cents ?? 0) / 100),
  )
  const [minRedemption, setMinRedemption] = useState(
    String(initialValues?.min_redemption_points ?? 100),
  )
  const [isActive, setIsActive] = useState(initialValues?.is_active ?? true)
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
      await onSave({ points_per_dollar: ppd, min_spend_cents: minCents, min_redemption_points: minPts, is_active: isActive })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1">Points per dollar spent</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={pointsPerDollar}
          onChange={(e) => setPointsPerDollar(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
        />
        <p className="text-xs text-gray-400 mt-1">e.g. 1 = 1 point per dollar</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Minimum spend ($) to earn points</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={minSpendDollars}
          onChange={(e) => setMinSpendDollars(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Minimum points required to redeem</label>
        <input
          type="number"
          step="1"
          min="0"
          value={minRedemption}
          onChange={(e) => setMinRedemption(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="is_active"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="is_active" className="text-sm font-medium">Points program is active</label>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {saved && <p className="text-green-600 text-sm">Saved successfully!</p>}

      <button
        type="submit"
        disabled={saving}
        className="px-6 py-2.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition"
      >
        {saving ? 'Saving...' : 'Save rules'}
      </button>
    </form>
  )
}
