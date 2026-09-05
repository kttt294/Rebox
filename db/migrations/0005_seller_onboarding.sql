INSERT INTO "profiles" ("id", "status")
SELECT "id", 'ACTIVE' FROM "auth"."users"
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO "public"."profiles" ("id", "status")
  VALUES (NEW."id", 'ACTIVE')
  ON CONFLICT ("id") DO NOTHING;
  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";--> statement-breakpoint
CREATE TRIGGER "on_auth_user_created"
AFTER INSERT ON "auth"."users"
FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_auth_user"();--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_display_name_unique" UNIQUE("display_name");--> statement-breakpoint
CREATE TABLE "shop_onboarding_profiles" (
	"shop_id" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"avatar_ref" text DEFAULT 'MOCK_DEFAULT_AVATAR' NOT NULL,
	"phone_enc" bytea NOT NULL,
	"pickup_contact_enc" bytea NOT NULL,
	"pickup_address_enc" bytea NOT NULL,
	"pickup_province" text NOT NULL,
	"pickup_district" text NOT NULL,
	"pickup_ward" text NOT NULL,
	"kyc_mode" text DEFAULT 'MOCK' NOT NULL,
	"tax_code_enc" bytea NOT NULL,
	"payout_bank_code" text NOT NULL,
	"payout_account_enc" bytea NOT NULL,
	"payout_holder_enc" bytea NOT NULL,
	"carrier_codes" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shop_onboarding_profiles_kyc_mode_check" CHECK ("shop_onboarding_profiles"."kyc_mode" = 'MOCK')
);--> statement-breakpoint
ALTER TABLE "shop_onboarding_profiles" ADD CONSTRAINT "shop_onboarding_profiles_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_onboarding_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "shop_onboarding_profiles" FROM anon, authenticated;
