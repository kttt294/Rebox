"use client";
import type { CommerceOrder } from "@reboxe/shared";
import { useEffect, useState } from "react";
import { createBrowserApiClient } from "../platform/api/browser";

const api = createBrowserApiClient();
export function SellerOrders() {
  const [orders, setOrders] = useState<CommerceOrder[]>([]);
  const [shopId, setShopId] = useState("");
  const [label, setLabel] = useState<string>();
  useEffect(() => { void api.getMe().then(async (actor) => { const shop = actor.shops[0]; if (!shop) return []; setShopId(shop.id); return api.listSellerOrders(shop.id); }).then(setOrders); }, []);
  async function ship(orderId: string) { const shipment = await api.createFakeShipment(shopId, orderId); setLabel(shipment.label); setOrders((items) => items.map((item) => item.id === orderId ? { ...item, status: "READY_TO_SHIP" } : item)); }
  return <section className="rounded-xl bg-white p-6"><h1 className="text-2xl font-bold">Đơn hàng sandbox</h1><p className="mt-2 text-sm text-amber-700">Vận chuyển và thanh toán đều là mô phỏng.</p>{label ? <pre className="mt-4 whitespace-pre-wrap rounded bg-slate-100 p-4">{label}</pre> : null}<div className="mt-6 space-y-3">{orders.map((order) => <article className="border p-4" key={order.id}><strong>{order.id}</strong><span className="float-right">{order.status.replaceAll("_", " ")}</span><p className="mt-2 text-sm">{order.item.title} · {order.totalVnd.toLocaleString("vi-VN")} ₫</p>{order.status === "CONFIRMED" ? <button className="mt-3 rounded bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white" onClick={() => void ship(order.id)}>Tạo vận đơn giả</button> : null}</article>)}</div></section>;
}

export function SellerDisputes() {
  const [cases, setCases] = useState<Array<{ id: string; orderId: string; status: string; reason: string; createdAt: string }>>([]);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string>();
  useEffect(() => { void api.getMe().then((actor) => actor.shops[0] ? api.listSellerDisputes(actor.shops[0].id) : []).then(setCases); }, []);
  async function reply(caseId: string) {
    const body = replies[caseId]?.trim(); if (!body) return;
    await api.replyDispute(caseId, body); setNotice(`Đã phản hồi ${caseId}.`); setReplies((items) => ({ ...items, [caseId]: "" }));
  }
  async function evidence(caseId: string, file?: File) {
    if (!file || file.size > 20 * 1024 * 1024) return setNotice("Evidence phải nhỏ hơn 20 MiB.");
    const checksum = [...new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()))]
      .map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const record = await api.createProcessingRecord({ purpose: "SELLER_EVIDENCE", targetType: "DISPUTE", targetId: caseId, noticeVersion: "2026-09-07" });
    await api.addDisputeEvidence(caseId, { processingRecordId: record.id, fileName: file.name, sizeBytes: file.size, checksum });
    setNotice("Đã ghi metadata evidence synthetic; buyer/admin chỉ đọc đúng phiên bản đã ghi.");
  }
  return <section className="rounded-xl bg-white p-6"><h1 className="text-2xl font-bold">Khiếu nại / Hoàn trả</h1>{notice ? <p className="mt-3 text-sm text-emerald-700" role="status">{notice}</p> : null}<div className="mt-6 space-y-3">{cases.length === 0 ? <p className="text-sm text-[var(--muted)]">Chưa có khiếu nại.</p> : cases.map((item) => <article className="border p-4" key={item.id}><strong>{item.id}</strong><span className="float-right">{item.status}</span><p className="mt-2 text-sm">Đơn {item.orderId} · {item.reason}</p><textarea aria-label={`Phản hồi ${item.id}`} className="mt-3 min-h-20 w-full border p-2 text-sm" onChange={(event) => setReplies((values) => ({ ...values, [item.id]: event.target.value }))} value={replies[item.id] ?? ""} /><div className="mt-2 flex gap-2"><button className="rounded bg-[var(--accent)] px-3 py-2 text-sm font-bold text-white" disabled={(replies[item.id]?.trim().length ?? 0) < 3} onClick={() => void reply(item.id)}>Gửi phản hồi</button><label className="cursor-pointer rounded border px-3 py-2 text-sm font-bold">Evidence tùy chọn<input accept="image/*,video/*" className="sr-only" onChange={(event) => void evidence(item.id, event.target.files?.[0])} type="file" /></label></div></article>)}</div></section>;
}
