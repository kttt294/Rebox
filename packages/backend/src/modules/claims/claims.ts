import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { ulid } from "ulid";
import { DomainError } from "../../errors";

export class ClaimsModule {
  constructor(private readonly pool: Pool, private readonly fakeEvidenceEnabled: boolean) {
    if (process.env.NODE_ENV === "production" && fakeEvidenceEnabled) throw new Error("Fake evidence must never be enabled in production");
  }

  async createProcessingRecord(actorId: string, input: { purpose: string; targetType: string; targetId: string; noticeVersion: string }) {
    if (!(await this.pool.query("SELECT 1 FROM legal_artifacts WHERE slug='processing-notice' AND version=$1", [input.noticeVersion])).rowCount) {
      throw new DomainError("LEGAL_ARTIFACT_NOT_FOUND", 404, "Processing notice version not found");
    }
    await this.pool.query("INSERT INTO profiles(id,status) VALUES($1,'ACTIVE') ON CONFLICT(id) DO NOTHING", [actorId]);
    const id = `RBX-PR-${ulid()}`;
    await this.pool.query(
      `INSERT INTO processing_records(id,actor_id,purpose,target_type,target_id,notice_version) VALUES($1,$2,$3,$4,$5,$6)`,
      [id, actorId, input.purpose, input.targetType, input.targetId, input.noticeVersion]
    );
    return { id, ...input };
  }

  async openDispute(actorId: string, orderId: string, reason: string) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const order = (await client.query<{ shop_id: string; total_vnd: string; completed_at: Date | null; status: string }>(
        `SELECT so.shop_id,o.total_vnd,o.completed_at,o.status FROM orders o JOIN sub_orders so ON so.order_id=o.id
         WHERE o.id=$1 AND o.buyer_id=$2 FOR UPDATE OF o`, [orderId, actorId]
      )).rows[0];
      if (!order || !["DELIVERED", "COMPLETED"].includes(order.status)) throw new DomainError("DISPUTE_NOT_ELIGIBLE", 409, "Order is not eligible for dispute");
      const existing = (await client.query("SELECT * FROM dispute_cases WHERE order_id=$1", [orderId])).rows[0];
      if (existing) { await client.query("COMMIT"); return presentCase(existing); }
      const late = !!order.completed_at && Date.now() - order.completed_at.getTime() > 7 * 86_400_000;
      const id = `RBX-CASE-${ulid()}`;
      const row = (await client.query(
        `INSERT INTO dispute_cases(id,order_id,buyer_id,shop_id,flags,reason,buyer_payable_vnd)
         VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [id, orderId, actorId, order.shop_id, late ? ["LATE_CLAIM"] : [], reason, Number(order.total_vnd)]
      )).rows[0];
      await this.event(client, id, actorId, "OPENED", reason);
      await client.query(`INSERT INTO outbox_events(id,topic,aggregate_id,payload) VALUES($1,'claims.opened',$2,$3::jsonb)`,
        [`RBX-${ulid()}`, id, JSON.stringify({ caseId: id, shopId: order.shop_id })]);
      await client.query("COMMIT"); return presentCase(row);
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }

  async addEvidence(actorId: string, caseId: string, input: { processingRecordId: string; fileName: string; sizeBytes: number; checksum: string }) {
    if (!this.fakeEvidenceEnabled) throw new DomainError("FORBIDDEN", 403, "Fake evidence is disabled");
    const record = (await this.pool.query<{ purpose: string; target_id: string }>(
      "SELECT purpose,target_id FROM processing_records WHERE id=$1 AND actor_id=$2", [input.processingRecordId, actorId]
    )).rows[0];
    if (!record || record.target_id !== caseId || !["DISPUTE_EVIDENCE", "SELLER_EVIDENCE"].includes(record.purpose)) {
      throw new DomainError("PROCESSING_RECORD_REQUIRED", 409, "A matching processing record is required before upload");
    }
    const access = await this.caseAccess(actorId, caseId);
    const objectKey = `fake-evidence/${caseId}/${ulid()}/${sanitize(input.fileName)}`;
    const version = hash({ objectKey, checksum: input.checksum }).slice(0, 20);
    const id = `RBX-EV-${ulid()}`;
    await this.pool.query(
      `INSERT INTO dispute_evidences(id,case_id,uploader_id,processing_record_id,object_key,object_version,checksum,original_owner)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [id, caseId, actorId, input.processingRecordId, objectKey, version, input.checksum, access.role]
    );
    const derivativeKey = `${objectKey}.redacted`;
    await this.pool.query(
      `INSERT INTO evidence_derivatives(id,evidence_id,object_key,object_version,checksum) VALUES($1,$2,$3,$4,$5)`,
      [`RBX-DER-${ulid()}`, id, derivativeKey, version, hash({ derivativeKey, version })]
    );
    return { id, provider: "FAKE_METADATA", objectVersion: version, checksum: input.checksum };
  }

