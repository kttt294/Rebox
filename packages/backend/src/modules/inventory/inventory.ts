import type {
  CreateListingInput,
  Listing,
  PublicListing,
  PublicListingPage,
  PublicListingsQuery,
  UpdateListingDraftInput
} from "@rebox/shared";
import type { Pool, PoolClient } from "pg";
import { ulid } from "ulid";
import { DomainError } from "../../errors";
import type { IdentityModule } from "../identity";

type ListingRow = {
  id: string;
  shop_id: string;
  shop_display_name: string;
  title: string;
  description: string | null;
  category_id: string;
  condition_grade: Listing["conditionGrade"];
  condition_notes: string;
  price: string;
  weight_gram: number;
  images: Listing["images"];
  status: Listing["status"];
  published_at: Date | null;
  created_at: Date;
};

type CatalogCursor = { sort: PublicListingsQuery["sort"]; value: string; id: string };

const publicListingPageSize = 24;

const listingSelect = `
  SELECT l.id, l.shop_id, s.display_name AS shop_display_name,
         l.title, l.description, l.category_id, l.condition_grade,
         l.condition_notes, l.price, l.weight_gram, l.images,
         l.status, l.published_at, l.created_at
  FROM listings l
  JOIN shops s ON s.id = l.shop_id`;

function presentPublicListing(row: ListingRow): PublicListing {
  const listing: PublicListing = {
    id: row.id,
    shopId: row.shop_id,
    shopDisplayName: row.shop_display_name,
    title: row.title,
    categoryId: row.category_id,
    conditionGrade: row.condition_grade,
    conditionNotes: row.condition_notes,
    price: Number(row.price),
    publishedAt: row.published_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString()
  };
  if (row.description !== null) {
    listing.description = row.description;
  }
  return listing;
}

function presentListing(row: ListingRow): Listing {
  return {
    ...presentPublicListing(row),
    weightGram: row.weight_gram,
    images: row.images,
    status: row.status
  };
}

function decodeCatalogCursor(encoded: string, sort: PublicListingsQuery["sort"]): CatalogCursor {
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 3 || parsed[0] !== sort
      || typeof parsed[1] !== "string" || typeof parsed[2] !== "string"
      || (sort === "newest" ? Number.isNaN(Date.parse(parsed[1])) : !/^\d+$/.test(parsed[1]))) {
      throw new Error("Invalid cursor");
    }
    return { sort, value: parsed[1], id: parsed[2] };
  } catch {
    throw new DomainError("VALIDATION_FAILED", 422, "Invalid catalog cursor");
  }
}

function encodeCatalogCursor(row: ListingRow, sort: PublicListingsQuery["sort"]): string {
  const value = sort === "newest" ? row.created_at.toISOString() : row.price;
  return Buffer.from(JSON.stringify([sort, value, row.id])).toString("base64url");
}

export class InventoryModule {
  constructor(
    private readonly pool: Pool,
    private readonly identity: IdentityModule
  ) {}

  async createDraft(actorId: string, shopId: string, input: CreateListingInput): Promise<Listing> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const access = await this.identity.requireShopCapability(client, actorId, shopId, "CREATE_LISTING");
      const listingId = `RBX-${ulid()}`;
      await client.query(
        `INSERT INTO listings (
           id, shop_id, title, description, category_id, condition_grade,
           condition_notes, price, weight_gram, images, price_source, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '[]'::jsonb, 'SELLER_DECLARED', 'DRAFT')`,
        [
          listingId,
          shopId,
          input.title,
          input.description ?? null,
          input.categoryId,
          input.conditionGrade,
          input.conditionNotes,
          input.price,
          input.weightGram
        ]
      );
      const listing = await this.selectOwnedListing(client, listingId, shopId);
      await client.query("COMMIT");
      return { ...listing, shopDisplayName: access.displayName };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listShopListings(actorId: string, shopId: string): Promise<Listing[]> {
    const client = await this.pool.connect();
    try {
      await this.identity.requireShopCapability(client, actorId, shopId, "CREATE_LISTING");
      const result = await client.query<ListingRow>(
        `${listingSelect}
         WHERE l.shop_id = $1
         ORDER BY l.created_at DESC`,
        [shopId]
      );
      return result.rows.map(presentListing);
    } finally {
      client.release();
    }
  }

  async updateDraft(
    actorId: string,
    shopId: string,
    listingId: string,
    input: UpdateListingDraftInput
  ): Promise<Listing> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await this.identity.requireShopCapability(client, actorId, shopId, "CREATE_LISTING");
      const updated = await client.query(
        `UPDATE listings
         SET title = $3, description = $4, category_id = $5,
             condition_grade = $6, condition_notes = $7, price = $8, weight_gram = $9
         WHERE id = $1 AND shop_id = $2 AND status = 'DRAFT'
         RETURNING id`,
        [
          listingId,
          shopId,
          input.title,
          input.description ?? null,
          input.categoryId,
          input.conditionGrade,
          input.conditionNotes,
          input.price,
          input.weightGram
        ]
      );
      if (updated.rowCount === 0) {
        const current = await client.query<{ status: string }>(
          "SELECT status FROM listings WHERE id = $1 AND shop_id = $2",
          [listingId, shopId]
        );
        if (!current.rows[0]) {
          throw new DomainError("RESOURCE_NOT_FOUND", 404, "Listing not found");
        }
        throw new DomainError("INVALID_LISTING_STATE", 409, "Only a draft listing can be updated");
      }

