import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import type { DomainError } from "../src/errors";
import { IdentityModule } from "../src/modules/identity";
import { InventoryModule } from "../src/modules/inventory";
import { OutboxModule } from "../src/platform/outbox";

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const verifiedActor = "10000000-0000-4000-8000-000000000001";
const pendingActor = "10000000-0000-4000-8000-000000000002";
const verifiedShop = "RBX-01JTESTVERIFIED0000000000";
const pendingShop = "RBX-01JTESTPENDING00000000000";

describe("Sprint 1 PostgreSQL vertical slice", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const identity = new IdentityModule(pool);
  const inventory = new InventoryModule(pool, identity);
  const outbox = new OutboxModule(pool);

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    await pool.query("DELETE FROM listings WHERE id NOT LIKE 'RBX-01JTEST%'");
    await pool.query("TRUNCATE outbox_events");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("publishes a verified shop listing and commits one outbox event", async () => {
    const draft = await inventory.createDraft(verifiedActor, verifiedShop, listingInput("Verified item"));
    const published = await inventory.publish(verifiedActor, verifiedShop, draft.id);
    const publicListing = await inventory.getPublicListing(draft.id);
    const events = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM outbox_events WHERE aggregate_id = $1",
      [draft.id]
    );

    expect(published.status).toBe("ACTIVE");
    expect(publicListing.id).toBe(draft.id);
    expect(events.rows[0]?.count).toBe("1");
  });

  it("blocks a pending shop without leaking a public listing", async () => {
    const draft = await inventory.createDraft(pendingActor, pendingShop, listingInput("Pending item"));

    await expect(inventory.publish(pendingActor, pendingShop, draft.id)).rejects.toMatchObject<Partial<DomainError>>({
      code: "SHOP_NOT_VERIFIED",
      status: 409
    });
    await expect(inventory.getPublicListing(draft.id)).rejects.toMatchObject<Partial<DomainError>>({
      code: "RESOURCE_NOT_FOUND"
    });
    const state = await pool.query<{ status: string }>("SELECT status FROM listings WHERE id = $1", [draft.id]);
    expect(state.rows[0]?.status).toBe("DRAFT");
  });

  it("does not expose another shop through an ownership probe", async () => {
    const draft = await inventory.createDraft(verifiedActor, verifiedShop, listingInput("Private draft"));
    await expect(inventory.publish(pendingActor, verifiedShop, draft.id)).rejects.toMatchObject<Partial<DomainError>>({
      code: "RESOURCE_NOT_FOUND",
      status: 404
    });
  });

  it("claims an event once across concurrent workers and remains idempotent", async () => {
    const draft = await inventory.createDraft(verifiedActor, verifiedShop, listingInput("Outbox item"));
    await inventory.publish(verifiedActor, verifiedShop, draft.id);

    const claimed = await Promise.all([outbox.processBatch(1), outbox.processBatch(1)]);
    expect(claimed.sort()).toEqual([0, 1]);
    expect(await outbox.processBatch(1)).toBe(0);
    const event = await pool.query<{ status: string; attempts: number }>(
      "SELECT status, attempts FROM outbox_events WHERE aggregate_id = $1",
      [draft.id]
    );
    expect(event.rows[0]).toMatchObject({ status: "PROCESSED", attempts: 1 });
  });

  it("denies direct table access to the authenticated browser role", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE authenticated");
      await expect(client.query("SELECT * FROM listings")).rejects.toThrow(/permission denied/i);
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  });
});

function listingInput(title: string) {
  return {
    title,
    categoryId: "fixture-category",
    conditionGrade: "GOOD" as const,
    conditionNotes: "Synthetic fixture in good condition",
    price: 120_000,
    weightGram: 500
  };
}
