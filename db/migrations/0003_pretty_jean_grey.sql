CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "categories" ("id", "name", "active")
SELECT DISTINCT "category_id", "category_id", false FROM "listings";--> statement-breakpoint
CREATE TABLE "restricted_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"policy_level" text NOT NULL,
	"rule_snapshot" jsonb NOT NULL,
	"policy_version" text NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"approved_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restricted_categories_category_version_unique" UNIQUE("category_id","policy_version"),
	CONSTRAINT "restricted_categories_policy_level_check" CHECK ("restricted_categories"."policy_level" IN ('BANNED', 'MANUAL_REVIEW', 'DISCLOSURE'))
);
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "applied_policy_version" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "applied_policy_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "policy_evaluated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted_categories" ADD CONSTRAINT "restricted_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted_categories" ADD CONSTRAINT "restricted_categories_approved_by_profiles_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_categories_picker" ON "categories" USING btree ("active","sort_order","name");--> statement-breakpoint
CREATE INDEX "idx_restricted_categories_effective" ON "restricted_categories" USING btree ("category_id","effective_from","effective_to");--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "restricted_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "categories", "restricted_categories" FROM anon, authenticated;
