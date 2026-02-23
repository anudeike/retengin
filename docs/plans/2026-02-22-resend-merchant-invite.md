# Resend Merchant Invite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Resend invite" button to both the merchants list and merchant detail pages, visible only when the merchant hasn't claimed their account yet (`auth_user_id IS NULL`).

**Architecture:** Inline server actions in each page, consistent with the existing `setStatus` pattern on the detail page. No new files or API routes. The action re-fetches `auth_user_id` before sending as a race-condition guard, then calls `service.auth.admin.inviteUserByEmail()`.

**Tech Stack:** Next.js App Router server actions, Supabase service-role client, shadcn/ui Button + Card.

---

### Task 1: Update the merchants list page

**Files:**
- Modify: `app/(admin)/admin/merchants/page.tsx`

**Step 1: Add `auth_user_id` to the select query**

In `app/(admin)/admin/merchants/page.tsx`, change the `.select(...)` call from:

```typescript
.select('id, business_name, slug, status, contact_email, square_merchant_id, created_at')
```

to:

```typescript
.select('id, business_name, slug, status, contact_email, square_merchant_id, auth_user_id, created_at')
```

**Step 2: Add the `resendInvite` server action**

Add this function inside `AdminMerchantsPage`, just before the `return` statement:

```typescript
async function resendInvite(formData: FormData) {
  'use server'
  const merchantId = formData.get('merchantId') as string
  const service = createServiceRoleClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('contact_email, auth_user_id')
    .eq('id', merchantId)
    .single()
  if (!merchant || merchant.auth_user_id) return
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://taplo.app'
  await service.auth.admin.inviteUserByEmail(merchant.contact_email, {
    redirectTo: `${appUrl}/api/auth/callback?role=merchant`,
  })
  redirect('/admin/merchants')
}
```

Also add `createServiceRoleClient` to the existing import at the top of the file (it's already imported on the detail page — add it to the list page's import line):

```typescript
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
```

**Step 3: Add the per-row resend button**

Inside the `<TableCell>` that renders `business_name` and `contact_email`, add the form after the email `<p>` tag:

```tsx
<TableCell>
  <Link href={`/admin/merchants/${m.id}`} className="font-medium hover:underline">
    {m.business_name}
  </Link>
  <p className="text-xs text-muted-foreground">{m.contact_email}</p>
  {!m.auth_user_id && (
    <form action={resendInvite}>
      <input type="hidden" name="merchantId" value={m.id} />
      <button type="submit" className="text-xs text-blue-500 hover:underline mt-0.5">
        Resend invite
      </button>
    </form>
  )}
</TableCell>
```

**Step 4: Verify the page compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 5: Commit**

```bash
git add app/\(admin\)/admin/merchants/page.tsx
git commit -m "feat: add resend invite button to merchants list"
```

---

### Task 2: Update the merchant detail page

**Files:**
- Modify: `app/(admin)/admin/merchants/[merchantId]/page.tsx`

**Step 1: Add the `resendInvite` server action**

Add this function inside `AdminMerchantDetailPage`, directly after the existing `setStatus` function (around line 51):

```typescript
async function resendInvite() {
  'use server'
  const service = createServiceRoleClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('contact_email, auth_user_id')
    .eq('id', merchantId)
    .single()
  if (!merchant || merchant.auth_user_id) return
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://taplo.app'
  await service.auth.admin.inviteUserByEmail(merchant.contact_email, {
    redirectTo: `${appUrl}/api/auth/callback?role=merchant`,
  })
  redirect(`/admin/merchants/${merchantId}`)
}
```

Note: `merchantId` and `createServiceRoleClient` are already in scope on this page — no new imports needed.

**Step 2: Add the Invite card**

Add this card between the Details card (`mb-4` Card ending around line 75) and the Point Rules card. Insert it so it's the second card:

```tsx
{!merchant.auth_user_id && (
  <Card className="mb-4">
    <CardContent className="p-5">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Invite
      </h2>
      <p className="text-sm text-muted-foreground mb-3">
        This merchant hasn&apos;t claimed their account yet.
      </p>
      <form action={resendInvite}>
        <Button type="submit" variant="outline" size="sm">Resend invite</Button>
      </form>
    </CardContent>
  </Card>
)}
```

**Step 3: Verify the page compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add app/\(admin\)/admin/merchants/\[merchantId\]/page.tsx
git commit -m "feat: add resend invite card to merchant detail page"
```

---

### Task 3: Run the test suite and verify nothing is broken

**Step 1: Run all tests**

```bash
npm test
```

Expected: `22 passed (159)` — same as before. No regressions.

**Step 2: Final commit if any stray changes exist**

```bash
git status
# If clean, nothing to do. If any files modified, investigate before committing.
```

---

## Manual Verification Checklist

After deploying or running locally:

- [ ] Merchant with `auth_user_id = null`: "Resend invite" text appears in the list row and the Invite card appears on the detail page
- [ ] Merchant with `auth_user_id` set (has logged in): neither button nor card is visible
- [ ] Clicking "Resend invite" in the list: page reloads, no error, merchant receives a new invite email
- [ ] Clicking "Resend invite" on the detail page: same page reloads, merchant receives email
- [ ] Clicking resend for a merchant who logs in between page load and button click: action returns early silently (no duplicate invite sent)
