import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { AccountModule } from "../src/modules/account";
import type { NotificationPreferences } from "@reboxe/shared";

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const piiSecret = process.env.SELLER_PII_ENCRYPTION_KEY ?? "test-seller-pii-encryption-key-at-least-32-characters";

describe("Account module", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const account = new AccountModule(pool, piiSecret);
  let actorId = "";
  let originalNotifications: NotificationPreferences;

  beforeAll(async () => {
    const actor = await pool.query<{ id: string }>("SELECT id::text FROM auth.users ORDER BY created_at ASC LIMIT 1");
    if (!actor.rows[0]) throw new Error("An auth fixture is required for the account integration test");
    actorId = actor.rows[0].id;
    originalNotifications = await account.getNotifications(actorId);
    await pool.query("DELETE FROM account_addresses WHERE user_id = $1 AND label = 'Vitest'", [actorId]);
  });

  afterAll(async () => {
    await pool.query("DELETE FROM account_addresses WHERE user_id = $1 AND label = 'Vitest'", [actorId]);
    await account.updateNotifications(actorId, originalNotifications);
    await pool.end();
  });

  it("persists encrypted addresses and notification preferences for the authenticated actor", async () => {
    const created = await account.createAddress(actorId, {
      label: "Vitest",
      recipientName: "Nguyen Van Test",
      phone: "0901234567",
      addressLine: "123 Duong Kiem Thu",
      ward: "Dich Vong",
      district: "Cau Giay",
      province: "Ha Noi",
      isDefault: false
    });
    const stored = await pool.query<{ phone_enc: Buffer }>("SELECT phone_enc FROM account_addresses WHERE id = $1", [created.id]);
    const notifications = await account.updateNotifications(actorId, {
      orderEmail: true,
      promotionEmail: true,
      surveyEmail: false,
      promotionSms: false,
      promotionZalo: true
    });

    expect((await account.listAddresses(actorId)).find((address) => address.id === created.id)).toMatchObject({
      recipientName: "Nguyen Van Test",
      phone: "0901234567"
    });
    expect(stored.rows[0]?.phone_enc.equals(Buffer.from("0901234567"))).toBe(false);
    expect(notifications).toMatchObject({ promotionEmail: true, surveyEmail: false });

    await account.deleteAddress(actorId, created.id);
  });
});
