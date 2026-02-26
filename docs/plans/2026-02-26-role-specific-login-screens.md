# Role-Specific Login Screens Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add dedicated `/login/merchant` and `/login/admin` pages by extracting a shared `LoginForm` component, with the admin page gating OTP sends behind a server-side email check.

**Architecture:** A shared `LoginForm` client component accepts an `onSubmit` prop so each page can inject its own sending logic. The merchant and customer pages call `supabase.auth.signInWithOtp` directly from the browser; the admin page passes a `'use server'` action that first checks whether the email belongs to a known admin using the Supabase admin REST API and the `user_roles` table. Non-admin emails receive an explicit error message.

**Tech Stack:** Next.js 15 App Router, `@supabase/ssr`, `@supabase/supabase-js`, Vitest, `@testing-library/react`, `@testing-library/user-event`, shadcn/ui (`Button`, `Input`, `Label`).

---

## Context for the implementer

### Current state

- `/login/page.tsx` — self-contained `'use client'` component, handles form state internally, calls `supabase.auth.signInWithOtp` directly
- `lib/supabase/server.ts` — exports `createServiceRoleClient()` (sync) and `createServerClient()` (async, cookie-aware)
- `middleware.ts` — protects `/wallet`, `/dashboard`, `/admin`; no changes needed
- `app/api/auth/callback/route.ts` — routes users by role after magic-link click; no changes needed
- Tests live in `__tests__/` and follow the pattern seen in `ConnectSquareButton.test.tsx` and `ConnectDonePage.test.tsx`

### Important: the admin REST API

The Supabase JS client has no `getUserByEmail` method. Use a direct `fetch` to the admin REST endpoint:

```
GET ${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=<email>&per_page=1
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
apikey: <SUPABASE_SERVICE_ROLE_KEY>
```

Response shape: `{ users: Array<{ id: string; email: string; ... }> }`. An empty `users` array means the email is not registered.

### Important: server action as a prop

The admin login page is a **server component** (no `'use client'`). It imports `sendAdminMagicLink` from `./actions` (a `'use server'` file) and passes it as the `onSubmit` prop to `LoginForm` (a client component). This is a valid Next.js 15 pattern — server actions can be passed as props to client components.

---

## Task 1: `LoginForm` shared component (TDD)

**Files:**
- Create: `__tests__/components/auth/LoginForm.test.tsx`
- Create: `components/auth/LoginForm.tsx`

---

### Step 1: Create the test file

Create `__tests__/components/auth/LoginForm.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/auth/LoginForm'

describe('LoginForm', () => {
  it('renders the given title and description', () => {
    render(
      <LoginForm title="Merchant Sign In" description="Enter your email." onSubmit={vi.fn()} />,
    )
    expect(screen.getByRole('heading', { name: 'Merchant Sign In' })).toBeInTheDocument()
    expect(screen.getByText('Enter your email.')).toBeInTheDocument()
  })

  it('calls onSubmit with the lowercased, trimmed email', async () => {
    const onSubmit = vi.fn().mockResolvedValue({})
    const user = userEvent.setup()
    render(<LoginForm title="T" description="D" onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('Email'), '  Hello@Example.COM')
    await user.click(screen.getByRole('button', { name: /send magic link/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('hello@example.com'))
  })

  it('shows "Sending…" and disables the button while submitting', async () => {
    let resolveOtp!: (v: { error?: string }) => void
    const onSubmit = vi.fn().mockReturnValue(
      new Promise<{ error?: string }>((r) => { resolveOtp = r }),
    )
    const user = userEvent.setup()
    render(<LoginForm title="T" description="D" onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send magic link/i }))
    expect(await screen.findByRole('button', { name: /sending/i })).toBeDisabled()
    resolveOtp({})
  })

  it('shows the "Check your email" screen after a successful submission', async () => {
    const onSubmit = vi.fn().mockResolvedValue({})
    const user = userEvent.setup()
    render(<LoginForm title="T" description="D" onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send magic link/i }))
    expect(await screen.findByRole('heading', { name: /check your email/i })).toBeInTheDocument()
    expect(screen.getByText(/user@example\.com/)).toBeInTheDocument()
  })

  it('shows the error message when onSubmit returns an error', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      error: "This email isn't registered as an admin account.",
    })
    const user = userEvent.setup()
    render(<LoginForm title="T" description="D" onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('Email'), 'bad@example.com')
    await user.click(screen.getByRole('button', { name: /send magic link/i }))
    expect(
      await screen.findByText(/This email isn't registered as an admin account\./),
    ).toBeInTheDocument()
    // Form is still visible — not replaced by "check your email"
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('re-enables the button after an error', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: 'Something went wrong' })
    const user = userEvent.setup()
    render(<LoginForm title="T" description="D" onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send magic link/i }))
    expect(await screen.findByRole('button', { name: /send magic link/i })).not.toBeDisabled()
  })
})
```

