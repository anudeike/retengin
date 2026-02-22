import { Badge } from '@/components/ui/badge'
import type { Enums } from '@/types/database.types'

type MerchantStatus = Enums<'merchant_status'>

export function MerchantStatusBadge({ status }: { status: MerchantStatus }) {
  if (status === 'active') {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
        {status}
      </Badge>
    )
  }
  if (status === 'pending') {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">
        {status}
      </Badge>
    )
  }
  return <Badge variant="destructive">{status}</Badge>
}
