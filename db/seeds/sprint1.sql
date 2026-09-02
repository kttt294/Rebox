-- Synthetic fixtures only. Password login is intentionally not seeded here;
-- E2E tests create disposable users through Supabase Auth.
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'verified-seller@rebox.test',
    crypt('Synthetic-Test-Password-123!', gen_salt('bf')), now(),
    '', '', '', '',
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'pending-seller@rebox.test',
    crypt('Synthetic-Test-Password-123!', gen_salt('bf')), now(),
    '', '', '', '',
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  )
ON CONFLICT (id) DO UPDATE
SET encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    confirmation_token = '', recovery_token = '',
    email_change_token_new = '', email_change = '',
    updated_at = now();

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
  (
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '{"sub":"10000000-0000-4000-8000-000000000001","email":"verified-seller@rebox.test","email_verified":true}',
    'email', now(), now(), now()
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    '{"sub":"10000000-0000-4000-8000-000000000002","email":"pending-seller@rebox.test","email_verified":true}',
    'email', now(), now(), now()
  )
ON CONFLICT (provider_id, provider) DO NOTHING;

INSERT INTO profiles (id, status)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'ACTIVE'),
  ('10000000-0000-4000-8000-000000000002', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO shops (id, display_name, legal_type, kyc_status, kyc_verified_at, status)
VALUES
  ('RBX-01JTESTVERIFIED0000000000', 'REBOX Verified Fixture', 'INDIVIDUAL', 'VERIFIED', now(), 'ACTIVE'),
  ('RBX-01JTESTPENDING00000000000', 'REBOX Pending Fixture', 'INDIVIDUAL', 'PENDING', NULL, 'ONBOARDING')
ON CONFLICT (id) DO NOTHING;

-- Catalog data is persisted in PostgreSQL and consumed by the storefront API.
INSERT INTO listings (
  id, shop_id, title, description, category_id, condition_grade,
  condition_notes, price, weight_gram, images, price_source, status, published_at
)
VALUES
  ('RBX-01JTESTCATALOG-TECH-001', 'RBX-01JTESTVERIFIED0000000000',
   'Tai nghe Bluetooth chống ồn', 'Tai nghe hàng hoàn đã được kiểm tra kết nối và pin.',
   'electronics', 'LIKE_NEW_99', 'Hộp có vết móp nhẹ, thiết bị hoạt động tốt', 299000, 320, '[]'::jsonb, 'SELLER_DECLARED', 'ACTIVE', now() - interval '1 hour'),
  ('RBX-01JTESTCATALOG-TECH-002', 'RBX-01JTESTVERIFIED0000000000',
   'Đồng hồ thông minh pin 7 ngày', 'Đồng hồ đổi trả, đầy đủ dây đeo và cáp sạc.',
   'electronics', 'GOOD', 'Mặt kính có một vết xước nhỏ ở cạnh', 479000, 180, '[]'::jsonb, 'SELLER_DECLARED', 'ACTIVE', now() - interval '2 hours'),
  ('RBX-01JTESTCATALOG-HOME-001', 'RBX-01JTESTVERIFIED0000000000',
   'Máy hút bụi cầm tay', 'Máy hút bụi hoàn đơn đã vệ sinh và kiểm tra lực hút.',
   'home', 'LIKE_NEW_99', 'Thiếu túi nilon bọc ngoài, phụ kiện còn đủ', 549000, 2100, '[]'::jsonb, 'SELLER_DECLARED', 'ACTIVE', now() - interval '3 hours'),
  ('RBX-01JTESTCATALOG-HOME-002', 'RBX-01JTESTVERIFIED0000000000',
   'Đèn bàn LED ba chế độ sáng', 'Đèn bàn đổi trả còn nguyên bộ nguồn.',
   'home', 'GOOD', 'Chân đế có vết cấn nhỏ không ảnh hưởng sử dụng', 259000, 950, '[]'::jsonb, 'SELLER_DECLARED', 'ACTIVE', now() - interval '4 hours'),
  ('RBX-01JTESTCATALOG-FASHION-001', 'RBX-01JTESTVERIFIED0000000000',
   'Áo khoác nỉ form rộng', 'Áo khoác khách đổi size, chưa qua sử dụng.',
   'fashion', 'LIKE_NEW_99', 'Không còn tem giấy, vải và khóa kéo nguyên vẹn', 219000, 650, '[]'::jsonb, 'SELLER_DECLARED', 'ACTIVE', now() - interval '5 hours'),
  ('RBX-01JTESTCATALOG-FASHION-002', 'RBX-01JTESTVERIFIED0000000000',
   'Túi tote canvas nhiều ngăn', 'Túi hoàn đơn đã kiểm tra đường may và khóa.',
   'fashion', 'GOOD', 'Có vết bụi nhẹ ở đáy túi', 119000, 380, '[]'::jsonb, 'SELLER_DECLARED', 'ACTIVE', now() - interval '6 hours'),
  ('RBX-01JTESTCATALOG-BEAUTY-001', 'RBX-01JTESTVERIFIED0000000000',
   'Máy sấy tóc hai chiều', 'Máy sấy đổi trả đã kiểm tra nhiệt và quạt.',
   'beauty', 'GOOD', 'Vỏ hộp rách, thân máy có xước mảnh', 329000, 780, '[]'::jsonb, 'SELLER_DECLARED', 'ACTIVE', now() - interval '7 hours'),
  ('RBX-01JTESTCATALOG-BEAUTY-002', 'RBX-01JTESTVERIFIED0000000000',
   'Bộ chăm sóc da dịu nhẹ', 'Bộ sản phẩm hoàn do khách đặt nhầm, chưa mở nắp.',
   'beauty', 'NEW_SEALED', 'Seal từng sản phẩm còn nguyên, hộp ngoài hơi móp', 189000, 620, '[]'::jsonb, 'SELLER_DECLARED', 'ACTIVE', now() - interval '8 hours'),
  ('RBX-01JTESTCATALOG-ACCESSORY-001', 'RBX-01JTESTVERIFIED0000000000',
   'Sạc nhanh GaN 65W', 'Củ sạc đổi trả đã kiểm tra đủ các cổng ra.',
   'accessories', 'LIKE_NEW_99', 'Không còn seal hộp, củ sạc không trầy xước', 429000, 210, '[]'::jsonb, 'SELLER_DECLARED', 'ACTIVE', now() - interval '9 hours'),
  ('RBX-01JTESTCATALOG-ACCESSORY-002', 'RBX-01JTESTVERIFIED0000000000',
   'Cáp sạc bọc dù 100W', 'Cáp hoàn đơn đã đo công suất và kiểm tra đầu nối.',
   'accessories', 'GOOD', 'Bao bì đã mở, dây hoạt động ổn định', 89000, 90, '[]'::jsonb, 'SELLER_DECLARED', 'ACTIVE', now() - interval '10 hours'),
  ('RBX-01JTESTCATALOG-LIFESTYLE-001', 'RBX-01JTESTVERIFIED0000000000',
   'Quạt mini cầm tay', 'Quạt đổi trả đã kiểm tra pin và các mức gió.',
   'lifestyle', 'GOOD', 'Thân quạt có vết xước nhẹ gần nút nguồn', 139000, 260, '[]'::jsonb, 'SELLER_DECLARED', 'ACTIVE', now() - interval '11 hours')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category_id = EXCLUDED.category_id,
  condition_grade = EXCLUDED.condition_grade,
  condition_notes = EXCLUDED.condition_notes,
  price = EXCLUDED.price,
  weight_gram = EXCLUDED.weight_gram,
  status = EXCLUDED.status,
  published_at = EXCLUDED.published_at;

INSERT INTO shop_memberships (user_id, shop_id, role, status)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'RBX-01JTESTVERIFIED0000000000', 'OWNER', 'ACTIVE'),
  ('10000000-0000-4000-8000-000000000002', 'RBX-01JTESTPENDING00000000000', 'OWNER', 'ACTIVE')
ON CONFLICT (user_id, shop_id) DO NOTHING;

INSERT INTO listings (
  id, shop_id, title, description, category_id, condition_grade,
  condition_notes, price, weight_gram, images, price_source, status, published_at
)
VALUES
  (
    'RBX-01JTESTPUBLICLISTING00000', 'RBX-01JTESTVERIFIED0000000000',
    'Áo khoác hoàn đơn synthetic', 'Fixture công khai cho smoke test.',
    'fashion', 'GOOD', 'Xước nhẹ ở khóa kéo', 120000, 500,
    '[]'::jsonb, 'SELLER_DECLARED', 'ACTIVE', now()
  ),
  (
    'RBX-01JTESTDRAFTLISTING000000', 'RBX-01JTESTVERIFIED0000000000',
    'Listing nháp không công khai', NULL,
    'fashion', 'GOOD', 'Synthetic draft', 90000, 400,
    '[]'::jsonb, 'SELLER_DECLARED', 'DRAFT', NULL
  )
ON CONFLICT (id) DO NOTHING;
