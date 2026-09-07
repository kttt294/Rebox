import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { ulid } from "ulid";
import { DomainError } from "../../errors";

export class OperationsModule {
  constructor(private readonly pool: Pool) {}

  async listNotifications(actorId: string) {
    const rows = await this.pool.query<{ id: string; kind: string; title: string; body: string; read_at: Date | null; created_at: Date }>(
      "SELECT id,kind,title,body,read_at,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100", [actorId]
    );
    return rows.rows.map((row) => ({ id: row.id, kind: row.kind, title: row.title, body: row.body, readAt: row.read_at?.toISOString() ?? null, createdAt: row.created_at.toISOString() }));
  }

  async markNotificationRead(actorId: string, notificationId: string) {
    const row = await this.pool.query("UPDATE notifications SET read_at=coalesce(read_at,now()) WHERE id=$1 AND user_id=$2 RETURNING id", [notificationId, actorId]);
    if (!row.rowCount) throw new DomainError("RESOURCE_NOT_FOUND", 404, "Notification not found");
    return { id: notificationId, read: true };
  }

  async getLegalArtifact(slug: string, version?: string) {
    const row = (await this.pool.query<{ slug: string; version: string; title: string; body: string; body_hash: string; effective_at: Date }>(
      `SELECT slug,version,title,body,body_hash,effective_at FROM legal_artifacts WHERE slug=$1
       ${version ? "AND version=$2" : "AND effective_at<=now() ORDER BY effective_at DESC LIMIT 1"}`, version ? [slug, version] : [slug]
    )).rows[0];
    if (!row) throw new DomainError("LEGAL_ARTIFACT_NOT_FOUND", 404, "Legal artifact not found");
    return { slug: row.slug, version: row.version, title: row.title, body: row.body, bodyHash: row.body_hash, effectiveAt: row.effective_at.toISOString() };
  }

  async acceptLegalArtifact(actorId: string, slug: string, version: string, source: string) {
    const artifact = await this.getLegalArtifact(slug, version);
    await this.pool.query("INSERT INTO profiles(id,status) VALUES($1,'ACTIVE') ON CONFLICT(id) DO NOTHING", [actorId]);
    const row = (await this.pool.query<{ accepted_at: Date }>(
      `INSERT INTO legal_acceptances(id,user_id,slug,version,source) VALUES($1,$2,$3,$4,$5)
       ON CONFLICT(user_id,slug,version) DO UPDATE SET source=legal_acceptances.source RETURNING accepted_at`,
      [`RBX-LA-${ulid()}`, actorId, slug, version, source]
    )).rows[0]!;
    return { ...artifact, acceptedAt: row.accepted_at.toISOString() };
  }

  async createSupportTicket(actorId: string, input: { category: string; content: string; orderId?: string | undefined; caseId?: string | undefined }) {
    await this.pool.query("INSERT INTO profiles(id,status) VALUES($1,'ACTIVE') ON CONFLICT(id) DO NOTHING", [actorId]);
    if (input.orderId && !(await this.pool.query("SELECT 1 FROM orders WHERE id=$1 AND buyer_id=$2", [input.orderId, actorId])).rowCount) {
      throw new DomainError("RESOURCE_NOT_FOUND", 404, "Order not found");
    }
    if (input.caseId && !(await this.pool.query("SELECT 1 FROM dispute_cases WHERE id=$1 AND buyer_id=$2", [input.caseId, actorId])).rowCount) {
      throw new DomainError("RESOURCE_NOT_FOUND", 404, "Dispute not found");
    }
    const id = `RBX-TKT-${ulid()}`;
    await this.pool.query(
      "INSERT INTO support_tickets(id,user_id,category,content,order_id,case_id) VALUES($1,$2,$3,$4,$5,$6)",
      [id, actorId, input.category, input.content, input.orderId ?? null, input.caseId ?? null]
    );
    return { id, status: "OPEN" };
  }

  async getSupportTicket(actorId: string, ticketId: string) {
    const row = (await this.pool.query("SELECT id,category,content,status,created_at FROM support_tickets WHERE id=$1 AND user_id=$2", [ticketId, actorId])).rows[0];
    if (!row) throw new DomainError("RESOURCE_NOT_FOUND", 404, "Ticket not found");
    return row;
  }

  async listSupportQueue(actor: { id: string; aal?: string }) {
    await this.requireStaff(actor, ["SUPPORT", "SUPER_ADMIN"]);
    return (await this.pool.query("SELECT id,category,status,created_at FROM support_tickets ORDER BY created_at")).rows;
  }

