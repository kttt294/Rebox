import { FinanceWorkspace, SellerShell } from "../../../features/seller-shell";

export default function SellerWalletPage() {
  return (
    <SellerShell>
      <FinanceWorkspace active="wallet">
        <div className="grid min-h-[420px] place-items-center rounded-xl border border-[var(--line)] bg-[var(--paper)] p-6 text-center">
          <div className="max-w-lg">
            <h2 className="text-2xl font-bold">Chưa có giao dịch ví</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Lịch sử ví sẽ xuất hiện sau khi backend ledger và payment được triển khai. Hiện giao diện không tạo giao dịch giả.
            </p>
          </div>
        </div>
      </FinanceWorkspace>
    </SellerShell>
  );
}
