'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function UnsubscribeContent() {
  const params = useSearchParams()
  const success = params.get('success') === '1'
  const scope = params.get('scope')
  const error = params.get('error')

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid link</h1>
          <p className="text-gray-500 text-sm">This unsubscribe link is invalid or has expired.</p>
        </div>
      </main>
    )
  }

  if (success) {
    const message =
      scope === 'merchant'
        ? "You've been unsubscribed from this merchant's emails."
        : "You've been unsubscribed from all Taplo emails."

    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Unsubscribed</h1>
          <p className="text-gray-500 text-sm mb-6">{message}</p>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 underline">
            Back to Taplo
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <p className="text-gray-500 text-sm">Processing your request…</p>
      </div>
    </main>
  )
}
