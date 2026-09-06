-- ponytail: one persisted snapshot per shop; replace with an append-only ledger when payments are implemented.
CREATE TABLE seller_finance_snapshots (
  shop_id text PRIMARY KEY REFERENCES shops(id) ON DELETE CASCADE,
  available_balance_vnd bigint NOT NULL CHECK (available_balance_vnd >= 0),
  held_balance_vnd bigint NOT NULL CHECK (held_balance_vnd >= 0),
  net_revenue_vnd bigint NOT NULL CHECK (net_revenue_vnd >= 0),
  monthly_revenue jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(monthly_revenue) = 'array'),
  product_revenue jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(product_revenue) = 'array'),
  wallet_transactions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(wallet_transactions) = 'array'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE seller_finance_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE seller_finance_snapshots FROM anon, authenticated;
