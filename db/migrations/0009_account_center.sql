CREATE TABLE account_addresses (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label text NOT NULL,
  recipient_name_enc bytea NOT NULL,
  phone_enc bytea NOT NULL,
  address_line_enc bytea NOT NULL,
  ward text NOT NULL,
  district text NOT NULL,
  province text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX idx_account_addresses_user_created ON account_addresses(user_id, created_at);
--> statement-breakpoint
CREATE UNIQUE INDEX account_addresses_one_default_per_user ON account_addresses(user_id) WHERE is_default;
--> statement-breakpoint
CREATE TABLE account_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  order_email boolean NOT NULL DEFAULT true,
  promotion_email boolean NOT NULL DEFAULT false,
  survey_email boolean NOT NULL DEFAULT true,
  promotion_sms boolean NOT NULL DEFAULT false,
  promotion_zalo boolean NOT NULL DEFAULT true,
  personalized_recommendations boolean NOT NULL DEFAULT true,
  share_usage_analytics boolean NOT NULL DEFAULT false,
  public_purchase_activity boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE purchase_orders (
  id text PRIMARY KEY,
  buyer_id uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED')),
  total_vnd bigint NOT NULL CHECK (total_vnd >= 0),
  item_count integer NOT NULL CHECK (item_count > 0),
  placed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX idx_purchase_orders_buyer_placed ON purchase_orders(buyer_id, placed_at DESC);
--> statement-breakpoint
ALTER TABLE account_addresses ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE account_preferences ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE account_addresses, account_preferences, purchase_orders FROM anon, authenticated;
