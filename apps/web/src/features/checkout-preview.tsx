"use client";

import type { AccountAddress, CommerceOrder, PublicListing } from "@reboxe/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "./commerce-data";
import { ProductVisual } from "./commerce-ui";
import { createBrowserApiClient } from "../platform/api/browser";
import { readCart, writeCart } from "./cart-storage";
import { useRouter } from "next/navigation";

const api = createBrowserApiClient();

export function CheckoutPreview({ listingIds }: { listingIds: string[] }) {
  const [items, setItems] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<AccountAddress[]>([]);
  const [addressId, setAddressId] = useState("");
  const [order, setOrder] = useState<CommerceOrder>();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    void Promise.all(listingIds.map(async (listingId) => {
      try {
        return await api.getPublicListing(listingId);
      } catch {
        return null;
      }
    })).then((resolved) => {
      setItems(resolved.filter((item): item is PublicListing => item !== null));
      setLoading(false);
    });
  }, [listingIds]);

  useEffect(() => {
    void api.listAccountAddresses().then((value) => { setAddresses(value); setAddressId(value.find((item) => item.isDefault)?.id ?? value[0]?.id ?? ""); })
      .catch((caught) => {
        if (caught instanceof Error && "status" in caught && caught.status === 401) router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      });
  }, [router]);

  async function placeOrder() {
    const item = items[0];
    if (!item || !addressId) return;
    setSubmitting(true); setError(undefined);
    try {
      const initialized = await api.initCheckout({ items: [{ listingId: item.id, quantity: 1 }], addressId }, crypto.randomUUID());
      const confirmed = await api.payCheckout(initialized.id, crypto.randomUUID());
      setOrder(confirmed);
      writeCart(readCart().filter((line) => line.listingId !== item.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể đặt hàng. Vui lòng thử lại.");
    } finally { setSubmitting(false); }
  }

  const subtotal = items.reduce((sum, listing) => sum + listing.price, 0);

  return (
    <main className="min-h-[calc(100vh-132px)] bg-[var(--paper)] px-4 pb-10 pt-5 sm:px-6 xl:px-0">
      <div className="reboxe-container">
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
              {items.map((listing) => (
                <article className="grid gap-4 border-b border-[var(--line)] p-6 last:border-b-0 sm:grid-cols-[86px_1fr_auto] sm:items-center" key={listing.id}>
                  <ProductVisual className="size-[86px] bg-[var(--accent-header)] text-sm" label={listing.categoryId.toUpperCase()} src={listing.images[0]?.url} />
                  <div>
                    <Link className="font-medium hover:text-[var(--accent)]" href={`/listings/${listing.id}`}>{listing.title}</Link>
                    <Link className="mt-1 block text-xs text-[var(--accent)]" href={`/shops/${listing.shopId}`}>{listing.shopDisplayName}</Link>
                    <p className="mt-1 text-xs text-[var(--muted)]">{listing.conditionGrade.replaceAll("_", " ")} · Số lượng: 1</p>
                  </div>
                  <strong className="text-[var(--accent)]">{formatPrice(listing.price)}</strong>
                </article>
              ))}
            </section>

            <section className="mt-4 rounded-lg border border-[var(--line)] bg-white p-6 text-right">
              <p className="text-sm text-[var(--muted)]">Tạm tính</p>
              <strong className="mt-2 block text-2xl text-[var(--accent)]">{formatPrice(subtotal)}</strong>
              {order ? <div className="mt-6 rounded-md bg-emerald-50 p-4 text-left text-sm text-emerald-800" role="status"><strong>Đơn hàng {order.id} đã được xác nhận.</strong><br />Bạn có thể theo dõi trạng thái giao hàng trong mục Đơn mua. <Link className="underline" href={`/account/orders/${order.id}`}>Xem chi tiết</Link></div> : <>
                <label className="mt-6 block text-left text-sm font-bold">Địa chỉ nhận hàng
                  <select className="mt-2 h-11 w-full rounded border border-[var(--line)] px-3 font-normal" onChange={(event) => setAddressId(event.target.value)} value={addressId}>
                    <option value="">Chọn địa chỉ</option>{addresses.map((address) => <option key={address.id} value={address.id}>{address.label} · {address.district}, {address.province}</option>)}
                  </select>
                </label>
                {addresses.length === 0 ? <p className="mt-3 text-left text-sm"><Link className="text-[var(--accent)] underline" href="/account/address">Thêm địa chỉ trước khi đặt hàng</Link></p> : null}
                <p className="mt-4 rounded-md bg-[var(--paper)] p-4 text-left text-sm text-[var(--muted)]">Phương thức thanh toán: <strong className="text-[var(--ink)]">Thanh toán khi nhận hàng (COD)</strong></p>
                {error ? <p className="mt-3 text-left text-sm text-red-700" role="alert">{error}</p> : null}
                <button className="mt-4 h-12 w-52 rounded-md bg-[var(--accent)] font-medium text-white disabled:opacity-50" disabled={!addressId || items.length !== 1 || submitting} onClick={() => void placeOrder()} type="button">{submitting ? "Đang đặt hàng..." : "Đặt hàng"}</button>
              </>}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
