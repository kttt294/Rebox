import { AccountShell } from "../../../features/account-shell";

const paymentMethods = [
  {
    title: "Thẻ Tín Dụng/Ghi Nợ",
    action: "Thêm Thẻ Mới",
    emptyMessage: "Bạn chưa liên kết thẻ."
  },
  {
    title: "Tài Khoản Ngân Hàng Của Tôi",
    action: "Thêm Ngân Hàng Liên Kết",
    emptyMessage: "Bạn chưa có tài khoản ngân hàng."
  }
];

export default function PaymentPage() {
  return (
    <AccountShell activeHref="/account/payment">
      <section className="min-h-[574px] w-[780px] max-w-full overflow-hidden border border-[var(--line)] bg-white md:-ml-5">
        {paymentMethods.map((method) => (
          <section className="flex min-h-[286px] flex-col px-[30px]" key={method.title}>
            <header className="flex min-h-[66px] flex-wrap items-center gap-3 border-b border-[var(--line)] py-3">
              <h1 className="text-lg font-normal">{method.title}</h1>
              <button className="ml-auto flex h-10 items-center gap-2 bg-[var(--accent-header)] px-5 text-sm font-medium text-white hover:bg-[var(--accent-strong)]" type="button">
                <span aria-hidden className="text-2xl font-light leading-none">+</span>
                {method.action}
              </button>
            </header>
            <p className="grid flex-1 place-items-center py-8 text-center text-lg text-[var(--ink)]">{method.emptyMessage}</p>
          </section>
        ))}
      </section>
    </AccountShell>
  );
}
