-- ============================================================
-- Migration 002: Enable RLS + Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_point_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_merchant_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- customers
-- ============================================================
CREATE POLICY "customers: customer can read own record"
  ON customers FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "customers: customer can update own record"
  ON customers FOR UPDATE
  USING (auth_user_id = auth.uid());

CREATE POLICY "customers: admin can do all"
  ON customers FOR ALL
  USING (public.get_user_role() = 'admin');

-- ============================================================
-- merchants
-- ============================================================
CREATE POLICY "merchants: merchant can read own record"
  ON merchants FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "merchants: merchant can update own record"
  ON merchants FOR UPDATE
  USING (auth_user_id = auth.uid());

CREATE POLICY "merchants: admin can do all"
  ON merchants FOR ALL
  USING (public.get_user_role() = 'admin');

-- ============================================================
-- merchant_point_rules
-- ============================================================
CREATE POLICY "rules: customers can read active rules"
  ON merchant_point_rules FOR SELECT
  USING (is_active = true);

CREATE POLICY "rules: merchant can manage own rules"
  ON merchant_point_rules FOR ALL
  USING (merchant_id = public.get_merchant_id());

CREATE POLICY "rules: admin can do all"
  ON merchant_point_rules FOR ALL
  USING (public.get_user_role() = 'admin');

-- ============================================================
-- rewards
-- ============================================================
CREATE POLICY "rewards: customers can read active rewards"
  ON rewards FOR SELECT
  USING (is_active = true);

CREATE POLICY "rewards: merchant can manage own rewards"
  ON rewards FOR ALL
  USING (merchant_id = public.get_merchant_id());

CREATE POLICY "rewards: admin can do all"
  ON rewards FOR ALL
  USING (public.get_user_role() = 'admin');

-- ============================================================
-- customer_merchant_balances
-- ============================================================
CREATE POLICY "cmb: customer can read own rows"
  ON customer_merchant_balances FOR SELECT
  USING (customer_id = public.get_customer_id());

CREATE POLICY "cmb: merchant can read own merchant rows"
  ON customer_merchant_balances FOR SELECT
  USING (merchant_id = public.get_merchant_id());

CREATE POLICY "cmb: admin can do all"
  ON customer_merchant_balances FOR ALL
  USING (public.get_user_role() = 'admin');

-- ============================================================
-- point_transactions
-- ============================================================
CREATE POLICY "pt: customer can read own rows"
  ON point_transactions FOR SELECT
  USING (customer_id = public.get_customer_id());

CREATE POLICY "pt: merchant can read own merchant rows"
  ON point_transactions FOR SELECT
  USING (merchant_id = public.get_merchant_id());

CREATE POLICY "pt: admin can do all"
  ON point_transactions FOR ALL
  USING (public.get_user_role() = 'admin');

-- ============================================================
-- reward_redemptions
-- ============================================================
CREATE POLICY "redemptions: customer can read own rows"
  ON reward_redemptions FOR SELECT
  USING (customer_id = public.get_customer_id());

CREATE POLICY "redemptions: merchant can manage own merchant rows"
  ON reward_redemptions FOR ALL
  USING (merchant_id = public.get_merchant_id());

CREATE POLICY "redemptions: admin can do all"
  ON reward_redemptions FOR ALL
  USING (public.get_user_role() = 'admin');

-- ============================================================
-- user_roles (read-only for authenticated users, service role for writes)
-- ============================================================
CREATE POLICY "user_roles: user can read own role"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "user_roles: admin can do all"
  ON user_roles FOR ALL
  USING (public.get_user_role() = 'admin');

-- ============================================================
-- processed_webhook_events (service role only — no user policies needed)
-- ============================================================
-- No user-facing policies; service role bypasses RLS by default.
