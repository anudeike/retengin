-- ============================================================
-- Migration 009: Flexible Merchant Referral Programs v2
-- ============================================================

-- 1a. New PG enum for reward types
CREATE TYPE referral_reward_type AS ENUM ('points', 'item', 'discount_percent', 'discount_flat');

-- 1b. Extend referral_programs with new config columns
ALTER TABLE referral_programs
  ADD COLUMN name                       TEXT,
  ADD COLUMN description                TEXT,
  ADD COLUMN max_referrals_per_customer INTEGER,            -- NULL = unlimited
  ADD COLUMN ends_at                    TIMESTAMPTZ,        -- NULL = no expiry
  ADD COLUMN clawback_on_refund         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN purchase_count_required    INTEGER NOT NULL DEFAULT 1;

-- 1c. Extend referral_spend_tiers with reward type columns for each side
ALTER TABLE referral_spend_tiers
  ADD COLUMN referrer_reward_type  referral_reward_type NOT NULL DEFAULT 'points',
  ADD COLUMN referrer_reward_title TEXT,        -- for item: "Free Coffee"; for discounts: label
  ADD COLUMN referrer_reward_value NUMERIC(10,2),
  ADD COLUMN referee_reward_type   referral_reward_type NOT NULL DEFAULT 'points',
  ADD COLUMN referee_reward_title  TEXT,
  ADD COLUMN referee_reward_value  NUMERIC(10,2);

-- 1d. Extend referrals table
ALTER TABLE referrals
  ALTER COLUMN referrer_id DROP NOT NULL,    -- merchant invites have no customer referrer
  ADD COLUMN purchase_count      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN invited_by_merchant BOOLEAN NOT NULL DEFAULT false;

-- 1e. New referral_reward_grants table for non-point rewards
CREATE TABLE referral_reward_grants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id    UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  customer_id    UUID NOT NULL REFERENCES customers(id),
  merchant_id    UUID NOT NULL REFERENCES merchants(id),
  role           TEXT NOT NULL CHECK (role IN ('referrer', 'referee')),
  reward_type    referral_reward_type NOT NULL,
  reward_title   TEXT NOT NULL,
  reward_value   NUMERIC(10,2),
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'redeemed', 'clawed_back')),
  granted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_at    TIMESTAMPTZ,
  clawed_back_at TIMESTAMPTZ,
  merchant_note  TEXT,
  UNIQUE(referral_id, role)
);
CREATE INDEX idx_rrg_customer ON referral_reward_grants(customer_id);
CREATE INDEX idx_rrg_merchant ON referral_reward_grants(merchant_id);
CREATE INDEX idx_rrg_status   ON referral_reward_grants(status);

-- 1f. RLS (referral tables had no RLS in 007 — add it all here)
ALTER TABLE referral_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_spend_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_reward_grants ENABLE ROW LEVEL SECURITY;

-- referral_programs policies
CREATE POLICY "rp: public can read enabled programs"
  ON referral_programs FOR SELECT USING (is_enabled = true);
CREATE POLICY "rp: merchant can manage own program"
  ON referral_programs FOR ALL USING (merchant_id = public.get_merchant_id());

-- referral_spend_tiers policies
CREATE POLICY "rst: public can read tiers for enabled programs"
  ON referral_spend_tiers FOR SELECT USING (
    EXISTS (SELECT 1 FROM referral_programs rp
            WHERE rp.id = referral_program_id AND rp.is_enabled = true));
CREATE POLICY "rst: merchant can manage own tiers"
  ON referral_spend_tiers FOR ALL USING (
    EXISTS (SELECT 1 FROM referral_programs rp
            WHERE rp.id = referral_program_id
              AND rp.merchant_id = public.get_merchant_id()));

-- referrals policies
CREATE POLICY "referrals: customer can read own referrals"
  ON referrals FOR SELECT
  USING (referrer_id = public.get_customer_id() OR referee_id = public.get_customer_id());
CREATE POLICY "referrals: merchant can read own referrals"
  ON referrals FOR SELECT USING (merchant_id = public.get_merchant_id());

-- referral_reward_grants policies
CREATE POLICY "rrg: customer can read own grants"
  ON referral_reward_grants FOR SELECT USING (customer_id = public.get_customer_id());
CREATE POLICY "rrg: merchant can manage own grants"
  ON referral_reward_grants FOR ALL USING (merchant_id = public.get_merchant_id());
