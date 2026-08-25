"use client";

import { ApiClientError } from "@rebox/api-client";
import type { ActorContext, Listing } from "@rebox/shared";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createBrowserApiClient } from "../../platform/api/browser";

const api = createBrowserApiClient();

const statusLabels: Record<Listing["status"], string> = {
  DRAFT: "Bản nháp",
  PENDING_REVIEW: "Chờ duyệt",
  ACTIVE: "Đang bán",
  HIDDEN_BY_FUND: "Tạm ẩn",
  RESERVED: "Đã giữ chỗ",
  SOLD: "Đã bán",
  RELISTABLE: "Có thể đăng lại",
  SUSPENDED: "Tạm ngưng",
  DELISTED: "Đã gỡ"
};

const conditionLabels: Record<Listing["conditionGrade"], string> = {
  NEW_SEALED: "Mới nguyên seal",
  LIKE_NEW_99: "Gần như mới",
  GOOD: "Còn tốt",
  FAIR: "Đã qua sử dụng",
  DEFECT: "Có lỗi"
};

function statusClass(status: Listing["status"]): string {
  if (status === "ACTIVE" || status === "SOLD") return "bg-emerald-50 text-emerald-700";
  if (status === "DRAFT" || status === "PENDING_REVIEW") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
}

export function SellerWorkbench() {
  const [actor, setActor] = useState<ActorContext>();
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string>();
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
      setError(caught instanceof ApiClientError && caught.status === 401
        ? "Bạn cần đăng nhập để mở kênh người bán."
        : "Không tải được dữ liệu người bán. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  async function createShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setAction("create-shop");
    setError(undefined);
    try {
      await api.createShop({ displayName: String(data.get("displayName")), legalType: "INDIVIDUAL" });
      await reload();
    } catch {
      setError("Không thể tạo shop. Vui lòng kiểm tra tên hiển thị và thử lại.");
    } finally {
      setAction(undefined);
    }
  }

  async function createListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shop) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setAction("create-listing");
    setError(undefined);
    try {
      await api.createListing(shop.id, {
        title: String(data.get("title")),
        description: String(data.get("description")),
        categoryId: String(data.get("categoryId")),
        conditionGrade: String(data.get("conditionGrade")) as Listing["conditionGrade"],
        conditionNotes: String(data.get("conditionNotes")),
        price: Number(data.get("price")),
        weightGram: Number(data.get("weightGram"))
      });
      form.reset();
      await reload();
    } catch (caught) {
      setError(caught instanceof ApiClientError && caught.code === "VALIDATION_FAILED"
        ? "Thông tin sản phẩm chưa hợp lệ. Vui lòng kiểm tra lại các trường bắt buộc."
        : "Không thể lưu bản nháp. Vui lòng thử lại.");
    } finally {
      setAction(undefined);
    }
  }

  async function publish(listingId: string) {
    if (!shop) return;
    setAction(`publish-${listingId}`);
    setError(undefined);
    try {
      await api.publishListing(shop.id, listingId);
      await reload();
    } catch (caught) {
      setError(caught instanceof ApiClientError && caught.code === "SHOP_NOT_VERIFIED"
        ? "Shop đang chờ xác minh nên chưa thể đăng công khai. Bản nháp của bạn vẫn được giữ nguyên."
        : "Không thể đăng sản phẩm. Vui lòng thử lại.");
    } finally {
      setAction(undefined);
    }
  }

  if (loading) {
    return (
      <div className="mt-6 grid animate-pulse gap-5" aria-label="Đang tải kênh người bán" aria-busy="true">
        <div className="h-16 rounded-[18px] bg-slate-200" />
        <div className="h-[420px] rounded-[18px] bg-white" />
        <div className="h-56 rounded-[18px] bg-white" />
      </div>
    );
  }

  if (error && !actor) {
    return (
      <section className="mt-6 rounded-[18px] border border-red-200 bg-white p-6 shadow-[0_12px_35px_rgba(35,63,101,0.06)]" role="alert">
        <h2 className="text-xl font-black">Chưa thể mở kênh người bán</h2>
        <p className="mt-2 text-sm leading-6 text-red-700">{error}</p>
        <Link className="mt-5 inline-flex rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white" href="/login">
          Đi đến đăng nhập
        </Link>
      </section>
    );
  }

  if (!shop) {
    return (
      <section className="mt-6 max-w-2xl rounded-[18px] border border-[var(--line)] bg-white p-6 shadow-[0_12px_35px_rgba(35,63,101,0.06)] sm:p-8">
        <p className="text-sm font-bold text-[var(--accent)]">Thiết lập ban đầu</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight">Tạo shop đầu tiên</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Tên này sẽ xuất hiện trên trang sản phẩm công khai.</p>
        {error ? <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p> : null}
        <form className="mt-6" onSubmit={createShop}>
          <label className="grid gap-2 text-sm font-bold" htmlFor="displayName">
            Tên hiển thị
            <input className="rounded-xl border border-[var(--line-strong)] px-4 py-3.5 font-normal transition-colors hover:border-slate-400" id="displayName" name="displayName" minLength={2} maxLength={120} placeholder="Ví dụ: REBOX Store Hà Nội" required />
          </label>
          <button className="mt-5 rounded-xl bg-[var(--accent)] px-5 py-3 font-bold text-white disabled:opacity-60" disabled={action === "create-shop"}>
            {action === "create-shop" ? "Đang tạo shop..." : "Tạo shop"}
          </button>
        </form>
      </section>
    );
  }

  const verified = shop.kycStatus === "VERIFIED" && shop.status === "ACTIVE";

  return (
    <div className="mt-6 grid gap-6">
      <section className="flex flex-col gap-3 rounded-[18px] border border-[var(--line)] bg-white px-5 py-4 shadow-[0_12px_35px_rgba(35,63,101,0.05)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-black text-[var(--ink)]">{shop.displayName}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Vai trò {shop.role} · Trạng thái {shop.status}</p>
        </div>
        <span className={`w-fit rounded-lg px-3 py-1.5 text-xs font-black ${verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {verified ? "Đã xác minh" : "Đang chờ xác minh"}
        </span>
      </section>

      {error ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800" role="alert">{error}</p> : null}

      <form id="new-listing" className="scroll-mt-28 rounded-[18px] border border-[var(--line)] bg-white shadow-[0_12px_35px_rgba(35,63,101,0.06)]" onSubmit={createListing}>
        <div className="border-b border-[var(--line)] px-5 py-5 sm:px-7">
          <h2 className="text-xl font-black tracking-tight">Thông tin sản phẩm</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Các trường có dấu * là bắt buộc trước khi lưu bản nháp.</p>
        </div>

        <div className="grid gap-x-6 gap-y-5 p-5 sm:grid-cols-2 sm:p-7">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2" htmlFor="title">
            Tên sản phẩm *
            <input className="rounded-xl border border-[var(--line-strong)] px-4 py-3.5 font-normal transition-colors hover:border-slate-400" id="title" name="title" minLength={3} maxLength={180} placeholder="Nhập tên sản phẩm rõ ràng, dễ tìm kiếm" required />
          </label>

          <label className="grid gap-2 text-sm font-bold" htmlFor="categoryId">
            Mã danh mục *
            <input className="rounded-xl border border-[var(--line-strong)] px-4 py-3.5 font-normal transition-colors hover:border-slate-400" id="categoryId" name="categoryId" maxLength={80} placeholder="Ví dụ: fashion-women" required />
          </label>

          <label className="grid gap-2 text-sm font-bold" htmlFor="conditionGrade">
            Tình trạng *
            <select className="rounded-xl border border-[var(--line-strong)] bg-white px-4 py-3.5 font-normal transition-colors hover:border-slate-400" id="conditionGrade" name="conditionGrade">
              <option value="NEW_SEALED">Mới nguyên seal</option>
              <option value="LIKE_NEW_99">Gần như mới</option>
              <option value="GOOD">Còn tốt</option>
              <option value="FAIR">Đã qua sử dụng</option>
              <option value="DEFECT">Có lỗi</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold" htmlFor="price">
            Giá bán dự kiến (VNĐ) *
            <input className="rounded-xl border border-[var(--line-strong)] px-4 py-3.5 font-normal transition-colors hover:border-slate-400" id="price" name="price" type="number" inputMode="numeric" min={1} placeholder="450000" required />
          </label>

          <label className="grid gap-2 text-sm font-bold" htmlFor="weightGram">
            Khối lượng (gram) *
            <input className="rounded-xl border border-[var(--line-strong)] px-4 py-3.5 font-normal transition-colors hover:border-slate-400" id="weightGram" name="weightGram" type="number" inputMode="numeric" min={1} max={100000} placeholder="500" required />
          </label>

          <label className="grid gap-2 text-sm font-bold sm:col-span-2" htmlFor="conditionNotes">
            Mô tả tình trạng và khuyết điểm *
            <textarea className="min-h-28 resize-y rounded-xl border border-[var(--line-strong)] px-4 py-3.5 font-normal leading-6 transition-colors hover:border-slate-400" id="conditionNotes" name="conditionNotes" minLength={3} maxLength={2000} placeholder="Ghi rõ vết xước, móp, thiếu phụ kiện hoặc dấu hiệu đã qua sử dụng" required />
          </label>

          <label className="grid gap-2 text-sm font-bold sm:col-span-2" htmlFor="description">
            Mô tả bổ sung
            <textarea className="min-h-24 resize-y rounded-xl border border-[var(--line-strong)] px-4 py-3.5 font-normal leading-6 transition-colors hover:border-slate-400" id="description" name="description" maxLength={5000} placeholder="Thông tin chất liệu, kích thước, phụ kiện đi kèm" />
          </label>
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--line)] bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="text-sm leading-6 text-[var(--muted)]">Bạn có thể chỉnh sửa bản nháp trước khi đăng bán.</p>
          <button className="rounded-xl bg-[var(--accent)] px-6 py-3 font-bold text-white shadow-[0_7px_16px_rgba(25,104,238,0.2)] transition-transform active:translate-y-px disabled:opacity-60" disabled={action === "create-listing"}>
            {action === "create-listing" ? "Đang lưu..." : "Lưu bản nháp"}
          </button>
        </div>
      </form>

      <section id="inventory" className="scroll-mt-28 rounded-[18px] border border-[var(--line)] bg-white shadow-[0_12px_35px_rgba(35,63,101,0.06)]">
        <div className="flex flex-col gap-2 border-b border-[var(--line)] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7">
          <div>
            <h2 className="text-xl font-black tracking-tight">Quản lý kho hàng</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Danh sách bản nháp và sản phẩm đang bán của shop.</p>
          </div>
          <p className="text-sm font-bold text-[var(--accent)]">{listings.length} sản phẩm</p>
        </div>

        {listings.length === 0 ? (
          <div className="p-8 text-center sm:p-12">
            <h3 className="font-black">Kho hàng chưa có sản phẩm</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">Điền form phía trên để tạo bản nháp đầu tiên.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead className="bg-slate-50 text-sm text-[var(--muted)]">
                <tr>
                  <th className="px-6 py-4 font-bold">Sản phẩm</th>
                  <th className="px-6 py-4 font-bold">Tình trạng</th>
                  <th className="px-6 py-4 font-bold">Giá bán</th>
                  <th className="px-6 py-4 font-bold">Trạng thái</th>
                  <th className="px-6 py-4 text-right font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr className="border-t border-[var(--line)]" key={listing.id}>
                    <td className="px-6 py-4">
                      <p className="font-bold text-[var(--ink)]">{listing.title}</p>
                      <p className="mt-1 max-w-sm truncate text-xs text-[var(--muted)]">Mã: {listing.id}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--muted)]">{conditionLabels[listing.conditionGrade]}</td>
                    <td className="px-6 py-4 font-bold tabular-nums">{listing.price.toLocaleString("vi-VN")}đ</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-lg px-2.5 py-1.5 text-xs font-black ${statusClass(listing.status)}`}>{statusLabels[listing.status]}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {listing.status === "DRAFT" ? (
                        <button className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white disabled:opacity-60" disabled={action === `publish-${listing.id}`} onClick={() => void publish(listing.id)} type="button">
                          {action === `publish-${listing.id}` ? "Đang đăng..." : "Đăng bán"}
                        </button>
                      ) : (
                        <Link className="text-sm font-bold text-[var(--accent)] hover:underline" href={`/listings/${listing.id}`}>Xem công khai</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
