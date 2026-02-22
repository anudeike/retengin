# shadcn/ui Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all raw HTML UI primitives across the Taplo codebase with shadcn/ui components and add a persistent top navbar to all authenticated pages.

**Architecture:** Install shadcn/ui with Tailwind v4 support, scaffold all required primitives into `components/ui/`, then migrate every component and page file from custom Tailwind HTML to shadcn primitives. All business logic, data fetching, and routing remain untouched.

**Tech Stack:** Next.js 16 (App Router), shadcn/ui (latest), Tailwind v4, Supabase SSR, TypeScript

---

## Task 1: Install shadcn/ui and add Toaster to root layout

**Files:**
- Run: CLI commands in project root
- Modify: `app/layout.tsx`

**Step 1: Run shadcn init**

```bash
cd "C:\Users\ikech\OneDrive\Documents\CodingProjects\retengin"
npx shadcn@latest init -d
```

The `-d` flag uses defaults (New York style, neutral color, CSS variables). If it prompts interactively, select: **Default** style, **Neutral** base color, **Yes** to CSS variables.

**Step 2: Install all required components in one command**

```bash
npx shadcn@latest add button input textarea select checkbox label card badge table dialog progress skeleton separator sonner --overwrite
```

**Step 3: Verify `lib/utils.ts` was created**

Run: `cat lib/utils.ts` — should contain `cn()` using `clsx` and `tailwind-merge`.

**Step 4: Update `app/layout.tsx` to add the global Toaster**

Replace the entire file with:

```tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Taplo',
  description: 'A universal loyalty network',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

**Step 5: Verify build compiles**

```bash
npm run build
```

Expected: Build succeeds (or only pre-existing errors, none new).

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: install shadcn/ui and add Toaster to root layout"
```

---

## Task 2: Create Navbar component and update authenticated layouts

**Files:**
- Create: `components/ui/Navbar.tsx`
- Modify: `app/(customer)/layout.tsx`
- Modify: `app/(merchant)/layout.tsx`
- Modify: `app/(admin)/layout.tsx`

**Step 1: Create `components/ui/Navbar.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface NavbarProps {
  section: string
  homeHref: string
}

export function Navbar({ section, homeHref }: NavbarProps) {
  const router = useRouter()

  async function signOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href={homeHref} className="font-bold text-lg tracking-tight">
          Taplo
        </Link>
        <span className="text-sm text-muted-foreground">{section}</span>
        <Button variant="ghost" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </div>
      <Separator />
    </header>
  )
}
```

**Step 2: Replace `app/(customer)/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/ui/Navbar'

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?redirectedFrom=/wallet')

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (roleRow?.role && roleRow.role !== 'customer') redirect('/')

  return (
    <>
      <Navbar section="Wallet" homeHref="/wallet" />
      {children}
    </>
  )
}
```

**Step 3: Replace `app/(merchant)/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/ui/Navbar'

export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?redirectedFrom=/dashboard')

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (roleRow?.role !== 'merchant') redirect('/')

  return (
    <>
      <Navbar section="Dashboard" homeHref="/dashboard" />
      {children}
    </>
  )
}
```

**Step 4: Replace `app/(admin)/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/ui/Navbar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?redirectedFrom=/admin')

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (roleRow?.role !== 'admin') redirect('/')

  return (
    <>
      <Navbar section="Admin" homeHref="/admin" />
      {children}
    </>
  )
}
```

**Step 5: Verify build**

```bash
npm run build
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Navbar to all authenticated layouts"
```

---

## Task 3: Migrate shared UI components

**Files:**
- Modify: `components/ui/LoadingSkeleton.tsx`
- Modify: `components/ui/ErrorBoundary.tsx`

**Step 1: Replace `components/ui/LoadingSkeleton.tsx`**

```tsx
import { Skeleton as ShadcnSkeleton } from '@/components/ui/skeleton'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <ShadcnSkeleton className={className} />
}

export function WalletPageSkeleton() {
  return (
    <div className="max-w-lg mx-auto p-6">
      <div className="mb-8">
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-7 w-48" />
      </div>
      <Skeleton className="h-32 rounded-2xl mb-6" />
      <Skeleton className="h-3 w-20 mb-3" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 rounded-lg" />
      ))}
    </div>
  )
}
```

**Step 2: Replace `components/ui/ErrorBoundary.tsx`**

