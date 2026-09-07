CREATE TABLE shop_reviews (
  id text PRIMARY KEY,
  shop_id text NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content text NOT NULL CHECK (char_length(content) BETWEEN 3 AND 1000 AND content = btrim(content)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_reviews_shop_reviewer_unique UNIQUE (shop_id, reviewer_id)
);

CREATE INDEX idx_shop_reviews_shop_updated ON shop_reviews(shop_id, updated_at DESC);

ALTER TABLE shop_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE shop_reviews FROM anon, authenticated;
