import { Skeleton as ShadcnSkeleton } from '@/components/ui/skeleton'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <ShadcnSkeleton className={className} />
}

export function WalletPageSkeleton() {
  return (
    <div className="max-w-lg mx-auto p-6">
      <div className="mb-8">
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-7 w-48" />
      </div>
      <Skeleton className="h-32 rounded-2xl mb-6" />
      <Skeleton className="h-3 w-20 mb-3" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 rounded-lg" />
      ))}
    </div>
  )
}
