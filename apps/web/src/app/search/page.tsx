import Link from "next/link";
import { ProductCard } from "../../features/product-card";
import { createPublicApiClient } from "../../platform/api/server";

type SearchParams = Promise<{ q?: string; category?: string; sort?: "newest" | "price_asc" | "price_desc"; cursor?: string }>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const result = await createPublicApiClient().listPublicListings(query).catch(() => null);
  const nextQuery = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, cursor: result?.nextCursor })) {
    if (value) nextQuery.set(key, value);
  }

  return (
    <main className="min-h-[760px] bg-[var(--paper)] px-4 py-6 sm:px-6 xl:px-0">
      <div className="rebox-container">
        <form action="/search" className="mb-6 grid gap-3 rounded-lg border border-[var(--line)] bg-white p-4 sm:grid-cols-[1fr_220px_180px_auto]">
          <input aria-label="Từ khóa" className="rounded-md border border-[var(--line)] px-3 py-2" defaultValue={query.q} name="q" placeholder="Tìm sản phẩm" type="search" />
          <input aria-label="Danh mục" className="rounded-md border border-[var(--line)] px-3 py-2" defaultValue={query.category} name="category" placeholder="Mã danh mục" />
          <select aria-label="Sắp xếp" className="rounded-md border border-[var(--line)] bg-white px-3 py-2" defaultValue={query.sort ?? "newest"} name="sort">
            <option value="newest">Mới nhất</option>
            <option value="price_asc">Giá tăng dần</option>
            <option value="price_desc">Giá giảm dần</option>
          </select>
          <button className="rounded-md bg-[var(--accent-strong)] px-5 py-2 font-medium text-white">Tìm kiếm</button>
        </form>

        {result === null ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-center text-amber-800" role="alert">Không thể tải kết quả. Vui lòng thử lại sau.</p>
        ) : result.items.length === 0 ? (
          <p className="rounded-lg border border-[var(--line)] bg-white p-8 text-center text-[var(--muted)]">Không tìm thấy sản phẩm phù hợp.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-x-3 gap-y-4 min-[440px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-[repeat(6,200px)]">
              {result.items.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
            {result.nextCursor ? <Link className="mx-auto mt-8 block w-fit rounded-md border border-[var(--accent)] bg-white px-6 py-3 font-medium text-[var(--accent)]" href={`/search?${nextQuery}`}>Xem thêm</Link> : null}
          </>
        )}
      </div>
    </main>
  );
}
