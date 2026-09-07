"use client";
import { useState, type FormEvent } from "react";
import { AuthBody, AuthField, AuthHeader } from "../../features/auth-shell";
import { getSupabaseBrowserClient } from "../../platform/auth/browser";

export default function ResetPasswordPage() {
  const [message, setMessage] = useState<string>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const password = String(data.get("password"));
    const { error } = await getSupabaseBrowserClient().auth.updateUser({ password });
    setMessage(error ? error.message : "Đã đặt lại mật khẩu. Bạn có thể đăng nhập.");
  }
  return <><AuthHeader title="Đặt lại mật khẩu" /><AuthBody><form className="absolute left-1/2 top-36 w-full max-w-[400px] -translate-x-1/2 space-y-4 rounded bg-white p-8" onSubmit={submit}><h2 className="text-xl font-bold">Mật khẩu mới</h2><AuthField autoComplete="new-password" minLength={8} name="password" placeholder="Ít nhất 8 ký tự" required type="password" /><button className="h-10 w-full bg-[var(--accent-header)] font-bold text-white">XÁC NHẬN</button>{message ? <p role="status" className="text-sm">{message}</p> : null}</form></AuthBody></>;
}
