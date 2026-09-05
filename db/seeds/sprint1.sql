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
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'moderator@rebox.test',
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
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000003',
    '{"sub":"10000000-0000-4000-8000-000000000003","email":"moderator@rebox.test","email_verified":true}',
    'email', now(), now(), now()
  )
ON CONFLICT (provider_id, provider) DO NOTHING;

INSERT INTO profiles (id, status)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'ACTIVE'),
  ('10000000-0000-4000-8000-000000000002', 'ACTIVE'),
  ('10000000-0000-4000-8000-000000000003', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Local/test only. Staff still must enroll and verify TOTP to obtain AAL2.
INSERT INTO platform_staff_roles (user_id, role, status)
VALUES ('10000000-0000-4000-8000-000000000003', 'MODERATOR', 'ACTIVE')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO categories (id, name, active, sort_order)
VALUES
  ('fashion', 'Thời trang', true, 10),
  ('electronics', 'Điện tử đã qua sử dụng', true, 20),
  ('home', 'Nhà cửa và đời sống', true, 30),
  ('accessories', 'Phụ kiện', true, 40),
  ('lifestyle', 'Tiện ích đời sống', true, 50),
  ('beauty', 'Mỹ phẩm và chăm sóc cá nhân', true, 60),
  ('cosmetics', 'Mỹ phẩm', true, 70),
  ('supplements', 'Thực phẩm chức năng', true, 80),
  ('packaged-food', 'Thực phẩm bao gói sẵn', true, 90),
  ('infant-nutrition', 'Dinh dưỡng cho trẻ dưới 24 tháng', true, 100),
  ('medical-devices', 'Trang thiết bị y tế', true, 110),
  ('childrens-toys', 'Đồ chơi trẻ em', true, 120),
  ('regulated-electronics', 'Thiết bị điện cần chứng nhận hợp quy', true, 130),
  ('motorcycle-helmets', 'Mũ bảo hiểm mô tô, xe máy', true, 140),
  ('luxury-goods', 'Hàng hiệu và thương hiệu cao cấp', true, 150),
  ('alcohol', 'Rượu và đồ uống có cồn', true, 160),
  ('jewelry-gemstones', 'Vàng trang sức và đá quý', true, 170),
  ('publications', 'Sách và ấn phẩm', true, 180),
  ('used-electronics', 'Đồ điện tử đã qua sử dụng', true, 190),
  ('tried-fashion', 'Quần áo, giày dép đã thử', true, 200),
  ('missing-accessories', 'Hàng thiếu phụ kiện hoặc hộp', true, 210),
  ('cosmetic-defect', 'Hàng lỗi ngoại hình', true, 220),
  ('near-expiry', 'Hàng cận hạn sử dụng', true, 230),
  ('banned-drugs', 'Ma túy và tiền chất', true, 1000),
  ('banned-wildlife', 'Mẫu vật động thực vật hoang dã nguy cấp', true, 1010),
  ('banned-human-body', 'Mô và bộ phận cơ thể người', true, 1020),
  ('banned-weapons-explosives', 'Vũ khí, pháo và vật liệu nổ', true, 1030),
  ('banned-illegal-content', 'Văn hóa phẩm bất hợp pháp', true, 1040),
  ('banned-medicines', 'Thuốc chữa bệnh', true, 1050),
  ('banned-tobacco-vape', 'Thuốc lá và thuốc lá điện tử', true, 1060),
  ('banned-counterfeit-illicit', 'Hàng giả, nhập lậu hoặc không rõ nguồn gốc', true, 1070),
  ('banned-financial-identity', 'Tiền tệ, tài khoản và giấy tờ định danh', true, 1080),
  ('banned-spyware-jammers', 'Thiết bị gián điệp hoặc phá sóng', true, 1090),
  ('banned-live-animals-hazardous', 'Động vật sống và chất nguy hại', true, 1100),
  ('banned-cold-chain-hazardous', 'Hàng cần chuỗi lạnh hoặc dễ cháy nổ', true, 1110),
  ('banned-expired-products', 'Sản phẩm đã quá hạn sử dụng', true, 1120)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order;

INSERT INTO restricted_categories (
  id, category_id, policy_level, rule_snapshot, policy_version,
  effective_from, effective_to, approved_by
)
SELECT
  'RP-' || category_id || '-20260825', category_id, policy_level, rule_snapshot,
  '2026-08-25-dev', '2026-08-25T00:00:00+07'::timestamptz, NULL,
  '10000000-0000-4000-8000-000000000001'::uuid
FROM (VALUES
  ('fashion', 'DISCLOSURE', '{"requiredFields":["conditionGrade","conditionNotes"],"minimumConditionNotesLength":20,"source":"docs/06-DANH-MUC-HANG-CAM.md#4"}'::jsonb),
  ('electronics', 'DISCLOSURE', '{"requiredFields":["conditionGrade","conditionNotes"],"minimumConditionNotesLength":20,"source":"docs/06-DANH-MUC-HANG-CAM.md#4"}'::jsonb),
  ('used-electronics', 'DISCLOSURE', '{"requiredFields":["conditionGrade","conditionNotes"],"minimumConditionNotesLength":20,"source":"docs/06-DANH-MUC-HANG-CAM.md#4"}'::jsonb),
  ('tried-fashion', 'DISCLOSURE', '{"requiredFields":["conditionGrade","conditionNotes"],"minimumConditionNotesLength":20,"source":"docs/06-DANH-MUC-HANG-CAM.md#4"}'::jsonb),
  ('missing-accessories', 'DISCLOSURE', '{"requiredFields":["conditionGrade","conditionNotes"],"minimumConditionNotesLength":20,"source":"docs/06-DANH-MUC-HANG-CAM.md#4"}'::jsonb),
  ('cosmetic-defect', 'DISCLOSURE', '{"requiredFields":["conditionGrade","conditionNotes"],"minimumConditionNotesLength":20,"source":"docs/06-DANH-MUC-HANG-CAM.md#4"}'::jsonb),
  ('near-expiry', 'DISCLOSURE', '{"requiredFields":["conditionGrade","conditionNotes"],"minimumConditionNotesLength":20,"source":"docs/06-DANH-MUC-HANG-CAM.md#4"}'::jsonb),
  ('beauty', 'MANUAL_REVIEW', '{"requiredEvidence":["Ảnh nhãn, số công bố và hạn sử dụng"],"source":"docs/06-DANH-MUC-HANG-CAM.md#3"}'::jsonb),
  ('cosmetics', 'MANUAL_REVIEW', '{"requiredEvidence":["Ảnh nhãn, số công bố và hạn sử dụng"],"source":"docs/06-DANH-MUC-HANG-CAM.md#3"}'::jsonb),
  ('supplements', 'MANUAL_REVIEW', '{"requiredEvidence":["Ảnh bản công bố và hạn sử dụng"],"source":"docs/06-DANH-MUC-HANG-CAM.md#3"}'::jsonb),
  ('packaged-food', 'MANUAL_REVIEW', '{"requiredEvidence":["Ảnh nhãn và hạn sử dụng"],"source":"docs/06-DANH-MUC-HANG-CAM.md#3"}'::jsonb),
  ('infant-nutrition', 'MANUAL_REVIEW', '{"legalDecisionPending":true,"source":"docs/06-DANH-MUC-HANG-CAM.md#8"}'::jsonb),
  ('medical-devices', 'MANUAL_REVIEW', '{"legalDecisionPending":true,"requiredEvidence":["Phân loại thiết bị và giấy tờ phù hợp"],"source":"docs/06-DANH-MUC-HANG-CAM.md#3"}'::jsonb),
  ('childrens-toys', 'MANUAL_REVIEW', '{"requiredEvidence":["Ảnh dấu hợp quy CR"],"source":"docs/06-DANH-MUC-HANG-CAM.md#3"}'::jsonb),
  ('regulated-electronics', 'MANUAL_REVIEW', '{"requiredEvidence":["Ảnh dấu hợp quy CR"],"source":"docs/06-DANH-MUC-HANG-CAM.md#3"}'::jsonb),
  ('motorcycle-helmets', 'MANUAL_REVIEW', '{"requiredEvidence":["Ảnh dấu hợp quy CR"],"source":"docs/06-DANH-MUC-HANG-CAM.md#3"}'::jsonb),
  ('luxury-goods', 'MANUAL_REVIEW', '{"requiredEvidence":["Ảnh tem, mã, hộp hoặc phiếu bảo hành"],"source":"docs/06-DANH-MUC-HANG-CAM.md#3"}'::jsonb),
  ('alcohol', 'MANUAL_REVIEW', '{"legalDecisionPending":true,"source":"docs/06-DANH-MUC-HANG-CAM.md#8"}'::jsonb),
  ('jewelry-gemstones', 'MANUAL_REVIEW', '{"requiredEvidence":["Giấy tờ nguồn gốc và điều kiện kinh doanh"],"source":"docs/06-DANH-MUC-HANG-CAM.md#3"}'::jsonb),
  ('publications', 'MANUAL_REVIEW', '{"requiredEvidence":["Thông tin nhà xuất bản và nguồn gốc"],"source":"docs/06-DANH-MUC-HANG-CAM.md#3"}'::jsonb),
  ('banned-drugs', 'BANNED', '{"reason":"Ma túy và tiền chất","source":"docs/06-DANH-MUC-HANG-CAM.md#2"}'::jsonb),
  ('banned-wildlife', 'BANNED', '{"reason":"Mẫu vật động thực vật hoang dã nguy cấp","source":"docs/06-DANH-MUC-HANG-CAM.md#2"}'::jsonb),
  ('banned-human-body', 'BANNED', '{"reason":"Mô và bộ phận cơ thể người","source":"docs/06-DANH-MUC-HANG-CAM.md#2"}'::jsonb),
  ('banned-weapons-explosives', 'BANNED', '{"reason":"Vũ khí, pháo và vật liệu nổ","source":"docs/06-DANH-MUC-HANG-CAM.md#2"}'::jsonb),
  ('banned-illegal-content', 'BANNED', '{"reason":"Văn hóa phẩm bất hợp pháp","source":"docs/06-DANH-MUC-HANG-CAM.md#2"}'::jsonb),
  ('banned-medicines', 'BANNED', '{"reason":"Thuốc chữa bệnh không phù hợp mô hình REBOX","source":"docs/06-DANH-MUC-HANG-CAM.md#2"}'::jsonb),
  ('banned-tobacco-vape', 'BANNED', '{"reason":"Thuốc lá và thuốc lá điện tử","source":"docs/06-DANH-MUC-HANG-CAM.md#2"}'::jsonb),
  ('banned-counterfeit-illicit', 'BANNED', '{"reason":"Hàng giả, nhập lậu hoặc không rõ nguồn gốc","source":"docs/06-DANH-MUC-HANG-CAM.md#2"}'::jsonb),
  ('banned-financial-identity', 'BANNED', '{"reason":"Tiền tệ, tài khoản và giấy tờ định danh","source":"docs/06-DANH-MUC-HANG-CAM.md#2"}'::jsonb),
  ('banned-spyware-jammers', 'BANNED', '{"reason":"Thiết bị gián điệp hoặc phá sóng","source":"docs/06-DANH-MUC-HANG-CAM.md#2"}'::jsonb),
  ('banned-live-animals-hazardous', 'BANNED', '{"reason":"Động vật sống hoặc chất nguy hại","source":"docs/06-DANH-MUC-HANG-CAM.md#2"}'::jsonb),
  ('banned-cold-chain-hazardous', 'BANNED', '{"reason":"Không đáp ứng chuỗi lạnh hoặc vận chuyển an toàn","source":"docs/06-DANH-MUC-HANG-CAM.md#2"}'::jsonb),
  ('banned-expired-products', 'BANNED', '{"reason":"Sản phẩm đã quá hạn sử dụng","source":"docs/06-DANH-MUC-HANG-CAM.md#2"}'::jsonb)
) AS policy(category_id, policy_level, rule_snapshot)
ON CONFLICT (category_id, policy_version) DO UPDATE SET
  policy_level = EXCLUDED.policy_level,
  rule_snapshot = EXCLUDED.rule_snapshot,
  effective_from = EXCLUDED.effective_from,
  effective_to = EXCLUDED.effective_to,
  approved_by = EXCLUDED.approved_by;

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
