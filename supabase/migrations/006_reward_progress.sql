-- ============================================================
-- Migration 006: Reward Progress & Visibility System
-- ============================================================

-- Add messaging style to merchant_point_rules
-- 'points_away' → "X pts to go"
-- 'spend_more'  → "Spend $Y more"
ALTER TABLE merchant_point_rules
  ADD COLUMN messaging_style TEXT NOT NULL DEFAULT 'points_away'
  CONSTRAINT mpr_messaging_style_check CHECK (messaging_style IN ('points_away', 'spend_more'));

-- Add Taplo-global points balance to customers
-- Used by the referral system (Plan 2) as well
ALTER TABLE customers
  ADD COLUMN taplo_points INTEGER NOT NULL DEFAULT 0
  CONSTRAINT customers_taplo_points_non_negative CHECK (taplo_points >= 0);
