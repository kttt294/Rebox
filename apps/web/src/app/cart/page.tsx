"use client";

import type { PublicListing } from "@reboxe/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { readCart, writeCart } from "../../features/cart-storage";
import { formatPrice } from "../../features/commerce-data";
import { ProductVisual } from "../../features/commerce-ui";
import { createBrowserApiClient } from "../../platform/api/browser";

type CartItem = { listing: PublicListing; quantity: number };

const api = createBrowserApiClient();

function SelectionRadio({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return <input aria-label={label} checked={checked} className="size-[18px] shrink-0 accent-[var(--accent)]" name="cart-selection" onChange={onChange} type="radio" />;
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const lines = readCart();
    void Promise.all(lines.map(async (line) => {
      try {
        return { listing: await api.getPublicListing(line.listingId), quantity: line.quantity };
      } catch {
        return null;
      }
    })).then((resolved) => {
      const available = resolved.filter((item): item is CartItem => item !== null);
      setItems(available);
      setSelectedId(available[0]?.listing.id ?? null);
      writeCart(available.map((item) => ({ listingId: item.listing.id, quantity: item.quantity })));
      setLoading(false);
    });
  }, []);

  const total = items.find((item) => item.listing.id === selectedId)?.listing.price ?? 0;

  function persist(nextItems: CartItem[]) {
    setItems(nextItems);
    writeCart(nextItems.map((item) => ({ listingId: item.listing.id, quantity: item.quantity })));
  }

  function removeItem(listingId: string) {
    persist(items.filter((item) => item.listing.id !== listingId));
    setSelectedId((current) => current === listingId ? null : current);
  }

  const checkoutHref = selectedId
    ? `/checkout?items=${encodeURIComponent(selectedId)}`
    : "/cart";

  return (
    <main className="min-h-[calc(100vh-132px)] bg-[var(--paper)] px-4 pb-36 pt-5 sm:px-6 xl:px-0">
      <div className="reboxe-container">
        <h1 className="mb-4 text-xl font-medium">Giỏ hàng</h1>
        {loading ? (
          <p className="rounded-lg border border-[var(--line)] bg-white p-8 text-center text-[var(--muted)]">Đang tải giỏ hàng...</p>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-[var(--line)] bg-white p-10 text-center">
            <p className="text-[var(--muted)]">Giỏ hàng chưa có sản phẩm.</p>
            <Link className="mt-4 inline-flex rounded-md bg-[var(--accent-strong)] px-5 py-3 font-medium text-white" href="/">Xem sản phẩm</Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map(({ listing }) => (
              <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-[0_3px_10px_rgba(16,40,69,0.08)]" key={listing.id}>
                <div className="mb-4 flex items-center gap-3 border-b border-[var(--line)] pb-4">
                  <SelectionRadio checked={selectedId === listing.id} label={`Chọn ${listing.title}`} onChange={() => setSelectedId(listing.id)} />
                  <Link className="font-medium hover:text-[var(--accent)]" href={`/shops/${listing.shopId}`}>{listing.shopDisplayName}</Link>
                </div>
                <div className="grid gap-4 sm:grid-cols-[96px_1fr_auto] sm:items-center">
                  <ProductVisual className="size-24 bg-[var(--accent-header)] text-sm" label={listing.categoryId.toUpperCase()} />
                  <div>
                    <Link className="font-medium hover:text-[var(--accent)]" href={`/listings/${listing.id}`}>{listing.title}</Link>
                    <p className="mt-2 text-xs text-[var(--muted)]">Tình trạng: {listing.conditionGrade.replaceAll("_", " ")}</p>
                    <strong className="mt-2 block text-[var(--accent)]">{formatPrice(listing.price)}</strong>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-[var(--muted)]">Số lượng: 1</span>
                    <strong className="w-28 text-right text-[var(--accent)]">{formatPrice(listing.price)}</strong>
                    <button className="text-xs" onClick={() => removeItem(listing.id)} type="button">Xóa</button>
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}

        {items.length > 0 ? (
          <aside className="fixed bottom-0 left-1/2 z-30 flex w-[calc(100%-2rem)] max-w-[1264px] -translate-x-1/2 flex-wrap items-center gap-4 rounded-t-lg border border-[var(--line)] bg-white p-5 shadow-[0_-2px_10px_rgba(16,40,69,0.08)]">
            <span>{selectedId ? "Đã chọn 1 sản phẩm" : "Chọn một sản phẩm để mua"}</span>
            <div className="ml-auto text-right"><span className="text-sm">Tổng cộng: </span><strong className="text-xl text-[var(--accent)]">{formatPrice(total)}</strong></div>
            <Link aria-disabled={!selectedId} className={`grid h-11 w-48 place-items-center rounded font-medium text-white ${!selectedId ? "pointer-events-none bg-slate-400" : "bg-[var(--accent-strong)]"}`} href={checkoutHref}>Mua hàng</Link>
          </aside>
        ) : null}
      </div>
    </main>
  );
}
