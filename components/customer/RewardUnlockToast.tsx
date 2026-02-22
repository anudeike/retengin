'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

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

export function RewardUnlockToast({ previousBalance, currentBalance, rewards }: RewardUnlockToastProps) {
  useEffect(() => {
    const newlyUnlocked = rewards.find(
      (r) => r.points_required > previousBalance && r.points_required <= currentBalance,
    )
    if (newlyUnlocked) {
      toast('🎁 Reward unlocked!', {
        description: newlyUnlocked.name,
        duration: 5000,
      })
    }
  }, [currentBalance, previousBalance, rewards])

  return null
}
