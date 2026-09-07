ALTER TABLE return_packages ADD COLUMN reserved_until timestamptz;
ALTER TABLE listings ADD COLUMN return_package_id text REFERENCES return_packages(id);
CREATE UNIQUE INDEX listings_return_package_unique ON listings(return_package_id) WHERE return_package_id IS NOT NULL;

CREATE TABLE listing_reviews (
  id text PRIMARY KEY,
  listing_id text NOT NULL REFERENCES listings(id),
  reviewer_id uuid NOT NULL REFERENCES profiles(id),
  decision text NOT NULL CHECK (decision IN ('APPROVE', 'REJECT')),
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 1 AND 1000),
  idempotency_key uuid NOT NULL,
  request_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_reviews_listing_unique UNIQUE (listing_id),
  CONSTRAINT listing_reviews_reviewer_key_unique UNIQUE (reviewer_id, idempotency_key)
);
