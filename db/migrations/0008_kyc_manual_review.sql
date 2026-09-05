CREATE TABLE platform_staff_roles (
  user_id uuid NOT NULL REFERENCES profiles(id),
  role text NOT NULL CHECK (role IN ('SUPPORT', 'MODERATOR', 'DISPUTE_ARBITRATOR', 'SUPER_ADMIN')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);
--> statement-breakpoint
CREATE TABLE seller_kyc_reviews (
  id text PRIMARY KEY,
  kyc_id text NOT NULL REFERENCES seller_kyc(id),
  reviewer_id uuid NOT NULL REFERENCES profiles(id),
  decision text NOT NULL CHECK (decision IN ('APPROVE', 'REJECT')),
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 1 AND 1000 AND reason = btrim(reason)),
  idempotency_key uuid NOT NULL,
  request_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seller_kyc_reviews_kyc_unique UNIQUE (kyc_id),
  CONSTRAINT seller_kyc_reviews_reviewer_key_unique UNIQUE (reviewer_id, idempotency_key)
);
--> statement-breakpoint
CREATE FUNCTION prevent_kyc_review_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'KYC reviews are append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER seller_kyc_reviews_immutable BEFORE UPDATE OR DELETE ON seller_kyc_reviews
FOR EACH ROW EXECUTE FUNCTION prevent_kyc_review_mutation();
--> statement-breakpoint
ALTER TABLE platform_staff_roles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE seller_kyc_reviews ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE platform_staff_roles, seller_kyc_reviews FROM anon, authenticated;
--> statement-breakpoint
CREATE INDEX idx_seller_kyc_manual_queue ON seller_kyc (created_at, id) WHERE status = 'MANUAL_REVIEW';
