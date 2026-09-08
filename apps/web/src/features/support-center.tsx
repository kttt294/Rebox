"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createBrowserApiClient } from "../platform/api/browser";

const api = createBrowserApiClient();

export function SupportCenter() {
  const [notice, setNotice] = useState<string>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const result = await api.createSupportTicket({
        category: String(data.get("category")) as "ORDER" | "DISPUTE" | "ACCOUNT" | "OTHER",
        content: String(data.get("content")),
        ...(data.get("orderId") ? { orderId: String(data.get("orderId")) } : {}),
        ...(data.get("caseId") ? { caseId: String(data.get("caseId")) } : {})
      });
      setNotice(`Đã tạo ticket ${result.id}.`); event.currentTarget.reset();
    } catch { setNotice("Không thể tạo ticket. Hãy đăng nhập và kiểm tra mã đơn/case."); }
  }
  return <main className="mx-auto max-w-2xl p-6"><h1 className="text-2xl font-bold">Hỗ trợ REBOXE</h1><p className="mt-2 text-sm text-[var(--muted)]">Hotline: {process.env.NEXT_PUBLIC_SUPPORT_HOTLINE || "Chưa cấu hình"} · Email: {process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "Chưa cấu hình"}</p><form className="mt-6 space-y-3 rounded border bg-white p-5" onSubmit={submit}><select aria-label="Loại hỗ trợ" className="w-full border p-3" defaultValue="ORDER" name="category"><option value="ORDER">Đơn hàng</option><option value="DISPUTE">Tranh chấp</option><option value="ACCOUNT">Tài khoản</option><option value="OTHER">Khác</option></select><input className="w-full border p-3" name="orderId" placeholder="Mã đơn (không bắt buộc)" /><input className="w-full border p-3" name="caseId" placeholder="Mã case (không bắt buộc)" /><textarea className="min-h-32 w-full border p-3" minLength={10} name="content" placeholder="Nội dung cần hỗ trợ" required /><button className="rounded bg-[var(--accent)] px-5 py-3 font-bold text-white">Gửi yêu cầu</button>{notice ? <p role="status" className="text-sm">{notice}</p> : null}</form></main>;
}

export function AdminSupportQueue() {
  const [items, setItems] = useState<Array<{ id: string; category: string; status: string }>>([]);
  const [error, setError] = useState<string>();
  useEffect(() => { void api.listSupportQueue().then(setItems).catch(() => setError("Cần quyền SUPPORT và MFA/AAL2.")); }, []);
  async function resolve(id: string) {
    await api.replySupportTicket(id, "Đã xử lý ticket synthetic theo quy trình hỗ trợ.", "RESOLVED");
    setItems((rows) => rows.map((row) => row.id === id ? { ...row, status: "RESOLVED" } : row));
  }
  return <main className="mx-auto max-w-4xl p-6"><h1 className="text-2xl font-bold">Hàng đợi hỗ trợ</h1>{error ? <p className="mt-4 text-red-700">{error}</p> : <div className="mt-6 space-y-3">{items.map((item) => <article className="border bg-white p-4" key={item.id}><strong>{item.id}</strong><span className="float-right">{item.status}</span><p className="mt-2 text-sm">{item.category}</p>{item.status !== "RESOLVED" ? <button className="mt-3 rounded bg-[var(--accent)] px-3 py-2 text-sm font-bold text-white" onClick={() => void resolve(item.id)}>Phản hồi và đóng</button> : null}</article>)}</div>}</main>;
}
