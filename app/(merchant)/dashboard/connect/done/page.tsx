'use client'

import { useEffect } from 'react'

export default function ConnectDonePage() {
  useEffect(() => {
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage({ type: 'square_connected' }, window.location.origin)
        window.close()
      } catch {
        // Opener became cross-origin or inaccessible — fall back to navigating in this tab
        window.location.replace('/dashboard/connect?success=true')
      }
    } else {
      window.location.replace('/dashboard/connect?success=true')
    }
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Connecting your Square account…</p>
    </main>
  )
}
