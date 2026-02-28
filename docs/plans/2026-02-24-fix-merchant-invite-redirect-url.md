# Fix Merchant Invite Redirect URL Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the hardcoded `NEXT_PUBLIC_APP_URL` env var used in all merchant invite server actions with a dynamic origin derived from the current request headers, so invite links always redirect back to whichever server is running the admin panel.

**Architecture:** Three server actions all construct a `redirectTo` URL using `process.env.NEXT_PUBLIC_APP_URL`. We replace that with `headers()` from `next/headers` to read the live `host` and `x-forwarded-proto` headers — the same technique Next.js uses internally for absolute URL construction. No new abstractions needed; it's a 3-line change repeated in three places.

**Tech Stack:** Next.js 16 App Router, `next/headers`, Supabase admin `inviteUserByEmail`

---

## Background

`NEXT_PUBLIC_APP_URL=https://taplo.app` is set in `.env.local`. Every invite currently embeds that URL as the `redirectTo` for Supabase's invite flow. When running locally at `http://localhost:3000`, merchants are redirected to `taplo.app` (wrong server) after clicking the invite link — or Supabase falls back to its Site URL if `taplo.app/api/auth/callback` isn't in the redirect allowlist. Either way the merchant lands at the homepage, not signed in.

**The Supabase Dashboard fix** (adding `http://localhost:3000/api/auth/callback` to the Redirect URLs allowlist) has already been done for local dev.

---

## Files to Modify

All three contain the same `NEXT_PUBLIC_APP_URL` pattern and need the same fix:

1. `app/(admin)/admin/merchants/new/page.tsx` — `createMerchant` server action (line 36)
2. `app/(admin)/admin/merchants/[merchantId]/page.tsx` — `resendInvite` server action (line 64)
3. `app/(admin)/admin/merchants/page.tsx` — `resendInvite` server action (line 44)

---

### Task 1: Fix `createMerchant` in `new/page.tsx`

**Files:**
- Modify: `app/(admin)/admin/merchants/new/page.tsx`

**Step 1: Add `headers` import at the top of the file**

The file currently imports from `next/navigation`, `next/link`, etc. Add `headers` from `next/headers`.

Replace the existing import block top section:
```typescript
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils/slug'
import { z } from 'zod'
```
With:
```typescript
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils/slug'
import { z } from 'zod'
```

**Step 2: Replace the hardcoded `appUrl` inside the `createMerchant` server action**

Find this block (around line 36):
```typescript
    const service = createServiceRoleClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://taplo.app'
```

Replace with:
```typescript
    const service = createServiceRoleClient()
    const headersList = await headers()
    const host = headersList.get('host') ?? 'localhost:3000'
    const proto = headersList.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
    const appUrl = `${proto}://${host}`
```

**Step 3: Verify the file looks correct**

Read the file and confirm:
- `headers` is imported from `next/headers`
- `appUrl` inside `createMerchant` no longer references `NEXT_PUBLIC_APP_URL`
- The `redirectTo` line below still reads `${appUrl}/api/auth/callback?role=merchant`

**Step 4: Commit**

```bash
git add "app/(admin)/admin/merchants/new/page.tsx"
git commit -m "fix: derive invite redirectTo from request host in new merchant page"
```

---

### Task 2: Fix `resendInvite` in `[merchantId]/page.tsx`

**Files:**
- Modify: `app/(admin)/admin/merchants/[merchantId]/page.tsx`

**Step 1: Add `headers` import**

The file currently starts with:
```typescript
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
```

Add the `headers` import:
```typescript
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
```

**Step 2: Replace the hardcoded `appUrl` inside the `resendInvite` server action**

Find (around line 64):
```typescript
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://taplo.app'
    const redirectTo = `${appUrl}/api/auth/callback?role=merchant`
```

Replace with:
```typescript
    const headersList = await headers()
    const host = headersList.get('host') ?? 'localhost:3000'
    const proto = headersList.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
    const appUrl = `${proto}://${host}`
    const redirectTo = `${appUrl}/api/auth/callback?role=merchant`
```

**Step 3: Commit**

```bash
git add "app/(admin)/admin/merchants/[merchantId]/page.tsx"
git commit -m "fix: derive invite redirectTo from request host in merchant detail page"
```

---

### Task 3: Fix `resendInvite` in `merchants/page.tsx`

**Files:**
- Modify: `app/(admin)/admin/merchants/page.tsx`

**Step 1: Add `headers` import**

The file currently starts with:
```typescript
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
```

Add the `headers` import:
```typescript
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
```

**Step 2: Replace the hardcoded `appUrl` inside the `resendInvite` server action**

Find (around line 44):
```typescript
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://taplo.app'
    const redirectTo = `${appUrl}/api/auth/callback?role=merchant`
```

Replace with:
```typescript
    const headersList = await headers()
    const host = headersList.get('host') ?? 'localhost:3000'
    const proto = headersList.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
    const appUrl = `${proto}://${host}`
    const redirectTo = `${appUrl}/api/auth/callback?role=merchant`
```

**Step 3: Commit**

```bash
git add "app/(admin)/admin/merchants/page.tsx"
git commit -m "fix: derive invite redirectTo from request host in merchants list page"
```

---

### Task 4: Run tests and verify

**Step 1: Run the test suite**

```bash
npm test
```

Expected: `22 passed, 159 tests` — no regressions. (These server actions don't have direct unit tests; the existing tests cover surrounding logic.)

**Step 2: Manual smoke test**

1. Start the dev server: `npm run dev`
2. Sign in as admin → go to `/admin/merchants/new`
3. Create a new merchant with a real email address you control
4. Open the invite email — confirm the link goes to `http://localhost:3000/api/auth/callback?role=merchant&code=...` (not `taplo.app`)
5. Click the link — confirm you land on `/dashboard` and are signed in as the merchant

**Step 3: Update changelog**

Add an entry to `.claude/changelog.md` under today's date describing the fix and the commit hashes.
