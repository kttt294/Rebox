import { ProductCard } from "../features/product-card";
import { createPublicApiClient } from "../platform/api/server";

export default async function HomePage() {
  const result = await createPublicApiClient().listPublicListings().catch(() => null);

  return (
    <main>
      <section className="h-[72px] overflow-hidden bg-white px-4 pt-5 sm:px-6 xl:px-0">
        <div className="rebox-container text-center">
          <h1 className="text-lg font-medium leading-[22px] text-[var(--accent)]">GỢI Ý HÔM NAY</h1>
          <div className="mt-4 h-1 w-full rounded-sm bg-[var(--accent)]" />
        </div>
      </section>
      <section className="min-h-[760px] bg-[var(--paper)] px-4 pb-7 pt-5 sm:px-6 xl:px-0">
        {result === null ? (
          <p className="rebox-container rounded-lg border border-amber-200 bg-amber-50 p-5 text-center text-amber-800" role="alert">Không thể tải sản phẩm. Vui lòng thử lại sau.</p>
        ) : result.items.length === 0 ? (
          <p className="rebox-container rounded-lg border border-[var(--line)] bg-white p-8 text-center text-[var(--muted)]">Chưa có sản phẩm đang bán.</p>
        ) : (
          <div className="rebox-container grid grid-cols-1 gap-x-3 gap-y-4 min-[440px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-[repeat(6,200px)]">
            {result.items.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        )}
      </section>
    </main>
  );
}
