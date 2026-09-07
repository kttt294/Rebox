ALTER TABLE purchase_orders ADD COLUMN shop_id text REFERENCES shops(id);

CREATE INDEX idx_purchase_orders_buyer_shop_status ON purchase_orders(buyer_id, shop_id, status);