      const listing = await this.selectOwnedListing(client, listingId, shopId);
      await client.query("COMMIT");
      return listing;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async publish(actorId: string, shopId: string, listingId: string): Promise<Listing> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const access = await this.identity.requireShopCapability(client, actorId, shopId, "PUBLISH_LISTING");
      if (access.kycStatus !== "VERIFIED") {
        throw new DomainError("SHOP_NOT_VERIFIED", 409, "Shop verification is required");
      }
      if (access.shopStatus !== "ACTIVE") {
        throw new DomainError("SHOP_NOT_ACTIVE", 409, "Shop is not active");
      }

      const updated = await client.query(
        `UPDATE listings
         SET status = 'ACTIVE', published_at = now()
         WHERE id = $1 AND shop_id = $2 AND status = 'DRAFT'
         RETURNING id`,
        [listingId, shopId]
      );
      if (updated.rowCount === 0) {
        const current = await client.query<{ status: string }>(
          "SELECT status FROM listings WHERE id = $1 AND shop_id = $2",
          [listingId, shopId]
        );
        if (!current.rows[0]) {
          throw new DomainError("RESOURCE_NOT_FOUND", 404, "Listing not found");
        }
        throw new DomainError("INVALID_LISTING_STATE", 409, "Only a draft listing can be published");
      }

      await client.query(
        `INSERT INTO outbox_events (id, topic, aggregate_id, payload)
         VALUES ($1, 'listing.published', $2, $3::jsonb)`,
        [`RBX-${ulid()}`, listingId, JSON.stringify({ listingId, shopId })]
      );
      const listing = await this.selectOwnedListing(client, listingId, shopId);
      await client.query("COMMIT");
      return listing;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getPublicListing(listingId: string): Promise<PublicListing> {
    const result = await this.pool.query<ListingRow>(
      `${listingSelect}
       WHERE l.id = $1 AND l.status = 'ACTIVE' AND s.status = 'ACTIVE'`,
      [listingId]
    );
    const row = result.rows[0];
    if (!row) {
      throw new DomainError("RESOURCE_NOT_FOUND", 404, "Listing not found");
    }
    return presentPublicListing(row);
  }

  async listPublicListings(input: PublicListingsQuery): Promise<PublicListingPage> {
    const values: unknown[] = [];
    const conditions = ["l.status = 'ACTIVE'", "s.status = 'ACTIVE'"];
    const parameter = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    if (input.q) {
      const query = parameter(input.q);
      conditions.push(`to_tsvector(
        'simple'::regconfig,
        rebox_unaccent(l.title || ' ' || coalesce(l.description, '') || ' ' || l.condition_notes)
      ) @@ plainto_tsquery('simple'::regconfig, rebox_unaccent(${query}))`);
    }
    if (input.category) {
      conditions.push(`l.category_id = ${parameter(input.category)}`);
    }
    if (input.shopId) {
      conditions.push(`l.shop_id = ${parameter(input.shopId)}`);
    }
    if (input.cursor) {
      const cursor = decodeCatalogCursor(input.cursor, input.sort);
      const value = parameter(cursor.value);
      const id = parameter(cursor.id);
      conditions.push(input.sort === "newest"
        ? `(l.created_at, l.id) < (${value}::timestamptz, ${id})`
        : `(l.price, l.id) ${input.sort === "price_asc" ? ">" : "<"} (${value}::bigint, ${id})`);
    }

    const orderBy = input.sort === "newest"
      ? "l.created_at DESC, l.id DESC"
      : `l.price ${input.sort === "price_asc" ? "ASC" : "DESC"}, l.id ${input.sort === "price_asc" ? "ASC" : "DESC"}`;
    const result = await this.pool.query<ListingRow>(
      `${listingSelect}
       WHERE ${conditions.join(" AND ")}
       ORDER BY ${orderBy}
       LIMIT ${publicListingPageSize + 1}`,
      values
    );
    const pageRows = result.rows.slice(0, publicListingPageSize);
    const last = pageRows.at(-1);
    return {
      items: pageRows.map(presentPublicListing),
      nextCursor: result.rows.length > publicListingPageSize && last
        ? encodeCatalogCursor(last, input.sort)
        : null
    };
  }

  private async selectOwnedListing(client: PoolClient, listingId: string, shopId: string): Promise<Listing> {
    const result = await client.query<ListingRow>(
      `${listingSelect}
       WHERE l.id = $1 AND l.shop_id = $2`,
      [listingId, shopId]
    );
    const row = result.rows[0];
    if (!row) {
      throw new DomainError("RESOURCE_NOT_FOUND", 404, "Listing not found");
    }
    return presentListing(row);
  }
}
