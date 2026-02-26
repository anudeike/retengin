# Role-Specific Login Screens — Design Document

**Date:** February 26, 2026

---

## Goal

Replace the single shared `/login` page with three role-specific login screens:
- `/login` — customers (existing, refactored)
- `/login/merchant` — merchants (new)
- `/login/admin` — admins (new, gated)

---

## Context

Taplo currently has one magic-link login page (`/login`) used by all roles. After authentication, the callback at `/api/auth/callback` routes users to the right destination based on their role in `user_roles`. There is no role-specific branding or access control at the login stage.

Merchants are onboarded via admin invite — they click an email link and land on `/dashboard` directly. After that, they need a dedicated URL to sign back in. Admins are seeded in the DB and also need a dedicated sign-in page.

---

## Decisions

| Question | Decision |
|---|---|
| How do merchants find their login page? | They bookmark `/login/merchant` |
| Admin security model | Magic link, gated — only sends OTP if email is a known admin |
| Merchant security model | Open to anyone — existing role in DB handles routing |
| Admin rejection behaviour | Show explicit error: "This email isn't registered as an admin account." |
| Homepage changes | None — stays customer-focused, links to `/login` |
| Callback changes | None — role routing logic unchanged |

---

## Architecture

### Pages

Three thin page components, each a wrapper around the shared `LoginForm`:

```
/login                  → customer login (refactored from current self-contained page)
/login/merchant         → merchant login (new)
/login/admin            → admin login (new, uses server action for OTP gating)
```

### Shared Component

**`components/auth/LoginForm.tsx`** — `'use client'`

Handles all form state (email input, loading, submitted, error). Accepts an `onSubmit` callback so each page can inject its own OTP-sending logic.

```typescript
interface LoginFormProps {
  title: string
  description: string
  onSubmit: (email: string) => Promise<{ error?: string }>
}
```

States:
- Default: email input + submit button
- Loading: button shows "Sending…", disabled
- Submitted (success): "Check your email" confirmation message
- Error: inline error message below the input, form remains

### Admin Server Action

**`app/login/admin/actions.ts`**

Called by the admin page's `onSubmit`. Runs on the server with service role access.

Flow:
1. Fetch `${SUPABASE_URL}/auth/v1/admin/users?email=<email>` with service role key
2. If user not found → return `{ error: "This email isn't registered as an admin account." }`
3. Query `user_roles` for `role = 'admin'` for that user ID
4. If role not admin → return `{ error: "This email isn't registered as an admin account." }` (same message — no info leak about whether the email exists)
5. If admin confirmed → call `supabase.auth.signInWithOtp({ email })` from server anon client
6. Return `{}`  (no error)

### Client OTP Helper

The merchant and customer pages pass an inline `onSubmit` that calls `supabase.auth.signInWithOtp` directly from the browser client (same as the current `/login` page).

---

## Files Changed

| File | Action | Notes |
|---|---|---|
| `components/auth/LoginForm.tsx` | **Create** | Shared form component |
| `app/login/page.tsx` | **Modify** | Thin wrapper — delegates to `LoginForm` |
| `app/login/merchant/page.tsx` | **Create** | Merchant branding, browser-side OTP |
| `app/login/admin/page.tsx` | **Create** | Admin branding, calls server action |
| `app/login/admin/actions.ts` | **Create** | `sendAdminMagicLink` server action |

**Not changed:**
- `middleware.ts`
- `app/api/auth/callback/route.ts`
- Supabase email templates
- Homepage (`app/page.tsx`)

---

## Testing

- `LoginForm` renders with correct title/description
- `LoginForm` shows loading state while submitting
- `LoginForm` shows "check your email" on success
- `LoginForm` shows error message when `onSubmit` returns `{ error }`
- Admin page: non-admin email → error shown, no OTP sent
- Admin page: unknown email → error shown, no OTP sent
- Admin page: valid admin email → "check your email" shown
- Merchant page: any email → "check your email" shown (no gating)
- `/login` page: behaviour unchanged

---

## Out of Scope

- Password-based auth for admin
- Homepage changes (role picker, etc.)
- Locking down `/login` so only customers can use it
- Audit logging of admin login attempts
