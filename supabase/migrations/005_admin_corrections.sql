-- ============================================================
-- Migration 005: Admin corrections (function already in 003)
-- Add an index to quickly filter admin corrections from the ledger.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pt_admin_corrections
  ON point_transactions(created_at DESC)
  WHERE transaction_type = 'admin_correction';
