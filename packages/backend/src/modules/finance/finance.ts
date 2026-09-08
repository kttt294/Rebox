import { sellerFinanceSnapshotSchema, type SellerFinanceSnapshot } from "@reboxe/shared";
import type { Pool } from "pg";
import type { IdentityModule } from "../identity";

type PersistedSnapshotRow = {
  available_balance_vnd: string;
  held_balance_vnd: string;
  net_revenue_vnd: string;
  monthly_revenue: SellerFinanceSnapshot["monthlyRevenue"];
  product_revenue: SellerFinanceSnapshot["productRevenue"];
  wallet_transactions: SellerFinanceSnapshot["walletTransactions"];
  updated_at: Date;
};

export class FinanceModule {
  constructor(private readonly pool: Pool, private readonly identity: IdentityModule) {}

  async getSnapshot(actorId: string, shopId: string): Promise<SellerFinanceSnapshot> {
    const client = await this.pool.connect();
    try {
      await this.identity.requireShopCapability(client, actorId, shopId, "VIEW_FINANCE");
      const persisted = (await client.query<PersistedSnapshotRow>(
        `SELECT available_balance_vnd::text,held_balance_vnd::text,net_revenue_vnd::text,
                monthly_revenue,product_revenue,wallet_transactions,updated_at
         FROM seller_finance_snapshots WHERE shop_id=$1`,
        [shopId]
      )).rows[0];
      if (persisted) {
        return sellerFinanceSnapshotSchema.parse({
          availableBalanceVnd: Number(persisted.available_balance_vnd),
          heldBalanceVnd: Number(persisted.held_balance_vnd),
          netRevenueVnd: Number(persisted.net_revenue_vnd),
          monthlyRevenue: persisted.monthly_revenue,
          productRevenue: persisted.product_revenue,
          walletTransactions: persisted.wallet_transactions,
          updatedAt: persisted.updated_at.toISOString()
        });
      }
      const balances = await client.query<{ account_key: string; amount: string }>(
        `SELECT p.account_key,coalesce(sum(p.amount_vnd),0)::text AS amount FROM ledger_postings p
         JOIN ledger_transactions t ON t.id=p.transaction_id
         WHERE t.status='POSTED' AND p.account_key=ANY($1::text[]) GROUP BY p.account_key`,
        [[`shop:${shopId}:available`, `shop:${shopId}:order_locked`]]
      );
      const byAccount = new Map(balances.rows.map((row) => [row.account_key, Number(row.amount)]));
      const revenue = Number((await client.query<{ amount: string }>(
        `SELECT coalesce(sum(i.amount_vnd),0)::text AS amount FROM sub_order_items i JOIN sub_orders s ON s.id=i.sub_order_id
         JOIN orders o ON o.id=s.order_id WHERE s.shop_id=$1 AND o.status='COMPLETED'`, [shopId]
      )).rows[0]!.amount);
      const transactions = await client.query<{ id: string; kind: string; amount_vnd: string; created_at: Date }>(
        `SELECT t.id,t.kind,p.amount_vnd,t.created_at FROM ledger_transactions t JOIN ledger_postings p ON p.transaction_id=t.id
         WHERE p.account_key LIKE $1 ORDER BY t.created_at DESC LIMIT 100`, [`shop:${shopId}:%`]
      );
      return sellerFinanceSnapshotSchema.parse({
        availableBalanceVnd: Math.max(0, byAccount.get(`shop:${shopId}:available`) ?? 0),
        heldBalanceVnd: Math.max(0, byAccount.get(`shop:${shopId}:order_locked`) ?? 0),
        netRevenueVnd: revenue, monthlyRevenue: [], productRevenue: [],
        walletTransactions: transactions.rows.map((row) => ({
          code: row.id, kind: row.kind === "SANDBOX_BALANCE_SEED" ? "DEPOSIT" : row.kind === "HOLD_CREATE" ? "HOLD" : "REVENUE",
          detail: `${row.kind} · dữ liệu mô phỏng`, amountVnd: Number(row.amount_vnd), occurredAt: row.created_at.toISOString()
        })),
        updatedAt: new Date().toISOString()
      });
    } finally {
      client.release();
    }
  }
}
