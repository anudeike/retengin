import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

interface WalletCardProps {
  merchantSlug: string
  merchantName: string
  balance: number
  logoUrl?: string | null
}

export function WalletCard({ merchantSlug, merchantName, balance, logoUrl }: WalletCardProps) {
  return (
    <Link href={`/wallet/${merchantSlug}`}>
      <Card className="hover:border-foreground/30 hover:shadow-sm transition cursor-pointer">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={merchantName} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
                  {merchantName.charAt(0)}
                </div>
              )}
              <span className="font-medium">{merchantName}</span>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">{balance.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">pts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
