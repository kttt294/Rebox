import Link from "next/link";
import type { ReactNode } from "react";

const accountNavItems = [
  { label: "Hồ sơ", href: "/account/profile" },
  { label: "Ngân hàng/ Ví điện tử", href: "/account/payment" },
  { label: "Địa chỉ", href: "/account/address" },
  { label: "Đổi mật khẩu", href: "/account/password" },
  { label: "Cài đặt thông báo", href: "/account/notifications" },
  { label: "Thiết lập riêng tư", href: "/account/privacy" },
  { label: "Thông tin cá nhân", href: "/account/personal" },
  { label: "Đơn mua", href: "/account/orders" }
];

function AccountNavItem({ active, href, label }: { active: boolean; href: string | undefined; label: string }) {
  const className = `flex h-8 items-center gap-[11px] pl-0.5 text-[13px] ${active ? "text-[var(--accent)]" : "text-[var(--ink)]"}`;
  const content = <><span className={`size-[7px] rounded-full ${active ? "bg-[var(--accent-header)]" : "bg-[var(--muted)]"}`} />{label}</>;

  return href ? <Link className={`${className} hover:text-[var(--accent)]`} href={href}>{content}</Link> : <span className={className}>{content}</span>;
}

export function AccountShell({ activeHref, children }: { activeHref: string; children: ReactNode }) {
  return (
    <main className="min-h-[780px] bg-[var(--paper)] px-4 pb-20 pt-[18px] sm:px-6">
      <div className="mx-auto flex w-full max-w-[960px] items-start max-md:flex-col">
        <aside className="w-[190px] shrink-0 max-md:mb-4 max-md:w-full">
          <div className="flex h-[68px] items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)]">US</span>
            <div><strong className="block text-[15px]">Tài khoản</strong><Link className="mt-1 block text-xs text-[var(--muted)] hover:underline" href="/account/profile">Xem hồ sơ</Link></div>
          </div>
          <div className="h-px bg-[var(--line)]" />
          <strong className="block py-1 text-xs">TÀI KHOẢN CỦA TÔI</strong>
          <nav aria-label="Tài khoản của tôi">
            {accountNavItems.map((item) => <AccountNavItem active={item.href === activeHref} href={item.href} key={item.label} label={item.label} />)}
          </nav>
        </aside>
        {children}
      </div>
    </main>
  );
}
