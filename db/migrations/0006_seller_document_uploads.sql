INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'seller-kyc',
  'seller-kyc',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;--> statement-breakpoint
ALTER TABLE "shop_onboarding_profiles" DROP CONSTRAINT "shop_onboarding_profiles_kyc_mode_check";--> statement-breakpoint
UPDATE "shop_onboarding_profiles" SET "kyc_mode" = 'MANUAL';--> statement-breakpoint
ALTER TABLE "shop_onboarding_profiles" ALTER COLUMN "kyc_mode" SET DEFAULT 'MANUAL';--> statement-breakpoint
ALTER TABLE "shop_onboarding_profiles" ADD CONSTRAINT "shop_onboarding_profiles_kyc_mode_check" CHECK ("kyc_mode" = 'MANUAL');--> statement-breakpoint
ALTER TABLE "shop_onboarding_profiles" ADD COLUMN "kyc_front_ref" text DEFAULT 'LEGACY_MISSING' NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_onboarding_profiles" ADD COLUMN "kyc_back_ref" text DEFAULT 'LEGACY_MISSING' NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_onboarding_profiles" ADD COLUMN "kyc_front_sha256" text DEFAULT '0000000000000000000000000000000000000000000000000000000000000000' NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_onboarding_profiles" ADD COLUMN "kyc_back_sha256" text DEFAULT '0000000000000000000000000000000000000000000000000000000000000000' NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_onboarding_profiles" ALTER COLUMN "kyc_front_ref" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "shop_onboarding_profiles" ALTER COLUMN "kyc_back_ref" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "shop_onboarding_profiles" ALTER COLUMN "kyc_front_sha256" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "shop_onboarding_profiles" ALTER COLUMN "kyc_back_sha256" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "shop_onboarding_profiles" ADD COLUMN "submitted_at" timestamp with time zone DEFAULT now() NOT NULL;
