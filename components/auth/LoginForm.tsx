'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LoginFormProps {
  title: string
  description: string
  onSubmit: (email: string) => Promise<{ error?: string }>
  footer?: React.ReactNode
}

export function LoginForm({ title, description, onSubmit, footer }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await onSubmit(email.toLowerCase().trim())
      if (result?.error) {
        setError(result.error)
        return
      }
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-sm w-full space-y-2">
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-muted-foreground">
            We sent a magic link to{' '}
            <span className="font-medium text-foreground">{email}</span>. Click it to sign in.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-sm w-full space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Sending\u2026' : 'Send magic link'}
          </Button>
        </form>
        {footer && <div className="text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </main>
  )
}
