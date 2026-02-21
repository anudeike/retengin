-- ============================================================
-- Migration 001: Initial Schema
-- ============================================================

-- Enum types
CREATE TYPE transaction_type AS ENUM ('earned', 'redeemed', 'reversed', 'admin_correction');
CREATE TYPE merchant_status AS ENUM ('pending', 'active', 'suspended');
CREATE TYPE app_role AS ENUM ('customer', 'merchant', 'admin');

-- ------------------------------------------------------------
-- customers — one Taplo wallet per email globally
-- ------------------------------------------------------------
CREATE TABLE customers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  email        TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_auth_user_id ON customers(auth_user_id);

-- ------------------------------------------------------------
-- merchants — businesses enrolled in Taplo
-- ------------------------------------------------------------
CREATE TABLE merchants (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id            UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  business_name           TEXT NOT NULL,
  slug                    TEXT NOT NULL UNIQUE,
  status                  merchant_status NOT NULL DEFAULT 'pending',
  square_merchant_id      TEXT UNIQUE,
  square_access_token     TEXT,
  square_refresh_token    TEXT,
  square_token_expires_at TIMESTAMPTZ,
  square_location_id      TEXT,
  contact_email           TEXT NOT NULL,
  logo_url                TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_merchants_slug ON merchants(slug);
CREATE INDEX idx_merchants_square_merchant_id ON merchants(square_merchant_id);

-- ------------------------------------------------------------
-- merchant_point_rules — one rule set per merchant
-- ------------------------------------------------------------
CREATE TABLE merchant_point_rules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id           UUID NOT NULL UNIQUE REFERENCES merchants(id) ON DELETE CASCADE,
  points_per_dollar     NUMERIC(10,4) NOT NULL DEFAULT 1.0,
  min_spend_cents       INTEGER NOT NULL DEFAULT 0,
  min_redemption_points INTEGER NOT NULL DEFAULT 100,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- rewards — merchant-defined reward tiers
-- ------------------------------------------------------------
CREATE TABLE rewards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  points_required INTEGER NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rewards_points_positive CHECK (points_required > 0)
);
CREATE INDEX idx_rewards_merchant_id ON rewards(merchant_id);

-- ------------------------------------------------------------
-- customer_merchant_balances — cached balance per merchant
-- ------------------------------------------------------------
CREATE TABLE customer_merchant_balances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  balance     INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cmb_unique UNIQUE (customer_id, merchant_id),
  CONSTRAINT cmb_non_negative CHECK (balance >= 0)
);
CREATE INDEX idx_cmb_customer_id ON customer_merchant_balances(customer_id);
CREATE INDEX idx_cmb_merchant_id ON customer_merchant_balances(merchant_id);

-- ------------------------------------------------------------
-- point_transactions — immutable append-only ledger
-- ------------------------------------------------------------
CREATE TABLE point_transactions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id            UUID NOT NULL REFERENCES customers(id),
  merchant_id            UUID NOT NULL REFERENCES merchants(id),
  transaction_type       transaction_type NOT NULL,
  points                 INTEGER NOT NULL,
  balance_after          INTEGER NOT NULL,
  square_payment_id      TEXT,
  square_order_id        TEXT,
  related_transaction_id UUID REFERENCES point_transactions(id),
  redemption_id          UUID,
  note                   TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pt_no_zero CHECK (points != 0)
);
CREATE INDEX idx_pt_customer_id ON point_transactions(customer_id);
CREATE INDEX idx_pt_merchant_id ON point_transactions(merchant_id);
CREATE INDEX idx_pt_square_payment_id ON point_transactions(square_payment_id);
CREATE INDEX idx_pt_created_at ON point_transactions(created_at DESC);
-- Idempotency guard: one earned entry per Square payment per merchant
CREATE UNIQUE INDEX idx_pt_idempotency
  ON point_transactions(square_payment_id, merchant_id)
  WHERE square_payment_id IS NOT NULL AND transaction_type = 'earned';

-- ------------------------------------------------------------
-- reward_redemptions — tracks each redemption lifecycle
-- ------------------------------------------------------------
CREATE TABLE reward_redemptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customers(id),
  merchant_id   UUID NOT NULL REFERENCES merchants(id),
  reward_id     UUID NOT NULL REFERENCES rewards(id),
  points_spent  INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'approved',
  redeemed_at   TIMESTAMPTZ DEFAULT now(),
  reversed_at   TIMESTAMPTZ,
  merchant_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT redemptions_points_positive CHECK (points_spent > 0)
);
CREATE INDEX idx_redemptions_customer_id ON reward_redemptions(customer_id);
CREATE INDEX idx_redemptions_merchant_id ON reward_redemptions(merchant_id);

-- ------------------------------------------------------------
-- user_roles — role mapping for RLS policies
-- ------------------------------------------------------------
CREATE TABLE user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role       app_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- processed_webhook_events — webhook idempotency guard
-- ------------------------------------------------------------
CREATE TABLE processed_webhook_events (
  event_id     TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
