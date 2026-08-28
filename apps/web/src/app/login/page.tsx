import Link from "next/link";
import { AuthBody, AuthField, AuthHeader, AuthSubmitButton, AuthTerms, OrDivider, RememberLogin, SocialLogin } from "../../features/auth-shell";

export default function LoginPage() {
  return (
    <div className="bg-[var(--paper)]">
      <AuthHeader title="Đăng nhập" />
      <AuthBody>
        <section className="absolute left-1/2 top-[140px] flex h-[536px] w-full max-w-[400px] -translate-x-1/2 flex-col gap-3 overflow-hidden rounded bg-white px-[30px] py-6 lg:left-[750px] lg:translate-x-0">
          <div className="flex h-[58px] items-center gap-2">
            <h2 className="text-[22px] font-normal">Đăng nhập</h2>
          </div>
          <AuthField autoComplete="username" name="identity" placeholder="Email/Số điện thoại/Tên đăng nhập" />
          <AuthField autoComplete="current-password" name="password" placeholder="Mật khẩu" type="password" />
          <div className="flex h-[18px] justify-end"><button className="text-[13px] text-[var(--accent)] hover:underline" type="button">Quên mật khẩu?</button></div>
          <AuthSubmitButton>ĐĂNG NHẬP</AuthSubmitButton>
          <RememberLogin />
          <OrDivider />
          <SocialLogin />
          <AuthTerms action="đăng nhập" />
          <p className="text-center text-[13px] text-[var(--muted)]">Bạn mới biết đến REBOX? <Link className="ml-1 text-[var(--accent)] hover:underline" href="/register">Đăng ký</Link></p>
        </section>
      </AuthBody>
    </div>
  );
}
