import Link from "next/link";
import type { PublicListing } from "@reboxe/shared";
import { formatPrice } from "./commerce-data";
import { ProductVisual } from "./commerce-ui";

type CatalogCardListing = Pick<PublicListing, "id" | "title" | "price" | "categoryId" | "conditionGrade" | "shopDisplayName" | "images">;

const conditionLabels: Record<PublicListing["conditionGrade"], string> = {
  NEW_SEALED: "Mới nguyên seal",
  LIKE_NEW_99: "Gần như mới",
  GOOD: "Tình trạng tốt",
  FAIR: "Khá",
  DEFECT: "Có khuyết điểm"
};

export function ProductCard({ product, sponsored = false }: { product: CatalogCardListing; sponsored?: boolean }) {
  return (
    <Link aria-label={`Xem ${product.title}`} href={`/listings/${product.id}`}>
      <article className="relative h-[332px] min-w-0 overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-[0_3px_10px_rgba(16,40,69,0.08)] transition-transform hover:-translate-y-0.5 xl:w-[200px]">
        {product.images[0] ? (
          <img alt={product.title} className="absolute -left-px -top-px h-[184px] w-[calc(100%+2px)] object-cover xl:w-[200px]" src={product.images[0].url} />
        ) : (
          <ProductVisual className="absolute -left-px -top-px h-[184px] w-[calc(100%+2px)] rounded-none bg-[linear-gradient(137deg,#4f8ad1_14%,#a8c9f0_86%)] xl:w-[200px]" label={product.categoryId.toUpperCase()} labelClassName="absolute left-5 top-[75px] text-[25px] leading-normal" />
        )}
        <span className="absolute left-2 top-2 rounded bg-white/90 px-2 py-1 text-[10px] font-bold text-[var(--accent-strong)] shadow-sm backdrop-blur-sm">{conditionLabels[product.conditionGrade]}</span>
        {sponsored ? <span className="absolute right-2 top-2 rounded bg-slate-900/85 px-2 py-1 text-[10px] font-bold text-white">Tài trợ</span> : null}
        <h2 className="absolute left-[11px] right-[13px] top-[193px] line-clamp-2 text-sm font-normal leading-5 text-[var(--ink)]">{product.title}</h2>
        <p className="absolute left-[11px] right-[13px] top-[241px] truncate text-[11px] font-medium text-[var(--accent)]">{product.shopDisplayName}</p>
        <div className="absolute left-[11px] right-[13px] top-[273px] flex h-6 items-end">
          <strong className="whitespace-nowrap text-[17px] leading-6 text-[var(--accent)]">{formatPrice(product.price)}</strong>
        </div>
      </article>
    </Link>
  );
}
