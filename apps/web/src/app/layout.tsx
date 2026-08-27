import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import type { ReactNode } from "react";
import { SiteHeader } from "../features/site-header";
import "./globals.css";

const roboto = Roboto({
  display: "swap",
  subsets: ["latin", "vietnamese"],
  variable: "--font-roboto",
  weight: ["400", "500", "700"]
});

export const metadata: Metadata = {
  title: "REBOX",
  description: "Sàn thanh lý hàng hoàn"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body className={roboto.variable}>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
