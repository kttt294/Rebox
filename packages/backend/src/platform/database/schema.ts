import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    status: text("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [check("profiles_status_check", sql`${table.status} IN ('ACTIVE', 'SUSPENDED', 'DELETED')`)]
);

export const shops = pgTable(
  "shops",
  {
    id: text("id").primaryKey(),
    displayName: text("display_name").notNull(),
    legalType: text("legal_type").notNull(),
    kycStatus: text("kyc_status").notNull().default("PENDING"),
    kycVerifiedAt: timestamp("kyc_verified_at", { withTimezone: true }),
    status: text("status").notNull().default("ONBOARDING"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check("shops_legal_type_check", sql`${table.legalType} IN ('INDIVIDUAL', 'HOUSEHOLD', 'ENTERPRISE')`),
    check("shops_kyc_status_check", sql`${table.kycStatus} IN ('PENDING', 'PROCESSING', 'VERIFIED', 'REJECTED', 'MANUAL_REVIEW')`),
    unique("shops_display_name_unique").on(table.displayName),
    check(
      "shops_status_check",
      sql`${table.status} IN ('ONBOARDING', 'ACTIVE', 'PAUSED', 'LOCKED_INSUFFICIENT_FUND', 'SUSPENDED')`
    )
  ]
);

export const shopOnboardingProfiles = pgTable("shop_onboarding_profiles", {
  shopId: text("shop_id")
    .primaryKey()
    .references(() => shops.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  avatarRef: text("avatar_ref").notNull().default("MOCK_DEFAULT_AVATAR"),
  phoneEnc: bytea("phone_enc").notNull(),
  pickupContactEnc: bytea("pickup_contact_enc").notNull(),
  pickupAddressEnc: bytea("pickup_address_enc").notNull(),
  pickupProvince: text("pickup_province").notNull(),
  pickupDistrict: text("pickup_district").notNull(),
  pickupWard: text("pickup_ward").notNull(),
  kycMode: text("kyc_mode").notNull().default("MANUAL"),
  kycFrontRef: text("kyc_front_ref").notNull(),
  kycBackRef: text("kyc_back_ref").notNull(),
  kycFrontSha256: text("kyc_front_sha256").notNull(),
  kycBackSha256: text("kyc_back_sha256").notNull(),
  taxCodeEnc: bytea("tax_code_enc").notNull(),
  payoutBankCode: text("payout_bank_code").notNull(),
  payoutAccountEnc: bytea("payout_account_enc").notNull(),
  payoutHolderEnc: bytea("payout_holder_enc").notNull(),
  carrierCodes: jsonb("carrier_codes").$type<Array<"GHN" | "GHTK">>().notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [check("shop_onboarding_profiles_kyc_mode_check", sql`${table.kycMode} = 'MANUAL'`)]);

export const shopMemberships = pgTable(
  "shop_memberships",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    shopId: text("shop_id")
      .notNull()
      .references(() => shops.id),
    role: text("role").notNull(),
    status: text("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.shopId] }),
    check("shop_memberships_role_check", sql`${table.role} IN ('OWNER', 'MANAGER', 'WAREHOUSE', 'ACCOUNTING')`),
    check("shop_memberships_status_check", sql`${table.status} IN ('ACTIVE', 'INACTIVE')`)
  ]
);

export const sellerKyc = pgTable(
  "seller_kyc",
  {
    id: text("id").primaryKey(),
    shopId: text("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id),
    citizenIdEnc: bytea("citizen_id_enc"),
    fullNameEnc: bytea("full_name_enc"),
    dobEnc: bytea("dob_enc"),
    genderEnc: bytea("gender_enc"),
    addressEnc: bytea("address_enc"),
    issuedAtEnc: bytea("issued_at_enc"),
    provider: text("provider").notNull(),
    providerReference: text("provider_reference"),
    frontRef: text("front_ref"),
    backRef: text("back_ref"),
    selfieRef: text("selfie_ref"),
    frontValid: boolean("front_valid"),
    backValid: boolean("back_valid"),
    faceMatched: boolean("face_matched"),
    faceMatchScore: doublePrecision("face_match_score"),
    livenessPassed: boolean("liveness_passed"),
    livenessScore: doublePrecision("liveness_score"),
    status: text("status").notNull().default("PENDING"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    unique("seller_kyc_shop_unique").on(table.shopId),
    check("seller_kyc_status_check", sql`${table.status} IN ('PENDING', 'PROCESSING', 'VERIFIED', 'REJECTED', 'MANUAL_REVIEW')`),
    index("idx_seller_kyc_user_created").on(table.userId, table.createdAt)
  ]
);

export const sellerBankAccounts = pgTable(
  "seller_bank_accounts",
  {
    kycId: text("kyc_id").primaryKey().references(() => sellerKyc.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id),
    bankCode: text("bank_code").notNull(),
    accountNumberEnc: bytea("account_number_enc").notNull(),
    accountHolderNameEnc: bytea("account_holder_name_enc"),
    nameMatchScore: doublePrecision("name_match_score"),
    verificationStatus: text("verification_status").notNull(),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [check("seller_bank_verification_status_check", sql`${table.verificationStatus} IN ('VERIFIED', 'NOT_FOUND', 'UNAVAILABLE')`)]
);

export const sellerTaxInfo = pgTable(
  "seller_tax_info",
  {
    kycId: text("kyc_id").primaryKey().references(() => sellerKyc.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id),
    taxCodeEnc: bytea("tax_code_enc").notNull(),
    taxpayerNameEnc: bytea("taxpayer_name_enc"),
    verificationStatus: text("verification_status").notNull(),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [check("seller_tax_verification_status_check", sql`${table.verificationStatus} IN ('VERIFIED', 'NOT_FOUND', 'UNAVAILABLE')`)]
);

export type ListingImage = { key: string; width: number; height: number };

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("idx_categories_picker").on(table.active, table.sortOrder, table.name)]
);

export const restrictedCategories = pgTable(
  "restricted_categories",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id").notNull().references(() => categories.id),
    policyLevel: text("policy_level").notNull(),
    ruleSnapshot: jsonb("rule_snapshot").$type<Record<string, unknown>>().notNull(),
    policyVersion: text("policy_version").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    approvedBy: uuid("approved_by").notNull().references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check("restricted_categories_policy_level_check", sql`${table.policyLevel} IN ('BANNED', 'MANUAL_REVIEW', 'DISCLOSURE')`),
    unique("restricted_categories_category_version_unique").on(table.categoryId, table.policyVersion),
    index("idx_restricted_categories_effective").on(table.categoryId, table.effectiveFrom, table.effectiveTo)
  ]
);

export const returnImportBatches = pgTable(
  "return_import_batches",
  {
    id: text("id").primaryKey(),
    shopId: text("shop_id").notNull().references(() => shops.id),
    source: text("source").notNull(),
    fileHash: text("file_hash").notNull(),
    manifestHash: text("manifest_hash").notNull(),
    status: text("status").notNull().default("PREVIEWED"),
    canCommit: boolean("can_commit").notNull(),
    normalizedPayload: jsonb("normalized_payload").$type<Record<string, unknown>>().notNull(),
    idempotencyKey: text("idempotency_key"),
    commitResult: jsonb("commit_result").$type<Record<string, unknown>>(),
    committedAt: timestamp("committed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check("return_import_batches_source_check", sql`${table.source} IN ('SPREADSHEET', 'PLATFORM_API')`),
    check("return_import_batches_status_check", sql`${table.status} IN ('PREVIEWED', 'COMMITTED')`),
    unique("return_import_batches_shop_idempotency_unique").on(table.shopId, table.idempotencyKey),
    index("idx_return_import_batches_shop_created").on(table.shopId, table.createdAt)
  ]
);

export const returnPackages = pgTable(
  "return_packages",
  {
    id: text("id").primaryKey(),
    shopId: text("shop_id").notNull().references(() => shops.id),
    sourcePlatform: text("source_platform").notNull(),
    sourceTrackingEnc: bytea("source_tracking_enc").notNull(),
    sourceTrackingHash: text("source_tracking_hash").notNull(),
    sourceOrderRef: text("source_order_ref"),
    sourceReturnRef: text("source_return_ref"),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    manifestSource: text("manifest_source").notNull(),
    manifestFetchedAt: timestamp("manifest_fetched_at", { withTimezone: true }).notNull(),
    manifestHash: text("manifest_hash").notNull(),
    manifestVersion: bigint("manifest_version", { mode: "number" }).notNull().default(1),
    ingestBatchRef: text("ingest_batch_ref").notNull().references(() => returnImportBatches.id),
    sealStatus: text("seal_status").notNull().default("UNKNOWN"),
    disclosure: text("disclosure").notNull().default("UNOPENED_UNINSPECTED"),
    packageWeightGram: integer("package_weight_gram"),
    packageDimensionsCm: jsonb("package_dimensions_cm").$type<{ length: number; width: number; height: number }>(),
    packageListingPriceVnd: bigint("package_listing_price_vnd", { mode: "number" }).notNull(),
    inventoryStatus: text("inventory_status").notNull().default("AVAILABLE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check("return_packages_platform_check", sql`${table.sourcePlatform} IN ('SHOPEE', 'TIKTOK')`),
    check("return_packages_manifest_source_check", sql`${table.manifestSource} IN ('SPREADSHEET', 'PLATFORM_API')`),
    check("return_packages_seal_status_check", sql`${table.sealStatus} IN ('INTACT', 'DAMAGED', 'UNKNOWN')`),
    check("return_packages_disclosure_check", sql`${table.disclosure} = 'UNOPENED_UNINSPECTED'`),
    check("return_packages_weight_check", sql`${table.packageWeightGram} IS NULL OR (${table.packageWeightGram} > 0 AND ${table.packageWeightGram} <= 100000)`),
    check("return_packages_listing_price_check", sql`${table.packageListingPriceVnd} > 0`),
    check("return_packages_inventory_status_check", sql`${table.inventoryStatus} IN ('SOURCE_PENDING', 'AVAILABLE', 'RESERVED', 'SOLD', 'VOID')`),
    unique("return_packages_shop_platform_tracking_unique").on(
      table.shopId,
      table.sourcePlatform,
      table.sourceTrackingHash
    )
  ]
);

export const returnLines = pgTable(
  "return_lines",
  {
    id: text("id").primaryKey(),
    returnPackageId: text("return_package_id").notNull().references(() => returnPackages.id),
    sourceItemRef: text("source_item_ref").notNull(),
    sourceSku: text("source_sku"),
    sourceQuantity: integer("source_quantity").notNull(),
    productName: text("product_name").notNull(),
    variantName: text("variant_name"),
    brand: text("brand"),
    sourceCategory: text("source_category"),
    originalUnitPriceVnd: bigint("original_unit_price_vnd", { mode: "number" }),
    returnReason: text("return_reason"),
    productImageUrls: jsonb("product_image_urls").$type<string[]>().notNull().default([]),
    reboxCategoryId: text("rebox_category_id").notNull().references(() => categories.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check("return_lines_source_quantity_check", sql`${table.sourceQuantity} > 0`),
    unique("return_lines_package_source_item_unique").on(table.returnPackageId, table.sourceItemRef)
  ]
);

export const listings = pgTable(
  "listings",
  {
    id: text("id").primaryKey(),
    shopId: text("shop_id")
      .notNull()
      .references(() => shops.id),
    title: text("title").notNull(),
    description: text("description"),
    categoryId: text("category_id").notNull().references(() => categories.id),
    conditionGrade: text("condition_grade").notNull(),
    conditionNotes: text("condition_notes").notNull(),
    price: bigint("price", { mode: "number" }).notNull(),
    weightGram: integer("weight_gram").notNull(),
    images: jsonb("images").$type<ListingImage[]>().notNull().default([]),
    priceSource: text("price_source").notNull().default("SELLER_DECLARED"),
    status: text("status").notNull().default("DRAFT"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    appliedPolicyVersion: text("applied_policy_version"),
    appliedPolicySnapshot: jsonb("applied_policy_snapshot").$type<Record<string, unknown>>(),
    policyEvaluatedAt: timestamp("policy_evaluated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check("listings_price_check", sql`${table.price} > 0`),
    check("listings_weight_check", sql`${table.weightGram} > 0 AND ${table.weightGram} <= 100000`),
    check("listings_price_source_check", sql`${table.priceSource} IN ('SELLER_DECLARED', 'VERIFIED_CSV', 'VERIFIED_PLATFORM')`),
    check(
      "listings_status_check",
      sql`${table.status} IN ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'HIDDEN_BY_FUND', 'RESERVED', 'SOLD', 'RELISTABLE', 'SUSPENDED', 'DELISTED')`
    ),
    index("idx_listings_public").on(table.status, table.id),
    index("idx_listings_shop_created").on(table.shopId, table.createdAt)
  ]
);

export type OutboxPayload = Record<string, unknown>;

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: text("id").primaryKey(),
    topic: text("topic").notNull(),
    aggregateId: text("aggregate_id"),
    payload: jsonb("payload").$type<OutboxPayload>().notNull(),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    attempts: integer("attempts").notNull().default(0),
    status: text("status").notNull().default("PENDING"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check("outbox_status_check", sql`${table.status} IN ('PENDING', 'PROCESSING', 'PROCESSED', 'DEAD')`),
    index("idx_outbox_claim").on(table.status, table.availableAt)
  ]
);

export const platformStaffRoles = pgTable("platform_staff_roles", {
  userId: uuid("user_id").notNull().references(() => profiles.id),
  role: text("role").notNull(),
  status: text("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  primaryKey({ columns: [table.userId, table.role] }),
  check("platform_staff_roles_role_check", sql`${table.role} IN ('SUPPORT', 'MODERATOR', 'DISPUTE_ARBITRATOR', 'SUPER_ADMIN')`),
  check("platform_staff_roles_status_check", sql`${table.status} IN ('ACTIVE', 'INACTIVE')`)
]);

export const sellerKycReviews = pgTable("seller_kyc_reviews", {
  id: text("id").primaryKey(),
  kycId: text("kyc_id").notNull().references(() => sellerKyc.id),
  reviewerId: uuid("reviewer_id").notNull().references(() => profiles.id),
  decision: text("decision").notNull(),
  reason: text("reason").notNull(),
  idempotencyKey: uuid("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  unique("seller_kyc_reviews_kyc_unique").on(table.kycId),
  unique("seller_kyc_reviews_reviewer_key_unique").on(table.reviewerId, table.idempotencyKey),
  check("seller_kyc_reviews_decision_check", sql`${table.decision} IN ('APPROVE', 'REJECT')`),
  check("seller_kyc_reviews_reason_check", sql`char_length(btrim(${table.reason})) BETWEEN 1 AND 1000 AND ${table.reason} = btrim(${table.reason})`)
]);
