import { TableSkeleton } from '@/components/ui/LoadingSkeleton'

export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-pulse h-7 w-48 bg-gray-200 rounded mb-8" />
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="h-20 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-20 bg-gray-200 rounded-xl animate-pulse" />
        </div>
        <TableSkeleton rows={4} />
      </div>
    </main>
  )
}
