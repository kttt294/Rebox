import { formatPrice, type StoreProduct } from "./commerce-data";
import { ProductVisual, ReboxBadge } from "./commerce-ui";

export function ProductCard({ product }: { product: StoreProduct }) {
  return (
    <article className="relative h-[332px] min-w-0 overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-[0_3px_10px_rgba(16,40,69,0.08)] xl:w-[200px]">
      <ProductVisual className="absolute -left-px -top-px h-[184px] w-[calc(100%+2px)] rounded-none xl:w-[200px]" gradient={product.gradient} label={product.visualLabel} labelClassName="absolute left-5 top-[75px] text-[25px] leading-normal" />
      <div className="absolute inset-x-0 top-0 h-[184px]">
        {product.sponsored ? (
          <ReboxBadge className="absolute right-0 top-0 h-6 w-[52px] rounded-none">Tài trợ</ReboxBadge>
        ) : null}
      </div>
      <h2 className="absolute left-[11px] right-[13px] top-[193px] line-clamp-2 text-sm font-normal leading-5 text-[var(--ink)]">{product.title}</h2>
      <p className="absolute left-[11px] top-[241px] text-[11px] font-medium text-[var(--accent)]">REBOX DEAL</p>
      <div className="absolute left-[11px] right-[13px] top-[273px] flex h-6 items-end justify-between gap-2">
        <strong className="whitespace-nowrap text-[17px] leading-6 text-[var(--accent)]">{formatPrice(product.price)}</strong>
        <span className="pb-0.5 text-right text-[10px] leading-4 text-[var(--muted)]">{product.sold}</span>
      </div>
    </article>
  );
}
