import { AccountShell } from "../../../features/account-shell";

export default function NotificationsPage() {
  return (
    <AccountShell activeHref="/account/notifications">
      <section className="grid min-h-[574px] w-[780px] max-w-full place-items-center border border-[var(--line)] bg-white p-8 text-center md:-ml-5">
        <div className="max-w-md">
          <h1 className="text-2xl font-medium">Chưa có cài đặt thông báo</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">CSDL chưa có notification preferences nên các công tắc cấu hình mẫu đã được gỡ.</p>
        </div>
      </section>
    </AccountShell>
  );
}