  async replySupport(actor: { id: string; aal?: string }, ticketId: string, body: string, status?: string) {
    await this.requireStaff(actor, ["SUPPORT", "SUPER_ADMIN"]);
    const updated = await this.pool.query("UPDATE support_tickets SET status=coalesce($2,status),updated_at=now() WHERE id=$1 RETURNING id", [ticketId, status ?? null]);
    if (!updated.rowCount) throw new DomainError("RESOURCE_NOT_FOUND", 404, "Ticket not found");
    await this.pool.query("INSERT INTO support_ticket_events(id,ticket_id,actor_id,body,status) VALUES($1,$2,$3,$4,$5)", [`RBX-TKE-${ulid()}`, ticketId, actor.id, body, status ?? null]);
    return { id: ticketId, status: status ?? "UNCHANGED" };
  }

  async createPrivacyRequest(actor: { id: string; aal?: string }, type: string) {
    if (actor.aal !== "aal2") throw new DomainError("STEP_UP_REQUIRED", 403, "AAL2 is required for privacy requests");
    const id = `RBX-PRIV-${ulid()}`;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO profiles(id,status) VALUES($1,'ACTIVE') ON CONFLICT(id) DO NOTHING", [actor.id]);
      const counts = (await client.query<{ addresses: string; orders: string; disputes: string }>(
        `SELECT
          (SELECT count(*)::text FROM account_addresses WHERE user_id=$1) AS addresses,
          (SELECT count(*)::text FROM orders WHERE buyer_id=$1) AS orders,
          (SELECT count(*)::text FROM dispute_cases WHERE buyer_id=$1) AS disputes`, [actor.id]
      )).rows[0]!;
      const exceptions = type === "DELETION_ANONYMIZATION" ? ["LEDGER", "AUDIT", "LEGAL_HOLD"] : [];
      const status = type === "CORRECTION" ? "WAITING_USER_INPUT"
        : type === "DELETION_ANONYMIZATION" ? "COMPLETED_WITH_EXCEPTIONS" : "COMPLETED";
      if (type === "DELETION_ANONYMIZATION") {
        await client.query("DELETE FROM account_addresses WHERE user_id=$1", [actor.id]);
        await client.query("DELETE FROM account_preferences WHERE user_id=$1", [actor.id]);
        await client.query("UPDATE profiles SET status='DELETED' WHERE id=$1", [actor.id]);
      }
      const receiptBase = {
        synthetic: true,
        status,
        processedAt: new Date().toISOString(),
        slaDueAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        summary: { addresses: Number(counts.addresses), orders: Number(counts.orders), disputes: Number(counts.disputes) },
        deleted: type === "DELETION_ANONYMIZATION" ? ["account_addresses", "account_preferences"] : [],
        tombstone: type === "DELETION_ANONYMIZATION" ? "profiles.status=DELETED" : null,
        exceptions
      };
      const receipt = { ...receiptBase, hash: hash({ id, actorId: actor.id, type, ...receiptBase }) };
      await client.query(
        "INSERT INTO privacy_requests(id,user_id,type,status,receipt,updated_at) VALUES($1,$2,$3,$4,$5::jsonb,now())",
        [id, actor.id, type, status, JSON.stringify(receipt)]
      );
      await client.query("COMMIT");
      return { id, type, status, receipt };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getPrivacyRequest(actorId: string, id: string) {
    const row = (await this.pool.query<{ id: string; type: string; status: string; receipt: unknown; created_at: Date }>(
      "SELECT id,type,status,receipt,created_at FROM privacy_requests WHERE id=$1 AND user_id=$2", [id, actorId]
    )).rows[0];
    if (!row) throw new DomainError("RESOURCE_NOT_FOUND", 404, "Privacy request not found");
    return { id: row.id, type: row.type, status: row.status, receipt: row.receipt, createdAt: row.created_at.toISOString() };
  }

  private async requireStaff(actor: { id: string; aal?: string }, roles: string[]): Promise<void> {
    if (actor.aal !== "aal2") throw new DomainError("MFA_REQUIRED", 403, "AAL2 is required");
    if (!(await this.pool.query("SELECT 1 FROM platform_staff_roles WHERE user_id=$1 AND status='ACTIVE' AND role=ANY($2::text[])", [actor.id, roles])).rowCount) {
      throw new DomainError("FORBIDDEN", 403, "Staff capability denied");
    }
  }
}

function hash(value: unknown): string { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
