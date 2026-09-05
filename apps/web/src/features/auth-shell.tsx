import Link from "next/link";
import type { ReactNode } from "react";

export function AuthHeader({ title }: { title: string }) {
  return (
    <header className="h-[84px] bg-white px-4 sm:px-6">
      <div className="mx-auto flex h-full w-full max-w-[880px] items-center gap-3">
        <Link aria-label="Về trang chủ" className="grid size-9 shrink-0 place-items-center rounded bg-[var(--accent-header)] text-lg font-bold text-white" href="/">R</Link>
        <Link className="text-[28px] font-bold leading-none" href="/">REBOX</Link>
        <span className="h-[26px] w-px bg-[var(--line)]" />
        <h1 className="whitespace-nowrap text-2xl font-normal">{title}</h1>
        <Link className="ml-auto hidden whitespace-nowrap text-[13px] text-[var(--accent)] hover:underline sm:block" href="/">Bạn cần giúp đỡ?</Link>
      </div>
    </header>
  );
}

export function AuthBody({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-[calc(100vh-84px)] bg-[var(--accent-header)] px-4 sm:px-6">
      <div className="relative mx-auto min-h-[816px] w-full max-w-[1180px] overflow-hidden">
        <div aria-hidden className="absolute left-0 top-[235px] hidden w-[590px] text-center text-[52px] font-bold leading-[58px] text-white lg:block">BANNER</div>
        {children}
      </div>
    </main>
  );
}

export function AuthField({ autoComplete, minLength, name, placeholder, required = false, type = "text" }: { autoComplete: string; minLength?: number; name: string; placeholder: string; required?: boolean; type?: "email" | "password" | "text" }) {
  return (
    <input
      autoComplete={autoComplete}
      className="h-10 w-full border border-[var(--line)] bg-white px-3.5 text-sm outline-none"
      minLength={minLength}
      name={name}
      placeholder={placeholder}
      required={required}
      type={type}
    />
  );
}

export function RememberLogin() {
  return (
    <label className="flex h-[18px] items-center gap-2 text-[13px] text-[var(--muted)]">
      <input className="size-4 accent-[var(--accent)]" type="checkbox" />
      Duy trì đăng nhập
    </label>
  );
}

export function OrDivider() {
  return (
    <div className="flex h-5 items-center gap-2.5 text-xs text-[var(--muted)]">
      <span className="h-px flex-1 bg-[var(--line)]" />
      HOẶC
      <span className="h-px flex-1 bg-[var(--line)]" />
    </div>
  );
}

function SocialButton({ icon, provider }: { icon: string; provider: string }) {
  return (
    <button className="flex h-10 flex-1 items-center justify-center gap-2.5 border border-[var(--line)] bg-white text-sm" type="button">
      <span className="grid size-7 place-items-center rounded-full bg-[var(--accent-header)] font-bold text-white">{icon}</span>
      {provider}
    </button>
  );
}

export function SocialLogin() {
  return (
    <div className="flex gap-2.5">
      <SocialButton icon="f" provider="Facebook" />
      <SocialButton icon="G" provider="Google" />
    </div>
  );
}

export function AuthTerms({ action }: { action: "đăng ký" | "đăng nhập" }) {
  return (
    <p className="text-center text-[11px] leading-[15px] text-[var(--muted)]">
      Bằng việc {action}, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của REBOX.
    </p>
  );
}
