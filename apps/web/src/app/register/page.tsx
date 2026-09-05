"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthBody, AuthField, AuthHeader, AuthTerms, OrDivider, SocialLogin } from "../../features/auth-shell";
import { getSupabaseBrowserClient } from "../../platform/auth/browser";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const data = new FormData(event.currentTarget);
    const password = String(data.get("password"));
    if (password !== String(data.get("confirmPassword"))) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }

    setSubmitting(true);
    setError(undefined);
    setSuccess(undefined);

    try {
      const next = new URLSearchParams(window.location.search).get("next");
      const { data: authData, error: authError } = await getSupabaseBrowserClient().auth.signUp({
        email: String(data.get("email")).trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login${next === "/seller/onboarding" ? "?next=/seller/onboarding" : ""}`
        }
      });
      if (authError) {
        setError("Không thể tạo tài khoản. Email có thể đã được sử dụng.");
        return;
      }
      if (!authData.session) {
        setSuccess("Tài khoản đã được tạo. Hãy kiểm tra email để xác nhận.");
        return;
      }
      router.replace(next === "/seller/onboarding" ? next : "/");
    } catch {
      setError("Không thể kết nối dịch vụ đăng ký. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white">
      <AuthHeader title="Đăng ký" />
      <AuthBody>
        <form className="absolute left-1/2 top-[115px] flex min-h-[586px] w-full max-w-[400px] -translate-x-1/2 flex-col gap-3.5 overflow-hidden rounded bg-white px-[30px] pb-6 pt-[26px] lg:left-[746px] lg:translate-x-0" onSubmit={register}>
          <div className="flex h-11 items-center"><h2 className="text-[22px] font-normal">Đăng ký</h2></div>
          <AuthField autoComplete="email" name="email" placeholder="Email" required type="email" />
          <AuthField autoComplete="new-password" minLength={8} name="password" placeholder="Mật khẩu (ít nhất 8 ký tự)" required type="password" />
          <AuthField autoComplete="new-password" minLength={8} name="confirmPassword" placeholder="Nhập lại mật khẩu" required type="password" />
          <button aria-busy={submitting} className="h-10 w-full bg-[var(--accent-header)] text-sm font-bold text-white hover:bg-[var(--accent-strong)] disabled:cursor-wait disabled:opacity-60" disabled={submitting} type="submit">
            {submitting ? "ĐANG TẠO TÀI KHOẢN..." : "ĐĂNG KÝ"}
          </button>
          {error ? <p className="text-center text-sm text-red-600" role="alert">{error}</p> : null}
          {success ? <p className="text-center text-sm text-emerald-700" role="status">{success}</p> : null}
          <OrDivider />
          <SocialLogin />
          <AuthTerms action="đăng ký" />
          <p className="text-center text-[13px] text-[var(--muted)]">Bạn đã có tài khoản? <Link className="ml-1 text-[var(--accent)] hover:underline" href="/login">Đăng nhập</Link></p>
        </form>
      </AuthBody>
    </div>
  );
}
