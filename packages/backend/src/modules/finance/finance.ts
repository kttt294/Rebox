import { sellerFinanceSnapshotSchema, type SellerFinanceSnapshot } from "@rebox/shared";
import type { Pool } from "pg";
import type { IdentityModule } from "../identity";

export class FinanceModule {
  constructor(private readonly pool: Pool, private readonly identity: IdentityModule) {}

  async getSnapshot(actorId: string, shopId: string): Promise<SellerFinanceSnapshot> {
    const client = await this.pool.connect();
    try {
      await this.identity.requireShopCapability(client, actorId, shopId, "VIEW_FINANCE");
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