---

### Step 2: Run the tests — verify they fail

```bash
npx vitest run __tests__/components/auth/LoginForm.test.tsx
```

Expected: all 6 tests fail with "Cannot find module '@/components/auth/LoginForm'".

---

### Step 3: Create `components/auth/LoginForm.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LoginFormProps {
  title: string
  description: string
  onSubmit: (email: string) => Promise<{ error?: string }>
}

export function LoginForm({ title, description, onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await onSubmit(email.toLowerCase().trim())
    setLoading(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    setSubmitted(true)
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
            {loading ? 'Sending…' : 'Send magic link'}
          </Button>
        </form>
      </div>
    </main>
  )
}
```

---

### Step 4: Run the tests — verify they pass

```bash
npx vitest run __tests__/components/auth/LoginForm.test.tsx
```

Expected: 6/6 tests pass.

---

### Step 5: Commit

```bash
git add components/auth/LoginForm.tsx __tests__/components/auth/LoginForm.test.tsx
git commit -m "feat: add shared LoginForm component"
```

---

## Task 2: `sendAdminMagicLink` server action (TDD)

**Files:**
- Create: `__tests__/app/login/admin/actions.test.ts`
- Create: `app/login/admin/actions.ts`

---

### Step 1: Create the test file

Create `__tests__/app/login/admin/actions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Build a chainable Supabase query mock that handles:
// .from().select().eq().eq().maybeSingle()
function makeQueryChain(resolvedValue: { data: unknown; error: null }) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(resolvedValue),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  return chain
}

const mockSignInWithOtp = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({ from: mockFrom }),
  createServerClient: async () => ({ auth: { signInWithOtp: mockSignInWithOtp } }),
}))

// sendAdminMagicLink is imported after mocks are set up
const { sendAdminMagicLink } = await import('@/app/login/admin/actions')

beforeEach(() => {
  vi.clearAllMocks()
  mockSignInWithOtp.mockResolvedValue({ error: null })
})

describe('sendAdminMagicLink', () => {
  it('returns error when the Supabase admin API call fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false })

    const result = await sendAdminMagicLink('any@example.com')

    expect(result).toEqual({ error: 'Unable to verify admin status. Please try again.' })
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
  })

  it('returns error when email is not in auth.users', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ users: [] }),
    })

    const result = await sendAdminMagicLink('nobody@example.com')

    expect(result).toEqual({ error: "This email isn't registered as an admin account." })
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
  })

  it('returns error when the user exists but is not assigned the admin role', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ users: [{ id: 'user-123' }] }),
    })
    mockFrom.mockReturnValue(makeQueryChain({ data: null, error: null }))

    const result = await sendAdminMagicLink('notadmin@example.com')

    expect(result).toEqual({ error: "This email isn't registered as an admin account." })
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
  })

  it('sends OTP and returns success for a known admin email', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ users: [{ id: 'admin-456' }] }),
    })
    mockFrom.mockReturnValue(makeQueryChain({ data: { role: 'admin' }, error: null }))

    const result = await sendAdminMagicLink('admin@example.com')

    expect(result).toEqual({})
    expect(mockSignInWithOtp).toHaveBeenCalledWith({ email: 'admin@example.com' })
  })

  it('returns error when the OTP send fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ users: [{ id: 'admin-456' }] }),
    })
    mockFrom.mockReturnValue(makeQueryChain({ data: { role: 'admin' }, error: null }))
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'Rate limited' } })

    const result = await sendAdminMagicLink('admin@example.com')

    expect(result).toEqual({ error: 'Rate limited' })
  })
})
```

---

### Step 2: Run the tests — verify they fail

```bash
npx vitest run "__tests__/app/login/admin/actions.test.ts"
```

Expected: all 5 tests fail with "Cannot find module '@/app/login/admin/actions'".

---

### Step 3: Create `app/login/admin/actions.ts`

```typescript
'use server'

import { createServiceRoleClient, createServerClient } from '@/lib/supabase/server'

