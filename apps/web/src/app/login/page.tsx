"use client";

import { useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "../../platform/auth/browser";

export default function LoginPage() {
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(undefined);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const { error } = await getSupabaseBrowserClient().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    window.location.assign("/seller");
  }

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <section className="rounded-3xl border border-[var(--line)] bg-white p-7 shadow-sm">
        <h1 className="text-3xl font-black">Đăng nhập</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Phiên đăng nhập do Supabase Auth quản lý.</p>
        <form className="mt-7 grid gap-4" onSubmit={submit}>
          <label className="grid gap-2 font-semibold">Email<input className="rounded-xl border border-[var(--line)] px-4 py-3" name="email" type="email" required /></label>
          <label className="grid gap-2 font-semibold">Mật khẩu<input className="rounded-xl border border-[var(--line)] px-4 py-3" name="password" type="password" required /></label>
          {message ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{message}</p> : null}
          <button className="rounded-xl bg-[var(--accent)] px-4 py-3 font-bold text-white disabled:opacity-60" disabled={loading}>
            {loading ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>
      </section>
    </main>
  );
}
