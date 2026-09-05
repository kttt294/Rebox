"use client";

import { ApiClientError } from "@rebox/api-client";
import type { ActorContext, KycStatus, KycStatusResponse } from "@rebox/shared";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createBrowserApiClient } from "../platform/api/browser";

const api = createBrowserApiClient();
const messages: Record<KycStatus, string> = {
  PENDING: "Hồ sơ chưa bắt đầu xác minh. Vui lòng hoàn thành các bước onboarding.",
  PROCESSING: "Hồ sơ đang xử lý hoặc còn thiếu bước xác minh. Chưa thể đăng bán.",
  MANUAL_REVIEW: "Hồ sơ đang chờ nhân viên duyệt. Bạn chưa thể đăng bán; vui lòng quay lại kiểm tra kết quả.",
  VERIFIED: "Hồ sơ đã được duyệt. Bạn được phép đăng bán.",
  REJECTED: "Hồ sơ bị từ chối. Vui lòng liên hệ hỗ trợ REBOX và cung cấp mã hồ sơ bên dưới."
};

export function SellerKycStatus() {
  const [shop, setShop] = useState<ActorContext["shops"][number]>();
  const [status, setStatus] = useState<KycStatusResponse>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    setStatus(undefined);
    try {
      const me = await api.getMe();
      const owned = me.shops.find((item) => item.role === "OWNER" && item.membershipStatus === "ACTIVE");
      setShop(owned);
      if (owned?.kycId) setStatus(await api.getKycStatus(owned.kycId));
    } catch (caught) {
      setError(caught instanceof ApiClientError && caught.status === 401
        ? "Bạn cần đăng nhập để xem hồ sơ." : "Không tải được trạng thái. Vui lòng thử lại.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  return <section className="mx-auto max-w-2xl space-y-5 rounded-xl border border-[var(--line)] bg-white p-6">
    <h1 className="text-2xl font-bold">Trạng thái xác minh</h1>
    {loading ? <p role="status">Đang tải hồ sơ…</p> : error ? <p role="alert">{error}</p> : shop ? <>
      <h2 className="font-bold">{shop.displayName}</h2>
      <p role="status">{messages[status?.kycStatus ?? shop.kycStatus]}</p>
      {status?.review ? <div className="space-y-2 border-l-4 border-[var(--accent)] pl-4">
        <p className="whitespace-pre-wrap"><strong>Lý do: </strong>{status.review.reason}</p>
        <p>Thời điểm duyệt: {new Date(status.review.reviewedAt).toLocaleString("vi-VN")}</p>
      </div> : null}
      {shop.kycId ? <p className="break-all text-sm text-[var(--muted)]">Mã hồ sơ: {shop.kycId}</p> : null}
    </> : <p>Chưa có hồ sơ shop thuộc quyền sở hữu của bạn.</p>}
    <div className="flex flex-wrap gap-5">
      <button type="button" disabled={loading} onClick={() => void reload()} className="font-bold text-[var(--accent)] disabled:opacity-50">Cập nhật trạng thái</button>
      <Link href="/seller/inventory" className="underline">Về kho hàng</Link>
      {error ? <Link href="/login" className="underline">Đăng nhập</Link> : null}
    </div>
  </section>;
}