```tsx
'use client'

import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="p-6 text-center text-muted-foreground">
            <p className="text-2xl mb-2">⚠️</p>
            <p className="font-medium">Something went wrong.</p>
            <p className="text-sm mt-1">{this.state.error?.message}</p>
            <Button
              variant="link"
              size="sm"
              className="mt-4"
              onClick={() => this.setState({ hasError: false })}
            >
              Try again
            </Button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
```

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add components/ui/LoadingSkeleton.tsx components/ui/ErrorBoundary.tsx
git commit -m "feat: migrate shared UI components to shadcn"
```

---

## Task 4: Migrate admin components

**Files:**
- Modify: `components/admin/MerchantStatusBadge.tsx`
- Modify: `components/admin/CorrectionForm.tsx`

**Step 1: Replace `components/admin/MerchantStatusBadge.tsx`**

```tsx
import { Badge } from '@/components/ui/badge'
import type { Enums } from '@/types/database.types'

type MerchantStatus = Enums<'merchant_status'>

export function MerchantStatusBadge({ status }: { status: MerchantStatus }) {
  if (status === 'active') {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
        {status}
      </Badge>
    )
  }
  if (status === 'pending') {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">
        {status}
      </Badge>
    )
  }
  return <Badge variant="destructive">{status}</Badge>
}
```

**Step 2: Replace `components/admin/CorrectionForm.tsx`**

```tsx
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
```

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add components/admin/
git commit -m "feat: migrate admin components to shadcn"
```

---

## Task 5: Migrate customer components

**Files:**
- Modify: `components/customer/WalletCard.tsx`
- Modify: `components/customer/PointsHistory.tsx`
- Modify: `components/customer/RewardProgress.tsx`
- Modify: `components/customer/RewardUnlockToast.tsx`

**Step 1: Replace `components/customer/WalletCard.tsx`**

```tsx
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

interface WalletCardProps {
  merchantSlug: string
  merchantName: string
  balance: number
  logoUrl?: string | null
}

export function WalletCard({ merchantSlug, merchantName, balance, logoUrl }: WalletCardProps) {
  return (
    <Link href={`/wallet/${merchantSlug}`}>
      <Card className="hover:border-foreground/30 hover:shadow-sm transition cursor-pointer">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={merchantName} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
                  {merchantName.charAt(0)}
                </div>
              )}
              <span className="font-medium">{merchantName}</span>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">{balance.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">pts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
```

**Step 2: Replace `components/customer/PointsHistory.tsx`**

```tsx
import { Separator } from '@/components/ui/separator'
import type { Tables } from '@/types/database.types'

type PointTransaction = Pick<
  Tables<'point_transactions'>,
  'id' | 'transaction_type' | 'points' | 'balance_after' | 'created_at' | 'note'
>

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  earned: { label: 'Earned', color: 'text-green-600' },
  redeemed: { label: 'Redeemed', color: 'text-orange-600' },
  reversed: { label: 'Reversed', color: 'text-red-500' },
  admin_correction: { label: 'Correction', color: 'text-blue-600' },
}

interface PointsHistoryProps {
  transactions: PointTransaction[]
}

export function PointsHistory({ transactions }: PointsHistoryProps) {
  if (transactions.length === 0) {
    return <p className="text-muted-foreground text-sm py-4 text-center">No transactions yet.</p>
  }

  return (
    <ul>
      {transactions.map((tx, i) => {
        const meta = TYPE_LABELS[tx.transaction_type] ?? { label: tx.transaction_type, color: 'text-foreground' }
        const sign = tx.points > 0 ? '+' : ''
        return (
          <li key={tx.id}>
            {i > 0 && <Separator />}
            <div className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{meta.label}</p>
                {tx.note && <p className="text-xs text-muted-foreground mt-0.5">{tx.note}</p>}
                <p className="text-xs text-muted-foreground">
                  {new Date(tx.created_at).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${meta.color}`}>
                  {sign}{tx.points.toLocaleString()} pts
                </p>
                <p className="text-xs text-muted-foreground">{tx.balance_after.toLocaleString()} bal</p>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
```

**Step 3: Replace `components/customer/RewardProgress.tsx`**

```tsx
import { Progress } from '@/components/ui/progress'
import type { Tables } from '@/types/database.types'

type Reward = Pick<Tables<'rewards'>, 'id' | 'name' | 'points_required'>

interface RewardProgressProps {
  currentBalance: number
  rewards: Reward[]
}

