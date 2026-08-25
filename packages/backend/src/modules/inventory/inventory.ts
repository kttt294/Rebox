import type { CreateListingInput, Listing } from "@rebox/shared";
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

const listingSelect = `
  SELECT l.id, l.shop_id, s.display_name AS shop_display_name,
         l.title, l.description, l.category_id, l.condition_grade,
         l.condition_notes, l.price, l.weight_gram, l.images,
         l.status, l.published_at, l.created_at
  FROM listings l
  JOIN shops s ON s.id = l.shop_id`;

function presentListing(row: ListingRow): Listing {
  const listing: Listing = {
    id: row.id,
    shopId: row.shop_id,
    shopDisplayName: row.shop_display_name,
    title: row.title,
    categoryId: row.category_id,
    conditionGrade: row.condition_grade,
    conditionNotes: row.condition_notes,
    price: Number(row.price),
    weightGram: row.weight_gram,
    images: row.images,
    status: row.status,
    publishedAt: row.published_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString()
  };
  if (row.description !== null) {
    listing.description = row.description;
  }
  return listing;
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

  async getPublicListing(listingId: string): Promise<Listing> {
    const result = await this.pool.query<ListingRow>(
      `${listingSelect}
       WHERE l.id = $1 AND l.status = 'ACTIVE' AND s.status = 'ACTIVE'`,
      [listingId]
    );
    const row = result.rows[0];
    if (!row) {
      throw new DomainError("RESOURCE_NOT_FOUND", 404, "Listing not found");
    }
    return presentListing(row);
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
