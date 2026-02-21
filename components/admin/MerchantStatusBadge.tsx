import type { Enums } from '@/types/database.types'

type MerchantStatus = Enums<'merchant_status'>

const STATUS_STYLES: Record<MerchantStatus, string> = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  suspended: 'bg-red-100 text-red-800',
}

export function MerchantStatusBadge({ status }: { status: MerchantStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  )
}
