import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { OperationsModule } from "../src/modules/operations";
import { OutboxModule } from "../src/platform/outbox";

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const userId = "10000000-0000-4000-8000-000000000002";
const otherUserId = "10000000-0000-4000-8000-000000000001";
const staffId = "10000000-0000-4000-8000-000000000003";

describe("sandbox legal, support, privacy and notification operations", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const operations = new OperationsModule(pool);
  const outbox = new OutboxModule(pool);
  const created = { ticketId: "", privacyId: "", eventId: "" };

  afterAll(async () => {
    if (created.ticketId) {
      await pool.query("DELETE FROM support_ticket_events WHERE ticket_id=$1", [created.ticketId]);
      await pool.query("DELETE FROM support_tickets WHERE id=$1", [created.ticketId]);
    }
    if (created.privacyId) await pool.query("DELETE FROM privacy_requests WHERE id=$1", [created.privacyId]);
    if (created.eventId) {
      await pool.query("DELETE FROM notifications WHERE stable_key=$1", [`${created.eventId}:${otherUserId}:IN_APP`]);
      await pool.query("DELETE FROM outbox_events WHERE id=$1", [created.eventId]);
    }
    await pool.query(
      "UPDATE account_preferences SET order_email=true,promotion_email=false,survey_email=true,promotion_sms=false,promotion_zalo=true WHERE user_id=$1",
      [otherUserId]
    );
    await pool.query("DELETE FROM legal_acceptances WHERE user_id=$1 AND slug='privacy-policy'", [userId]);
    await pool.query("UPDATE profiles SET status='ACTIVE' WHERE id=$1", [userId]);
    await pool.end();
  });

  it("keeps artifacts immutable and acceptances idempotent", async () => {
    const artifact = await operations.getLegalArtifact("privacy-policy");
    const first = await operations.acceptLegalArtifact(userId, "privacy-policy", artifact.version, "E2E");
    const retry = await operations.acceptLegalArtifact(userId, "privacy-policy", artifact.version, "RETRY");
    expect(retry.acceptedAt).toBe(first.acceptedAt);
    await expect(pool.query("UPDATE legal_artifacts SET body='tampered' WHERE slug='privacy-policy'"))
      .rejects.toThrow(/LEGAL_ARTIFACT_IMMUTABLE/);
  });

  it("enforces support ownership/capability and audits the reply", async () => {
    const ticket = await operations.createSupportTicket(userId, { category: "ACCOUNT", content: "Cần hỗ trợ tài khoản synthetic trong bài kiểm thử." });
    created.ticketId = ticket.id;
    await expect(operations.getSupportTicket(otherUserId, ticket.id)).rejects.toMatchObject({ code: "RESOURCE_NOT_FOUND" });
    await expect(operations.listSupportQueue({ id: staffId, aal: "aal1" })).rejects.toMatchObject({ code: "MFA_REQUIRED" });
    expect(await operations.listSupportQueue({ id: staffId, aal: "aal2" })).toEqual(expect.arrayContaining([expect.objectContaining({ id: ticket.id })]));
    await operations.replySupport({ id: staffId, aal: "aal2" }, ticket.id, "Đã xử lý ticket synthetic.", "RESOLVED");
    expect(await operations.getSupportTicket(userId, ticket.id)).toMatchObject({ status: "RESOLVED" });
    expect((await pool.query("SELECT actor_id FROM support_ticket_events WHERE ticket_id=$1", [ticket.id])).rows[0]!.actor_id).toBe(staffId);
  });

  it("deduplicates mandatory notifications even when optional preferences are disabled", async () => {
    created.eventId = `RBX-OPS-${randomUUID()}`;
    await pool.query(
      `INSERT INTO account_preferences(user_id,order_email,promotion_email,survey_email,promotion_sms,promotion_zalo)
       VALUES($1,false,false,false,false,false) ON CONFLICT(user_id) DO UPDATE SET order_email=false,promotion_email=false,survey_email=false,promotion_sms=false,promotion_zalo=false`,
      [otherUserId]
    );
    await pool.query("INSERT INTO outbox_events(id,topic,aggregate_id,payload) VALUES($1,'listing.published','RBX-01JTESTPUBLICLISTING00000','{}')", [created.eventId]);
    await outbox.processBatch(100);
    await outbox.processBatch(100);
    const rows = await pool.query("SELECT mandatory FROM notifications WHERE stable_key=$1", [`${created.eventId}:${otherUserId}:IN_APP`]);
    expect(rows.rows).toEqual([{ mandatory: true }]);
  });

  it("requires step-up and emits a deletion tombstone with retention exceptions", async () => {
    await expect(operations.createPrivacyRequest({ id: userId, aal: "aal1" }, "DELETION_ANONYMIZATION"))
      .rejects.toMatchObject({ code: "STEP_UP_REQUIRED" });
    const result = await operations.createPrivacyRequest({ id: userId, aal: "aal2" }, "DELETION_ANONYMIZATION");
    created.privacyId = result.id;
    expect(result).toMatchObject({ status: "COMPLETED_WITH_EXCEPTIONS", receipt: { tombstone: "profiles.status=DELETED", exceptions: ["LEDGER", "AUDIT", "LEGAL_HOLD"] } });
    expect((await pool.query("SELECT status FROM profiles WHERE id=$1", [userId])).rows[0]!.status).toBe("DELETED");
    await expect(operations.getPrivacyRequest(otherUserId, result.id)).rejects.toMatchObject({ code: "RESOURCE_NOT_FOUND" });
  });
});
