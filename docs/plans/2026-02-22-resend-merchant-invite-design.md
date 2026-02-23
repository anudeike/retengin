# Design: Resend Merchant Invite

**Date:** 2026-02-22

## Problem

When an admin onboards a merchant, an invite email is sent via `inviteUserByEmail()`. If
the merchant misses or loses the email, there is currently no way to resend it without
re-creating the merchant record from scratch.

## Solution

Add a "Resend invite" action to both the merchants list page and the merchant detail page.
The button is only shown when `auth_user_id IS NULL` — meaning the merchant hasn't clicked
the invite link and claimed their account yet.

## Approach

Server actions with hidden inputs, consistent with the existing `setStatus` pattern on the
detail page. No new files, no API routes, no client components.

## Data Layer

Both pages call `service.auth.admin.inviteUserByEmail()` with the merchant's `contact_email`
and the same `redirectTo` used at creation time:

```
redirectTo: ${NEXT_PUBLIC_APP_URL}/api/auth/callback?role=merchant
```

A guard inside the action re-fetches `auth_user_id` before sending, so a race condition
(merchant claims account between page load and button click) is handled safely — the action
returns early without sending a duplicate invite.

## UI

### Merchants list (`/admin/merchants`)

- Add `auth_user_id` to the existing select query.
- When `auth_user_id` is null, render a small "Resend invite" text-button below the
  contact email in the Business cell. Uses a `<form>` with a hidden `merchantId` input.
- Disappears automatically once the merchant logs in.

### Merchant detail (`/admin/merchants/[merchantId]`)

- Add a new "Invite" card between the Details card and the Change Status card.
- Only rendered when `merchant.auth_user_id === null`.
- Shows a short explanatory line ("This merchant hasn't claimed their account yet.") and
  an outline "Resend invite" button.
- The server action closes over `merchantId` from the route params — no hidden input needed.
- After sending, redirects back to the same detail page.

## Files Changed

| File | Change |
|---|---|
| `app/(admin)/admin/merchants/page.tsx` | Add `auth_user_id` to select; add `resendInvite` server action; add per-row form/button |
| `app/(admin)/admin/merchants/[merchantId]/page.tsx` | Add `resendInvite` server action; add Invite card |

## Out of Scope

- Success toast / confirmation message (redirect serves as implicit feedback, consistent
  with `setStatus`)
- Rate limiting resends (Supabase handles duplicate invite behaviour)
- Resending for merchants who have already logged in (button hidden via `auth_user_id` check)
