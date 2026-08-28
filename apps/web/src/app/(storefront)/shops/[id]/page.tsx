import Link from "next/link";
import { formatPrice, shopProducts, type StoreProduct } from "../../../../features/commerce-data";
import { ProductVisual } from "../../../../features/commerce-ui";

const categories = [
  ["SẢN PHẨM"],
  ["Deal nổi bật", true],
  ["Điện tử"],
  ["Tai nghe", true],
  ["Đồng hồ thông minh", true],
  ["Phụ kiện công nghệ", true],
  ["GIA DỤNG"],
  ["Thiết bị vệ sinh", true],
  ["Đồ dùng phòng ngủ", true],
  ["Quạt mini", true],
  ["LÀM ĐẸP"],
  ["Chăm sóc da", true],
  ["Tẩy trang", true],
  ["THỜI TRANG"],
  ["Áo thun", true],
  ["Phụ kiện", true]
] as const;

function ShopProductCard({ product, index }: { product: StoreProduct; index: number }) {
  return (
    <Link aria-label={`Xem ${product.title}`} className="h-[294px] overflow-hidden rounded-lg border border-[var(--line)] bg-white transition-transform hover:-translate-y-0.5" href={`/listings/${product.id}`}>
      <ProductVisual className="h-[166px] w-full rounded-none" gradient={product.gradient} label={product.visualLabel} labelClassName="absolute left-3.5 top-3 text-[23px]" />
      <div className="flex h-32 flex-col gap-2 px-2.5 py-2">
        <h2 className="line-clamp-2 min-h-[34px] text-xs leading-[17px]">{product.title}</h2>
        <strong className="text-base text-[var(--accent)]">{formatPrice(product.price)}</strong>
        <div className="mt-auto flex justify-between text-[10px]"><span className="font-medium text-[#f59e0b]">{index % 3 === 1 ? "4.9" : "4.8"} / 5</span><span className="text-[9px] text-[var(--muted)]">{product.sold}</span></div>
      </div>
    </Link>
  );
}

function Metric({ label, value, success = false }: { label: string; value: string; success?: boolean }) {
  return <div><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className={`mt-1 text-[15px] font-medium ${success ? "text-[#20a06b]" : ""}`}>{value}</dd></div>;
}

export default async function ShopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shopName = id === "rebox-official-store" ? "REBOX Official Store" : "REBOX Verified Fixture";

  return (
    <main>
      <section className="bg-white px-4 pt-[22px] sm:px-6 xl:px-0">
        <div className="rebox-container">
          <div className="flex h-[168px] gap-[30px] overflow-hidden">
            <div className="flex h-[148px] w-[430px] shrink-0 gap-4 rounded-xl bg-[var(--accent-header)] p-5 text-white">
              <div className="grid size-[72px] shrink-0 place-items-center rounded-full bg-white text-[22px] font-bold text-[var(--accent)]">RB</div>
              <div>
                <h1 className="text-xl font-bold">{shopName}</h1>
                <p className="mt-1 text-[11px] font-medium">REBOX CERTIFIED</p>
                <p className="mt-1 text-xs text-white/80">Online 3 phút trước</p>
                <div className="mt-2 flex gap-2"><button className="rounded-md border border-white px-3.5 py-2 text-xs font-medium" type="button">Theo dõi</button><button className="rounded-md border border-white px-3.5 py-2 text-xs font-medium" type="button">Chat ngay</button></div>
              </div>
            </div>
            <dl className="grid flex-1 grid-cols-3 gap-x-[18px] gap-y-4 pt-2">
              <Metric label="Sản phẩm" value="312" />
              <Metric label="Người theo dõi" value="18,6k" />
              <Metric label="Đánh giá" value="4.8 / 5" />
              <Metric label="Tỉ lệ phản hồi" success value="99%" />
              <Metric label="Tham gia" value="28 tháng" />
              <Metric label="Địa chỉ" value="Cầu Giấy, Hà Nội" />
            </dl>
          </div>

          <nav aria-label="Danh mục cửa hàng" className="flex h-[58px] items-center justify-between text-[13px]">
            {["Dạo", "TẤT CẢ SẢN PHẨM", "DEAL NỔI BẬT", "ĐIỆN TỬ", "ĐỒ GIA DỤNG", "THỜI TRANG", "Thêm"].map((tab, index) => (
              <a className={`grid h-[58px] min-w-[150px] place-items-center border-b-[3px] ${index === 0 ? "border-[var(--accent)] font-medium text-[var(--accent)]" : "border-transparent"}`} href="#catalog" key={tab}>{tab}</a>
            ))}
          </nav>
        </div>
      </section>

      <section className="bg-[var(--paper)] px-4 pb-10 pt-5 sm:px-6 xl:px-0" id="catalog">
        <div className="rebox-container grid gap-6 xl:grid-cols-[220px_1fr]">
          <aside className="hidden pr-3 pt-2 xl:block">
            <h2 className="flex items-center gap-2 border-b border-[var(--line)] pb-3 text-lg font-bold"><span aria-hidden>≡</span> Danh mục</h2>
            <nav className="mt-2 grid gap-0.5 text-[13px]">
              {categories.map(([category, nested]) => <a className={`py-1 ${nested ? "pl-3.5" : "mt-1 font-medium"} ${category === "SẢN PHẨM" ? "text-[var(--accent)]" : ""}`} href="#products" key={category}>{category}</a>)}
            </nav>
          </aside>

          <div>
            <div className="flex h-[58px] items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-4 text-xs">
              <span className="text-[var(--muted)]">Sắp xếp theo</span>
              <button className="rounded-md bg-[var(--accent)] px-3 py-2 text-white" type="button">Phổ biến</button>
              {['Mới nhất', 'Bán chạy', 'Giá'].map((sort) => <button className="rounded-md border border-[var(--line)] px-3 py-2" key={sort} type="button">{sort}</button>)}
              <span className="ml-auto text-[var(--accent)]">1 / 12</span>
              <button aria-label="Trang trước" className="size-8 rounded-md border border-[var(--line)]" type="button">‹</button>
              <button aria-label="Trang sau" className="size-8 rounded-md border border-[var(--line)]" type="button">›</button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" id="products">
              {shopProducts.map((product, index) => <ShopProductCard index={index} key={product.id} product={product} />)}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
