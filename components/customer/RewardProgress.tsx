import { Progress } from '@/components/ui/progress'
import type { Tables } from '@/types/database.types'

type Reward = Pick<Tables<'rewards'>, 'id' | 'name' | 'points_required'>

interface RewardProgressProps {
  currentBalance: number
  rewards: Reward[]
  /** Count of approved redemptions per reward_id */
  redemptions?: Record<string, number>
  /** From merchant_point_rules.messaging_style */
  messagingStyle?: 'points_away' | 'spend_more'
  /** From merchant_point_rules.points_per_dollar — needed for spend_more copy */
  pointsPerDollar?: number
}

type RewardState = 'locked' | 'unlocked' | 'redeemed'

function getRewardState(
  reward: Reward,
  balance: number,
  redemptions: Record<string, number>,
): RewardState {
  if ((redemptions[reward.id] ?? 0) > 0) return 'redeemed'
  if (balance >= reward.points_required) return 'unlocked'
  return 'locked'
}

function progressCopy(
  reward: Reward,
  balance: number,
  messagingStyle: 'points_away' | 'spend_more',
  pointsPerDollar: number,
): string {
  const remaining = reward.points_required - balance
  if (messagingStyle === 'spend_more' && pointsPerDollar > 0) {
    const dollars = Math.ceil((remaining / pointsPerDollar) * 100) / 100
    return `Spend $${dollars.toFixed(2)} more`
  }
  return `${remaining.toLocaleString()} pts to go`
}

export function RewardProgress({
  currentBalance,
  rewards,
  redemptions = {},
  messagingStyle = 'points_away',
  pointsPerDollar = 1,
}: RewardProgressProps) {
  if (rewards.length === 0) {
    return <p className="text-muted-foreground text-sm">No rewards available yet.</p>
  }

  const sorted = [...rewards].sort((a, b) => a.points_required - b.points_required)

  return (
    <div className="space-y-4">
      {sorted.map((reward) => {
        const state = getRewardState(reward, currentBalance, redemptions)
        const redemptionCount = redemptions[reward.id] ?? 0

        if (state === 'redeemed') {
          return (
            <div key={reward.id} className="flex items-center justify-between text-sm opacity-60">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground line-through">{reward.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({reward.points_required.toLocaleString()} pts)
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                Redeemed{redemptionCount > 1 ? ` ×${redemptionCount}` : ''}
              </span>
            </div>
          )
        }

        if (state === 'unlocked') {
          return (
            <div key={reward.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span className="font-medium text-green-700">{reward.name}</span>
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                Unlocked
              </span>
            </div>
          )
        }

        // locked
        const pct = Math.min(100, (currentBalance / reward.points_required) * 100)
        return (
          <div key={reward.id} className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{reward.name}</span>
              <span className="text-muted-foreground text-xs">
                {progressCopy(reward, currentBalance, messagingStyle, pointsPerDollar)}
              </span>
            </div>
            <Progress value={pct} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {currentBalance.toLocaleString()} / {reward.points_required.toLocaleString()} pts
            </p>
          </div>
        )
      })}
    </div>
  )
}
