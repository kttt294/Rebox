import Link from "next/link";
import { ProductCard } from "../../../../features/product-card";
import { ShopReviews } from "../../../../features/shop-reviews";
import { createPublicApiClient } from "../../../../platform/api/server";

type ShopSearchParams = Promise<{ category?: string; sort?: "newest" | "price_asc" | "price_desc" }>;

function Metric({ label, value, success = false }: { label: string; value: string; success?: boolean }) {
  return <div><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className={`mt-1 text-[15px] font-medium ${success ? "text-[#20a06b]" : ""}`}>{value}</dd></div>;
}

function membershipAge(createdAt?: string): string {
  if (!createdAt) return "—";
  const joined = new Date(createdAt);
  const now = new Date();
  const months = Math.max(0, (now.getFullYear() - joined.getFullYear()) * 12 + now.getMonth() - joined.getMonth());
  if (months < 1) return "Tháng này";
  return months < 12 ? `${months} tháng` : `${Math.floor(months / 12)} năm`;
}

export default async function ShopDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: ShopSearchParams;
}) {
  const { id } = await params;
  const query = await searchParams;
  const api = createPublicApiClient();
  const [shop, result] = await Promise.all([
    api.getPublicShop(id).catch(() => null),
    api.listPublicListings({
      shopId: id,
      category: query.category,
      sort: query.sort ?? "newest"
    }).catch(() => null)
  ]);
  const shopName = shop?.displayName ?? result?.items[0]?.shopDisplayName;
  const categories = [...new Set(result?.items.map((item) => item.categoryId) ?? [])];

  return (
    <main>
      <section className="bg-white px-4 pt-[22px] sm:px-6 xl:px-0">
        <div className="rebox-container">
          <div className="grid gap-5 pb-5 lg:grid-cols-[430px_1fr] lg:gap-[30px]">
            <div className="flex min-h-[148px] gap-4 rounded-xl bg-[var(--accent-header)] p-5 text-white">
              {shop?.avatarUrl ? (
                <img alt={`Ảnh đại diện ${shop.displayName}`} className="size-[72px] shrink-0 rounded-full bg-white object-cover" height={72} src={shop.avatarUrl} width={72} />
              ) : (
                <div className="grid size-[72px] shrink-0 place-items-center rounded-full bg-white text-[22px] font-bold text-[var(--accent)]">RB</div>
              )}
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold">{shopName ?? "Cửa hàng"}</h1>
                {shop?.verified ? <p className="mt-1 text-[11px] font-medium">REBOX CERTIFIED</p> : null}
                <p className="mt-1 text-xs text-white/80">{shop ? "Đang hoạt động" : "Không thể tải thông tin cửa hàng"}</p>
                {shop?.description ? <p className="mt-1 line-clamp-1 text-xs text-white/80">{shop.description}</p> : null}
                <div className="mt-2 flex gap-2">
                  <button className="rounded-md border border-white px-3.5 py-2 text-xs font-medium" type="button">Theo dõi</button>
                  <button className="rounded-md border border-white px-3.5 py-2 text-xs font-medium" type="button">Chat ngay</button>
                </div>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-[18px] gap-y-4 py-2 sm:grid-cols-3">
              <Metric label="Sản phẩm" value={shop ? String(shop.activeListingCount) : "—"} />
              <Metric label="Người theo dõi" value="—" />
              <Metric label="Đánh giá" value={shop?.averageRating ? `${shop.averageRating.toFixed(1)}/5 (${shop.reviewCount})` : "Chưa có"} />
              <Metric label="Tỉ lệ phản hồi" value="—" success />
              <Metric label="Tham gia" value={membershipAge(shop?.createdAt)} />
              <Metric label="Địa chỉ" value={shop?.location ?? "Chưa cập nhật"} />
            </dl>
          </div>
          <ShopReviews shopId={id} />
        </div>
      </section>

      <section className="min-h-[620px] bg-[var(--paper)] px-4 pb-10 pt-5 sm:px-6 xl:px-0">
        <div className="rebox-container">
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--line)] bg-white p-4 text-xs">
            <span className="mr-2 text-[var(--muted)]">Danh mục</span>
            <Link className={`rounded-md px-3 py-2 ${!query.category ? "bg-[var(--accent)] text-white" : "border border-[var(--line)]"}`} href={`/shops/${id}`}>Tất cả</Link>
            {categories.map((category) => (
              <Link className={`rounded-md px-3 py-2 ${query.category === category ? "bg-[var(--accent)] text-white" : "border border-[var(--line)]"}`} href={`/shops/${id}?category=${encodeURIComponent(category)}`} key={category}>{category}</Link>
            ))}
            <span className="ml-auto text-[var(--muted)]">Sắp xếp</span>
            {[{ label: "Mới nhất", value: "newest" }, { label: "Giá tăng", value: "price_asc" }, { label: "Giá giảm", value: "price_desc" }].map((sort) => {
              const params = new URLSearchParams();
              if (query.category) params.set("category", query.category);
              params.set("sort", sort.value);
              return <Link className={`rounded-md px-3 py-2 ${query.sort === sort.value || (!query.sort && sort.value === "newest") ? "bg-[var(--accent)] text-white" : "border border-[var(--line)]"}`} href={`/shops/${id}?${params}`} key={sort.value}>{sort.label}</Link>;
            })}
          </div>

          {result === null ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">Không thể tải sản phẩm. Vui lòng thử lại sau.</p>
          ) : result.items.length === 0 ? (
            <p className="rounded-lg border border-[var(--line)] bg-white p-8 text-center text-[var(--muted)]">Shop chưa có sản phẩm đang bán.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {result.items.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
