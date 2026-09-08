"use client";
import type { CommerceOrder } from "@reboxe/shared";
import { useEffect, useState } from "react";
import { createBrowserApiClient } from "../platform/api/browser";
import { AccountShell } from "./account-shell";

const api = createBrowserApiClient();
export function OrderDetail({ id }: { id: string }) {
  const [order, setOrder] = useState<CommerceOrder>();
  const [error, setError] = useState<string>();
  const [reason, setReason] = useState("");
  const [caseId, setCaseId] = useState<string>();
  const [evidenceStatus, setEvidenceStatus] = useState<string>();
  useEffect(() => { void api.getCommerceOrder(id).then(setOrder).catch(() => setError("Không thể tải đơn hàng.")); }, [id]);
  async function addEvidence(file?: File) {
    if (!caseId || !file) return;
    if (file.size > 20 * 1024 * 1024) return setEvidenceStatus("File vượt giới hạn 20 MiB.");
    setEvidenceStatus("Đang ghi metadata synthetic...");
    try {
      const checksum = [...new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()))]
        .map((byte) => byte.toString(16).padStart(2, "0")).join("");
      const record = await api.createProcessingRecord({ purpose: "DISPUTE_EVIDENCE", targetType: "DISPUTE", targetId: caseId, noticeVersion: "2026-09-07" });
      await api.addDisputeEvidence(caseId, { processingRecordId: record.id, fileName: file.name, sizeBytes: file.size, checksum });
      setEvidenceStatus("Đã lưu metadata evidence; không upload nội dung thật trong sandbox.");
    } catch { setEvidenceStatus("Không thể thêm evidence."); }
  }
  return <AccountShell activeHref="/account/orders" initials="RB" username="Tài khoản"><main className="min-h-96 flex-1 rounded border border-[var(--line)] bg-white p-6">{error ? <p role="alert">{error}</p> : !order ? <p>Đang tải...</p> : <><h1 className="text-xl font-bold">Đơn {order.id}</h1><p className="mt-2 text-sm text-amber-700">SANDBOX · không phải thanh toán thật</p><div className="mt-6 border p-4"><strong>{order.item.title}</strong><p className="mt-2">{order.totalVnd.toLocaleString("vi-VN")} ₫</p></div><ol className="mt-6 space-y-3">{order.timeline.map((event) => <li key={`${event.status}-${event.at}`}><strong>{event.status.replaceAll("_", " ")}</strong> · {new Date(event.at).toLocaleString("vi-VN")}</li>)}</ol>{["DELIVERED", "COMPLETED"].includes(order.status) ? <div className="mt-8 border-t pt-5"><h2 className="font-bold">Mở khiếu nại</h2><p className="mt-1 text-sm text-[var(--muted)]">Video tối đa 90 giây là tùy chọn; bạn có thể gửi case không kèm evidence.</p><textarea aria-label="Lý do khiếu nại" className="mt-3 min-h-24 w-full border p-3" minLength={10} onChange={(event) => setReason(event.target.value)} value={reason} /><button className="mt-2 rounded bg-[var(--accent)] px-4 py-2 font-bold text-white" disabled={reason.trim().length < 10 || Boolean(caseId)} onClick={() => void api.openDispute(order.id, reason).then((item) => setCaseId(item.id))}>{caseId ? `Đã tạo ${caseId}` : "Gửi khiếu nại"}</button>{caseId ? <label className="ml-3 inline-flex cursor-pointer rounded border px-4 py-2 text-sm font-bold">Thêm evidence tùy chọn<input accept="image/*,video/*" className="sr-only" onChange={(event) => void addEvidence(event.target.files?.[0])} type="file" /></label> : null}{evidenceStatus ? <p className="mt-3 text-sm" role="status">{evidenceStatus}</p> : null}</div> : null}</>}</main></AccountShell>;
}
