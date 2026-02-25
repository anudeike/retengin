'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  isConnected: boolean
}

export function ConnectSquareButton({ isConnected }: Props) {
  const router = useRouter()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'square_connected') {
        setConnected(true)
        router.refresh()
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [router])

  function handleClick() {
    // NOTE: Do not add 'noopener' here. The done page (/dashboard/connect/done)
    // relies on window.opener to postMessage back to this tab. Adding 'noopener'
    // would set window.opener to null there, breaking the auto-close flow and
    // falling back to a full-page redirect instead.
    window.open('/api/square/connect', '_blank')
  }

  if (connected) {
    return (
      <p className="text-sm text-green-700">
        Successfully connected to Square! This page will refresh momentarily.
      </p>
    )
  }

  return (
    <Button
      onClick={handleClick}
      variant={isConnected ? 'outline' : 'default'}
      size={isConnected ? 'default' : 'lg'}
    >
      {isConnected ? 'Reconnect Square' : 'Connect Square Account'}
    </Button>
  )
}
