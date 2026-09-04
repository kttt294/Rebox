CREATE TABLE "return_import_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text NOT NULL,
	"source" text NOT NULL,
	"file_hash" text NOT NULL,
	"manifest_hash" text NOT NULL,
	"status" text DEFAULT 'PREVIEWED' NOT NULL,
	"can_commit" boolean NOT NULL,
	"normalized_payload" jsonb NOT NULL,
	"idempotency_key" text,
	"commit_result" jsonb,
	"committed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "return_import_batches_shop_idempotency_unique" UNIQUE("shop_id","idempotency_key"),
	CONSTRAINT "return_import_batches_source_check" CHECK ("return_import_batches"."source" IN ('SPREADSHEET', 'PLATFORM_API')),
	CONSTRAINT "return_import_batches_status_check" CHECK ("return_import_batches"."status" IN ('PREVIEWED', 'COMMITTED'))
);
--> statement-breakpoint
CREATE TABLE "return_packages" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text NOT NULL,
	"source_platform" text NOT NULL,
	"source_tracking_enc" bytea NOT NULL,
	"source_tracking_hash" text NOT NULL,
	"source_order_ref" text,
	"source_return_ref" text,
	"returned_at" timestamp with time zone,
	"manifest_source" text NOT NULL,
	"manifest_fetched_at" timestamp with time zone NOT NULL,
	"manifest_hash" text NOT NULL,
	"manifest_version" bigint DEFAULT 1 NOT NULL,
	"ingest_batch_ref" text NOT NULL,
	"seal_status" text DEFAULT 'UNKNOWN' NOT NULL,
	"disclosure" text DEFAULT 'UNOPENED_UNINSPECTED' NOT NULL,
	"package_weight_gram" integer,
	"package_dimensions_cm" jsonb,
	"package_listing_price_vnd" bigint NOT NULL,
	"inventory_status" text DEFAULT 'AVAILABLE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "return_packages_shop_platform_tracking_unique" UNIQUE("shop_id","source_platform","source_tracking_hash"),
	CONSTRAINT "return_packages_platform_check" CHECK ("return_packages"."source_platform" IN ('SHOPEE', 'TIKTOK')),
	CONSTRAINT "return_packages_manifest_source_check" CHECK ("return_packages"."manifest_source" IN ('SPREADSHEET', 'PLATFORM_API')),
	CONSTRAINT "return_packages_seal_status_check" CHECK ("return_packages"."seal_status" IN ('INTACT', 'DAMAGED', 'UNKNOWN')),
	CONSTRAINT "return_packages_disclosure_check" CHECK ("return_packages"."disclosure" = 'UNOPENED_UNINSPECTED'),
	CONSTRAINT "return_packages_weight_check" CHECK ("return_packages"."package_weight_gram" IS NULL OR ("return_packages"."package_weight_gram" > 0 AND "return_packages"."package_weight_gram" <= 100000)),
	CONSTRAINT "return_packages_listing_price_check" CHECK ("return_packages"."package_listing_price_vnd" > 0),
	CONSTRAINT "return_packages_inventory_status_check" CHECK ("return_packages"."inventory_status" IN ('SOURCE_PENDING', 'AVAILABLE', 'RESERVED', 'SOLD', 'VOID'))
);
--> statement-breakpoint
CREATE TABLE "return_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"return_package_id" text NOT NULL,
	"source_item_ref" text NOT NULL,
	"source_sku" text,
	"source_quantity" integer NOT NULL,
	"product_name" text NOT NULL,
	"variant_name" text,
	"brand" text,
	"source_category" text,
	"original_unit_price_vnd" bigint,
	"return_reason" text,
	"product_image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rebox_category_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "return_lines_package_source_item_unique" UNIQUE("return_package_id","source_item_ref"),
	CONSTRAINT "return_lines_source_quantity_check" CHECK ("return_lines"."source_quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "return_import_batches" ADD CONSTRAINT "return_import_batches_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_packages" ADD CONSTRAINT "return_packages_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_packages" ADD CONSTRAINT "return_packages_ingest_batch_ref_return_import_batches_id_fk" FOREIGN KEY ("ingest_batch_ref") REFERENCES "public"."return_import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_lines" ADD CONSTRAINT "return_lines_return_package_id_return_packages_id_fk" FOREIGN KEY ("return_package_id") REFERENCES "public"."return_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_lines" ADD CONSTRAINT "return_lines_rebox_category_id_categories_id_fk" FOREIGN KEY ("rebox_category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_return_import_batches_shop_created" ON "return_import_batches" USING btree ("shop_id","created_at");--> statement-breakpoint
ALTER TABLE "return_import_batches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "return_packages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "return_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "return_import_batches", "return_packages", "return_lines" FROM anon, authenticated;
