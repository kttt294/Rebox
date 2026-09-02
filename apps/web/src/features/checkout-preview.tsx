"use client";

import type { PublicListing } from "@rebox/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { readCart } from "./cart-storage";
import { formatPrice } from "./commerce-data";
import { ProductVisual } from "./commerce-ui";
import { createBrowserApiClient } from "../platform/api/browser";

type CheckoutItem = { listing: PublicListing; quantity: number };

const api = createBrowserApiClient();

export function CheckoutPreview({ listingIds }: { listingIds: string[] }) {
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cart = readCart();
    void Promise.all(listingIds.map(async (listingId) => {
      try {
        const quantity = cart.find((line) => line.listingId === listingId)?.quantity ?? 1;
        return { listing: await api.getPublicListing(listingId), quantity };
      } catch {
        return null;
      }
    })).then((resolved) => {
      setItems(resolved.filter((item): item is CheckoutItem => item !== null));
      setLoading(false);
    });
  }, [listingIds]);

  const subtotal = items.reduce((sum, item) => sum + item.listing.price * item.quantity, 0);

  return (
    <main className="min-h-[calc(100vh-132px)] bg-[var(--paper)] px-4 pb-10 pt-5 sm:px-6 xl:px-0">
      <div className="rebox-container">
        <h1 className="mb-4 text-xl font-medium">Xác nhận sản phẩm</h1>
        {loading ? (
          <p className="rounded-lg border border-[var(--line)] bg-white p-8 text-center text-[var(--muted)]">Đang tải dữ liệu...</p>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-[var(--line)] bg-white p-10 text-center">
            <p className="text-[var(--muted)]">Không có sản phẩm hợp lệ để thanh toán.</p>
            <Link className="mt-4 inline-flex rounded-md bg-[var(--accent-strong)] px-5 py-3 font-medium text-white" href="/cart">Quay lại giỏ hàng</Link>
          </div>
        ) : (
          <>
            <section className="overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-[0_3px_10px_rgba(16,40,69,0.05)]">
              {items.map(({ listing, quantity }) => (
                <article className="grid gap-4 border-b border-[var(--line)] p-6 last:border-b-0 sm:grid-cols-[86px_1fr_auto] sm:items-center" key={listing.id}>
                  <ProductVisual className="size-[86px] bg-[var(--accent-header)] text-sm" label={listing.categoryId.toUpperCase()} />
                  <div>
                    <Link className="font-medium hover:text-[var(--accent)]" href={`/listings/${listing.id}`}>{listing.title}</Link>
                    <Link className="mt-1 block text-xs text-[var(--accent)]" href={`/shops/${listing.shopId}`}>{listing.shopDisplayName}</Link>
                    <p className="mt-1 text-xs text-[var(--muted)]">{listing.conditionGrade.replaceAll("_", " ")} · Số lượng: {quantity}</p>
                  </div>
                  <strong className="text-[var(--accent)]">{formatPrice(listing.price * quantity)}</strong>
                </article>
              ))}
            </section>

            <section className="mt-4 rounded-lg border border-[var(--line)] bg-white p-6 text-right">
              <p className="text-sm text-[var(--muted)]">Tạm tính từ dữ liệu listing hiện tại</p>
              <strong className="mt-2 block text-2xl text-[var(--accent)]">{formatPrice(subtotal)}</strong>
              <p className="mt-6 rounded-md bg-amber-50 p-4 text-left text-sm text-amber-800">
                Đặt hàng, địa chỉ, phí vận chuyển và thanh toán chưa có API/backend nên chưa được giả lập trên giao diện này.
              </p>
              <button className="mt-4 h-12 w-52 cursor-not-allowed rounded-md bg-slate-400 font-medium text-white" disabled type="button">Đặt hàng chưa khả dụng</button>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