export function RewardProgress({ currentBalance, rewards }: RewardProgressProps) {
  if (rewards.length === 0) {
    return <p className="text-muted-foreground text-sm">No rewards available yet.</p>
  }

  const sorted = [...rewards].sort((a, b) => a.points_required - b.points_required)
  const next = sorted.find((r) => r.points_required > currentBalance)
  const achieved = sorted.filter((r) => r.points_required <= currentBalance)

  return (
    <div className="space-y-4">
      {next && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{next.name}</span>
            <span className="text-muted-foreground">
              {Math.max(0, next.points_required - currentBalance).toLocaleString()} pts to go
            </span>
          </div>
          <Progress value={Math.min(100, (currentBalance / next.points_required) * 100)} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {currentBalance.toLocaleString()} / {next.points_required.toLocaleString()} pts
          </p>
        </div>
      )}
      {achieved.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Unlocked rewards
          </p>
          <ul className="space-y-1">
            {achieved.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <span className="text-green-500">✓</span>
                <span>{r.name}</span>
                <span className="text-muted-foreground text-xs">({r.points_required.toLocaleString()} pts)</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

**Step 4: Replace `components/customer/RewardUnlockToast.tsx`**

The custom fixed-position div is replaced by a `sonner` toast call. The component still lives in the same place — it just calls `toast()` from within its effect instead of rendering markup.

```tsx
'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

interface Reward {
  id: string
  name: string
  points_required: number
}

interface RewardUnlockToastProps {
  previousBalance: number
  currentBalance: number
  rewards: Reward[]
}

export function RewardUnlockToast({ previousBalance, currentBalance, rewards }: RewardUnlockToastProps) {
  useEffect(() => {
    const newlyUnlocked = rewards.find(
      (r) => r.points_required > previousBalance && r.points_required <= currentBalance,
    )
    if (newlyUnlocked) {
      toast('🎁 Reward unlocked!', {
        description: newlyUnlocked.name,
        duration: 5000,
      })
    }
  }, [currentBalance, previousBalance, rewards])

  return null
}
```

**Step 5: Verify build**

```bash
npm run build
```

**Step 6: Commit**

```bash
git add components/customer/
git commit -m "feat: migrate customer components to shadcn"
```

---

## Task 6: Migrate merchant components

**Files:**
- Modify: `components/merchant/CustomerTable.tsx`
- Modify: `components/merchant/PointRuleForm.tsx`
- Modify: `components/merchant/QRCodeDisplay.tsx`
- Modify: `components/merchant/RedemptionModal.tsx`

**Step 1: Replace `components/merchant/CustomerTable.tsx`**

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface CustomerRow {
  customer_id: string
  email: string
  display_name: string | null
  balance: number
}

interface CustomerTableProps {
  customers: CustomerRow[]
}

export function CustomerTable({ customers }: CustomerTableProps) {
  if (customers.length === 0) {
    return <p className="text-muted-foreground text-sm py-6 text-center">No customers yet.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead className="text-right">Points</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((c) => (
          <TableRow key={c.customer_id}>
            <TableCell>
              <p className="font-medium">{c.display_name ?? c.email}</p>
              {c.display_name && <p className="text-xs text-muted-foreground">{c.email}</p>}
            </TableCell>
            <TableCell className="text-right font-bold">{c.balance.toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

**Step 2: Replace `components/merchant/PointRuleForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

interface PointRuleFormProps {
  initialValues?: {
    points_per_dollar: number
    min_spend_cents: number
    min_redemption_points: number
    is_active: boolean
  }
  onSave: (values: {
    points_per_dollar: number
    min_spend_cents: number
    min_redemption_points: number
    is_active: boolean
  }) => Promise<void>
}

export function PointRuleForm({ initialValues, onSave }: PointRuleFormProps) {
  const [pointsPerDollar, setPointsPerDollar] = useState(String(initialValues?.points_per_dollar ?? 1))
  const [minSpendDollars, setMinSpendDollars] = useState(String((initialValues?.min_spend_cents ?? 0) / 100))
  const [minRedemption, setMinRedemption] = useState(String(initialValues?.min_redemption_points ?? 100))
  const [isActive, setIsActive] = useState(initialValues?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaved(false)
    setSaving(true)
    const ppd = parseFloat(pointsPerDollar)
    const minCents = Math.round(parseFloat(minSpendDollars) * 100)
    const minPts = parseInt(minRedemption, 10)
    if (isNaN(ppd) || ppd <= 0) { setError('Points per dollar must be > 0'); setSaving(false); return }
    if (isNaN(minCents) || minCents < 0) { setError('Min spend must be ≥ $0'); setSaving(false); return }
    if (isNaN(minPts) || minPts < 0) { setError('Min redemption must be ≥ 0'); setSaving(false); return }
    try {
      await onSave({ points_per_dollar: ppd, min_spend_cents: minCents, min_redemption_points: minPts, is_active: isActive })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="ppd">Points per dollar spent</Label>
        <Input id="ppd" type="number" step="0.01" min="0.01" value={pointsPerDollar} onChange={(e) => setPointsPerDollar(e.target.value)} />
        <p className="text-xs text-muted-foreground">e.g. 1 = 1 point per dollar</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="min-spend">Minimum spend ($) to earn points</Label>
        <Input id="min-spend" type="number" step="0.01" min="0" value={minSpendDollars} onChange={(e) => setMinSpendDollars(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="min-redemption">Minimum points required to redeem</Label>
        <Input id="min-redemption" type="number" step="1" min="0" value={minRedemption} onChange={(e) => setMinRedemption(e.target.value)} />
      </div>
      <div className="flex items-center gap-3">
        <Checkbox id="is-active" checked={isActive} onCheckedChange={(checked) => setIsActive(checked === true)} />
        <Label htmlFor="is-active">Points program is active</Label>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {saved && <p className="text-green-600 text-sm">Saved successfully!</p>}
      <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save rules'}</Button>
    </form>
  )
}
```

**Step 3: Replace `components/merchant/QRCodeDisplay.tsx`**

```tsx
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
```

**Step 4: Replace `components/merchant/RedemptionModal.tsx`**

```tsx
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Reward {
  id: string
  name: string
  points_required: number
}

interface RedemptionModalProps {
  merchantId: string
  onClose: () => void
}

export function RedemptionModal({ merchantId, onClose }: RedemptionModalProps) {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<'email' | 'confirm' | 'done'>('email')
  const [customerData, setCustomerData] = useState<{ customerId: string; balance: number; rewards: Reward[] } | null>(null)
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function lookupCustomer(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/merchant/lookup-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), merchantId }),
    })
    setLoading(false)
    if (!res.ok) { const body = await res.json(); setError(body.error ?? 'Customer not found'); return }
    setCustomerData(await res.json())
    setStep('confirm')
  }

  async function confirmRedemption() {
    if (!selectedReward || !customerData) return
    setError('')
    setLoading(true)
    const res = await fetch('/api/merchant/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: customerData.customerId, merchantId, rewardId: selectedReward.id, points: selectedReward.points_required }),
    })
    setLoading(false)
    if (!res.ok) { const body = await res.json(); setError(body.error ?? 'Redemption failed'); return }
    setStep('done')
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Redeem Points</DialogTitle>
        </DialogHeader>

        {step === 'email' && (
          <form onSubmit={lookupCustomer} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="redeem-email">Customer email</Label>
              <Input id="redeem-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Looking up...' : 'Look up customer'}
            </Button>
          </form>
        )}

        {step === 'confirm' && customerData && (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{email}</p>
              <p className="text-2xl font-bold mt-1">{customerData.balance.toLocaleString()} pts</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Select reward</p>
              <div className="space-y-2">
                {customerData.rewards.map((r) => {
                  const canRedeem = customerData.balance >= r.points_required
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={!canRedeem}
                      onClick={() => setSelectedReward(r)}
                      className={`w-full text-left px-3 py-2.5 border rounded-lg transition text-sm ${
                        selectedReward?.id === r.id
                          ? 'border-foreground bg-foreground text-background'
                          : canRedeem
                          ? 'border-border hover:border-foreground/50'
                          : 'border-border/50 text-muted-foreground cursor-not-allowed'
                      }`}
                    >
                      <span className="font-medium">{r.name}</span>
                      <span className="text-xs ml-2 opacity-70">
                        {r.points_required.toLocaleString()} pts{!canRedeem && ' (insufficient)'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="button" disabled={!selectedReward || loading} onClick={confirmRedemption} className="w-full">
              {loading ? 'Redeeming...' : 'Confirm redemption'}
            </Button>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-4">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-bold text-lg">Redeemed!</p>
            <p className="text-muted-foreground text-sm mt-1">
              {selectedReward?.points_required.toLocaleString()} pts deducted for {selectedReward?.name}
            </p>
            <Button variant="outline" onClick={onClose} className="mt-4">Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

**Step 5: Verify build**

```bash
npm run build
```

**Step 6: Commit**

```bash
git add components/merchant/
git commit -m "feat: migrate merchant components to shadcn"
```

---

## Task 7: Migrate public pages (login, join, home)

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `app/join/[slug]/page.tsx`
- Modify: `app/page.tsx`

**Step 1: Replace `app/login/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-sm w-full space-y-2">
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-muted-foreground">
            We sent a magic link to <span className="font-medium text-foreground">{email}</span>.
            Click it to sign in.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-sm w-full space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">Sign in to Taplo</h1>
          <p className="text-muted-foreground text-sm">Enter your email and we&apos;ll send you a magic link.</p>
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
            {loading ? 'Sending…' : 'Send magic link'}
          </Button>
        </form>
      </div>
    </main>
  )
}
```

**Step 2: Replace `app/join/[slug]/page.tsx`**

```tsx
'use client'

import React, { useState, useEffect } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface JoinPageProps {
  params: Promise<{ slug: string }>
}

export default function JoinPage({ params }: JoinPageProps) {
  const [slug, setSlug] = useState<string | null>(null)
  const [merchant, setMerchant] = useState<{
    id: string
    business_name: string
    logo_url: string | null
  } | null | undefined>(undefined)
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    params.then(({ slug: s }) => {
      setSlug(s)
      const supabase = createClient()
      supabase
        .from('merchants')
        .select('id, business_name, logo_url')
        .eq('slug', s)
        .eq('status', 'active')
        .maybeSingle()
        .then(({ data }) => setMerchant(data))
    })
  }, [params])

  if (merchant === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </main>
    )
  }

  if (merchant === null) notFound()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${appUrl}/api/auth/callback?role=customer` },
    })
    setLoading(false)
    if (otpError) { setError(otpError.message); return }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-sm space-y-2">
          <div className="text-4xl mb-4">✉️</div>
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-muted-foreground">
            We sent a magic link to <strong>{email}</strong>. Click it to access your Taplo wallet.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          {merchant.logo_url && (
            <Image
              src={merchant.logo_url}
              alt={`${merchant.business_name} logo`}
              width={80}
              height={80}
              className="mx-auto mb-4 rounded-full object-cover"
            />
          )}
          <p className="text-sm text-muted-foreground mb-1">Earn points at</p>
          <h1 className="text-2xl font-bold">{merchant.business_name}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Enter your email to start earning Taplo points on every purchase.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="join-email" className="sr-only">Email address</Label>
            <Input
              id="join-email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Sending...' : 'Get my magic link'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to receive loyalty emails from Taplo.
        </p>
      </div>
    </main>
  )
}
```

**Step 3: Replace `app/page.tsx`**

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-bold mb-4">Taplo</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-md">
        A universal loyalty network — earn points at every small business you love.
      </p>
      <Button asChild size="lg">
        <Link href="/login">Sign in</Link>
      </Button>
    </main>
  )
}
```

**Step 4: Verify build**

```bash
npm run build
```

**Step 5: Commit**

```bash
git add app/login/ app/join/ app/page.tsx
git commit -m "feat: migrate public pages to shadcn"
```

---

## Task 8: Migrate customer pages

**Files:**
- Modify: `app/(customer)/wallet/page.tsx`
- Modify: `app/(customer)/wallet/[merchantSlug]/page.tsx`

**Step 1: Update `app/(customer)/wallet/page.tsx`**

Replace the total points hero card `<div className="bg-black text-white ...">` with a shadcn `Card` and replace the section heading text. All data-fetching logic stays identical.

The key changes from the current file:
1. Add `import { Card, CardContent } from '@/components/ui/card'`
2. Replace the total points block `<div className="bg-black text-white rounded-2xl p-6 mb-6">` with:
   ```tsx
   <Card className="bg-foreground text-background mb-6">
     <CardContent className="p-6">
       <p className="text-sm opacity-70 mb-1">Total Taplo Points</p>
       <p className="text-5xl font-bold">{totalPoints.toLocaleString()}</p>
       <p className="text-xs opacity-50 mt-2">across {(balances ?? []).length} merchants</p>
     </CardContent>
   </Card>
   ```
3. Keep all other markup as-is (layout classes, header, empty state, WalletCard list).

**Step 2: Update `app/(customer)/wallet/[merchantSlug]/page.tsx`**

Key changes:
1. Add `import { Card, CardContent } from '@/components/ui/card'`
2. Replace the two `<section className="bg-white rounded-xl border border-gray-200 p-5 ...">` blocks with shadcn `Card`:
   ```tsx
   <Card className="mb-4">
     <CardContent className="p-5">
       <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Rewards</h2>
       <RewardProgress currentBalance={balance} rewards={rewards ?? []} />
     </CardContent>
   </Card>

   <Card>
     <CardContent className="p-5">
       <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">History</h2>
       <PointsHistory transactions={transactions ?? []} />
     </CardContent>
   </Card>
   ```
3. Replace `<Link href="/wallet" className="text-sm text-gray-500 ...">` with shadcn `Button`:
   ```tsx
   import { Button } from '@/components/ui/button'
   ...
   <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
     <Link href="/wallet">← All merchants</Link>
   </Button>
   ```

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add "app/(customer)/"
git commit -m "feat: migrate customer pages to shadcn"
```

---

## Task 9: Migrate merchant dashboard pages

**Files:**
- Modify: `app/(merchant)/dashboard/page.tsx`
- Modify: `app/(merchant)/dashboard/connect/page.tsx`
- Modify: `app/(merchant)/dashboard/settings/page.tsx`
- Modify: `app/(merchant)/dashboard/rewards/page.tsx`
- Modify: `app/(merchant)/dashboard/rewards/new/page.tsx`
- Modify: `app/(merchant)/dashboard/customers/page.tsx`
- Modify: `app/(merchant)/dashboard/redeem/page.tsx`

For each file, the pattern is:

**Imports to add** to every dashboard page:
```tsx
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
```

**Pattern A — stat card:**
Replace `<div className="bg-white rounded-xl border border-gray-200 p-4">` with:
```tsx
<Card><CardContent className="p-4">...</CardContent></Card>
```

**Pattern B — section card:**
Replace `<section className="bg-white rounded-xl border border-gray-200 p-5 ...">` with:
```tsx
<Card className="mb-6"><CardContent className="p-5">...</CardContent></Card>
```

**Pattern C — nav link grid item:**
Replace `<Link href="..." className="block p-4 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:border-gray-400 transition text-center">` with:
```tsx
<Button variant="outline" asChild className="h-auto py-4 flex flex-col">
  <Link href="...">{label}</Link>
</Button>
```

**Pattern D — back links:**
Replace `<Link href="..." className="text-sm text-gray-500 hover:text-black mb-6 inline-block">← Back</Link>` with:
```tsx
<Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
  <Link href="...">← Back label</Link>
</Button>
```

**Pattern E — primary action buttons:**
Replace `<Link href="..." className="px-4 py-2 bg-black text-white text-sm rounded-lg ...">+ New</Link>` with:
```tsx
<Button asChild size="sm"><Link href="...">+ New reward</Link></Button>
```

**Pattern F — form inputs in pages (rewards/new, merchants/new):**
Replace `<input className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black">` with `<Input>`.
Replace `<label className="block text-sm font-medium mb-1">` with `<Label>`.
Replace `<button type="submit" className="px-6 py-2.5 bg-black ...">` with `<Button type="submit">`.
Wrap each field in `<div className="space-y-1.5">`.

**dashboard/connect/page.tsx — additional changes:**
- Replace inline connection status `<Link className="px-4 py-2 border ...">Reconnect Square</Link>` → `<Button variant="outline" asChild><Link>Reconnect Square</Link></Button>`
- Replace `<Link className="inline-block px-6 py-3 bg-black ...">Connect Square Account</Link>` → `<Button asChild size="lg"><Link href="/api/square/connect">Connect Square Account</Link></Button>`
- Replace the yellow warning box (`bg-yellow-50 border border-yellow-200`) in dashboard/page.tsx with a Card that has yellow styling, or keep as-is (it's a valid use of a custom color alert).

**dashboard/redeem/page.tsx — client page:**
Replace `<button type="button" disabled={!merchantId} onClick={...} className="w-full py-4 bg-black ...">` with:
```tsx
<Button size="lg" className="w-full py-4 text-lg" disabled={!merchantId} onClick={() => setShowModal(true)}>
  Start redemption
</Button>
```

**Step 1: Apply all patterns to each of the 7 merchant dashboard pages**

Read each file, apply the patterns above. The data fetching and server actions do not change.

**Step 2: Verify build after all 7 files are updated**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add "app/(merchant)/"
git commit -m "feat: migrate merchant dashboard pages to shadcn"
```

---

## Task 10: Migrate admin pages

**Files:**
- Modify: `app/(admin)/admin/page.tsx`
- Modify: `app/(admin)/admin/merchants/page.tsx`
- Modify: `app/(admin)/admin/merchants/new/page.tsx`
- Modify: `app/(admin)/admin/merchants/[merchantId]/page.tsx`
- Modify: `app/(admin)/admin/customers/page.tsx`
- Modify: `app/(admin)/admin/customers/[customerId]/page.tsx`
- Modify: `app/(admin)/admin/corrections/page.tsx`

Apply the same patterns from Task 9 to all admin pages:

**admin/page.tsx:**
- Stat cards → `<Card><CardContent className="p-4">...</CardContent></Card>`
- Nav grid links → `<Button variant="outline" asChild className="h-auto py-4">…</Button>`

**admin/merchants/page.tsx:**
- Wrap the `<table>` in a `<Card>` (replace the outer `<div className="bg-white rounded-xl border ...">`)
- Replace the `<table>` and its children with shadcn Table components:
  ```tsx
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
  ```
- "+ Onboard" link → `<Button asChild size="sm"><Link href="/admin/merchants/new">+ Onboard</Link></Button>`
- Back link → `<Button variant="ghost" size="sm" asChild className="-ml-2 mb-6"><Link href="/admin">← Admin</Link></Button>`

**admin/merchants/new/page.tsx:**
- Wrap form in `<Card><CardContent className="p-6">…</CardContent></Card>`
- All `<input>` → `<Input>`, all `<label>` → `<Label>`, `<button type="submit">` → `<Button type="submit">`
- Wrap each field in `<div className="space-y-1.5">`
- Back link → `<Button variant="ghost" size="sm" asChild>`

**admin/merchants/[merchantId]/page.tsx:**
- Section cards → `<Card><CardContent className="p-5">…</CardContent></Card>`
- Status toggle buttons → keep as native `<button>` (they are `type="submit"` inside a form action, shadcn Button works too):
  ```tsx
  <Button
    key={s}
    type="submit"
    name="status"
    value={s}
    variant={merchant.status === s ? 'secondary' : 'outline'}
    disabled={merchant.status === s}
    size="sm"
  >
    Set {s}
  </Button>
  ```

**admin/customers/page.tsx:**
- Search `<input>` → `<Input name="q" defaultValue={q} placeholder="Search by email..." />`
- Wrap `<table>` in `<Card>` and use shadcn Table components

**admin/customers/[customerId]/page.tsx:**
- Section cards → `<Card><CardContent className="p-5">…</CardContent></Card>`
- Back link → `<Button variant="ghost" size="sm" asChild>`

**admin/corrections/page.tsx:**
- Section cards → `<Card><CardContent>…</CardContent></Card>` (CorrectionForm already migrated in Task 4)
- Back link → `<Button variant="ghost" size="sm" asChild>`

**Step 1: Apply patterns to all 7 admin pages**

**Step 2: Verify build**

```bash
npm run build
```

Expected: Clean build with no TypeScript errors.

**Step 3: Commit**

```bash
git add "app/(admin)/"
git commit -m "feat: migrate admin pages to shadcn"
```

---

## Task 11: Final verification

**Step 1: Full build check**

```bash
npm run build
```

Expected: Exit code 0, no TypeScript errors, no missing module errors.

**Step 2: Dev server smoke test**

```bash
npm run dev
```

Manually verify each section:
- [ ] `http://localhost:3000` — home page renders with Sign in button
- [ ] `http://localhost:3000/login` — login form renders with shadcn Input and Button
- [ ] Sign in → `/admin` — Navbar visible at top with "Admin" label and Sign out button
- [ ] `/admin/merchants` — Table renders with shadcn Table component
- [ ] `/dashboard` — Stats cards render as shadcn Cards
- [ ] `/dashboard/redeem` — Redemption modal opens as shadcn Dialog
- [ ] `/wallet` — Wallet cards render as shadcn Cards

**Step 3: Commit (if any final fixes were needed)**

```bash
git add -A
git commit -m "fix: shadcn migration final corrections"
```
