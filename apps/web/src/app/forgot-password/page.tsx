"use client";
import { useState, type FormEvent } from "react";
import { AuthBody, AuthField, AuthHeader } from "../../features/auth-shell";
import { getSupabaseBrowserClient } from "../../platform/auth/browser";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const redirectTo = `${window.location.origin}/reset-password`;
    await getSupabaseBrowserClient().auth.resetPasswordForEmail(String(data.get("email")).trim(), { redirectTo });
    setMessage("Nếu email tồn tại, REBOX đã gửi liên kết đặt lại mật khẩu.");
  }
  return <><AuthHeader title="Quên mật khẩu" /><AuthBody><form className="absolute left-1/2 top-36 w-full max-w-[400px] -translate-x-1/2 space-y-4 rounded bg-white p-8" onSubmit={submit}><h2 className="text-xl font-bold">Đặt lại mật khẩu</h2><AuthField autoComplete="email" name="email" placeholder="Email" required type="email" /><button className="h-10 w-full bg-[var(--accent-header)] font-bold text-white">GỬI LIÊN KẾT</button>{message ? <p role="status" className="text-sm text-emerald-700">{message}</p> : null}</form></AuthBody></>;
}
