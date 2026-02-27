# Plan 3 — Transactional Emails: Manual QA Test Guide

**Branch:** `feat/transaction-emails`
**Date:** 2026-02-27
**Prerequisites:** App running locally (`npm run dev`), Supabase running, `RESEND_API_KEY` and `EMAIL_UNSUBSCRIBE_SECRET` set in `.env.local`, migration 008 applied (`supabase db push`)

---

## Setup

1. Set `RESEND_API_KEY` in `.env.local` (get a free key at resend.com)
2. Set `EMAIL_UNSUBSCRIBE_SECRET` to any random string (e.g., `openssl rand -hex 32`)
3. Set `NEXT_PUBLIC_APP_URL=http://localhost:3000`
4. Run `supabase db push` to apply migration 008
5. Start the app: `npm run dev`
6. You will need two customer email accounts (A and B) and one merchant account

---

## Section 1: PointsEarned Email

**Trigger:** Square `payment.completed` webhook → `handlePaymentCompleted`

### Test 1.1 — Points earned email is sent on first purchase

1. Ensure you have an active merchant with a Square connection and `is_active=true` point rule
2. Simulate a completed payment via the Square sandbox or send a test webhook to `/api/webhooks/square`
3. The `buyer_email_address` on the payment must match a customer email
4. **Expected:** Within a few seconds, the customer email receives a "You earned X points" email
5. **Verify email contains:**
   - Merchant name and logo (if set)
   - Exact number of points earned
   - New running balance
   - "View Wallet" button linking to `/wallet/<merchant-slug>`
   - Unsubscribe link at the bottom

### Test 1.2 — Points earned email not sent for duplicate webhook

1. Send the same webhook event twice (same `payment.id`)
2. **Expected:** Email is sent only once (idempotency via `processed_webhook_events`)

### Test 1.3 — Points earned email not sent when merchant has no email rule

1. Create a merchant with `emails_enabled = false` (toggle in Settings)
2. Simulate a payment for a customer at that merchant
3. **Expected:** No email is received

### Test 1.4 — Points earned email not sent when customer globally opted out

1. Have customer opt out globally (Settings > Email preferences > "Unsubscribe from all emails")
2. Simulate a payment
3. **Expected:** No email received

### Test 1.5 — Points earned email not sent when customer opted out from this merchant

1. Have customer opt out from a specific merchant (Settings > Email preferences > per-merchant toggle)
2. Simulate a payment from that merchant
3. **Expected:** No email from that merchant, but emails from other merchants still work

---

## Section 2: RewardUnlocked Email

**Trigger:** Same webhook flow — fires when `previousBalance < points_required <= newBalance`

### Test 2.1 — Reward unlocked email fires when threshold is crossed

1. Set up an active reward for a merchant with `points_required = 100`
2. Customer has 80 points; simulate a payment that earns 30+ points (so total >= 100)
3. **Expected:** Customer receives both a PointsEarned email AND a RewardUnlocked email
4. **Verify RewardUnlocked email contains:**
   - Merchant name and logo
   - Exact reward name highlighted
   - "View Wallet" button
   - Unsubscribe link

### Test 2.2 — Multiple rewards unlocked in one payment

1. Set up two rewards: `points_required = 100` and `points_required = 150`
2. Customer has 90 points; simulate a payment earning 70 points (total = 160)
3. **Expected:** Customer receives PointsEarned email + **two** RewardUnlocked emails (one per reward)

### Test 2.3 — No unlock email when threshold not crossed

1. Customer has 80 points; reward requires 100; simulate payment earning 10 points
2. **Expected:** Only PointsEarned email — no RewardUnlocked email

### Test 2.4 — No unlock email for already-crossed threshold

1. Customer has 110 points (already above the 100-point reward threshold)
2. Simulate any payment that earns points
3. **Expected:** Only PointsEarned — no duplicate RewardUnlocked email

---

## Section 3: RewardRedeemed Email

**Trigger:** Merchant staff clicks "Redeem" in the dashboard → `POST /api/merchant/redeem`

### Test 3.1 — Redemption email sent after successful redemption

1. Log in as merchant staff
2. Go to Dashboard → Redeem
3. Search for a customer who has enough points for a reward
4. Click "Redeem" on one of their available rewards
5. **Expected:** Customer receives a "Reward redeemed" email
6. **Verify email contains:**
   - Merchant name and logo
   - Reward name
   - Points spent (e.g., "−100 pts")
   - Remaining balance after redemption
   - "View Wallet" button
   - Unsubscribe link

### Test 3.2 — No redemption email when merchant has emails disabled

1. Set `emails_enabled = false` for the merchant (Dashboard → Settings → Transactional emails)
2. Perform a redemption
3. **Expected:** No email sent

### Test 3.3 — No redemption email when customer globally opted out

1. Have customer opt out globally via `/wallet/preferences`
2. Perform a redemption for that customer
3. **Expected:** No email sent

### Test 3.4 — Redemption of insufficient points returns 422 and no email

1. Attempt to redeem a reward worth more points than the customer has
2. **Expected:** API returns `{ error: 'Insufficient points' }` with status 422; no email sent

---

## Section 4: ReferralCompleted Email

**Trigger:** First qualifying purchase by a referee → `awardReferralBonus`

### Test 4.1 — Both referrer and referee receive emails on referral completion

1. Log in as Customer A (referrer) and copy their referral link from `/wallet/<merchant-slug>`
2. Open the link in an incognito window as Customer B (referee)
3. Sign up / log in as Customer B using their email
4. Verify a referral record was created (status = `wallet_created`)
5. Simulate a payment completing for Customer B at that merchant
6. **Expected:**
   - Customer A receives a "Your referral at X is complete!" email
   - Customer B receives a "Welcome bonus from X!" email
