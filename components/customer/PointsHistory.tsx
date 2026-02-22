import { Separator } from '@/components/ui/separator'
import type { Tables } from '@/types/database.types'

type PointTransaction = Pick<
  Tables<'point_transactions'>,
  'id' | 'transaction_type' | 'points' | 'balance_after' | 'created_at' | 'note'
>

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  earned: { label: 'Earned', color: 'text-green-600' },
  redeemed: { label: 'Redeemed', color: 'text-orange-600' },
  reversed: { label: 'Reversed', color: 'text-red-500' },
  admin_correction: { label: 'Correction', color: 'text-blue-600' },
}

interface PointsHistoryProps {
  transactions: PointTransaction[]
}

export function PointsHistory({ transactions }: PointsHistoryProps) {
  if (transactions.length === 0) {
    return <p className="text-muted-foreground text-sm py-4 text-center">No transactions yet.</p>
  }

  return (
    <ul>
      {transactions.map((tx, i) => {
        const meta = TYPE_LABELS[tx.transaction_type] ?? { label: tx.transaction_type, color: 'text-foreground' }
        const sign = tx.points > 0 ? '+' : ''
        return (
          <li key={tx.id}>
            {i > 0 && <Separator />}
            <div className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{meta.label}</p>
                {tx.note && <p className="text-xs text-muted-foreground mt-0.5">{tx.note}</p>}
                <p className="text-xs text-muted-foreground">
                  {new Date(tx.created_at).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${meta.color}`}>
                  {sign}{tx.points.toLocaleString()} pts
                </p>
                <p className="text-xs text-muted-foreground">{tx.balance_after.toLocaleString()} bal</p>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
