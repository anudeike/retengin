-- ============================================================
-- Migration 003: Helper Functions + Points RPCs
-- ============================================================

-- ------------------------------------------------------------
-- Helper functions for RLS policies
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_merchant_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id FROM public.merchants WHERE auth_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_customer_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id FROM public.customers WHERE auth_user_id = auth.uid();
$$;

-- ------------------------------------------------------------
-- award_points — atomic balance update + ledger insert
-- Idempotency enforced by idx_pt_idempotency unique index.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_points(
  p_customer_id       UUID,
  p_merchant_id       UUID,
  p_points            INTEGER,
  p_square_payment_id TEXT,
  p_square_order_id   TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Upsert balance; ON CONFLICT updates in place
  INSERT INTO customer_merchant_balances (customer_id, merchant_id, balance)
  VALUES (p_customer_id, p_merchant_id, p_points)
  ON CONFLICT (customer_id, merchant_id)
  DO UPDATE SET
    balance    = customer_merchant_balances.balance + p_points,
    updated_at = now()
  RETURNING balance INTO v_new_balance;

  -- Write immutable ledger entry (will fail with duplicate-key error if
  -- same square_payment_id already processed for this merchant, which is
  -- the intended idempotency behavior — caller should ignore this error)
  INSERT INTO point_transactions (
    customer_id, merchant_id, transaction_type, points,
    balance_after, square_payment_id, square_order_id
  )
  VALUES (
    p_customer_id, p_merchant_id, 'earned', p_points,
    v_new_balance, p_square_payment_id, p_square_order_id
  );
END;
$$;

-- ------------------------------------------------------------
-- redeem_points — atomic row-locked redemption
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_points(
  p_customer_id UUID,
  p_merchant_id UUID,
  p_reward_id   UUID,
  p_points      INTEGER
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance     INTEGER;
  v_redemption_id   UUID;
BEGIN
  -- Lock the balance row to prevent concurrent over-redemptions
  SELECT balance INTO v_current_balance
  FROM customer_merchant_balances
  WHERE customer_id = p_customer_id AND merchant_id = p_merchant_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'no_balance_record';
  END IF;

  IF v_current_balance < p_points THEN
    RAISE EXCEPTION 'insufficient_points';
  END IF;

  v_new_balance := v_current_balance - p_points;

  -- Record redemption
  INSERT INTO reward_redemptions (
    customer_id, merchant_id, reward_id,
    points_spent, status, redeemed_at
  )
  VALUES (
    p_customer_id, p_merchant_id, p_reward_id,
    p_points, 'approved', now()
  )
  RETURNING id INTO v_redemption_id;

  -- Update cached balance
  UPDATE customer_merchant_balances
  SET balance = v_new_balance, updated_at = now()
  WHERE customer_id = p_customer_id AND merchant_id = p_merchant_id;

  -- Write ledger entry
  INSERT INTO point_transactions (
    customer_id, merchant_id, transaction_type,
    points, balance_after, redemption_id
  )
  VALUES (
    p_customer_id, p_merchant_id, 'redeemed',
    -p_points, v_new_balance, v_redemption_id
  );

  RETURN v_redemption_id;
END;
$$;

-- ------------------------------------------------------------
-- admin_correct_points — allows signed delta with required note
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_correct_points(
  p_customer_id UUID,
  p_merchant_id UUID,
  p_delta       INTEGER,    -- positive = add, negative = deduct
  p_note        TEXT
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  IF p_delta = 0 THEN
    RAISE EXCEPTION 'delta_cannot_be_zero';
  END IF;

  IF p_note IS NULL OR trim(p_note) = '' THEN
    RAISE EXCEPTION 'note_required_for_admin_correction';
  END IF;

  -- Upsert balance
  INSERT INTO customer_merchant_balances (customer_id, merchant_id, balance)
  VALUES (p_customer_id, p_merchant_id, GREATEST(0, p_delta))
  ON CONFLICT (customer_id, merchant_id)
  DO UPDATE SET
    balance    = GREATEST(0, customer_merchant_balances.balance + p_delta),
    updated_at = now()
  RETURNING balance INTO v_new_balance;

  -- Write ledger entry
  INSERT INTO point_transactions (
    customer_id, merchant_id, transaction_type,
    points, balance_after, note
  )
  VALUES (
    p_customer_id, p_merchant_id, 'admin_correction',
    p_delta, v_new_balance, p_note
  );
END;
$$;
