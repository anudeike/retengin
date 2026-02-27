-- ============================================================
-- Migration 008: Email Preferences
-- ============================================================

-- Global opt-out on customers
ALTER TABLE customers
  ADD COLUMN email_global_opt_out BOOLEAN NOT NULL DEFAULT false;

-- Per-merchant opt-out
CREATE TABLE customer_merchant_email_prefs (
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  opted_out   BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (customer_id, merchant_id)
);

-- Email kill-switch per merchant (default true = enabled)
ALTER TABLE merchants
  ADD COLUMN emails_enabled BOOLEAN NOT NULL DEFAULT true;
