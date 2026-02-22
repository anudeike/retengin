# Design: shadcn/ui Migration

**Date:** 2026-02-22
**Status:** Approved
**Approach:** Option A — component-for-component replacement across the entire project

---

## Goals

- Replace all raw HTML UI primitives (buttons, inputs, tables, modals, badges, etc.) with shadcn/ui equivalents
- Add a persistent top navigation bar to all authenticated pages
- Keep all business logic, data fetching, routing, and layout structure unchanged

## Non-Goals

- Page layout redesign (card-based structure stays as-is)
- Dark mode
- Color scheme change (keeping black/white)
- Any changes to server logic, auth, or middleware

---

## Theme Configuration

- **Color scheme:** Default shadcn theme (black/white)
- **Dark mode:** Disabled
- **Tailwind:** v4 (already installed via `@tailwindcss/postcss`)
- **Path alias:** `@/` pointing to project root

---

## Setup

1. Run `npx shadcn@latest init` — accepts Tailwind v4, creates `components/ui/` primitives and `lib/utils.ts`
2. Install all required components in one command:
   ```
   npx shadcn@latest add button input textarea select checkbox label card badge table dialog progress skeleton separator sonner
   ```
3. Add `<Toaster />` from `sonner` to `app/layout.tsx` for global toast support

---

## New Component: Navbar

**File:** `components/ui/Navbar.tsx`

A server component added to all three authenticated route group layouts:
- `app/(customer)/layout.tsx`
- `app/(merchant)/layout.tsx`
- `app/(admin)/layout.tsx`

**Layout:**
```
[ Taplo ]     [ Section Label ]     [ Sign out ]
```

- Left: "Taplo" wordmark as a link to the section home
- Center: section label (Wallet / Dashboard / Admin)
- Right: ghost `Button` that calls `supabase.auth.signOut()` and redirects to `/`
- Sticky, full-width, with a bottom `Separator`

---

## Component Replacement Map

| File | shadcn components used |
|---|---|
| `app/login/page.tsx` | `Input`, `Button`, `Label` |
| `app/join/[slug]/page.tsx` | `Input`, `Button`, `Label` |
| `components/ui/LoadingSkeleton.tsx` | `Skeleton` |
| `components/ui/ErrorBoundary.tsx` | `Button` |
| `components/admin/CorrectionForm.tsx` | `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `Input`, `Textarea`, `Label`, `Button` |
| `components/admin/MerchantStatusBadge.tsx` | `Badge` (variant mapping: active→default, pending→secondary, suspended→destructive) |
| `components/customer/WalletCard.tsx` | `Card`, `CardContent` |
| `components/customer/PointsHistory.tsx` | `Separator` |
| `components/customer/RewardProgress.tsx` | `Progress` |
| `components/customer/RewardUnlockToast.tsx` | `sonner` `toast()` call (replaces custom fixed-position div) |
| `components/merchant/CustomerTable.tsx` | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` |
| `components/merchant/PointRuleForm.tsx` | `Input`, `Checkbox`, `Label`, `Button` |
| `components/merchant/RedemptionModal.tsx` | `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `Input`, `Button`, `Label` |
| `components/merchant/QRCodeDisplay.tsx` | `Card`, `CardContent` |
| All page stat cards | `Card`, `CardHeader`, `CardTitle`, `CardContent` |
| All page action buttons | `Button` |

---

## Files Not Changed

- All server actions, data fetching, RLS, webhook logic
- `components/customer/RealtimeWallet.tsx` (renders null)
- `middleware.ts`, `lib/`, `supabase/`, `types/`
- Tailwind layout classes (grid, flex, spacing) within pages

---

## Constraints

- shadcn components are written to `components/ui/` — existing `ErrorBoundary.tsx` and `LoadingSkeleton.tsx` stay in the same directory alongside the new primitives
- `lib/utils.ts` is created by shadcn init with `cn()` helper (clsx + tailwind-merge)
- No new pages or routes are added
