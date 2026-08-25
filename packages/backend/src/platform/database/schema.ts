import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

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
    check("shops_kyc_status_check", sql`${table.kycStatus} IN ('PENDING', 'VERIFIED', 'REJECTED')`),
    check(
      "shops_status_check",
      sql`${table.status} IN ('ONBOARDING', 'ACTIVE', 'PAUSED', 'LOCKED_INSUFFICIENT_FUND', 'SUSPENDED')`
    )
  ]
);

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

export type ListingImage = { key: string; width: number; height: number };

export const listings = pgTable(
  "listings",
  {
    id: text("id").primaryKey(),
    shopId: text("shop_id")
      .notNull()
      .references(() => shops.id),
    title: text("title").notNull(),
    description: text("description"),
    categoryId: text("category_id").notNull(),
    conditionGrade: text("condition_grade").notNull(),
    conditionNotes: text("condition_notes").notNull(),
    price: bigint("price", { mode: "number" }).notNull(),
    weightGram: integer("weight_gram").notNull(),
    images: jsonb("images").$type<ListingImage[]>().notNull().default([]),
    priceSource: text("price_source").notNull().default("SELLER_DECLARED"),
    status: text("status").notNull().default("DRAFT"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
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
