import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'

interface ClosestRewardItem {
  rewardId: string
  rewardName: string
  pointsRequired: number
  currentBalance: number
  merchantName: string
  merchantSlug: string
}

interface ClosestRewardsProps {
  items: ClosestRewardItem[]
}

export function ClosestRewards({ items }: ClosestRewardsProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Start earning points at a merchant to see your progress here.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const remaining = item.pointsRequired - item.currentBalance
        const pct = Math.min(100, (item.currentBalance / item.pointsRequired) * 100)
        return (
          <Link key={item.rewardId} href={`/wallet/${item.merchantSlug}`} className="block">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{item.rewardName}</p>
                    <p className="text-xs text-muted-foreground">{item.merchantName}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {remaining.toLocaleString()} pts to go
                  </span>
                </div>
                <Progress value={pct} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  {item.currentBalance.toLocaleString()} / {item.pointsRequired.toLocaleString()} pts
                </p>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
