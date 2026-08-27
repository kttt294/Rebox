import { FinanceWorkspace, SellerShell } from "../../../features/seller-shell";

const transactions = [
  { code: "#RBX-99834", kind: "TẠM TRỪ VÍ", detail: "Escrow giữ bảo lãnh (Khách khiếu nại - AI đang xử lý)", amount: "-850.000đ", date: "Hôm qua" },
  { code: "#RBX-99801", kind: "DOANH THU ĐƠN", detail: "Người mua xác nhận nhận hàng thành công (XM4)", amount: "+432.000đ", date: "08/07/2026" }
];

function FilterChip({ active, children }: { active?: boolean; children: string }) {
  return <button className={`h-[30px] rounded-full border px-3 text-xs font-medium ${active ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--line)] bg-white text-[var(--ink)]"}`} type="button">{children}</button>;
}

function TransactionFilters() {
  return (
    <section className="h-[120px] shrink-0 overflow-x-auto">
      <div className="flex h-[120px] min-w-[900px] flex-col gap-2.5">
        <div className="flex h-[30px] items-center">
          <strong className="w-[138px] shrink-0 text-[13px] font-medium">Loại giao dịch</strong>
          <div className="flex gap-2"><FilterChip active>Tất cả</FilterChip><FilterChip>Tạm trừ ví</FilterChip><FilterChip>Doanh thu đơn</FilterChip></div>
        </div>
        <div className="flex h-[30px] items-center">
          <strong className="w-[138px] shrink-0 text-[13px] font-medium">Thời gian</strong>
          <div className="flex gap-2"><FilterChip active>30 ngày gần nhất</FilterChip><FilterChip>Hôm qua</FilterChip><FilterChip>Tháng này</FilterChip></div>
        </div>
        <form className="flex h-10 gap-2" role="search">
          <label className="sr-only" htmlFor="wallet-search-kind">Loại mã cần tìm</label>
          <select className="h-10 w-40 shrink-0 border border-[var(--line)] bg-white px-3 text-[13px] font-medium" defaultValue="order" id="wallet-search-kind"><option value="order">Mã đơn</option></select>
          <label className="sr-only" htmlFor="wallet-search">Tìm giao dịch ví</label>
          <input className="h-10 min-w-0 flex-1 border border-[var(--line)] px-3.5 text-[13px]" id="wallet-search" placeholder="Nhập mã đơn hoặc nội dung thanh toán" type="search" />
          <button className="my-[2.5px] h-[35px] w-[81px] shrink-0 bg-[var(--accent)] text-[13px] font-medium text-white" type="submit">Áp dụng</button>
          <button className="my-[2.5px] h-[35px] w-[108px] shrink-0 border border-[var(--line)] bg-white text-[13px] font-medium text-[var(--accent)]" type="button">Xuất báo cáo</button>
        </form>
      </div>
    </section>
  );
}

function TransactionTable() {
  return (
    <section className="h-[619px] min-h-0 flex-1 overflow-x-auto">
      <div className="h-full min-w-[1124px]">
        <h2 className="flex h-[38px] items-center text-[16px] font-bold">Lịch sử giao dịch ví</h2>
        <div className="overflow-hidden border border-[var(--line)]">
          <div className="grid h-[42px] grid-cols-[145px_180px_420px_140px_135px_104px] bg-white text-xs font-medium">
            <span className="flex items-center px-2">Mã đơn</span>
            <span className="flex items-center px-2">Loại giao dịch</span>
            <span className="flex items-center px-2">Nội dung thanh toán</span>
            <span className="flex items-center px-2">Giá trị</span>
            <span className="flex items-center px-2">Thời gian</span>
            <span className="flex items-center px-2">Thao tác</span>
          </div>
          {transactions.map((transaction) => (
            <div className="grid h-[72px] grid-cols-[145px_180px_420px_140px_135px_104px] border-t border-[var(--line)] bg-white text-[13px]" key={transaction.code}>
              <strong className="flex items-center px-2">{transaction.code}</strong>
              <div className="flex items-center"><span className="flex h-[30px] items-center rounded-full px-3 text-xs font-medium">{transaction.kind}</span></div>
              <span className="flex items-center px-2">{transaction.detail}</span>
              <strong className="flex items-center px-2">{transaction.amount}</strong>
              <span className="flex items-center px-2 text-[var(--muted)]">{transaction.date}</span>
              <button className="px-2 text-left font-medium" type="button">Chi tiết</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function SellerWalletPage() {
  return (
    <SellerShell>
      <FinanceWorkspace active="wallet">
        <TransactionFilters />
        <TransactionTable />
      </FinanceWorkspace>
    </SellerShell>
  );
}
