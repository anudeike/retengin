-- ============================================================
-- Migration 004: Webhook idempotency table
-- (Already created in 001; this migration documents the intent
--  and adds an optional TTL index for future cleanup.)
-- ============================================================

-- Add an index to support TTL-based pruning of old events (optional).
-- Old processed events older than 30 days can be safely deleted by a cron job.
CREATE INDEX IF NOT EXISTS idx_pwe_processed_at
  ON processed_webhook_events(processed_at);
