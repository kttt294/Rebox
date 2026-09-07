import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { ulid } from "ulid";
import { DomainError } from "../../errors";

export type CarrierStatus = "PICKED_UP" | "IN_TRANSIT" | "DELIVERED" | "DELIVERY_FAILED" | "CANCELLED_BY_PICKUP_FAILURE";
export type CarrierOrder = { providerKey: string; trackingCode: string };

export interface CarrierAdapter {
  quote(orderId: string): Promise<{ feeVnd: number }>;
  createOrder(orderId: string): Promise<CarrierOrder>;
  getLabel(order: CarrierOrder): Promise<string>;
  getStatus(order: CarrierOrder): Promise<CarrierStatus | "READY_TO_SHIP">;
}

export class FakeCarrierAdapter implements CarrierAdapter {
  constructor(private readonly failure = false) {}
  async quote(orderId: string): Promise<{ feeVnd: number }> { this.fail(); return { feeVnd: 20_000 + parseInt(hash(orderId).slice(0, 4), 16) % 10_001 }; }
  async createOrder(orderId: string): Promise<CarrierOrder> { this.fail(); const token = hash(orderId).slice(0, 16).toUpperCase(); return { providerKey: `FAKE-${token}`, trackingCode: `SYN${token}` }; }
  async getLabel(order: CarrierOrder): Promise<string> { this.fail(); return `SYNTHETIC — NOT FOR SHIPPING\n${order.trackingCode}`; }
  async getStatus(): Promise<"READY_TO_SHIP"> { this.fail(); return "READY_TO_SHIP"; }
  private fail(): void { if (this.failure) throw new Error("FAKE_CARRIER_INJECTED_FAILURE"); }
}

const transitions: Record<string, readonly string[]> = {
  CONFIRMED: ["READY_TO_SHIP", "CANCELLED_BY_SELLER"],
  READY_TO_SHIP: ["PICKED_UP", "CANCELLED_BY_PICKUP_FAILURE", "CANCELLED_BY_SELLER"],
  PICKED_UP: ["IN_TRANSIT", "DELIVERY_FAILED"],
  IN_TRANSIT: ["DELIVERED", "DELIVERY_FAILED"],
  DELIVERED: ["COMPLETED"]
};

export class FulfillmentModule {
  constructor(private readonly pool: Pool, private readonly adapter: CarrierAdapter, private readonly fakeEnabled: boolean) {
    if (process.env.NODE_ENV === "production" && fakeEnabled) throw new Error("Fake fulfillment must never be enabled in production");
  }

  async createShipment(actorId: string, shopId: string, orderId: string): Promise<{ id: string; trackingCode: string; status: string; label: string }> {
    this.requireFake();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await this.requireShop(client, actorId, shopId);
      const order = (await client.query<{ status: string }>(
        "SELECT o.status FROM orders o JOIN sub_orders s ON s.order_id=o.id WHERE o.id=$1 AND s.shop_id=$2 FOR UPDATE OF o", [orderId, shopId]
      )).rows[0];
      if (!order) throw new DomainError("RESOURCE_NOT_FOUND", 404, "Order not found");
      const existing = (await client.query<{ id: string; provider_key: string; tracking_code: string; status: string; label_payload: string }>(
        "SELECT id,provider_key,tracking_code,status,label_payload FROM shipments WHERE order_id=$1", [orderId]
      )).rows[0];
      if (existing) { await client.query("COMMIT"); return { id: existing.id, trackingCode: existing.tracking_code, status: existing.status, label: existing.label_payload }; }
      this.assertTransition(order.status, "READY_TO_SHIP");
      // Provider work happens before this transaction in production; the fake adapter is pure and deterministic.
      const created = await this.adapter.createOrder(orderId);
      const label = await this.adapter.getLabel(created);
      const id = `RBX-SHP-${ulid()}`;
      await client.query(
        `INSERT INTO shipments(id,order_id,provider_key,tracking_code,status,label_payload) VALUES($1,$2,$3,$4,'READY_TO_SHIP',$5)`,
        [id, orderId, created.providerKey, created.trackingCode, label]
      );
      await this.transition(client, orderId, order.status, "READY_TO_SHIP", `shipment:${created.providerKey}`);
      await client.query("COMMIT"); return { id, trackingCode: created.trackingCode, status: "READY_TO_SHIP", label };
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }

