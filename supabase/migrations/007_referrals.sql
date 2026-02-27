-- ============================================================
-- Migration 007: Referral Growth Engine
-- ============================================================

-- Referral code on customers (generated lazily on first wallet load)
ALTER TABLE customers
  ADD COLUMN referral_code TEXT UNIQUE;

-- Per-merchant referral program config
CREATE TABLE referral_programs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE UNIQUE,
  is_enabled  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spend tiers: first purchase >= min_spend_cents earns these bonuses
CREATE TABLE referral_spend_tiers (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_program_id      UUID NOT NULL REFERENCES referral_programs(id) ON DELETE CASCADE,
  min_spend_cents          INTEGER NOT NULL DEFAULT 0,
  referrer_merchant_points INTEGER NOT NULL DEFAULT 0,
  referrer_taplo_points    INTEGER NOT NULL DEFAULT 0,
  referee_merchant_points  INTEGER NOT NULL DEFAULT 0,
  referee_taplo_points     INTEGER NOT NULL DEFAULT 0,
  UNIQUE(referral_program_id, min_spend_cents)
);

-- Individual referral events
CREATE TABLE referrals (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id          UUID NOT NULL REFERENCES customers(id),
  referee_id           UUID REFERENCES customers(id),      -- null until wallet created
  merchant_id          UUID NOT NULL REFERENCES merchants(id),
  referee_email        TEXT NOT NULL,                      -- fraud guard pre-signup
  status               TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT referrals_status_check
      CHECK (status IN ('pending', 'wallet_created', 'completed', 'invalid')),
  first_purchase_cents INTEGER,
  square_payment_id    TEXT,                               -- idempotency
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referee_email, merchant_id)                       -- one referral per email per merchant
);

-- Indexes for common query patterns
CREATE INDEX idx_referrals_referrer  ON referrals(referrer_id);
CREATE INDEX idx_referrals_referee   ON referrals(referee_id);
CREATE INDEX idx_referrals_merchant  ON referrals(merchant_id);
CREATE INDEX idx_referrals_status    ON referrals(status);