export async function sendAdminMagicLink(email: string): Promise<{ error?: string }> {
  const adminSupabase = createServiceRoleClient()

  // Step 1: Look up the user by email via the Supabase admin REST API.
  // The JS client has no getUserByEmail method, so we use fetch directly.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const usersResponse = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}&per_page=1`,
    {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    },
  )

  if (!usersResponse.ok) {
    return { error: 'Unable to verify admin status. Please try again.' }
  }

  const body = (await usersResponse.json()) as { users?: Array<{ id: string }> }
  const user = body.users?.[0]

  if (!user) {
    return { error: "This email isn't registered as an admin account." }
  }

  // Step 2: Confirm the user has the admin role in our user_roles table.
  const { data: roleRecord } = await adminSupabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle()

  if (!roleRecord) {
    return { error: "This email isn't registered as an admin account." }
  }

  // Step 3: All checks passed — send the magic link.
  const supabase = await createServerClient()
  const { error: otpError } = await supabase.auth.signInWithOtp({ email })

  if (otpError) {
    return { error: otpError.message }
  }

  return {}
}
```

---

### Step 4: Run the tests — verify they pass

```bash
npx vitest run "__tests__/app/login/admin/actions.test.ts"
```

Expected: 5/5 tests pass.

---

### Step 5: Commit

```bash
git add app/login/admin/actions.ts "__tests__/app/login/admin/actions.test.ts"
git commit -m "feat: add sendAdminMagicLink server action with admin email gating"
```

---

## Task 3: Refactor `/login/page.tsx` to use `LoginForm`

**Files:**
- Modify: `app/login/page.tsx`

No new tests needed — `LoginForm` tests already cover all form behaviour. This task is purely mechanical.

---

### Step 1: Replace the contents of `app/login/page.tsx`

Current file is ~74 lines of form state + JSX. Replace it entirely:

```typescript
'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  async function handleSubmit(email: string) {
    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    })
    if (error) return { error: error.message }
    return {}
  }

  return (
    <LoginForm
      title="Sign in to Taplo"
      description="Enter your email and we'll send you a magic link."
      onSubmit={handleSubmit}
    />
  )
}
```

---

### Step 2: Run the full test suite — verify nothing broke

```bash
npx vitest run
```

Expected: all existing tests still pass (the refactor changes no observable behaviour).

---

### Step 3: Commit

```bash
git add app/login/page.tsx
git commit -m "refactor: simplify /login page to use shared LoginForm component"
```

---

## Task 4: Create `/login/admin/page.tsx`

**Files:**
- Create: `app/login/admin/page.tsx`

This page is a **server component** (no `'use client'`). It passes the `sendAdminMagicLink` server action as the `onSubmit` prop — Next.js 15 supports server actions as props to client components.

---

### Step 1: Create `app/login/admin/page.tsx`

```typescript
import { LoginForm } from '@/components/auth/LoginForm'
import { sendAdminMagicLink } from './actions'

export default function AdminLoginPage() {
  return (
    <LoginForm
      title="Admin Sign In"
      description="Enter your admin email address to receive a sign-in link."
      onSubmit={sendAdminMagicLink}
    />
  )
}
```

---

### Step 2: Run the full test suite

```bash
npx vitest run
```

Expected: all tests pass.

---

### Step 3: Commit

```bash
git add app/login/admin/page.tsx
git commit -m "feat: add /login/admin page"
```

---

## Task 5: Create `/login/merchant/page.tsx`

**Files:**
- Create: `app/login/merchant/page.tsx`

This page is a **client component** because `handleSubmit` uses `window.location.origin` (a browser API). The OTP send is not gated — any email can request a magic link; the callback's role logic handles routing.

---

### Step 1: Create `app/login/merchant/page.tsx`

```typescript
'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'
import { LoginForm } from '@/components/auth/LoginForm'

export default function MerchantLoginPage() {
  async function handleSubmit(email: string) {
    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    })
    if (error) return { error: error.message }
    return {}
  }

  return (
    <LoginForm
      title="Merchant Sign In"
      description="Enter your email to sign in to your merchant dashboard."
      onSubmit={handleSubmit}
    />
  )
}
```

---

### Step 2: Run the full test suite — final verification

```bash
npx vitest run
```

Expected: all tests pass. Note the exact count — it should be at least 6 more than before this feature branch (6 `LoginForm` tests + 5 server action tests = 11 new tests).

---

### Step 3: Commit

```bash
git add app/login/merchant/page.tsx
git commit -m "feat: add /login/merchant page"
```

---

## Manual smoke test (after all tasks complete)

1. Run `npm run dev`
2. Go to `http://localhost:3000/login` — should look identical to before
3. Go to `http://localhost:3000/login/merchant` — should show "Merchant Sign In" heading
4. Go to `http://localhost:3000/login/admin` — should show "Admin Sign In" heading
5. On `/login/admin`, enter a non-admin email → should see "This email isn't registered as an admin account." error, no email sent
6. On `/login/admin`, enter your admin email → should see "Check your email" and receive a magic link
7. Click the admin magic link → should land on `/admin`
8. On `/login/merchant`, enter a merchant email → should see "Check your email" and receive a magic link
9. Click the merchant magic link → should land on `/dashboard`