  async applyEvent(eventId: string, orderId: string, status: CarrierStatus): Promise<{ status: string; duplicate: boolean }> {
    this.requireFake();
    const payloadHash = hash({ orderId, status });
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`carrier-event:${eventId}`]);
      const prior = (await client.query<{ payload_hash: string; normalized_status: string }>("SELECT payload_hash,normalized_status FROM carrier_events WHERE provider_event_id=$1", [eventId])).rows[0];
      if (prior) {
        if (prior.payload_hash !== payloadHash) throw new DomainError("EVENT_ID_CONFLICT", 409, "Carrier event ID was reused with different payload");
        await client.query("COMMIT"); return { status: prior.normalized_status, duplicate: true };
      }
      const row = (await client.query<{ shipment_id: string; status: string }>(
        "SELECT id AS shipment_id,status FROM shipments WHERE order_id=$1 FOR UPDATE", [orderId]
      )).rows[0];
      if (!row) throw new DomainError("RESOURCE_NOT_FOUND", 404, "Shipment not found");
      this.assertTransition(row.status, status);
      await client.query(
        "INSERT INTO carrier_events(id,shipment_id,provider_event_id,payload_hash,normalized_status) VALUES($1,$2,$3,$4,$5)",
        [`RBX-CE-${ulid()}`, row.shipment_id, eventId, payloadHash, status]
      );
      await client.query("UPDATE shipments SET status=$2,updated_at=now() WHERE id=$1", [row.shipment_id, status]);
      await this.transition(client, orderId, row.status, status, `carrier:${eventId}`);
      await client.query("COMMIT"); return { status, duplicate: false };
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }

  async completeDelivery(orderId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const row = (await client.query<{ status: string }>("SELECT status FROM orders WHERE id=$1 FOR UPDATE", [orderId])).rows[0];
      if (!row) throw new DomainError("RESOURCE_NOT_FOUND", 404, "Order not found");
      this.assertTransition(row.status, "COMPLETED");
      await this.transition(client, orderId, row.status, "COMPLETED", `complete:${orderId}`);
      await client.query("UPDATE orders SET completed_at=now() WHERE id=$1", [orderId]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }

  private async transition(client: PoolClient, orderId: string, from: string, to: string, key: string): Promise<void> {
    await client.query("UPDATE orders SET status=$2,updated_at=now() WHERE id=$1", [orderId, to]);
    await client.query("UPDATE sub_orders SET status=$2 WHERE order_id=$1", [orderId, to]);
    await client.query(
      `INSERT INTO order_events(id,order_id,event_key,from_status,to_status,source) VALUES($1,$2,$3,$4,$5,'FAKE_CARRIER') ON CONFLICT(event_key) DO NOTHING`,
      [`RBX-OE-${ulid()}`, orderId, key, from, to]
    );
    await client.query(`INSERT INTO outbox_events(id,topic,aggregate_id,payload) VALUES($1,'fulfillment.status_changed',$2,$3::jsonb)`,
      [`RBX-${ulid()}`, orderId, JSON.stringify({ orderId, from, to })]);
  }

  private assertTransition(from: string, to: string): void {
    if (!transitions[from]?.includes(to)) throw new DomainError("INVALID_FULFILLMENT_TRANSITION", 409, `Cannot move from ${from} to ${to}`);
  }
  private requireFake(): void { if (!this.fakeEnabled) throw new DomainError("FORBIDDEN", 403, "Fake carrier mutation is disabled"); }
  private async requireShop(client: PoolClient, actorId: string, shopId: string): Promise<void> {
    if (!(await client.query("SELECT 1 FROM shop_memberships WHERE user_id=$1 AND shop_id=$2 AND status='ACTIVE'", [actorId, shopId])).rowCount) {
      throw new DomainError("RESOURCE_NOT_FOUND", 404, "Shop not found");
    }
  }
}

function hash(value: unknown): string { return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex"); }
