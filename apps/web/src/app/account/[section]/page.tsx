import { notFound } from "next/navigation";
import { AccountShell } from "../../../features/account-shell";

const developmentSections = {
  address: "Địa chỉ",
  password: "Đổi mật khẩu",
  privacy: "Thiết lập riêng tư",
  personal: "Thông tin cá nhân",
  orders: "Đơn mua"
} as const;

export default async function AccountDevelopmentPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const title = developmentSections[section as keyof typeof developmentSections];
  if (!title) notFound();

  return (
    <AccountShell activeHref={`/account/${section}`}>
      <section className="grid min-h-[574px] w-[780px] max-w-full place-items-center border border-[var(--line)] bg-white px-6 text-center md:-ml-5">
        <div>
          <span aria-hidden className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--accent-soft)] text-2xl font-bold text-[var(--accent)]">…</span>
          <h1 className="mt-5 text-2xl font-medium">{title}</h1>
          <p className="mt-3 text-lg text-[var(--accent)]">Tính năng đang phát triển</p>
          <p className="mt-2 text-sm text-[var(--muted)]">REBOX sẽ cập nhật tính năng này trong thời gian tới.</p>
        </div>
      </section>
    </AccountShell>
  );
}
