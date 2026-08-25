"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();
  const sellerActive = pathname.startsWith("/seller");
  const buyerActive = !sellerActive && pathname !== "/login";

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white/95 backdrop-blur">
      <nav
        className="mx-auto grid min-h-18 max-w-[1480px] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3 sm:px-6 xl:px-8"
        aria-label="Điều hướng chính"
      >
        <Link className="text-xl font-black tracking-[0.08em] text-[var(--accent)] sm:text-2xl" href="/">
          REBOX
        </Link>

        <div className="order-3 col-span-3 mx-auto flex w-full max-w-[620px] items-center gap-1 overflow-x-auto rounded-2xl bg-[var(--nav-surface)] p-1 md:order-none md:col-span-1 md:w-auto">
          <Link
            aria-current={sellerActive ? "page" : undefined}
            className={`min-w-max flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-bold transition-colors ${sellerActive ? "bg-[var(--accent)] text-white shadow-[0_5px_14px_rgba(25,104,238,0.2)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
            href="/seller"
          >
            Kênh Người Bán
          </Link>
          <Link
            aria-current={buyerActive ? "page" : undefined}
            className={`min-w-max flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-bold transition-colors ${buyerActive ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
            href="/"
          >
            Cửa Hàng Người Mua
          </Link>
          <span aria-disabled="true" className="min-w-max flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-bold text-slate-400" title="Dự kiến ở giai đoạn 3">
            AI Admin Hub
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 text-sm">
          <span className="hidden font-semibold text-slate-400 xl:inline">Hotline: 1900-REBOX</span>
          <Link className="rounded-xl border border-[var(--line-strong)] bg-white px-3.5 py-2 font-bold text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]" href="/login">
            Đăng nhập
          </Link>
        </div>
      </nav>
    </header>
  );
}
