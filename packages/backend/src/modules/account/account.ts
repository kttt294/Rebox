import type {
  AccountAddress,
  AccountPaymentOverview,
  CreateAccountAddressInput,
  NotificationPreferences,
  PrivacyPreferences,
  PurchaseOrderSummary
} from "@reboxe/shared";
import type { Pool, PoolClient } from "pg";
import { ulid } from "ulid";
import { DomainError } from "../../errors";
import { createPiiKey, decryptPii, encryptPii } from "../identity/pii";

const notificationDefaults: NotificationPreferences = {
  orderEmail: true,
  promotionEmail: false,
  surveyEmail: true,
  promotionSms: false,
  promotionZalo: true
};

const privacyDefaults: PrivacyPreferences = {
  personalizedRecommendations: true,
  shareUsageAnalytics: false,
  publicPurchaseActivity: false
};

type PreferenceRow = {
  order_email: boolean;
  promotion_email: boolean;
  survey_email: boolean;
  promotion_sms: boolean;
  promotion_zalo: boolean;
  personalized_recommendations: boolean;
  share_usage_analytics: boolean;
  public_purchase_activity: boolean;
};

type AddressRow = {
  id: string;
  label: string;
  recipient_name_enc: Buffer;
  phone_enc: Buffer;
  address_line_enc: Buffer;
  ward: string;
  district: string;
  province: string;
  is_default: boolean;
  created_at: Date;
};

export class AccountModule {
  private readonly piiKey: Buffer;

  constructor(private readonly pool: Pool, piiSecret: string) {
    this.piiKey = createPiiKey(piiSecret);
  }

