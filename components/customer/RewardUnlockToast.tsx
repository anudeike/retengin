'use client'

import { useEffect, useState } from 'react'

interface Reward {
  id: string
  name: string
  points_required: number
}

interface RewardUnlockToastProps {
  previousBalance: number
  currentBalance: number
  rewards: Reward[]
}

/**
 * Displays a toast notification when the user's balance crosses a reward threshold.
 */
export function RewardUnlockToast({
  previousBalance,
  currentBalance,
  rewards,
}: RewardUnlockToastProps) {
  const [visible, setVisible] = useState(false)
  const [unlockedReward, setUnlockedReward] = useState<Reward | null>(null)

  useEffect(() => {
    const newlyUnlocked = rewards.find(
      (r) => r.points_required > previousBalance && r.points_required <= currentBalance,
    )
    if (newlyUnlocked) {
      setUnlockedReward(newlyUnlocked)
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [currentBalance, previousBalance, rewards])

  if (!visible || !unlockedReward) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-black text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 max-w-xs">
        <span className="text-2xl">🎁</span>
        <div>
          <p className="font-bold text-sm">Reward unlocked!</p>
          <p className="text-xs opacity-80">{unlockedReward.name}</p>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="ml-2 opacity-60 hover:opacity-100"
        >
          ×
        </button>
      </div>
    </div>
  )
}
