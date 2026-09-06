import { z } from "zod";

export const financeAmountSchema = z.object({ label: z.string(), amountVnd: z.number().int().nonnegative() });

export const walletTransactionSchema = z.object({
  code: z.string(),
  kind: z.enum(["DEPOSIT", "HOLD", "REVENUE"]),
  detail: z.string(),
  amountVnd: z.number().int(),
  occurredAt: z.string().datetime()
});

export const sellerFinanceSnapshotSchema = z.object({
  availableBalanceVnd: z.number().int().nonnegative(),
  heldBalanceVnd: z.number().int().nonnegative(),
  netRevenueVnd: z.number().int().nonnegative(),
  monthlyRevenue: z.array(financeAmountSchema).max(12),
  productRevenue: z.array(financeAmountSchema).max(12),
  walletTransactions: z.array(walletTransactionSchema).max(100),
  updatedAt: z.string().datetime()
});

export type SellerFinanceSnapshot = z.infer<typeof sellerFinanceSnapshotSchema>;
