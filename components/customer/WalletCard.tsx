import Link from 'next/link'

interface WalletCardProps {
  merchantSlug: string
  merchantName: string
  balance: number
  logoUrl?: string | null
}

export function WalletCard({ merchantSlug, merchantName, balance, logoUrl }: WalletCardProps) {
  return (
    <Link
      href={`/wallet/${merchantSlug}`}
      className="block p-5 bg-white border border-gray-200 rounded-xl hover:border-gray-400 hover:shadow-sm transition group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={merchantName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-400">
              {merchantName.charAt(0)}
            </div>
          )}
          <span className="font-medium text-gray-900">{merchantName}</span>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">{balance.toLocaleString()}</p>
          <p className="text-xs text-gray-500">pts</p>
        </div>
      </div>
    </Link>
  )
}
