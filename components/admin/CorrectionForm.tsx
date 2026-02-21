'use client'

import { useState } from 'react'

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
      <div>
        <label className="block text-sm font-medium mb-1">Merchant</label>
        <select
          value={merchantId}
          onChange={(e) => setMerchantId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
        >
          {merchants.map((m) => (
            <option key={m.id} value={m.id}>{m.business_name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Customer email</label>
        <input
          type="email"
          required
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          placeholder="customer@example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Point delta <span className="text-gray-400 font-normal">(positive = add, negative = deduct)</span>
        </label>
        <input
          type="number"
          required
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          placeholder="e.g. 100 or -50"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Note <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason for correction..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none"
        />
      </div>

      {result && (
        <p className={`text-sm ${result.ok ? 'text-green-600' : 'text-red-600'}`}>
          {result.message}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition"
      >
        {loading ? 'Applying...' : 'Apply correction'}
      </button>
    </form>
  )
}
