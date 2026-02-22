import { Progress } from '@/components/ui/progress'
import type { Tables } from '@/types/database.types'

type Reward = Pick<Tables<'rewards'>, 'id' | 'name' | 'points_required'>

interface RewardProgressProps {
  currentBalance: number
  rewards: Reward[]
}

export function RewardProgress({ currentBalance, rewards }: RewardProgressProps) {
  if (rewards.length === 0) {
    return <p className="text-muted-foreground text-sm">No rewards available yet.</p>
  }

  const sorted = [...rewards].sort((a, b) => a.points_required - b.points_required)
  const next = sorted.find((r) => r.points_required > currentBalance)
  const achieved = sorted.filter((r) => r.points_required <= currentBalance)

  return (
    <div className="space-y-4">
      {next && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{next.name}</span>
            <span className="text-muted-foreground">
              {Math.max(0, next.points_required - currentBalance).toLocaleString()} pts to go
            </span>
          </div>
          <Progress value={Math.min(100, (currentBalance / next.points_required) * 100)} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {currentBalance.toLocaleString()} / {next.points_required.toLocaleString()} pts
          </p>
        </div>
      )}
      {achieved.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Unlocked rewards
          </p>
          <ul className="space-y-1">
            {achieved.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <span className="text-green-500">✓</span>
                <span>{r.name}</span>
                <span className="text-muted-foreground text-xs">({r.points_required.toLocaleString()} pts)</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
