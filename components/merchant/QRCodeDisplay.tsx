'use client'

import { useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface QRCodeDisplayProps {
  slug: string
  appUrl: string
  size?: number
}

export function QRCodeDisplay({ slug, appUrl, size = 200 }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const joinUrl = `${appUrl}/join/${slug}`

  useEffect(() => {
    if (!canvasRef.current) return
    import('qrcode').then((QRCode) => {
      QRCode.toCanvas(canvasRef.current!, joinUrl, { width: size, margin: 2 })
    })
  }, [joinUrl, size])

  return (
    <div className="flex flex-col items-center gap-3">
      <Card>
        <CardContent className="p-3">
          <canvas ref={canvasRef} className="rounded" />
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground break-all max-w-xs text-center">{joinUrl}</p>
    </div>
  )
}
