"use client";

import { ApiClientError } from "@reboxe/api-client";
import { maxCatalogImageBytes, maxCatalogImages, type ActorContext, type Listing, type SellerInventoryPackage } from "@reboxe/shared";
import Link from "next/link";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { createBrowserApiClient } from "../../platform/api/browser";

const api = createBrowserApiClient();

const statusLabels: Record<Listing["status"], string> = {
  DRAFT: "Bản nháp",
  PENDING_REVIEW: "Chờ duyệt",
  ACTIVE: "Đang bán",
  HIDDEN_BY_FUND: "Tạm ẩn",
  RESERVED: "Đã giữ chỗ",
  SOLD: "Đã bán",
  RELISTABLE: "Hoàn hàng",
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

const listingStatusDescriptions: Record<Listing["status"], string> = {
  DRAFT: "Có thể chỉnh sửa trước khi đăng",
  PENDING_REVIEW: "Đang chờ quản trị viên duyệt",
  ACTIVE: "Đang hiển thị công khai",
  HIDDEN_BY_FUND: "Tạm ẩn do số dư ký quỹ",
  RESERVED: "Đang chờ hoàn tất đơn",
  SOLD: "Đã hoàn tất bán hàng",
  RELISTABLE: "Đã hoàn về kho, có thể đăng bán lại",
  SUSPENDED: "Đang tạm ngưng",
  DELISTED: "Đã gỡ khỏi gian hàng"
};

function statusClass(status: Listing["status"]): string {
  if (status === "ACTIVE") return "bg-blue-50 text-blue-700";
  if (status === "SOLD") return "bg-emerald-50 text-emerald-700";
  if (status === "RELISTABLE") return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
}

type InventoryStatusFilter = "all" | "active" | "claims" | "sold";
type InventoryStockFilter = "all" | "in-stock" | "out-of-stock";

type InventoryItem = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  price: number;
  stock: 0 | 1;
  statusGroup: Exclude<InventoryStatusFilter, "all" | "claims"> | "other";
  statusLabel: string;
  statusDescription: string;
  statusTone: string;
  sourceLabel: string;
  orderRef: string;
  createdAt: string;
  listing?: Listing;
};

const packageStatus: Record<SellerInventoryPackage["status"], Pick<InventoryItem, "stock" | "statusGroup" | "statusLabel" | "statusDescription" | "statusTone">> = {
  SOURCE_PENDING: { stock: 0, statusGroup: "other", statusLabel: "CHỜ NHẬP KHO", statusDescription: "Chờ quét mã kiện", statusTone: "bg-blue-50 text-blue-700" },
  AVAILABLE: { stock: 1, statusGroup: "active", statusLabel: "CÒN HÀNG", statusDescription: "Sẵn sàng chuẩn bị bán", statusTone: "bg-blue-50 text-blue-700" },
  RESERVED: { stock: 0, statusGroup: "other", statusLabel: "ĐÃ GIỮ CHỖ", statusDescription: "Đang chờ hoàn tất đơn", statusTone: "bg-amber-50 text-amber-700" },
  SOLD: { stock: 0, statusGroup: "sold", statusLabel: "ĐÃ BÁN", statusDescription: "Chờ dữ liệu đối soát", statusTone: "bg-emerald-50 text-emerald-700" },
  VOID: { stock: 0, statusGroup: "other", statusLabel: "ĐÃ HỦY", statusDescription: "Kiện không còn khả dụng", statusTone: "bg-red-50 text-red-700" }
};

function listingStock(status: Listing["status"]): 0 | 1 {
  return status === "RESERVED" || status === "SOLD" || status === "DELISTED" ? 0 : 1;
}

