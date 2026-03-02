CREATE TABLE loyalty_checkins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at  TIMESTAMPTZ,
  payment_id  TEXT
);

-- Partial index: only unclaimed rows, ordered FIFO — fast lookup
CREATE INDEX idx_loyalty_checkins_merchant
  ON loyalty_checkins(merchant_id, created_at ASC)
  WHERE claimed_at IS NULL;

-- RLS: service role handles inserts (via API route); merchants can view their own
ALTER TABLE loyalty_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkins: merchant can read own"
  ON loyalty_checkins FOR SELECT
  USING (merchant_id = public.get_merchant_id());
