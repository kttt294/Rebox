import Link from "next/link";
import { AuthBody, AuthField, AuthHeader, AuthSubmitButton, AuthTerms, OrDivider, RememberLogin, SocialLogin } from "../../features/auth-shell";

export default function RegisterPage() {
  return (
    <div className="bg-white">
      <AuthHeader title="Đăng ký" />
      <AuthBody>
        <section className="absolute left-1/2 top-[157px] flex h-[482px] w-full max-w-[400px] -translate-x-1/2 flex-col gap-3.5 overflow-hidden rounded bg-white px-[30px] pb-6 pt-[26px] lg:left-[746px] lg:translate-x-0">
          <div className="flex h-11 items-center"><h2 className="text-[22px] font-normal">Đăng ký</h2></div>
          <AuthField autoComplete="email" name="contact" placeholder="Số điện thoại hoặc email" />
          <AuthSubmitButton>TIẾP TỤC</AuthSubmitButton>
          <RememberLogin />
          <OrDivider />
          <SocialLogin />
          <AuthTerms action="đăng ký" />
          <p className="text-center text-[13px] text-[var(--muted)]">Bạn đã có tài khoản? <Link className="ml-1 text-[var(--accent)] hover:underline" href="/login">Đăng nhập</Link></p>
        </section>
      </AuthBody>
    </div>
  );
}