function initials(title: string): string {
  return title.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

export function SellerWorkbench() {
  const [actor, setActor] = useState<ActorContext>();
  const [listings, setListings] = useState<Listing[]>([]);
  const [inventoryPackages, setInventoryPackages] = useState<SellerInventoryPackage[]>([]);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<InventoryStatusFilter>("all");
  const [stockFilter, setStockFilter] = useState<InventoryStockFilter>("all");
  const [searchType, setSearchType] = useState<"order" | "product">("order");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const shop = actor?.shops[0];

  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const nextActor = await api.getMe();
      setActor(nextActor);
      const firstShop = nextActor.shops[0];
      const [nextListings, nextPackages] = firstShop
        ? await Promise.all([
          api.listShopListings(firstShop.id),
          api.listSellerInventoryPackages(firstShop.id)
        ])
        : [[], []];
      setListings(nextListings);
      setInventoryPackages(nextPackages);
    } catch (caught) {
      setError(caught instanceof ApiClientError && caught.status === 401
        ? "Bạn cần đăng nhập để mở kênh người bán."
        : "Không tải được dữ liệu người bán. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function uploadImages(listing: Listing, event: ChangeEvent<HTMLInputElement>) {
    if (!shop) return;
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) return;
    if (listing.images.length + files.length > maxCatalogImages
      || files.some((file) => file.size > maxCatalogImageBytes)) {
      setError(`Mỗi sản phẩm có tối đa ${maxCatalogImages} ảnh; mỗi ảnh không quá 5 MiB.`);
      input.value = "";
      return;
    }

    setAction(`upload-${listing.id}`);
    setError(undefined);
    setSuccess(undefined);
    try {
      let updated = listing;
      for (const file of files) {
        updated = await api.uploadCatalogImage(shop.id, listing.id, file);
      }
      setListings((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSuccess(files.length === 1 ? "Đã thêm ảnh sản phẩm." : `Đã thêm ${files.length} ảnh sản phẩm.`);
    } catch (caught) {
      setError(caught instanceof ApiClientError && caught.code === "CATALOG_IMAGE_LIMIT"
        ? `Sản phẩm chỉ được có tối đa ${maxCatalogImages} ảnh.`
        : caught instanceof ApiClientError && caught.code === "VALIDATION_FAILED"
          ? "Ảnh phải là JPEG, PNG hoặc WebP và không quá 5 MiB."
          : "Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      input.value = "";
      setAction(undefined);
    }
  }

  async function publish(listingId: string) {
    if (!shop) return;
    setAction(`publish-${listingId}`);
    setError(undefined);
    setSuccess(undefined);
    try {
      const published = await api.publishListing(shop.id, listingId);
      setListings((current) => current.map((listing) =>
        listing.id === published.listing.id ? published.listing : listing));
      setSuccess(published.policy.outcome === "PENDING_REVIEW"
        ? "Sản phẩm đã được gửi duyệt và chưa xuất hiện công khai."
        : "Sản phẩm đã được đăng bán.");
    } catch (caught) {
      setError(caught instanceof ApiClientError && caught.code === "SHOP_NOT_VERIFIED"
        ? "Shop đang chờ xác minh nên chưa thể đăng công khai. Bản nháp của bạn vẫn được giữ nguyên."
        : caught instanceof ApiClientError && caught.code === "LISTING_CATEGORY_BANNED"
          ? "Danh mục này bị cấm trên REBOXE. Listing vẫn được giữ ở bản nháp."
        : caught instanceof ApiClientError && caught.code === "LISTING_DISCLOSURE_REQUIRED"
          ? "Danh mục này yêu cầu mô tả tình trạng chi tiết hơn. Listing vẫn được giữ ở bản nháp."
        : caught instanceof ApiClientError && caught.code === "INVALID_CATEGORY"
          ? "Danh mục không còn khả dụng. Hãy chọn danh mục khác trước khi đăng bán."
        : caught instanceof ApiClientError && caught.code === "LISTING_IMAGE_REQUIRED"
          ? "Cần ít nhất một ảnh sản phẩm trước khi đăng bán."
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
        <p className="text-sm font-bold text-[var(--accent)]">Bạn chưa có shop</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight">Đăng ký trở thành người bán</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Hoàn thành hồ sơ shop, địa chỉ lấy hàng, eKYC và cấu hình vận chuyển trước khi vào Seller Center.</p>
        <Link className="mt-6 inline-flex rounded-xl bg-[var(--accent)] px-5 py-3 font-bold text-white" href="/seller/onboarding">Bắt đầu đăng ký</Link>
      </section>
    );
  }


  const inventoryItems: InventoryItem[] = [
    ...inventoryPackages.map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: [item.variantName, `${item.lineCount} dòng · ${item.unitCount} sản phẩm`].filter(Boolean).join(" · "),
      imageUrl: item.imageUrl,
      price: item.price,
      ...packageStatus[item.status],
      sourceLabel: `Kiện hàng hoàn ${item.sourcePlatform}`,
      orderRef: item.sourceOrderRef ?? item.id,
      createdAt: item.createdAt
    })),
    ...listings.map((listing): InventoryItem => ({
      id: listing.id,
      title: listing.title,
      subtitle: `${conditionLabels[listing.conditionGrade]} · ${listing.images.length}/${maxCatalogImages} ảnh`,
      imageUrl: listing.images[0]?.url ?? null,
      price: listing.price,
      stock: listingStock(listing.status),
      statusGroup: listing.status === "ACTIVE" ? "active" : listing.status === "SOLD" ? "sold" : "other",
      statusLabel: statusLabels[listing.status].toUpperCase(),
      statusDescription: listingStatusDescriptions[listing.status],
      statusTone: statusClass(listing.status),
      sourceLabel: shop.displayName,
      orderRef: listing.id,
      createdAt: listing.createdAt,
      listing
    }))
  ];
  const activeCount = inventoryItems.filter((item) => item.statusGroup === "active").length;
  const soldCount = inventoryItems.filter((item) => item.statusGroup === "sold").length;
  const inStockCount = inventoryItems.filter((item) => item.stock === 1).length;
  const outOfStockCount = inventoryItems.length - inStockCount;
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("vi");
  const filteredItems = inventoryItems
    .filter((item) => statusFilter === "all" || item.statusGroup === statusFilter)
    .filter((item) => stockFilter === "all" || (stockFilter === "in-stock" ? item.stock === 1 : item.stock === 0))
    .filter((item) => !normalizedSearch || (searchType === "order" ? `${item.id} ${item.orderRef}` : item.title)
      .toLocaleLowerCase("vi").includes(normalizedSearch))
    .sort((left, right) => sortOrder === "newest"
      ? right.createdAt.localeCompare(left.createdAt)
      : left.createdAt.localeCompare(right.createdAt));

  return (
    <div className="grid gap-6 xl:h-full xl:min-h-0">
      <section id="inventory" className="flex min-h-[calc(100vh-100px)] flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-white p-5 xl:h-full xl:min-h-0">
        <h1 className="text-[22px] font-bold leading-normal text-[var(--ink)]">Quản Lý Kho Hàng REBOXE</h1>

        <div className="mt-1 flex h-11 items-end gap-1 overflow-x-auto border-b border-[var(--line)]" aria-label="Lọc trạng thái kho hàng">
          {([
            ["all", "Tất cả"],
            ["active", `Đang bán (${activeCount})`],
            ["claims", "Khiếu nại (0)"],
            ["sold", `Đã bán (${soldCount})`]
          ] as const).map(([value, label]) => (
            <button
              aria-pressed={statusFilter === value}
              className={`flex h-11 shrink-0 flex-col items-center justify-end gap-2 px-3 text-[13px] font-medium ${statusFilter === value ? "font-bold text-[var(--accent)]" : "text-[var(--ink)]"} ${value === "claims" ? "cursor-not-allowed opacity-50" : ""}`}
              disabled={value === "claims"}
              key={value}
              onClick={() => setStatusFilter(value)}
              type="button"
            >
              {label}
              <span className={`h-0.5 rounded-sm ${statusFilter === value ? "w-9 bg-[var(--accent)]" : "w-9"}`} />
            </button>
          ))}
        </div>

        <div className="grid gap-2 py-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
            <span className="w-[120px] shrink-0 font-medium">Trạng thái</span>
            {([
              ["all", "Tất cả"],
              ["active", `Đang bán (${activeCount})`],
              ["sold", `Đã bán (${soldCount})`]
            ] as const).map(([value, label]) => (
              <button className={`rounded-full border px-3 py-1.5 font-medium ${statusFilter === value ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--line)] text-[var(--muted)]"}`} key={value} onClick={() => setStatusFilter(value)} type="button">{label}</button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
            <span className="w-[120px] shrink-0 font-medium">Tồn kho</span>
            {([
              ["all", "Tất cả"],
              ["in-stock", `Còn hàng (${inStockCount})`],
              ["out-of-stock", `Hết hàng (${outOfStockCount})`]
            ] as const).map(([value, label]) => (
              <button className={`rounded-full border px-3 py-1.5 font-medium ${stockFilter === value ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--line)] text-[var(--muted)]"}`} key={value} onClick={() => setStockFilter(value)} type="button">{label}</button>
            ))}
          </div>
        </div>

        <form className="flex flex-wrap items-center gap-2 pb-3" onSubmit={(event) => { event.preventDefault(); setSearchTerm(searchInput); }} role="search">
          <select aria-label="Loại tìm kiếm" className="h-[34px] w-[150px] rounded-sm border border-[var(--line)] bg-white px-3 text-xs" onChange={(event) => setSearchType(event.target.value as "order" | "product")} value={searchType}>
            <option value="order">Mã đơn hàng</option>
            <option value="product">Tên sản phẩm</option>
          </select>
          <input aria-label="Nhập tên sản phẩm hoặc mã đơn" className="h-[34px] min-w-[220px] flex-1 rounded-sm border border-[var(--line)] px-3 text-xs" onChange={(event) => setSearchInput(event.target.value)} placeholder="Nhập tên sản phẩm" type="search" value={searchInput} />
          <span className="flex h-[34px] items-center rounded-sm border border-[var(--line)] px-3 text-xs">Đơn vị vận chuyển: REBOXE</span>
          <button className="h-[34px] rounded-sm bg-[var(--accent)] px-4 text-xs font-medium text-white">Áp dụng</button>
          <button className="h-[34px] rounded-sm border border-[var(--line)] bg-white px-4 text-xs text-[var(--accent)]" onClick={() => { setSearchInput(""); setSearchTerm(""); setStatusFilter("all"); setStockFilter("all"); }} type="button">Đặt lại</button>
        </form>

        <div className="flex items-center justify-between gap-3 pb-3">
          <strong className="text-[13px]">{filteredItems.length} Kiện hàng</strong>
          <select aria-label="Sắp xếp kho hàng" className="h-8 rounded-sm border border-[var(--line)] bg-white px-3 text-[11px] text-[var(--muted)]" onChange={(event) => setSortOrder(event.target.value as "newest" | "oldest")} value={sortOrder}>
            <option value="newest">Sắp xếp theo: Mới nhất</option>
            <option value="oldest">Sắp xếp theo: Cũ nhất</option>
          </select>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-hidden" role="table" aria-label="Danh sách kho hàng">
          <div className="grid min-w-[920px] grid-cols-[minmax(320px,1fr)_170px_120px_230px_152px] rounded-t-[5px] bg-[var(--paper)] px-3 py-2 text-[11px] text-[var(--muted)]" role="row">
            <span role="columnheader">Sản phẩm</span><span role="columnheader">Giá xả kho</span><span role="columnheader">Tồn kho</span><span role="columnheader">Trạng thái</span><span role="columnheader">Thao tác</span>
          </div>
          <div className="mt-2 flex min-h-0 min-w-[920px] flex-1 flex-col gap-2 overflow-y-auto overscroll-contain" role="rowgroup">
            {filteredItems.length === 0 ? (
              <div className="grid flex-1 place-items-center rounded-[5px] border border-[var(--line)] text-center" role="row">
                <div role="cell"><p className="font-bold">Không có kiện hàng phù hợp</p><p className="mt-1 text-xs text-[var(--muted)]">Thử đổi bộ lọc hoặc tạo sản phẩm mới ở mục Thêm Sản Phẩm.</p></div>
              </div>
            ) : filteredItems.map((item) => (
              <article className="min-w-[920px] shrink-0 overflow-hidden rounded-[5px] border border-[var(--line)]" key={`${item.listing ? "listing" : "package"}-${item.id}`} role="row">
                <div className="flex h-[30px] items-center justify-between bg-[var(--paper)] px-3 text-[11px] text-[var(--muted)]">
                  <span className="flex items-center gap-2 font-medium"><span className="grid size-[18px] place-items-center rounded-full bg-[var(--accent-soft)] text-[9px] font-bold text-[var(--accent)]">R</span>{item.sourceLabel}</span>
                  <span>Mã đơn hàng: {item.orderRef}</span>
                </div>
                <div className="grid h-[76px] grid-cols-[minmax(320px,1fr)_170px_120px_230px_152px] items-center text-xs">
                  <div className="flex min-w-0 items-center gap-2.5 pl-3" role="cell">
                    {item.imageUrl ? <img alt="" className="size-[46px] shrink-0 rounded-[5px] object-cover" height={46} src={item.imageUrl} width={46} /> : <span className="grid size-[46px] shrink-0 place-items-center rounded-[5px] bg-[var(--accent-soft)] text-[11px] font-bold text-[var(--accent)]">{initials(item.title)}</span>}
                    <span className="min-w-0"><strong className="block truncate text-[13px]">{item.title}</strong><span className="mt-1 block truncate text-[11px] text-[var(--muted)]">{item.subtitle}</span></span>
                  </div>
                  <div className="pl-3 tabular-nums" role="cell"><strong className="block text-[13px]">{item.price.toLocaleString("vi-VN")}đ</strong><span className="text-[10px] text-[var(--muted)]">Giá xả kho</span></div>
                  <div className="pl-3 tabular-nums" role="cell"><strong className="block text-[13px]">{item.stock}</strong><span className="text-[10px] text-[var(--muted)]">Tồn kho</span></div>
                  <div className="pl-3" role="cell"><span className={`inline-flex rounded-full px-2.5 py-1.5 text-[11px] font-bold ${item.statusTone}`}>{item.statusLabel}</span><span className="mt-1 block text-[10px] text-[var(--muted)]">{item.statusDescription}</span></div>
                  <div className="flex items-center gap-2 pl-3" role="cell">
                    {item.listing?.status === "DRAFT" ? <><label className={`cursor-pointer text-xs font-medium ${action === `upload-${item.id}` || item.listing.images.length >= maxCatalogImages ? "pointer-events-none opacity-50" : ""}`}>{action === `upload-${item.id}` ? "Đang tải..." : "Thêm ảnh"}<input accept="image/jpeg,image/png,image/webp" aria-label={`Thêm ảnh cho ${item.title}`} className="sr-only" disabled={action === `upload-${item.id}` || item.listing.images.length >= maxCatalogImages} multiple onChange={(event) => void uploadImages(item.listing!, event)} type="file" /></label><Link className="text-xs font-medium" href={`/seller/products/new?edit=${item.id}`}>Chỉnh sửa</Link><button className="text-xs font-medium text-[var(--accent)] disabled:opacity-50" disabled={action === `publish-${item.id}`} onClick={() => void publish(item.id)} type="button">{action === `publish-${item.id}` ? "Đang đăng..." : "Đăng bán"}</button></> : item.listing?.status === "ACTIVE" ? <Link className="font-medium text-[var(--accent)]" href={`/listings/${item.id}`}>Xem công khai</Link> : item.statusGroup === "sold" ? <Link className="font-medium text-[var(--accent)]" href="/seller/finance">Đối soát</Link> : <span className="font-medium text-[var(--muted)]">{item.listing ? "Chờ xử lý" : "Chuẩn bị bán"}</span>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-4 flex h-8 items-center justify-end gap-1.5 text-[11px] text-[var(--muted)]"><span>Trang 1 / 1</span><button className="grid size-6 place-items-center rounded-sm border border-[var(--line)] opacity-45" disabled type="button">‹</button><span className="grid size-6 place-items-center rounded-sm bg-[var(--accent)] text-white">1</span><button className="grid size-6 place-items-center rounded-sm border border-[var(--line)] opacity-45" disabled type="button">›</button></div>
      </section>



      {error ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800" role="alert">{error}</p> : null}
      {success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800" role="status">{success}</p> : null}

    </div>
  );
}
