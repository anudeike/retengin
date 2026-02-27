'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ReferralCardProps {
  referralCode: string
  merchantSlug: string
  merchantName: string
  appUrl: string
  completedCount: number
  pendingCount: number
}

export function ReferralCard({
  referralCode,
  merchantSlug,
  merchantName,
  appUrl,
  completedCount,
  pendingCount,
}: ReferralCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)

  const referralUrl = `${appUrl}/join/${merchantSlug}?ref=${referralCode}`

  useEffect(() => {
    if (!canvasRef.current) return
    import('qrcode').then((QRCode) => {
      QRCode.toCanvas(canvasRef.current!, referralUrl, { width: 180, margin: 2 })
    })
  }, [referralUrl])

  async function handleCopy() {
    await navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({
        title: `Join me at ${merchantName} on Taplo`,
        text: `Use my referral link to earn bonus points at ${merchantName}!`,
        url: referralUrl,
      })
    } else {
      handleCopy()
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Share &amp; Earn at {merchantName}
        </h2>

        <div className="flex flex-col items-center gap-3 mb-4">
          <Card className="border">
            <CardContent className="p-3">
              <canvas ref={canvasRef} className="rounded" />
            </CardContent>
          </Card>
          <p className="text-xs font-mono text-muted-foreground tracking-widest">{referralCode}</p>
        </div>

        <div className="flex gap-3 mb-4">
          <Button variant="outline" size="sm" onClick={handleCopy} className="flex-1">
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          <Button size="sm" onClick={handleShare} className="flex-1">
            Share
          </Button>
        </div>

        <div className="flex gap-6 text-center border-t pt-4">
          <div className="flex-1">
            <p className="text-xl font-bold">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="flex-1">
            <p className="text-xl font-bold">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
