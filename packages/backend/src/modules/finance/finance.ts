import { sellerFinanceSnapshotSchema, type SellerFinanceSnapshot } from "@rebox/shared";
import type { Pool } from "pg";
import type { IdentityModule } from "../identity";

export class FinanceModule {
  constructor(private readonly pool: Pool, private readonly identity: IdentityModule) {}

  async getSnapshot(actorId: string, shopId: string): Promise<SellerFinanceSnapshot> {
    const client = await this.pool.connect();
    try {
      await this.identity.requireShopCapability(client, actorId, shopId, "VIEW_FINANCE");
      const row = (await client.query<{
        available_balance_vnd: string;
        held_balance_vnd: string;
        net_revenue_vnd: string;
        monthly_revenue: unknown;
        product_revenue: unknown;
        wallet_transactions: unknown;
        updated_at: Date;
      }>("SELECT * FROM seller_finance_snapshots WHERE shop_id = $1", [shopId])).rows[0];

      return sellerFinanceSnapshotSchema.parse(row ? {
        availableBalanceVnd: Number(row.available_balance_vnd),
        heldBalanceVnd: Number(row.held_balance_vnd),
        netRevenueVnd: Number(row.net_revenue_vnd),
        monthlyRevenue: row.monthly_revenue,
        productRevenue: row.product_revenue,
        walletTransactions: row.wallet_transactions,
        updatedAt: row.updated_at.toISOString()
      } : {
        availableBalanceVnd: 0,
        heldBalanceVnd: 0,
        netRevenueVnd: 0,
        monthlyRevenue: [],
        productRevenue: [],
        walletTransactions: [],
        updatedAt: new Date(0).toISOString()
      });
    } finally {
      client.release();
    }
  }
}
