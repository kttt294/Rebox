import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "REBOX",
  description: "Sàn thanh lý hàng hoàn"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <header className="border-b border-[var(--line)] bg-white">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4" aria-label="Điều hướng chính">
            <Link className="text-xl font-black tracking-tight text-[var(--accent)]" href="/">REBOX</Link>
            <div className="flex items-center gap-5 text-sm font-semibold">
              <Link href="/">Mua hàng</Link>
              <Link href="/seller">Kênh người bán</Link>
              <Link className="rounded-full bg-[var(--ink)] px-4 py-2 text-white" href="/login">Đăng nhập</Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
