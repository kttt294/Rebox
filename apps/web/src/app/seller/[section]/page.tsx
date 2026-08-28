import Link from "next/link";
import { notFound } from "next/navigation";
import { SellerShell } from "../../../features/seller-shell";
import { SellerWorkbench } from "../../../features/seller-workbench/seller-workbench";

const sections = {
  returns: "Khiếu nại / Hoàn trả",
  reports: "Báo Cáo Hiệu Suất"
} as const;

export default async function SellerSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;

  if (section === "inventory") {
    return (
      <SellerShell>
        <section className="mx-auto w-full max-w-[1200px]">
          <div className="border-b border-[var(--line)] pb-5">
            <p className="text-sm font-bold text-[var(--accent)]">Kênh Người Bán</p>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.035em] text-[var(--ink)] sm:text-4xl">Quản lý kho hàng</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">Đăng sản phẩm mới, quản lý bản nháp và các sản phẩm đang bán của shop.</p>
          </div>
          <SellerWorkbench />
        </section>
      </SellerShell>
    );
  }

  const title = sections[section as keyof typeof sections];

  if (!title) notFound();

  return (
    <SellerShell>
      <section className="grid min-h-[calc(100vh-100px)] place-items-center rounded-[18px] bg-white p-6 shadow-[0_3px_10px_rgba(16,40,69,0.08)] ring-1 ring-inset ring-[var(--line)]">
        <div className="max-w-md text-center">
          <p className="mb-3 text-sm font-medium text-[var(--accent)]">{title}</p>
          <h1 className="text-3xl font-bold text-[var(--ink)]">Tính năng đang phát triển</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">REBOX đang hoàn thiện tính năng này. Vui lòng quay lại sau.</p>
          <Link className="mt-6 inline-flex h-10 items-center rounded-lg bg-[var(--accent)] px-5 text-sm font-medium text-white" href="/seller/finance">Về trang đối soát</Link>
        </div>
      </section>
    </SellerShell>
  );
}
