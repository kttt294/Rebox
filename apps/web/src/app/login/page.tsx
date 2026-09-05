"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthBody, AuthField, AuthHeader, AuthTerms, OrDivider, RememberLogin, SocialLogin } from "../../features/auth-shell";
import { getSupabaseBrowserClient } from "../../platform/auth/browser";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(undefined);

    try {
      const { error: authError } = await getSupabaseBrowserClient().auth.signInWithPassword({
        email: String(data.get("email")).trim(),
        password: String(data.get("password"))
      });
      if (authError) {
        setError("Email hoặc mật khẩu không đúng.");
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next === "/seller/onboarding" ? next : "/");
    } catch {
      setError("Không thể kết nối dịch vụ đăng nhập. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-[var(--paper)]">
      <AuthHeader title="Đăng nhập" />
      <AuthBody>
        <form className="absolute left-1/2 top-[140px] flex h-[536px] w-full max-w-[400px] -translate-x-1/2 flex-col gap-3 overflow-hidden rounded bg-white px-[30px] py-6 lg:left-[750px] lg:translate-x-0" onSubmit={login}>
          <div className="flex h-[58px] items-center gap-2">
            <h2 className="text-[22px] font-normal">Đăng nhập</h2>
          </div>
          <AuthField autoComplete="email" name="email" placeholder="Email" required type="email" />
          <AuthField autoComplete="current-password" name="password" placeholder="Mật khẩu" required type="password" />
          <div className="flex h-[18px] justify-end"><button className="text-[13px] text-[var(--accent)] hover:underline" type="button">Quên mật khẩu?</button></div>
          <button aria-busy={submitting} className="h-10 w-full bg-[var(--accent-header)] text-sm font-bold text-white hover:bg-[var(--accent-strong)] disabled:cursor-wait disabled:opacity-60" disabled={submitting} type="submit">
            {submitting ? "ĐANG ĐĂNG NHẬP..." : "ĐĂNG NHẬP"}
          </button>
          {error ? <p className="text-center text-sm text-red-600" role="alert">{error}</p> : null}
          <RememberLogin />
          <OrDivider />
          <SocialLogin />
          <AuthTerms action="đăng nhập" />
          <p className="text-center text-[13px] text-[var(--muted)]">Bạn mới biết đến REBOX? <Link className="ml-1 text-[var(--accent)] hover:underline" href="/register">Đăng ký</Link></p>
        </form>
      </AuthBody>
    </div>
  );
}
