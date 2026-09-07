CREATE TABLE idempotency_records (
  actor_id uuid NOT NULL REFERENCES profiles(id), scope text NOT NULL, idempotency_key text NOT NULL,
  request_hash text NOT NULL, response jsonb, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, scope, idempotency_key)
);

CREATE TABLE ledger_transactions (
  id text PRIMARY KEY, kind text NOT NULL CHECK (kind IN ('SANDBOX_BALANCE_SEED','HOLD_CREATE','HOLD_RELEASE','HOLD_CAPTURE_SIMULATED')),
  reference_id text NOT NULL, status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','POSTED')),
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (kind, reference_id)
);
CREATE TABLE ledger_postings (
  id text PRIMARY KEY, transaction_id text NOT NULL REFERENCES ledger_transactions(id), account_key text NOT NULL,
  amount_vnd bigint NOT NULL CHECK (amount_vnd <> 0), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_postings_account ON ledger_postings(account_key, created_at);

CREATE OR REPLACE FUNCTION rebox_guard_ledger() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'ledger_transactions' THEN
    IF OLD.status = 'POSTED' THEN RAISE EXCEPTION 'POSTED_LEDGER_IMMUTABLE'; END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM ledger_transactions WHERE id = OLD.transaction_id AND status = 'POSTED') THEN
      RAISE EXCEPTION 'POSTED_LEDGER_IMMUTABLE';
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER ledger_transactions_immutable BEFORE UPDATE OR DELETE ON ledger_transactions FOR EACH ROW EXECUTE FUNCTION rebox_guard_ledger();
CREATE TRIGGER ledger_postings_immutable BEFORE UPDATE OR DELETE ON ledger_postings FOR EACH ROW EXECUTE FUNCTION rebox_guard_ledger();

CREATE OR REPLACE FUNCTION rebox_check_ledger_balance() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'POSTED' AND (SELECT coalesce(sum(amount_vnd), 0) FROM ledger_postings WHERE transaction_id = NEW.id) <> 0 THEN
    RAISE EXCEPTION 'UNBALANCED_LEDGER_TRANSACTION';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ledger_transactions_balanced BEFORE UPDATE OF status ON ledger_transactions FOR EACH ROW EXECUTE FUNCTION rebox_check_ledger_balance();