7. **Verify referrer email contains:**
   - Merchant name and logo
   - Points earned (merchant points + Taplo points if > 0)
   - "View Wallet" button
8. **Verify referee email contains:**
   - Merchant name and logo
   - Welcome bonus breakdown
   - "View Wallet" button

### Test 4.2 — Referral email fires only once (not on second purchase)

1. Complete the referral flow as above
2. Simulate a second payment for Customer B at the same merchant
3. **Expected:** No additional ReferralCompleted emails sent (referral status is `completed`)

### Test 4.3 — No referral email when no referral program is active

1. Disable the referral program for the merchant (Dashboard → Referrals → toggle off)
2. Complete a referral-linked purchase
3. **Expected:** No ReferralCompleted emails

### Test 4.4 — No referral email when purchase is below min_spend tier

1. Set a spend tier with `min_spend_cents = 5000` ($50)
2. Simulate a payment for Customer B of $20
3. **Expected:** No bonus awarded, no email sent

---

## Section 5: Unsubscribe Flow

### Test 5.1 — Merchant-scoped unsubscribe link works

1. Receive any transactional email (e.g., PointsEarned)
2. Click the "Unsubscribe from [Merchant] emails" link in the footer
3. **Expected:**
   - Browser navigates to `/unsubscribe?success=1&scope=merchant`
   - Page shows "You've been unsubscribed from this merchant's emails."
   - A row is created in `customer_merchant_email_prefs` with `opted_out = true`
4. Simulate another payment from that merchant
5. **Expected:** No further emails from that merchant

### Test 5.2 — Opted-out customer still receives emails from other merchants

1. After opting out from Merchant A (Test 5.1)
2. Simulate a payment for the same customer at Merchant B
3. **Expected:** Email from Merchant B is received normally

### Test 5.3 — Invalid/tampered token returns error page

1. Navigate to `/api/email/unsubscribe?token=invalid`
2. **Expected:** Redirected to `/unsubscribe?error=invalid_token`; page shows "Invalid link" message

### Test 5.4 — Missing token returns error page

1. Navigate to `/api/email/unsubscribe` with no token parameter
2. **Expected:** Redirected to `/unsubscribe?error=missing_token`; page shows "Invalid link" message

---

## Section 6: Customer Email Preferences Page

**URL:** `/wallet/preferences`

### Test 6.1 — Global opt-out toggle saves and takes effect

1. Log in as a customer and navigate to `/wallet/preferences`
2. Check "Unsubscribe from all emails" and click Save
3. **Expected:** Page reloads with the checkbox still checked
4. Check `customers.email_global_opt_out = true` in Supabase
5. Simulate a payment for this customer
6. **Expected:** No email received

### Test 6.2 — Global opt-in re-enables emails

1. With global opt-out enabled, uncheck "Unsubscribe from all emails" and Save
2. Simulate a payment
3. **Expected:** Email received

### Test 6.3 — Per-merchant opt-out saves and takes effect

1. On `/wallet/preferences`, find a merchant in the per-merchant list (requires balance > 0 at that merchant)
2. Check "Unsubscribe" for that merchant and click Save
3. **Expected:** Row in `customer_merchant_email_prefs` has `opted_out = true`
4. Simulate a payment from that merchant
5. **Expected:** No email from that merchant

### Test 6.4 — Per-merchant section only shows merchants with active balances

1. Customer has no balance at Merchant C
2. Navigate to `/wallet/preferences`
3. **Expected:** Merchant C does not appear in the per-merchant section

### Test 6.5 — Preferences page requires authentication

1. Log out of the app
2. Navigate to `/wallet/preferences`
3. **Expected:** Redirected to `/` (not a 500 error)

---

## Section 7: Merchant Email Settings

**URL:** `/dashboard/settings`

### Test 7.1 — Toggle emails_enabled off stops all emails to that merchant's customers

1. Log in as a merchant
2. Go to Dashboard → Settings
3. Uncheck "Send emails to customers" and click Save
4. **Expected:** `merchants.emails_enabled = false` in Supabase
5. Simulate a payment for any customer at this merchant
6. **Expected:** No email received

### Test 7.2 — Re-enabling emails restores sending

1. Re-check "Send emails to customers" and Save
2. Simulate a payment
3. **Expected:** Email received

### Test 7.3 — emails_enabled defaults to true for new merchants

1. Onboard a new merchant via the invite flow
2. Check the `merchants` row in Supabase
3. **Expected:** `emails_enabled = true`

---

## Section 8: Edge Cases & Regression

### Test 8.1 — No email when RESEND_API_KEY is not set

1. Remove `RESEND_API_KEY` from `.env.local` and restart the app
2. Simulate a payment
3. **Expected:** App does not crash; a warning is logged: `[email] RESEND_API_KEY is not set`; no email sent

### Test 8.2 — No email when customer has no email address

1. Simulate a payment where `buyer_email_address` is null
2. **Expected:** Points are NOT awarded (engine returns early); no email crash

### Test 8.3 — Webhook response is not delayed by email sending

1. Simulate a payment and time the webhook response
2. **Expected:** Webhook returns 200 in < 1 second; email is sent asynchronously after

### Test 8.4 — Migration 008 applies cleanly

1. Run `supabase db push` on a fresh database
2. **Expected:** No errors; `customers.email_global_opt_out`, `merchants.emails_enabled`, and `customer_merchant_email_prefs` table all exist

### Test 8.5 — Existing customers have email_global_opt_out = false by default

1. After migration 008, check an existing customer row
2. **Expected:** `email_global_opt_out = false`

### Test 8.6 — Existing merchants have emails_enabled = true by default

1. After migration 008, check an existing merchant row
2. **Expected:** `emails_enabled = true`
