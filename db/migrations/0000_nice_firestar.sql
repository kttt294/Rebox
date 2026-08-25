CREATE TABLE "listings" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category_id" text NOT NULL,
	"condition_grade" text NOT NULL,
	"condition_notes" text NOT NULL,
	"price" bigint NOT NULL,
	"weight_gram" integer NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price_source" text DEFAULT 'SELLER_DECLARED' NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listings_price_check" CHECK ("listings"."price" > 0),
	CONSTRAINT "listings_weight_check" CHECK ("listings"."weight_gram" > 0 AND "listings"."weight_gram" <= 100000),
	CONSTRAINT "listings_price_source_check" CHECK ("listings"."price_source" IN ('SELLER_DECLARED', 'VERIFIED_CSV', 'VERIFIED_PLATFORM')),
	CONSTRAINT "listings_status_check" CHECK ("listings"."status" IN ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'HIDDEN_BY_FUND', 'RESERVED', 'SOLD', 'RELISTABLE', 'SUSPENDED', 'DELISTED'))
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" text PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"aggregate_id" text,
	"payload" jsonb NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"claimed_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_status_check" CHECK ("outbox_events"."status" IN ('PENDING', 'PROCESSING', 'PROCESSED', 'DEAD'))
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_status_check" CHECK ("profiles"."status" IN ('ACTIVE', 'SUSPENDED', 'DELETED'))
);
--> statement-breakpoint
CREATE TABLE "shop_memberships" (
	"user_id" uuid NOT NULL,
	"shop_id" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shop_memberships_user_id_shop_id_pk" PRIMARY KEY("user_id","shop_id"),
	CONSTRAINT "shop_memberships_role_check" CHECK ("shop_memberships"."role" IN ('OWNER', 'MANAGER', 'WAREHOUSE', 'ACCOUNTING')),
	CONSTRAINT "shop_memberships_status_check" CHECK ("shop_memberships"."status" IN ('ACTIVE', 'INACTIVE'))
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"legal_type" text NOT NULL,
	"kyc_status" text DEFAULT 'PENDING' NOT NULL,
	"kyc_verified_at" timestamp with time zone,
	"status" text DEFAULT 'ONBOARDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shops_legal_type_check" CHECK ("shops"."legal_type" IN ('INDIVIDUAL', 'HOUSEHOLD', 'ENTERPRISE')),
	CONSTRAINT "shops_kyc_status_check" CHECK ("shops"."kyc_status" IN ('PENDING', 'VERIFIED', 'REJECTED')),
	CONSTRAINT "shops_status_check" CHECK ("shops"."status" IN ('ONBOARDING', 'ACTIVE', 'PAUSED', 'LOCKED_INSUFFICIENT_FUND', 'SUSPENDED'))
);
--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_memberships" ADD CONSTRAINT "shop_memberships_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_memberships" ADD CONSTRAINT "shop_memberships_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_listings_public" ON "listings" USING btree ("status","id");--> statement-breakpoint
CREATE INDEX "idx_listings_shop_created" ON "listings" USING btree ("shop_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_outbox_claim" ON "outbox_events" USING btree ("status","available_at");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_auth_user_fk"
  FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shops" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shop_memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "listings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "outbox_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "profiles", "shops", "shop_memberships", "listings", "outbox_events"
  FROM anon, authenticated;
