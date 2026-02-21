'use client'

import { useEffect, useRef } from 'react'

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
      <canvas ref={canvasRef} className="rounded-lg border border-gray-200" />
      <p className="text-xs text-gray-500 break-all max-w-xs text-center">{joinUrl}</p>
    </div>
  )
}
