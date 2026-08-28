import { ApiClientError } from "@rebox/api-client";
import type { Listing } from "@rebox/shared";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findStoreProduct, formatPrice, shopProducts, type StoreProduct } from "../../../../features/commerce-data";
import { ProductVisual, ReboxBadge } from "../../../../features/commerce-ui";
import { createPublicApiClient } from "../../../../platform/api/server";

type ListingView = Pick<Listing, "id" | "shopId" | "shopDisplayName" | "title" | "description" | "categoryId" | "conditionGrade" | "conditionNotes" | "price"> & {
  product?: StoreProduct;
};

function mockListing(product: StoreProduct): ListingView {
  return {
    id: product.id,
    shopId: "rebox-official-store",
    shopDisplayName: "REBOX Official Store",
    title: product.id === "tech" ? `${product.title} - Like New 99%` : product.title,
    description: "Sản phẩm hoàn đơn được REBOX kiểm định, làm sạch và công khai tình trạng thực tế trước khi bán.",
    categoryId: "Điện tử",
    conditionGrade: "LIKE_NEW_99",
    conditionNotes: "Ngoại hình đẹp, hoạt động ổn định và đã vượt qua quy trình kiểm định REBOX.",
    price: product.price,
    product
  };
}

async function getListing(id: string): Promise<ListingView> {
  const product = findStoreProduct(id);
  if (product) return mockListing(product);

  try {
    return await createPublicApiClient().getPublicListing(id);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) notFound();
    throw error;
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-4 text-[13px] leading-5">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);
  const product = listing.product;
  const visualLabel = product?.visualLabel ?? "REBOX";
  const visualGradient = product?.gradient ?? "linear-gradient(139deg, #3769b2 14%, #b8d5f7 86%)";
  const shopHref = listing.shopId === "rebox-official-store" ? "/shops/rebox-official-store" : `/shops/${listing.shopId}`;

  return (
    <main className="bg-[var(--paper)] px-4 pb-9 pt-5 sm:px-6 xl:px-0">
      <div className="rebox-container">
        <nav aria-label="Breadcrumb" className="flex h-7 items-center gap-2 overflow-hidden bg-white text-[13px]">
          <Link className="font-medium text-[var(--accent-strong)]" href="/">REBOX</Link>
          <span className="text-[var(--muted)]">/</span>
          <span className="font-medium text-[var(--accent-strong)]">{listing.categoryId}</span>
          <span className="text-[var(--muted)]">/</span>
          <span className="truncate">{listing.title}</span>
        </nav>

        <section className="mt-4 grid gap-8 rounded-[10px] border border-[var(--line)] bg-white p-6 xl:min-h-[620px] xl:grid-cols-[500px_1fr]">
          <div>
            <ProductVisual
              className="h-[430px] w-full rounded-[10px]"
              gradient={visualGradient}
              label={visualLabel}
              labelClassName="absolute left-7 top-[150px] text-[58px] leading-[81px]"
            />
            <ReboxBadge className="absolute ml-5 mt-[-410px] h-[27px] px-2.5 font-bold">REBOX CERTIFIED</ReboxBadge>
            <div className="mt-3 grid grid-cols-5 gap-2.5">
              {["FRONT", "SIDE", "CASE", "DETAIL", "BOX"].map((label, index) => (
                <div className={`grid h-[84px] place-items-center rounded-[7px] border ${index === 0 ? "border-2 border-[var(--accent)]" : "border-[var(--line)]"}`} key={label} style={{ backgroundImage: visualGradient }}>
                  <span className="text-[10px] font-bold text-white">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <ReboxBadge className="h-[25px] w-fit px-2 font-bold">REBOX CHOICE</ReboxBadge>
            <h1 className="text-2xl font-medium leading-[34px]">{listing.title}</h1>
            <div className="flex gap-6 text-[13px] text-[var(--muted)]">
              <strong className="text-sm text-[var(--accent-strong)]">4.8 / 5</strong>
              <span>2,1k đánh giá</span>
              <span>5,8k đã bán</span>
            </div>
            <div className="rounded-lg bg-[var(--accent-soft)] px-4 py-3.5">
              <strong className="text-[30px] leading-[42px] text-[var(--accent-strong)]">{formatPrice(listing.price)}</strong>
              <span className="ml-3 text-sm text-[var(--muted)] line-through">{formatPrice(Math.round(listing.price * 1.54))}</span>
              <p className="text-xs font-medium text-[#20a06b]">Giá sau ưu đãi REBOX - tiết kiệm hơn khi mua hàng hoàn</p>
            </div>
            <dl className="grid gap-3">
              <DetailRow label="Vận chuyển" value="Miễn phí giao hàng toàn quốc - dự kiến 30/08 - 01/09" />
              <DetailRow label="Tình trạng" value={`${listing.conditionGrade.replaceAll("_", " ")} - đã kiểm định 32 điểm`} />
              <DetailRow label="Bảo hành" value="12 tháng REBOX Care - đổi máy trong 15 ngày" />
            </dl>
            <div>
              <p className="mb-2 text-[13px] text-[var(--muted)]">Phiên bản</p>
              <div className="flex gap-2">
                {[
                  ["Đen", true],
                  ["Trắng", false],
                  ["Xanh navy", false]
                ].map(([label, active]) => (
                  <button className={`rounded-md border px-3 py-2 text-[13px] ${active ? "border-[var(--accent)] bg-[var(--accent-soft)] font-medium text-[var(--accent-strong)]" : "border-[var(--line)]"}`} key={String(label)} type="button">{label}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 text-[13px]">
              <span className="text-[var(--muted)]">Số lượng</span>
              <div className="flex h-9 overflow-hidden rounded-md border border-[var(--line)]">
                <button aria-label="Giảm số lượng" className="w-9" type="button">−</button>
                <span className="grid w-10 place-items-center border-x border-[var(--line)]">1</span>
                <button aria-label="Tăng số lượng" className="w-9" type="button">+</button>
              </div>
              <span className="text-[var(--muted)]">Còn 18 sản phẩm</span>
            </div>
            <div className="mt-auto grid gap-3 sm:grid-cols-2">
              <Link className="grid h-12 place-items-center rounded-md border border-[var(--accent)] bg-[var(--accent-soft)] font-medium text-[var(--accent-strong)]" href="/cart">Thêm vào giỏ hàng</Link>
              <Link className="grid h-12 place-items-center rounded-md bg-[var(--accent-strong)] font-medium text-white" href="/checkout">Mua ngay</Link>
            </div>
          </div>
        </section>

        <section className="mt-6 flex items-center gap-5 rounded-[10px] border border-[var(--line)] bg-white px-6 py-5">
          <div className="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--accent)] font-bold text-white">RB</div>
          <div className="min-w-[230px]">
            <Link className="font-medium hover:text-[var(--accent)]" href={shopHref}>{listing.shopDisplayName}</Link>
            <p className="mt-1 text-xs text-[var(--muted)]">Online 3 phút trước</p>
            <Link className="mt-2 inline-flex rounded-md border border-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent)]" href={shopHref}>Xem shop</Link>
          </div>
          <dl className="hidden flex-1 grid-cols-4 gap-6 text-xs lg:grid">
            <div><dt className="text-[var(--muted)]">Đánh giá</dt><dd className="mt-1 font-medium">4,8k</dd></div>
            <div><dt className="text-[var(--muted)]">Tỷ lệ phản hồi</dt><dd className="mt-1 font-medium text-[#20a06b]">99%</dd></div>
            <div><dt className="text-[var(--muted)]">Sản phẩm</dt><dd className="mt-1 font-medium">312</dd></div>
            <div><dt className="text-[var(--muted)]">Tham gia</dt><dd className="mt-1 font-medium">28 tháng</dd></div>
          </dl>
        </section>

        <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_300px]">
          <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
            <section className="p-6">
              <h2 className="border-b border-[var(--line)] pb-3 text-base font-medium">CHI TIẾT SẢN PHẨM</h2>
              <dl className="mt-4 grid gap-2.5">
                <DetailRow label="Danh mục" value={listing.categoryId} />
                <DetailRow label="Tình trạng sản phẩm" value={listing.conditionGrade.replaceAll("_", " ")} />
                <DetailRow label="Mô tả trung thực" value={listing.conditionNotes} />
                <DetailRow label="Xuất xứ" value="Được REBOX kiểm định và phân loại" />
                <DetailRow label="Bảo hành" value="12 tháng REBOX Care" />
              </dl>
            </section>
            <section className="border-t border-[var(--line)] p-6">
              <h2 className="border-b border-[var(--line)] pb-3 text-base font-medium">MÔ TẢ SẢN PHẨM</h2>
              <p className="mt-4 text-[13px] leading-6">{listing.description ?? listing.conditionNotes}</p>
              <ProductVisual className="mt-5 h-[280px] w-full rounded-lg" gradient={visualGradient} label="CHỐNG ỒN CHỦ ĐỘNG" labelClassName="absolute left-7 top-[110px] text-2xl" />
            </section>
          </div>

          <aside className="rounded-[10px] border border-[var(--line)] bg-white p-3">
            <h2 className="border-b border-[var(--line)] pb-3 text-[13px] font-medium">SẢN PHẨM LIÊN QUAN</h2>
            <div className="mt-3 grid gap-3">
              {shopProducts.slice(1, 5).map((related) => (
                <Link className="overflow-hidden rounded-lg border border-[var(--line)]" href={`/listings/${related.id}`} key={related.id}>
                  <ProductVisual className="h-28 w-full rounded-none" gradient={related.gradient} label="REBOX" labelClassName="absolute left-4 top-9 text-xl" />
                  <div className="p-3">
                    <p className="line-clamp-1 text-xs">{related.title}</p>
                    <strong className="mt-2 block text-sm text-[var(--accent)]">{formatPrice(related.price)}</strong>
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        </div>

        <section className="mt-6 rounded-[10px] border border-[var(--line)] bg-white p-6">
          <h2 className="text-lg font-medium">ĐÁNH GIÁ SẢN PHẨM</h2>
          <div className="mt-4 flex items-center gap-7 rounded-lg bg-[#f8fafd] p-4">
            <div><strong className="text-3xl text-[var(--accent-strong)]">4.8</strong><p className="text-xs text-[var(--muted)]">trên 5</p></div>
            <div className="flex flex-wrap gap-2">
              {["Tất cả", "5 sao (1,8k)", "4 sao (214)", "3 sao (56)", "Có bình luận (1,2k)"].map((filter, index) => <button className={`rounded-md border px-3 py-2 text-xs ${index === 0 ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--line)] bg-white"}`} key={filter} type="button">{filter}</button>)}
            </div>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {[
              ["m***n", "Tai nghe nhìn như mới, đóng gói chắc chắn và đúng tình trạng mô tả."],
              ["h***4", "Sản phẩm hoạt động ổn định, giao hàng nhanh và tư vấn rõ ràng."],
              ["t***9", "Ngoại hình đẹp hơn mong đợi, giá hợp lý cho hàng đã kiểm định."]
            ].map(([name, review]) => (
              <article className="flex gap-4 py-5" key={name}>
                <div className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)]">U</div>
                <div><h3 className="text-[13px] font-medium">{name}</h3><p className="mt-1 text-[13px] font-bold text-[var(--accent-strong)]">5.0 / 5</p><p className="mt-2 text-[13px]">{review}</p><p className="mt-3 rounded-md bg-[#f8fafd] p-3 text-xs text-[var(--muted)]"><strong className="text-[var(--accent)]">Phản hồi từ REBOX:</strong> Cảm ơn bạn đã lựa chọn REBOX.</p></div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
