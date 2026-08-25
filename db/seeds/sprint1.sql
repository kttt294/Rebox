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
