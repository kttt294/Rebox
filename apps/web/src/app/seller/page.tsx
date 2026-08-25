import { SellerWorkbench } from "../../features/seller-workbench/seller-workbench";

export default function SellerPage() {
  return (
    <main className="mx-auto grid w-full max-w-[1480px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:py-8 xl:px-8">
      <aside className="self-start rounded-[18px] border border-[var(--line)] bg-white p-3 shadow-[0_12px_35px_rgba(35,63,101,0.06)] lg:sticky lg:top-26 lg:min-h-[430px] lg:p-4">
        <nav className="flex gap-2 overflow-x-auto lg:grid" aria-label="Khu vực người bán">
          <a aria-current="page" className="min-w-max rounded-xl bg-[var(--accent-soft)] px-4 py-3 text-sm font-bold text-[var(--accent)]" href="#new-listing">
            Đăng Bán
          </a>
          <a className="min-w-max rounded-xl px-4 py-3 text-sm font-bold text-[var(--muted)] transition-colors hover:bg-slate-50 hover:text-[var(--ink)]" href="#inventory">
            Quản Lý Kho Hàng
          </a>
          <span aria-disabled="true" className="min-w-max rounded-xl px-4 py-3 text-sm font-bold text-slate-400" title="Chưa thuộc Sprint 1">
            Đối Soát Dòng Tiền
          </span>
        </nav>
      </aside>

      <section className="min-w-0">
        <div className="border-b border-[var(--line)] pb-5">
          <p className="text-sm font-bold text-[var(--accent)]">Kênh Người Bán</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.035em] text-[var(--ink)] sm:text-4xl">Đăng sản phẩm mới</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
            Khai báo trung thực tình trạng hàng hoàn, lưu bản nháp và đăng bán sau khi shop được xác minh.
          </p>
        </div>

        <SellerWorkbench />
      </section>
    </main>
  );
}