  async listEvidence(actor: string | { id: string; aal?: string }, caseId: string) {
    const actorId = typeof actor === "string" ? actor : actor.id;
    const access = await this.caseAccess(actorId, caseId, typeof actor === "string" ? undefined : actor.aal);
    const result = await this.pool.query<{
      id: string; original_key: string; original_version: string; original_checksum: string;
      derivative_key: string; derivative_version: string; derivative_checksum: string;
    }>(
      `SELECT e.id,e.object_key AS original_key,e.object_version AS original_version,e.checksum AS original_checksum,
              d.object_key AS derivative_key,d.object_version AS derivative_version,d.checksum AS derivative_checksum
       FROM dispute_evidences e JOIN evidence_derivatives d ON d.evidence_id=e.id WHERE e.case_id=$1 ORDER BY e.created_at`, [caseId]
    );
    return result.rows.map((row) => access.role === "SELLER" || access.role === "ADMIN"
      ? { id: row.id, view: "DERIVATIVE", objectKey: row.derivative_key, objectVersion: row.derivative_version, checksum: row.derivative_checksum }
      : { id: row.id, view: "ORIGINAL_METADATA", objectKey: row.original_key, objectVersion: row.original_version, checksum: row.original_checksum });
  }

  async reply(actorId: string, caseId: string, body: string) {
    const access = await this.caseAccess(actorId, caseId);
    await this.pool.query(
      "INSERT INTO dispute_case_events(id,case_id,actor_id,type,body) VALUES($1,$2,$3,$4,$5)",
      [`RBX-DCE-${ulid()}`, caseId, actorId, access.role === "SELLER" ? "SELLER_RESPONSE" : "BUYER_RESPONSE", body]
    );
    return { accepted: true };
  }

  async appeal(actorId: string, caseId: string, body: string) {
    const updated = await this.pool.query(
      `UPDATE dispute_cases SET status='APPEALED',updated_at=now() WHERE id=$1 AND buyer_id=$2
       AND status='RESOLVED_APPEAL_WINDOW' AND appeal_until>now() RETURNING id`, [caseId, actorId]
    );
    if (!updated.rowCount) throw new DomainError("RESOURCE_NOT_FOUND", 404, "Appealable case not found");
    await this.pool.query("INSERT INTO dispute_case_events(id,case_id,actor_id,type,body) VALUES($1,$2,$3,'APPEALED',$4)", [`RBX-DCE-${ulid()}`, caseId, actorId, body]);
    return { id: caseId, status: "APPEALED" };
  }

  async listAdmin(actor: { id: string; aal?: string }) {
    await this.requireArbitrator(actor);
    return (await this.pool.query("SELECT * FROM dispute_cases WHERE status<>'CLOSED' ORDER BY created_at")).rows.map(presentCase);
  }

  async listForShop(actorId: string, shopId: string) {
    if (!(await this.pool.query("SELECT 1 FROM shop_memberships WHERE user_id=$1 AND shop_id=$2 AND status='ACTIVE'", [actorId, shopId])).rowCount) {
      throw new DomainError("RESOURCE_NOT_FOUND", 404, "Shop not found");
    }
    return (await this.pool.query(
      `SELECT c.*,i.item_snapshot->>'title' AS product_title
       FROM dispute_cases c
       JOIN sub_orders so ON so.order_id=c.order_id
       JOIN sub_order_items i ON i.sub_order_id=so.id
       WHERE c.shop_id=$1 ORDER BY c.created_at DESC`,
      [shopId]
    )).rows.map(presentCase);
  }

