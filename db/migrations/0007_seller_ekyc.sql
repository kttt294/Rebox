ALTER TABLE "shops" DROP CONSTRAINT "shops_kyc_status_check";--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_kyc_status_check" CHECK ("kyc_status" IN ('PENDING', 'PROCESSING', 'VERIFIED', 'REJECTED', 'MANUAL_REVIEW'));--> statement-breakpoint
CREATE TABLE "seller_kyc" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"citizen_id_enc" bytea,
	"full_name_enc" bytea,
	"dob_enc" bytea,
	"gender_enc" bytea,
	"address_enc" bytea,
	"issued_at_enc" bytea,
	"provider" text NOT NULL,
	"provider_reference" text,
	"front_ref" text,
	"back_ref" text,
	"selfie_ref" text,
	"front_valid" boolean,
	"back_valid" boolean,
	"face_matched" boolean,
	"face_match_score" double precision,
	"liveness_passed" boolean,
	"liveness_score" double precision,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_kyc_shop_unique" UNIQUE("shop_id"),
	CONSTRAINT "seller_kyc_status_check" CHECK ("status" IN ('PENDING', 'PROCESSING', 'VERIFIED', 'REJECTED', 'MANUAL_REVIEW'))
);--> statement-breakpoint
CREATE TABLE "seller_bank_accounts" (
	"kyc_id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"bank_code" text NOT NULL,
	"account_number_enc" bytea NOT NULL,
	"account_holder_name_enc" bytea,
	"name_match_score" double precision,
	"verification_status" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_bank_verification_status_check" CHECK ("verification_status" IN ('VERIFIED', 'NOT_FOUND', 'UNAVAILABLE'))
);--> statement-breakpoint
CREATE TABLE "seller_tax_info" (
	"kyc_id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"tax_code_enc" bytea NOT NULL,
	"taxpayer_name_enc" bytea,
	"verification_status" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_tax_verification_status_check" CHECK ("verification_status" IN ('VERIFIED', 'NOT_FOUND', 'UNAVAILABLE'))
);--> statement-breakpoint
ALTER TABLE "seller_kyc" ADD CONSTRAINT "seller_kyc_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "seller_kyc" ADD CONSTRAINT "seller_kyc_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");--> statement-breakpoint
ALTER TABLE "seller_bank_accounts" ADD CONSTRAINT "seller_bank_accounts_kyc_id_seller_kyc_id_fk" FOREIGN KEY ("kyc_id") REFERENCES "public"."seller_kyc"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "seller_bank_accounts" ADD CONSTRAINT "seller_bank_accounts_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");--> statement-breakpoint
ALTER TABLE "seller_tax_info" ADD CONSTRAINT "seller_tax_info_kyc_id_seller_kyc_id_fk" FOREIGN KEY ("kyc_id") REFERENCES "public"."seller_kyc"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "seller_tax_info" ADD CONSTRAINT "seller_tax_info_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");--> statement-breakpoint
CREATE INDEX "idx_seller_kyc_user_created" ON "seller_kyc" USING btree ("user_id", "created_at");--> statement-breakpoint
ALTER TABLE "seller_kyc" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "seller_bank_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "seller_tax_info" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "seller_kyc", "seller_bank_accounts", "seller_tax_info" FROM anon, authenticated;
