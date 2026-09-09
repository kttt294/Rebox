ALTER TABLE ledger_transactions DROP CONSTRAINT IF EXISTS ledger_transactions_kind_check;
ALTER TABLE ledger_transactions ADD CONSTRAINT ledger_transactions_kind_check CHECK (kind IN (
  'SANDBOX_BALANCE_SEED', 'HOLD_CREATE', 'HOLD_RELEASE', 'HOLD_CAPTURE_SIMULATED',
  'PROMOTION_CREDIT_SEED', 'PROMOTION_PURCHASE', 'PROMOTION_REFUND'
));

CREATE TABLE listing_promotions (
  id text PRIMARY KEY,
  listing_id text NOT NULL REFERENCES listings(id),
  shop_id text NOT NULL REFERENCES shops(id),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ENDED')),
  fee_vnd bigint NOT NULL CHECK (fee_vnd > 0),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  ended_at timestamptz,
  refunded_vnd bigint NOT NULL DEFAULT 0 CHECK (refunded_vnd >= 0 AND refunded_vnd <= fee_vnd),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE UNIQUE INDEX listing_promotions_one_active ON listing_promotions(listing_id) WHERE status = 'ACTIVE';
CREATE INDEX listing_promotions_home ON listing_promotions(status, ends_at, starts_at);

ALTER TABLE listing_promotions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE listing_promotions FROM anon, authenticated;