  async listAddresses(actorId: string): Promise<AccountAddress[]> {
    const result = await this.pool.query<AddressRow>(
      `SELECT id, label, recipient_name_enc, phone_enc, address_line_enc, ward, district, province,
              is_default, created_at
       FROM account_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
      [actorId]
    );
    return result.rows.map((row) => this.addressResponse(row));
  }

  async createAddress(actorId: string, input: CreateAccountAddressInput): Promise<AccountAddress> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await this.ensureProfile(client, actorId);
      await client.query("SELECT id FROM profiles WHERE id = $1 FOR UPDATE", [actorId]);
      const count = await client.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM account_addresses WHERE user_id = $1",
        [actorId]
      );
      const isDefault = input.isDefault || count.rows[0]?.count === "0";
      if (isDefault) await client.query("UPDATE account_addresses SET is_default = false, updated_at = now() WHERE user_id = $1", [actorId]);
      const result = await client.query<AddressRow>(
        `INSERT INTO account_addresses (
           id, user_id, label, recipient_name_enc, phone_enc, address_line_enc,
           ward, district, province, is_default
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, label, recipient_name_enc, phone_enc, address_line_enc, ward, district,
                   province, is_default, created_at`,
        [
          `RBXADDR-${ulid()}`,
          actorId,
          input.label,
          this.encrypt(input.recipientName),
          this.encrypt(input.phone),
          this.encrypt(input.addressLine),
          input.ward,
          input.district,
          input.province,
          isDefault
        ]
      );
      await client.query("COMMIT");
      return this.addressResponse(result.rows[0]!);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteAddress(actorId: string, addressId: string): Promise<{ deleted: true }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const deleted = await client.query<{ is_default: boolean }>(
        "DELETE FROM account_addresses WHERE id = $1 AND user_id = $2 RETURNING is_default",
        [addressId, actorId]
      );
      if (!deleted.rowCount) throw new DomainError("RESOURCE_NOT_FOUND", 404, "Address not found");
      if (deleted.rows[0]?.is_default) {
        await client.query(
          `UPDATE account_addresses SET is_default = true, updated_at = now()
           WHERE id = (SELECT id FROM account_addresses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1)`,
          [actorId]
        );
      }
      await client.query("COMMIT");
      return { deleted: true };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getNotifications(actorId: string): Promise<NotificationPreferences> {
    const row = await this.getPreferences(actorId);
    return row ? this.notificationResponse(row) : notificationDefaults;
  }

  async updateNotifications(actorId: string, input: NotificationPreferences): Promise<NotificationPreferences> {
    await this.ensureProfile(this.pool, actorId);
    const result = await this.pool.query<PreferenceRow>(
      `INSERT INTO account_preferences (
         user_id, order_email, promotion_email, survey_email, promotion_sms, promotion_zalo
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET order_email = EXCLUDED.order_email,
         promotion_email = EXCLUDED.promotion_email, survey_email = EXCLUDED.survey_email,
         promotion_sms = EXCLUDED.promotion_sms, promotion_zalo = EXCLUDED.promotion_zalo,
         updated_at = now()
       RETURNING *`,
      [actorId, input.orderEmail, input.promotionEmail, input.surveyEmail, input.promotionSms, input.promotionZalo]
    );
    return this.notificationResponse(result.rows[0]!);
  }

  async getPrivacy(actorId: string): Promise<PrivacyPreferences> {
    const row = await this.getPreferences(actorId);
    return row ? this.privacyResponse(row) : privacyDefaults;
  }

  async updatePrivacy(actorId: string, input: PrivacyPreferences): Promise<PrivacyPreferences> {
    await this.ensureProfile(this.pool, actorId);
    const result = await this.pool.query<PreferenceRow>(
      `INSERT INTO account_preferences (
         user_id, personalized_recommendations, share_usage_analytics, public_purchase_activity
       ) VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET personalized_recommendations = EXCLUDED.personalized_recommendations,
         share_usage_analytics = EXCLUDED.share_usage_analytics,
         public_purchase_activity = EXCLUDED.public_purchase_activity, updated_at = now()
       RETURNING *`,
      [actorId, input.personalizedRecommendations, input.shareUsageAnalytics, input.publicPurchaseActivity]
    );
    return this.privacyResponse(result.rows[0]!);
  }

  async getPaymentOverview(actorId: string): Promise<AccountPaymentOverview> {
    const result = await this.pool.query<{
      kyc_id: string;
      bank_code: string;
      account_number_enc: Buffer;
      account_holder_name_enc: Buffer | null;
      verified: boolean;
    }>(
      `SELECT kyc_id, bank_code, account_number_enc, account_holder_name_enc, verified
       FROM seller_bank_accounts WHERE user_id = $1 ORDER BY created_at DESC`,
      [actorId]
    );
    return {
      cards: [],
      bankAccounts: result.rows.map((row) => {
        const accountNumber = decryptPii(row.account_number_enc, this.piiKey) ?? "";
        return {
          id: row.kyc_id,
          bankCode: row.bank_code,
          maskedAccountNumber: accountNumber ? `${"•".repeat(Math.max(0, accountNumber.length - 4))}${accountNumber.slice(-4)}` : "",
          accountHolder: decryptPii(row.account_holder_name_enc, this.piiKey),
          verified: row.verified
        };
      })
    };
  }

  async listOrders(actorId: string): Promise<PurchaseOrderSummary[]> {
    const result = await this.pool.query<{
      id: string;
      status: PurchaseOrderSummary["status"];
      total_vnd: string;
      item_count: number;
      placed_at: Date;
    }>(
      `SELECT id, status, total_vnd::text, item_count, placed_at
       FROM purchase_orders WHERE buyer_id = $1 ORDER BY placed_at DESC`,
      [actorId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      status: row.status,
      totalVnd: Number(row.total_vnd),
      itemCount: row.item_count,
      placedAt: row.placed_at.toISOString()
    }));
  }

  private async getPreferences(actorId: string): Promise<PreferenceRow | undefined> {
    return (await this.pool.query<PreferenceRow>("SELECT * FROM account_preferences WHERE user_id = $1", [actorId])).rows[0];
  }

  private notificationResponse(row: PreferenceRow): NotificationPreferences {
    return {
      orderEmail: row.order_email,
      promotionEmail: row.promotion_email,
      surveyEmail: row.survey_email,
      promotionSms: row.promotion_sms,
      promotionZalo: row.promotion_zalo
    };
  }

  private privacyResponse(row: PreferenceRow): PrivacyPreferences {
    return {
      personalizedRecommendations: row.personalized_recommendations,
      shareUsageAnalytics: row.share_usage_analytics,
      publicPurchaseActivity: row.public_purchase_activity
    };
  }

  private addressResponse(row: AddressRow): AccountAddress {
    return {
      id: row.id,
      label: row.label,
      recipientName: decryptPii(row.recipient_name_enc, this.piiKey) ?? "",
      phone: decryptPii(row.phone_enc, this.piiKey) ?? "",
      addressLine: decryptPii(row.address_line_enc, this.piiKey) ?? "",
      ward: row.ward,
      district: row.district,
      province: row.province,
      isDefault: row.is_default,
      createdAt: row.created_at.toISOString()
    };
  }

  private encrypt(value: string): Buffer {
    return encryptPii(value, this.piiKey);
  }

  private async ensureProfile(client: Pick<Pool, "query"> | Pick<PoolClient, "query">, actorId: string): Promise<void> {
    await client.query("INSERT INTO profiles (id, status) VALUES ($1, 'ACTIVE') ON CONFLICT (id) DO NOTHING", [actorId]);
  }
}
