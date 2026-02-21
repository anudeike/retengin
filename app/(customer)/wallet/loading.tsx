import { WalletPageSkeleton } from '@/components/ui/LoadingSkeleton'

export default function WalletLoading() {
  return (
    <main className="min-h-screen bg-gray-50">
      <WalletPageSkeleton />
    </main>
  )
}