  async resolve(actor: { id: string; aal?: string }, caseId: string, input: { decision: string; reason: string; refundAmountVnd: number; returnRequired: boolean }, idempotencyKey?: string) {
    await this.requireArbitrator(actor);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const requestHash = hash({ caseId, input });
      if (idempotencyKey) {
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`claim-decision:${actor.id}:${idempotencyKey}`]);
        const prior = (await client.query<{ request_hash: string; response: { id: string; status: string; payoutCompleted: false } | null }>(
          "SELECT request_hash,response FROM idempotency_records WHERE actor_id=$1 AND scope='claims.decision' AND idempotency_key=$2", [actor.id, idempotencyKey]
        )).rows[0];
        if (prior?.request_hash !== undefined && prior.request_hash !== requestHash) throw new DomainError("IDEMPOTENCY_CONFLICT", 409, "Idempotency key payload differs");
        if (prior?.response) { await client.query("COMMIT"); return prior.response; }
        if (!prior) await client.query("INSERT INTO idempotency_records(actor_id,scope,idempotency_key,request_hash) VALUES($1,'claims.decision',$2,$3)", [actor.id, idempotencyKey, requestHash]);
      }
      const item = (await client.query<{ order_id: string; buyer_payable_vnd: string }>("SELECT order_id,buyer_payable_vnd FROM dispute_cases WHERE id=$1 FOR UPDATE", [caseId])).rows[0];
      if (!item) throw new DomainError("RESOURCE_NOT_FOUND", 404, "Dispute not found");
      const refunded = Number((await client.query<{ total: string }>("SELECT coalesce(sum(amount_vnd),0)::text AS total FROM refunds WHERE order_id=$1", [item.order_id])).rows[0]!.total);
      if (refunded + input.refundAmountVnd > Number(item.buyer_payable_vnd)) throw new DomainError("REFUND_AMOUNT_EXCEEDED", 409, "Refund exceeds buyer payable");
      if (input.decision === "BUYER_REFUND" && input.refundAmountVnd > 0) {
        const partial = input.refundAmountVnd < Number(item.buyer_payable_vnd);
        await client.query(
          `INSERT INTO refunds(id,case_id,order_id,amount_vnd,funder,return_required,status)
           VALUES($1,$2,$3,$4,'SELLER',$5,$6)`,
          [`RBX-REF-${ulid()}`, caseId, item.order_id, input.refundAmountVnd, partial ? false : input.returnRequired,
            partial || !input.returnRequired ? "PAYOUT_READY" : "WAITING_RETURN"]
        );
      }
      await client.query("UPDATE dispute_cases SET status='RESOLVED_APPEAL_WINDOW',appeal_until=now()+interval '7 days',updated_at=now() WHERE id=$1", [caseId]);
      await this.event(client, caseId, actor.id, "ADMIN_DECISION", `${input.decision}: ${input.reason}`);
      const response = { id: caseId, status: "RESOLVED_APPEAL_WINDOW", payoutCompleted: false as const };
      if (idempotencyKey) await client.query("UPDATE idempotency_records SET response=$3::jsonb WHERE actor_id=$1 AND scope='claims.decision' AND idempotency_key=$2", [actor.id, idempotencyKey, JSON.stringify(response)]);
      await client.query("COMMIT"); return response;
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }

  private async caseAccess(actorId: string, caseId: string, aal?: string): Promise<{ role: "BUYER" | "SELLER" | "ADMIN" }> {
    const row = (await this.pool.query<{ buyer_id: string; seller: boolean }>(
      `SELECT c.buyer_id::text, EXISTS(SELECT 1 FROM shop_memberships m WHERE m.shop_id=c.shop_id AND m.user_id=$2 AND m.status='ACTIVE') AS seller
       FROM dispute_cases c WHERE c.id=$1`, [caseId, actorId]
    )).rows[0];
    if (!row) throw new DomainError("RESOURCE_NOT_FOUND", 404, "Dispute not found");
    if (row.buyer_id !== actorId && !row.seller && aal === "aal2" && (await this.pool.query(
      "SELECT 1 FROM platform_staff_roles WHERE user_id=$1 AND status='ACTIVE' AND role IN ('DISPUTE_ARBITRATOR','SUPER_ADMIN')", [actorId]
    )).rowCount) return { role: "ADMIN" };
    if (row.buyer_id !== actorId && !row.seller) throw new DomainError("RESOURCE_NOT_FOUND", 404, "Dispute not found");
    return { role: row.buyer_id === actorId ? "BUYER" : "SELLER" };
  }
  private async requireArbitrator(actor: { id: string; aal?: string }): Promise<void> {
    if (actor.aal !== "aal2") throw new DomainError("MFA_REQUIRED", 403, "AAL2 is required");
    if (!(await this.pool.query("SELECT 1 FROM platform_staff_roles WHERE user_id=$1 AND status='ACTIVE' AND role IN ('DISPUTE_ARBITRATOR','SUPER_ADMIN')", [actor.id])).rowCount) {
      throw new DomainError("FORBIDDEN", 403, "Dispute capability denied");
    }
  }
  private async event(client: PoolClient, caseId: string, actorId: string, type: string, body: string): Promise<void> {
    await client.query("INSERT INTO dispute_case_events(id,case_id,actor_id,type,body) VALUES($1,$2,$3,$4,$5)", [`RBX-DCE-${ulid()}`, caseId, actorId, type, body]);
  }
}

function hash(value: unknown): string { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function sanitize(value: string): string { return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120); }
function presentCase(row: Record<string, unknown>) { return {
  id: row.id, orderId: row.order_id, shopId: row.shop_id, status: row.status, flags: row.flags, reason: row.reason,
  productTitle: row.product_title,
  buyerPayableVnd: Number(row.buyer_payable_vnd), appealUntil: row.appeal_until instanceof Date ? row.appeal_until.toISOString() : null,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
}; }
