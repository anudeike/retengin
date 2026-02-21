'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface RealtimeWalletProps {
  customerId: string
  onPointsUpdate: () => void
}

/**
 * Subscribes to new point_transactions for this customer and calls
 * onPointsUpdate when a new row is inserted, triggering a page refresh.
 */
export function RealtimeWallet({ customerId, onPointsUpdate }: RealtimeWalletProps) {
  const cbRef = useRef(onPointsUpdate)
  cbRef.current = onPointsUpdate

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`wallet:${customerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'point_transactions',
          filter: `customer_id=eq.${customerId}`,
        },
        () => {
          cbRef.current()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [customerId])

  return null
}
