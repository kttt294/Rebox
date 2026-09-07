-- Demo-only fixtures for reviewing seller finance and buyer order screens.
-- Auth users are created through the Supabase Admin API before this file runs.

INSERT INTO profiles (id, status)
SELECT id, 'ACTIVE' FROM auth.users
WHERE email IN ('shop-test@rebox.test', 'buyer-test@rebox.test')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

INSERT INTO shops (id, display_name, legal_type, kyc_status, kyc_verified_at, status)
VALUES ('RBX-DEMO-SHOP-2026', 'REBOX Shop Test', 'INDIVIDUAL', 'VERIFIED', now(), 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, kyc_status = EXCLUDED.kyc_status, status = EXCLUDED.status;

INSERT INTO shop_memberships (user_id, shop_id, role, status)
SELECT id, 'RBX-DEMO-SHOP-2026', 'OWNER', 'ACTIVE' FROM auth.users WHERE email = 'shop-test@rebox.test'
ON CONFLICT (user_id, shop_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;

INSERT INTO categories (id, name, active, sort_order)
VALUES
  ('electronics', 'Điện tử', true, 10),
  ('fashion', 'Thời trang', true, 20),
  ('home', 'Nhà cửa và đời sống', true, 30),
  ('accessories', 'Phụ kiện', true, 40)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, active = EXCLUDED.active, sort_order = EXCLUDED.sort_order;

INSERT INTO listings (
  id, shop_id, title, description, category_id, condition_grade,
  condition_notes, price, weight_gram, images, price_source, status, published_at
)
VALUES
  ('RBX-DEMO-PRODUCT-001', 'RBX-DEMO-SHOP-2026', 'Tai nghe Sony WH-1000XM4', 'Kiện hoàn test cho giao diện đối soát.', 'electronics', 'GOOD', 'Vỏ kiện có vết móp nhẹ, chưa mở kiểm tra nội dung.', 950000, 620, '[]'::jsonb, 'SELLER_DECLARED', 'SOLD', now() - interval '5 days'),
  ('RBX-DEMO-PRODUCT-002', 'RBX-DEMO-SHOP-2026', 'Giày Jordan 4 Retro', 'Kiện hoàn test cho giao diện đối soát.', 'fashion', 'GOOD', 'Vỏ hộp có vết cấn nhẹ, chưa mở kiểm tra nội dung.', 850000, 1300, '[]'::jsonb, 'SELLER_DECLARED', 'SOLD', now() - interval '4 days'),
  ('RBX-DEMO-PRODUCT-003', 'RBX-DEMO-SHOP-2026', 'Váy satin dáng dài', 'Kiện hoàn test cho giao diện đối soát.', 'fashion', 'GOOD', 'Bao bì ngoài còn nguyên, chưa mở kiểm tra nội dung.', 225000, 480, '[]'::jsonb, 'SELLER_DECLARED', 'SOLD', now() - interval '3 days'),
  ('RBX-DEMO-PRODUCT-004', 'RBX-DEMO-SHOP-2026', 'Bàn phím cơ không dây', 'Kiện hoàn đang bán của shop test.', 'electronics', 'GOOD', 'Seal ngoài còn nguyên, chưa mở kiểm tra nội dung.', 690000, 980, '[]'::jsonb, 'SELLER_DECLARED', 'ACTIVE', now() - interval '2 days'),
  ('RBX-DEMO-PRODUCT-005', 'RBX-DEMO-SHOP-2026', 'Đèn bàn LED chống cận', 'Kiện hoàn đang bán của shop test.', 'home', 'GOOD', 'Thùng ngoài hơi móp, chưa mở kiểm tra nội dung.', 320000, 1700, '[]'::jsonb, 'SELLER_DECLARED', 'ACTIVE', now() - interval '1 day'),
  ('RBX-DEMO-PRODUCT-006', 'RBX-DEMO-SHOP-2026', 'Túi tote canvas nhiều ngăn', 'Kiện hoàn đang bán của shop test.', 'accessories', 'GOOD', 'Bao bì ngoài còn nguyên, chưa mở kiểm tra nội dung.', 180000, 350, '[]'::jsonb, 'SELLER_DECLARED', 'ACTIVE', now())
ON CONFLICT (id) DO UPDATE SET
  shop_id = EXCLUDED.shop_id, title = EXCLUDED.title, description = EXCLUDED.description,
  category_id = EXCLUDED.category_id, condition_grade = EXCLUDED.condition_grade,
  condition_notes = EXCLUDED.condition_notes, price = EXCLUDED.price,
  weight_gram = EXCLUDED.weight_gram, status = EXCLUDED.status, published_at = EXCLUDED.published_at;

INSERT INTO purchase_orders (id, buyer_id, shop_id, status, total_vnd, item_count, placed_at, updated_at)
SELECT order_data.id, users.id, 'RBX-DEMO-SHOP-2026', order_data.status, order_data.total_vnd, 1, order_data.placed_at, now()
FROM auth.users AS users
CROSS JOIN (VALUES
  ('RBX-DEMO-001', 'COMPLETED', 950000::bigint, now() - interval '4 days'),
  ('RBX-DEMO-002', 'SHIPPING', 850000::bigint, now() - interval '2 days'),
  ('RBX-DEMO-003', 'COMPLETED', 225000::bigint, now() - interval '1 day')
) AS order_data(id, status, total_vnd, placed_at)
WHERE users.email = 'buyer-test@rebox.test'
ON CONFLICT (id) DO UPDATE SET
  buyer_id = EXCLUDED.buyer_id, shop_id = EXCLUDED.shop_id, status = EXCLUDED.status, total_vnd = EXCLUDED.total_vnd,
  item_count = EXCLUDED.item_count, placed_at = EXCLUDED.placed_at, updated_at = now();

INSERT INTO seller_finance_snapshots (
  shop_id, available_balance_vnd, held_balance_vnd, net_revenue_vnd,
  monthly_revenue, product_revenue, wallet_transactions, updated_at
)
VALUES (
  'RBX-DEMO-SHOP-2026', 300000, 850000, 432000,
  '[{"label":"T1","amountVnd":320000},{"label":"T2","amountVnd":365000},{"label":"T3","amountVnd":410000},{"label":"T4","amountVnd":398000},{"label":"T5","amountVnd":455000},{"label":"T6","amountVnd":432000}]'::jsonb,
  '[{"label":"Sony XM4","amountVnd":950000},{"label":"Jordan 4","amountVnd":850000},{"label":"Váy Satin","amountVnd":225000},{"label":"Phụ kiện","amountVnd":180000}]'::jsonb,
  '[{"code":"#RBX-DEMO-003","kind":"REVENUE","detail":"Váy satin dáng dài — đã trừ phí nền tảng","amountVnd":202500,"occurredAt":"2026-09-05T03:00:00.000Z"},{"code":"#RBX-DEMO-002","kind":"HOLD","detail":"Giày Jordan 4 Retro — chờ người mua xác nhận","amountVnd":-850000,"occurredAt":"2026-09-04T03:00:00.000Z"},{"code":"#RBX-DEMO-001","kind":"REVENUE","detail":"Tai nghe Sony WH-1000XM4 — đã trừ phí nền tảng","amountVnd":855000,"occurredAt":"2026-09-02T03:00:00.000Z"},{"code":"#RBX-DEPOSIT","kind":"DEPOSIT","detail":"Nạp số dư ký quỹ ban đầu","amountVnd":300000,"occurredAt":"2026-09-01T03:00:00.000Z"}]'::jsonb,
  now()
)
ON CONFLICT (shop_id) DO UPDATE SET
  available_balance_vnd = EXCLUDED.available_balance_vnd,
  held_balance_vnd = EXCLUDED.held_balance_vnd,
  net_revenue_vnd = EXCLUDED.net_revenue_vnd,
  monthly_revenue = EXCLUDED.monthly_revenue,
  product_revenue = EXCLUDED.product_revenue,
  wallet_transactions = EXCLUDED.wallet_transactions,
  updated_at = now();