CREATE TABLE orders (
  id text PRIMARY KEY, buyer_id uuid NOT NULL REFERENCES profiles(id), status text NOT NULL DEFAULT 'RESERVED'
    CHECK (status IN ('RESERVED','CONFIRMED','READY_TO_SHIP','PICKED_UP','IN_TRANSIT','DELIVERED','COMPLETED','EXPIRED','CANCELLED_BY_SELLER','CANCELLED_BY_PICKUP_FAILURE','DELIVERY_FAILED')),
  commerce_mode text NOT NULL DEFAULT 'SANDBOX' CHECK (commerce_mode = 'SANDBOX'), payment_method text,
  subtotal_vnd bigint NOT NULL CHECK (subtotal_vnd > 0), fee_vnd bigint NOT NULL CHECK (fee_vnd >= 0),
  total_vnd bigint NOT NULL CHECK (total_vnd = subtotal_vnd + fee_vnd),
  address_snapshot_enc bytea NOT NULL, address_hash text NOT NULL, fee_snapshot jsonb NOT NULL,
  expires_at timestamptz NOT NULL, confirmed_at timestamptz, completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_buyer_created ON orders(buyer_id, created_at DESC);
CREATE TABLE sub_orders (
  id text PRIMARY KEY, order_id text NOT NULL UNIQUE REFERENCES orders(id), shop_id text NOT NULL REFERENCES shops(id),
  shop_snapshot jsonb NOT NULL, status text NOT NULL DEFAULT 'RESERVED', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sub_orders_shop_created ON sub_orders(shop_id, created_at DESC);
CREATE TABLE sub_order_items (
  id text PRIMARY KEY, sub_order_id text NOT NULL REFERENCES sub_orders(id), listing_id text NOT NULL REFERENCES listings(id),
  return_package_id text NOT NULL UNIQUE REFERENCES return_packages(id), item_snapshot jsonb NOT NULL,
  amount_vnd bigint NOT NULL CHECK (amount_vnd > 0), quantity integer NOT NULL DEFAULT 1 CHECK (quantity = 1)
);
CREATE TABLE fund_holds (
  id text PRIMARY KEY, order_id text NOT NULL UNIQUE REFERENCES orders(id), shop_id text NOT NULL REFERENCES shops(id),
  amount_vnd bigint NOT NULL CHECK (amount_vnd > 0), status text NOT NULL DEFAULT 'HELD' CHECK (status IN ('HELD','RELEASED','CAPTURED_SIMULATED')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE order_events (
  id text PRIMARY KEY, order_id text NOT NULL REFERENCES orders(id), event_key text NOT NULL UNIQUE,
  from_status text, to_status text NOT NULL, source text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE shipments (
  id text PRIMARY KEY, order_id text NOT NULL UNIQUE REFERENCES orders(id), provider text NOT NULL DEFAULT 'FAKE',
  provider_key text NOT NULL UNIQUE, tracking_code text NOT NULL UNIQUE, status text NOT NULL,
  label_payload text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE carrier_events (
  id text PRIMARY KEY, shipment_id text NOT NULL REFERENCES shipments(id), provider_event_id text NOT NULL UNIQUE,
  payload_hash text NOT NULL, normalized_status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE processing_records (
  id text PRIMARY KEY, actor_id uuid NOT NULL REFERENCES profiles(id), purpose text NOT NULL,
  target_type text NOT NULL, target_id text NOT NULL, notice_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE dispute_cases (
  id text PRIMARY KEY, order_id text NOT NULL REFERENCES orders(id), buyer_id uuid NOT NULL REFERENCES profiles(id),
  shop_id text NOT NULL REFERENCES shops(id), status text NOT NULL DEFAULT 'OPEN', flags text[] NOT NULL DEFAULT '{}',
  reason text NOT NULL, buyer_payable_vnd bigint NOT NULL, appeal_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(order_id)
);
CREATE TABLE dispute_case_events (
  id text PRIMARY KEY, case_id text NOT NULL REFERENCES dispute_cases(id), actor_id uuid NOT NULL REFERENCES profiles(id),
  type text NOT NULL, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE dispute_evidences (
  id text PRIMARY KEY, case_id text NOT NULL REFERENCES dispute_cases(id), uploader_id uuid NOT NULL REFERENCES profiles(id),
  processing_record_id text NOT NULL REFERENCES processing_records(id), provider text NOT NULL DEFAULT 'FAKE_METADATA',
  object_key text NOT NULL, object_version text NOT NULL, checksum text NOT NULL, original_owner text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(provider, object_key, object_version)
);
CREATE TABLE evidence_derivatives (
  id text PRIMARY KEY, evidence_id text NOT NULL UNIQUE REFERENCES dispute_evidences(id), object_key text NOT NULL,
  object_version text NOT NULL, checksum text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE refunds (
  id text PRIMARY KEY, case_id text NOT NULL REFERENCES dispute_cases(id), order_id text NOT NULL REFERENCES orders(id),
  amount_vnd bigint NOT NULL CHECK (amount_vnd > 0), funder text NOT NULL, return_required boolean NOT NULL,
  status text NOT NULL CHECK (status IN ('APPROVED','WAITING_RETURN','WAITING_REVIEW','PAYOUT_READY','SELLER_ACTION_REQUIRED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id text PRIMARY KEY, user_id uuid NOT NULL REFERENCES profiles(id), stable_key text NOT NULL UNIQUE,
  kind text NOT NULL, mandatory boolean NOT NULL DEFAULT true, title text NOT NULL, body text NOT NULL,
  read_at timestamptz, delivered_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE TABLE legal_artifacts (
  slug text NOT NULL, version text NOT NULL, title text NOT NULL, body text NOT NULL, body_hash text NOT NULL,
  effective_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(slug, version), UNIQUE(slug, body_hash)
);
CREATE TABLE legal_acceptances (
  id text PRIMARY KEY, user_id uuid NOT NULL REFERENCES profiles(id), slug text NOT NULL, version text NOT NULL,
  source text NOT NULL, accepted_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(slug, version) REFERENCES legal_artifacts(slug, version), UNIQUE(user_id, slug, version)
);
CREATE OR REPLACE FUNCTION rebox_immutable_legal_artifact() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'LEGAL_ARTIFACT_IMMUTABLE'; END $$;
CREATE TRIGGER legal_artifacts_immutable BEFORE UPDATE OR DELETE ON legal_artifacts FOR EACH ROW EXECUTE FUNCTION rebox_immutable_legal_artifact();
CREATE TABLE support_tickets (
  id text PRIMARY KEY, user_id uuid NOT NULL REFERENCES profiles(id), category text NOT NULL, content text NOT NULL,
  order_id text REFERENCES orders(id), case_id text REFERENCES dispute_cases(id), status text NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE support_ticket_events (
  id text PRIMARY KEY, ticket_id text NOT NULL REFERENCES support_tickets(id), actor_id uuid NOT NULL REFERENCES profiles(id),
  body text NOT NULL, status text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE privacy_requests (
  id text PRIMARY KEY, user_id uuid NOT NULL REFERENCES profiles(id), type text NOT NULL CHECK(type IN ('ACCESS_EXPORT','CORRECTION','DELETION_ANONYMIZATION')),
  status text NOT NULL DEFAULT 'RECEIVED', receipt jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO legal_artifacts(slug, version, title, body, body_hash, effective_at) VALUES
('marketplace-rules','2026-09-07','Quy chế sàn','Quy chế vận hành REBOX sandbox. Không phát sinh thanh toán thật.',encode(digest('Quy chế vận hành REBOX sandbox. Không phát sinh thanh toán thật.','sha256'),'hex'),now()),
('privacy-policy','2026-09-07','Chính sách bảo mật','REBOX chỉ dùng dữ liệu synthetic trong MVP sandbox.',encode(digest('REBOX chỉ dùng dữ liệu synthetic trong MVP sandbox.','sha256'),'hex'),now()),
('dispute-process','2026-09-07','Giải quyết tranh chấp','Tranh chấp được tiếp nhận kể cả khi không có video.',encode(digest('Tranh chấp được tiếp nhận kể cả khi không có video.','sha256'),'hex'),now()),
('seller-terms','2026-09-07','Điều khoản người bán','Số dư và vận chuyển trong MVP đều là dữ liệu mô phỏng.',encode(digest('Số dư và vận chuyển trong MVP đều là dữ liệu mô phỏng.','sha256'),'hex'),now()),
('processing-notice','2026-09-07','Thông báo xử lý dữ liệu','eKYC và evidence cần processing record trước khi xử lý.',encode(digest('eKYC và evidence cần processing record trước khi xử lý.','sha256'),'hex'),now());
