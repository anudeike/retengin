import { Suspense } from 'react'
import UnsubscribeContent from './UnsubscribeContent'

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  )
}
