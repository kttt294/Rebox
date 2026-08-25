import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "../features/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "REBOX",
  description: "Sàn thanh lý hàng hoàn"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
