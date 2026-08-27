import { storefrontProducts } from "../features/commerce-data";
import { ProductCard } from "../features/product-card";

export default function HomePage() {
  return (
    <main>
      <section className="h-[72px] overflow-hidden bg-white px-4 pt-5 sm:px-6 xl:px-0">
        <div className="rebox-container text-center">
          <h1 className="text-lg font-medium leading-[22px] text-[var(--accent)]">GỢI Ý HÔM NAY</h1>
          <div className="mt-4 h-1 w-full rounded-sm bg-[var(--accent)]" />
        </div>
      </section>
      <section className="min-h-[760px] bg-[var(--paper)] px-4 pb-7 pt-5 sm:px-6 xl:px-0">
        <div className="rebox-container grid grid-cols-1 gap-x-3 gap-y-4 min-[440px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-[repeat(6,200px)]">
          {storefrontProducts.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>
    </main>
  );
}
