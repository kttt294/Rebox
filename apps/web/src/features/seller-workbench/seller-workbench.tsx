"use client";

import { ApiClientError } from "@rebox/api-client";
import type { ActorContext, Listing } from "@rebox/shared";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createBrowserApiClient } from "../../platform/api/browser";

const api = createBrowserApiClient();

export function SellerWorkbench() {
  const [actor, setActor] = useState<ActorContext>();
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const shop = actor?.shops[0];

  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const nextActor = await api.getMe();
      setActor(nextActor);
      const firstShop = nextActor.shops[0];
      setListings(firstShop ? await api.listShopListings(firstShop.id) : []);
    } catch (caught) {
      setError(caught instanceof ApiClientError && caught.status === 401 ? "Bạn cần đăng nhập để mở kênh người bán." : "Không tải được dữ liệu người bán.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  async function createShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await api.createShop({ displayName: String(data.get("displayName")), legalType: "INDIVIDUAL" });
    await reload();
  }

  async function createListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shop) return;
    const data = new FormData(event.currentTarget);
    await api.createListing(shop.id, {
      title: String(data.get("title")),
      description: String(data.get("description")),
      categoryId: String(data.get("categoryId")),
      conditionGrade: String(data.get("conditionGrade")) as "GOOD",
      conditionNotes: String(data.get("conditionNotes")),
      price: Number(data.get("price")),
      weightGram: Number(data.get("weightGram"))
    });
    event.currentTarget.reset();
    await reload();
  }

  async function publish(listingId: string) {
    if (!shop) return;
    setError(undefined);
    try {
      await api.publishListing(shop.id, listingId);
      await reload();
    } catch (caught) {
      setError(caught instanceof ApiClientError && caught.code === "SHOP_NOT_VERIFIED"
        ? "Shop đang chờ xác minh nên chưa thể đăng công khai."
        : "Không thể đăng listing.");
    }
  }

  if (loading) return <p className="py-16 text-center text-[var(--muted)]">Đang tải kênh người bán…</p>;
  if (error && !actor) return <p className="rounded-2xl bg-red-50 p-5 text-red-700" role="alert">{error} <Link className="underline" href="/login">Đăng nhập</Link></p>;

  if (!shop) {
    return (
      <form className="max-w-xl rounded-3xl border border-[var(--line)] bg-white p-7" onSubmit={createShop}>
        <h2 className="text-2xl font-black">Tạo shop đầu tiên</h2>
        <label className="mt-5 grid gap-2 font-semibold">Tên hiển thị<input className="rounded-xl border border-[var(--line)] px-4 py-3" name="displayName" minLength={2} required /></label>
        <button className="mt-5 rounded-xl bg-[var(--accent)] px-5 py-3 font-bold text-white">Tạo shop</button>
      </form>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <form className="rounded-3xl border border-[var(--line)] bg-white p-7" onSubmit={createListing}>
        <p className="text-sm font-bold text-[var(--accent)]">{shop.displayName} · {shop.kycStatus}</p>
        <h2 className="mt-2 text-2xl font-black">Tạo listing thủ công</h2>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-1 font-semibold">Tên sản phẩm<input className="rounded-xl border border-[var(--line)] px-4 py-3" name="title" minLength={3} required /></label>
          <label className="grid gap-1 font-semibold">Danh mục<input className="rounded-xl border border-[var(--line)] px-4 py-3" name="categoryId" required /></label>
          <label className="grid gap-1 font-semibold">Tình trạng<select className="rounded-xl border border-[var(--line)] px-4 py-3" name="conditionGrade"><option value="GOOD">Còn tốt</option><option value="LIKE_NEW_99">Gần như mới</option><option value="FAIR">Đã qua sử dụng</option><option value="DEFECT">Có lỗi</option></select></label>
          <label className="grid gap-1 font-semibold">Mô tả khuyết điểm<textarea className="rounded-xl border border-[var(--line)] px-4 py-3" name="conditionNotes" minLength={3} required /></label>
          <label className="grid gap-1 font-semibold">Mô tả<textarea className="rounded-xl border border-[var(--line)] px-4 py-3" name="description" /></label>
          <div className="grid grid-cols-2 gap-3"><label className="grid gap-1 font-semibold">Giá (VNĐ)<input className="rounded-xl border border-[var(--line)] px-4 py-3" name="price" type="number" min={1} required /></label><label className="grid gap-1 font-semibold">Khối lượng (g)<input className="rounded-xl border border-[var(--line)] px-4 py-3" name="weightGram" type="number" min={1} max={100000} required /></label></div>
        </div>
        <button className="mt-5 w-full rounded-xl bg-[var(--ink)] px-5 py-3 font-bold text-white">Lưu bản nháp</button>
      </form>

      <section>
        <h2 className="text-2xl font-black">Listing của shop</h2>
        {error ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-amber-800" role="alert">{error}</p> : null}
        {listings.length === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-[var(--muted)]">Chưa có listing nào.</p> : null}
        <div className="mt-5 grid gap-3">
          {listings.map((listing) => (
            <article className="rounded-2xl border border-[var(--line)] bg-white p-5" key={listing.id}>
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold text-[var(--accent)]">{listing.status}</p><h3 className="mt-1 text-lg font-bold">{listing.title}</h3><p className="mt-2 text-[var(--muted)]">{listing.price.toLocaleString("vi-VN")}đ</p></div>{listing.status === "DRAFT" ? <button className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white" onClick={() => void publish(listing.id)}>Đăng bán</button> : <Link className="text-sm font-bold underline" href={`/listings/${listing.id}`}>Xem công khai</Link>}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
