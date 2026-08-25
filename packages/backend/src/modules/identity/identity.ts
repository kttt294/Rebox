import type {
  ActorContext,
  CreateShopInput,
  ShopCapability,
  ShopRole
} from "@rebox/shared";
import type { Pool, PoolClient } from "pg";
import { ulid } from "ulid";
import { DomainError } from "../../errors";

export type ShopAccess = {
  shopId: string;
  displayName: string;
  role: ShopRole;
  kycStatus: "PENDING" | "VERIFIED" | "REJECTED";
  shopStatus: "ONBOARDING" | "ACTIVE" | "PAUSED" | "LOCKED_INSUFFICIENT_FUND" | "SUSPENDED";
};

const capabilityRoles: Record<ShopCapability, ReadonlySet<ShopRole>> = {
  CREATE_LISTING: new Set(["OWNER", "MANAGER", "WAREHOUSE"]),
  PUBLISH_LISTING: new Set(["OWNER", "MANAGER"])
};

type MembershipRow = {
  shop_id: string;
  display_name: string;
  role: ShopRole;
  membership_status: string;
  kyc_status: ShopAccess["kycStatus"];
  shop_status: ShopAccess["shopStatus"];
};

export class IdentityModule {
  constructor(private readonly pool: Pool) {}

  async onboardShop(actorId: string, input: CreateShopInput): Promise<ShopAccess> {
    const client = await this.pool.connect();
    const shopId = `RBX-${ulid()}`;

    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO profiles (id, status)
         VALUES ($1, 'ACTIVE')
         ON CONFLICT (id) DO NOTHING`,
        [actorId]
      );
      await client.query(
        `INSERT INTO shops (id, display_name, legal_type, kyc_status, status)
         VALUES ($1, $2, $3, 'PENDING', 'ONBOARDING')`,
        [shopId, input.displayName, input.legalType]
      );
      await client.query(
        `INSERT INTO shop_memberships (user_id, shop_id, role, status)
         VALUES ($1, $2, 'OWNER', 'ACTIVE')`,
        [actorId, shopId]
      );
      await client.query("COMMIT");
      return {
        shopId,
        displayName: input.displayName,
        role: "OWNER",
        kycStatus: "PENDING",
        shopStatus: "ONBOARDING"
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getActorContext(actorId: string): Promise<ActorContext> {
    const profile = await this.pool.query<{ status: ActorContext["profileStatus"] }>(
      "SELECT status FROM profiles WHERE id = $1",
      [actorId]
    );
    const memberships = await this.pool.query<MembershipRow>(
      `SELECT sm.shop_id, s.display_name, sm.role,
              sm.status AS membership_status, s.kyc_status, s.status AS shop_status
       FROM shop_memberships sm
       JOIN shops s ON s.id = sm.shop_id
       WHERE sm.user_id = $1
       ORDER BY sm.created_at ASC`,
      [actorId]
    );

    return {
      id: actorId,
      profileStatus: profile.rows[0]?.status ?? null,
      shops: memberships.rows.map((row) => ({
        id: row.shop_id,
        displayName: row.display_name,
        role: row.role,
        membershipStatus: row.membership_status,
        kycStatus: row.kyc_status,
        status: row.shop_status
      }))
    };
  }

  async requireShopCapability(
    client: PoolClient,
    actorId: string,
    shopId: string,
    capability: ShopCapability
  ): Promise<ShopAccess> {
    const result = await client.query<MembershipRow>(
      `SELECT sm.shop_id, s.display_name, sm.role,
              sm.status AS membership_status, s.kyc_status, s.status AS shop_status
       FROM shop_memberships sm
       JOIN shops s ON s.id = sm.shop_id
       WHERE sm.user_id = $1 AND sm.shop_id = $2
       FOR KEY SHARE OF sm, s`,
      [actorId, shopId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new DomainError("RESOURCE_NOT_FOUND", 404, "Shop not found");
    }
    if (row.membership_status !== "ACTIVE" || !capabilityRoles[capability].has(row.role)) {
      throw new DomainError("FORBIDDEN", 403, "Shop capability denied");
    }

    return {
      shopId: row.shop_id,
      displayName: row.display_name,
      role: row.role,
      kycStatus: row.kyc_status,
      shopStatus: row.shop_status
    };
  }
}
