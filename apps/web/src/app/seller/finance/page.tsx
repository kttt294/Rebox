import { FinanceWorkspace, SellerShell } from "../../../features/seller-shell";

export default function SellerFinancePage() {
  return (
    <SellerShell>
      <FinanceWorkspace active="overview">
        <div className="grid min-h-[420px] place-items-center rounded-xl border border-[var(--line)] bg-[var(--paper)] p-6 text-center">
          <div className="max-w-lg">
            <h2 className="text-2xl font-bold">Chưa có dữ liệu tài chính</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              CSDL hiện chưa có ledger, settlement hoặc API số dư. Các số liệu tài chính mẫu đã được gỡ để tránh hiển thị dữ liệu không tồn tại.
            </p>
          </div>
        </div>
      </FinanceWorkspace>
    </SellerShell>
  );
}
