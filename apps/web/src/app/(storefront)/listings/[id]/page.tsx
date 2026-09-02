import { ApiClientError } from "@rebox/api-client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CartActions } from "../../../../features/cart-actions";
import { formatPrice } from "../../../../features/commerce-data";
import { ProductVisual, ReboxBadge } from "../../../../features/commerce-ui";
import { ProductCard } from "../../../../features/product-card";
import { createPublicApiClient } from "../../../../platform/api/server";

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
  const api = createPublicApiClient();
  let listing;
  try {
    listing = await api.getPublicListing(id);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) notFound();
    throw error;
  }

  const relatedPage = await api.listPublicListings({ category: listing.categoryId }).catch(() => null);
  const related = relatedPage?.items.filter((item) => item.id !== listing.id).slice(0, 4) ?? [];

  return (
    <main className="bg-[var(--paper)] px-4 pb-9 pt-5 sm:px-6 xl:px-0">
      <div className="rebox-container">
        <nav aria-label="Breadcrumb" className="flex h-7 items-center gap-2 overflow-hidden text-[13px]">
          <Link className="font-medium text-[var(--accent-strong)]" href="/">REBOX</Link>
          <span className="text-[var(--muted)]">/</span>
          <Link className="font-medium text-[var(--accent-strong)]" href={`/search?category=${encodeURIComponent(listing.categoryId)}`}>{listing.categoryId}</Link>
          <span className="text-[var(--muted)]">/</span>
          <span className="truncate">{listing.title}</span>
        </nav>

        <section className="mt-4 grid gap-8 rounded-[10px] border border-[var(--line)] bg-white p-6 xl:min-h-[500px] xl:grid-cols-[500px_1fr]">
          <ProductVisual
            className="h-[430px] w-full rounded-[10px] bg-[linear-gradient(139deg,#3769b2_14%,#b8d5f7_86%)]"
            label={listing.categoryId.toUpperCase()}
            labelClassName="text-[44px]"
          />

          <div className="flex flex-col gap-4">
            <ReboxBadge className="h-[25px] w-fit px-2 font-bold">{listing.conditionGrade.replaceAll("_", " ")}</ReboxBadge>
            <h1 className="text-2xl font-medium leading-[34px]">{listing.title}</h1>
            <div className="rounded-lg bg-[var(--accent-soft)] px-4 py-3.5">
              <strong className="text-[30px] leading-[42px] text-[var(--accent-strong)]">{formatPrice(listing.price)}</strong>
            </div>
            <dl className="grid gap-3">
              <DetailRow label="Danh mục" value={listing.categoryId} />
              <DetailRow label="Tình trạng" value={listing.conditionGrade.replaceAll("_", " ")} />
              <DetailRow label="Mô tả tình trạng" value={listing.conditionNotes} />
              <DetailRow label="Đăng bán lúc" value={new Date(listing.publishedAt ?? listing.createdAt).toLocaleString("vi-VN")} />
            </dl>
            <CartActions listingId={listing.id} />
          </div>
        </section>

        <section className="mt-6 flex items-center gap-5 rounded-[10px] border border-[var(--line)] bg-white px-6 py-5">
          <div className="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--accent)] font-bold text-white">RB</div>
          <div>
            <Link className="font-medium hover:text-[var(--accent)]" href={`/shops/${listing.shopId}`}>{listing.shopDisplayName}</Link>
            <p className="mt-1 text-xs text-[var(--muted)]">Shop đang hoạt động</p>
          </div>
          <Link className="ml-auto rounded-md border border-[var(--accent)] px-3 py-2 text-xs font-medium text-[var(--accent)]" href={`/shops/${listing.shopId}`}>Xem shop</Link>
        </section>

        <section className="mt-6 rounded-[10px] border border-[var(--line)] bg-white p-6">
          <h2 className="border-b border-[var(--line)] pb-3 text-base font-medium">MÔ TẢ SẢN PHẨM</h2>
          <p className="mt-4 text-[13px] leading-6">{listing.description ?? listing.conditionNotes}</p>
        </section>

        <section className="mt-6">
          <h2 className="mb-4 text-lg font-medium">SẢN PHẨM LIÊN QUAN</h2>
          {related.length === 0 ? (
            <p className="rounded-lg border border-[var(--line)] bg-white p-6 text-sm text-[var(--muted)]">Chưa có sản phẩm liên quan trong cơ sở dữ liệu.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {related.map((item) => <ProductCard key={item.id} product={item} />)}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
