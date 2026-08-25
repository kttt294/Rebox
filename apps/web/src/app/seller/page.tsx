import { SellerWorkbench } from "../../features/seller-workbench/seller-workbench";

export default function SellerPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <div className="mb-8"><p className="text-sm font-bold uppercase tracking-widest text-[var(--accent)]">Kênh người bán</p><h1 className="mt-2 text-4xl font-black">Đăng hàng hoàn trong một luồng gọn.</h1></div>
      <SellerWorkbench />
    </main>
  );
}
