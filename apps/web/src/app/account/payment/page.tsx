import { AccountShell } from "../../../features/account-shell";

export default function PaymentPage() {
  return (
    <AccountShell activeHref="/account/payment">
      <section className="grid min-h-[574px] w-[780px] max-w-full place-items-center border border-[var(--line)] bg-white p-8 text-center md:-ml-5">
        <div className="max-w-md">
          <h1 className="text-2xl font-medium">Chưa có phương thức thanh toán</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Backend payment chưa được triển khai nên không hiển thị hoặc lưu phương thức thanh toán giả.</p>
        </div>
      </section>
    </AccountShell>
  );
}
