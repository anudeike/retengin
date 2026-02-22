'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Merchant {
  id: string
  business_name: string
}

interface CorrectionFormProps {
  merchants: Merchant[]
  onSubmit: (data: {
    merchantId: string
    customerEmail: string
    delta: number
    note: string
  }) => Promise<{ error?: string }>
}

export function CorrectionForm({ merchants, onSubmit }: CorrectionFormProps) {
  const [merchantId, setMerchantId] = useState(merchants[0]?.id ?? '')
  const [customerEmail, setCustomerEmail] = useState('')
  const [delta, setDelta] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)
    const d = parseInt(delta, 10)
    if (isNaN(d) || d === 0) { setResult({ ok: false, message: 'Delta cannot be zero' }); return }
    if (!note.trim()) { setResult({ ok: false, message: 'Note is required' }); return }
    setLoading(true)
    const res = await onSubmit({ merchantId, customerEmail, delta: d, note })
    setLoading(false)
    if (res.error) {
      setResult({ ok: false, message: res.error })
    } else {
      setResult({ ok: true, message: 'Correction applied successfully.' })
      setCustomerEmail('')
      setDelta('')
      setNote('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label>Merchant</Label>
        <Select value={merchantId} onValueChange={setMerchantId}>
          <SelectTrigger>
            <SelectValue placeholder="Select merchant" />
          </SelectTrigger>
          <SelectContent>
            {merchants.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.business_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="correction-email">Customer email</Label>
        <Input
          id="correction-email"
          type="email"
          required
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          placeholder="customer@example.com"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="correction-delta">
          Point delta{' '}
          <span className="text-muted-foreground font-normal">(positive = add, negative = deduct)</span>
        </Label>
        <Input
          id="correction-delta"
          type="number"
          required
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          placeholder="e.g. 100 or -50"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="correction-note">
          Note <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="correction-note"
          required
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason for correction..."
          rows={3}
          className="resize-none"
        />
      </div>

      {result && (
        <p className={`text-sm ${result.ok ? 'text-green-600' : 'text-destructive'}`}>
          {result.message}
        </p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? 'Applying...' : 'Apply correction'}
      </Button>
    </form>
  )
}
