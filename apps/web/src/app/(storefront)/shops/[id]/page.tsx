import Link from "next/link";
import { ProductCard } from "../../../../features/product-card";
import { createPublicApiClient } from "../../../../platform/api/server";

type ShopSearchParams = Promise<{ category?: string; sort?: "newest" | "price_asc" | "price_desc" }>;

export default async function ShopDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: ShopSearchParams;
}) {
  const { id } = await params;
  const query = await searchParams;
  const result = await createPublicApiClient().listPublicListings({
    shopId: id,
    category: query.category,
    sort: query.sort ?? "newest"
  }).catch(() => null);
  const shopName = result?.items[0]?.shopDisplayName;
  const categories = [...new Set(result?.items.map((item) => item.categoryId) ?? [])];

  return (
    <main>
      <section className="bg-white px-4 py-6 sm:px-6 xl:px-0">
        <div className="rebox-container flex items-center gap-5">
          <div className="grid size-[72px] shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[22px] font-bold text-white">RB</div>
          <div>
            <h1 className="text-xl font-bold">{shopName ?? "Cửa hàng"}</h1>
            <p className="mt-1 text-xs text-[var(--muted)]">{result === null ? "Không thể tải dữ liệu cửa hàng" : `${result.items.length} sản phẩm đang bán`}</p>
          </div>
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
