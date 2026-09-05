"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../platform/auth/browser";

function UtilityNavigation({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => { subscription.unsubscribe(); };
  }, []);

  async function logout() {
    await getSupabaseBrowserClient().auth.signOut();
    router.replace("/");
  }

  return (
    <div className={`rebox-container flex h-[30px] items-center justify-between gap-6 overflow-hidden text-white/95 ${compact ? "text-[13px]" : "text-sm"}`}>
      <p className="hidden whitespace-nowrap sm:block">
        <Link className="hover:underline" href="/seller/onboarding">Kênh Người Bán</Link>
        &nbsp;&nbsp; | &nbsp;&nbsp;Trở thành đối tác REBOX&nbsp;&nbsp; | &nbsp;&nbsp;Tải ứng dụng
      </p>
      <p className="ml-auto whitespace-nowrap">
        Thông báo&nbsp;&nbsp; Hỗ trợ&nbsp;&nbsp; Tiếng Việt&nbsp;&nbsp; | &nbsp;&nbsp;
        {email ? (
          <>
            <Link className="opacity-90 hover:underline" href="/account/profile">{email.split("@")[0]}</Link>
            &nbsp;&nbsp; | &nbsp;&nbsp;
            <button className="hover:underline" onClick={logout} type="button">Đăng xuất</button>
          </>
        ) : (
          <>
            <Link className="hover:underline" href="/register">Đăng ký</Link>
            &nbsp;&nbsp; | &nbsp;&nbsp;
            <Link className="hover:underline" href="/login">Đăng nhập</Link>
          </>
        )}
      </p>
    </div>
  );
}

function ReboxBrand({ section }: { section?: string | undefined }) {
  return (
    <Link className={`flex h-12 shrink-0 items-center gap-2.5 text-white ${section ? "w-[300px] gap-3" : "w-[210px]"}`} href="/">
      <Image alt="" aria-hidden height={38} src="/rebox/logo-mark.svg" width={38} />
      <strong className="text-[30px] leading-none">REBOX</strong>
      {section ? <span className="h-8 w-px bg-white/90" /> : null}
      {section ? <span className="whitespace-nowrap text-[22px] leading-[30px]">{section}</span> : null}
    </Link>
  );
}

function SearchField({ className = "", placeholder = "Tìm kiếm sản phẩm hoàn, đồ mới giá tốt..." }: { className?: string; placeholder?: string | undefined }) {
  return (
    <form action="/search" className={`flex h-12 min-w-0 items-center overflow-hidden rounded-md bg-white pl-[18px] pr-1 ${className}`} role="search">
      <input aria-label="Tìm kiếm sản phẩm" className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm outline-none focus:outline-none" name="q" placeholder={placeholder} type="search" />
      <button aria-label="Tìm kiếm" className="flex h-10 w-[60px] shrink-0 items-center justify-center rounded-[5px] bg-[var(--accent-strong)]" type="submit">
        <Image alt="" aria-hidden height={22} src="/rebox/search.svg" width={22} />
      </button>
    </form>
  );
}

function MarketplaceHeader({ cart = false, shop = false }: { cart?: boolean; shop?: boolean }) {
  return (
    <header className="relative z-40 min-h-[132px] bg-[var(--accent-header)] px-4 pt-2.5 text-white sm:px-6 xl:h-[132px] xl:overflow-hidden xl:px-0">
      <UtilityNavigation />
      <div className="rebox-container mt-2 flex min-h-16 flex-wrap items-center gap-x-7 gap-y-3 pb-4 xl:h-16 xl:flex-nowrap xl:pb-0">
        <ReboxBrand section={cart ? "Giỏ Hàng" : undefined} />
        <SearchField className={`order-3 w-full xl:order-none ${cart ? "xl:flex-1" : "xl:w-[900px] xl:flex-none"}`} placeholder={shop ? "Tìm sản phẩm trong cửa hàng..." : undefined} />
        {!cart ? (
          <Link aria-label="Mở giỏ hàng" className="ml-auto flex size-[34px] shrink-0 items-center justify-center xl:ml-0" href="/cart">
            <Image alt="" aria-hidden height={34} src="/rebox/cart.svg" width={34} />
          </Link>
        ) : null}
      </div>
    </header>
  );
}

function CheckoutHeader() {
  return (
    <header className="relative z-40">
      <div className="flex h-9 items-center bg-[var(--accent-header)] px-4 sm:px-6 xl:px-0"><UtilityNavigation compact /></div>
      <div className="h-24 bg-white px-4 sm:px-6 xl:px-0">
        <div className="rebox-container flex h-full items-center">
          <Link className="flex items-center gap-3" href="/">
            <span className="grid size-[38px] place-items-center rounded-lg bg-[var(--accent-header)] text-[22px] font-bold text-white">R</span>
            <strong className="text-[30px] leading-none text-[var(--accent)]">REBOX</strong>
          </Link>
          <span className="mx-[18px] h-[34px] w-px bg-[var(--line)]" />
          <span className="text-[22px] text-[var(--accent)]">Thanh Toán</span>
        </div>
      </div>
    </header>
  );
}

function AccountHeader() {
  return (
    <header className="relative z-40 h-[120px] bg-[var(--accent-header)] px-4 py-1.5 text-white sm:px-6 xl:px-0">
      <div className="mx-auto w-full max-w-[940px]">
        <div className="flex h-6 items-center justify-between gap-6 overflow-hidden whitespace-nowrap text-xs text-white/95">
          <p>Kênh Người Bán&nbsp;&nbsp; | &nbsp;&nbsp;Tải ứng dụng&nbsp;&nbsp; | &nbsp;&nbsp;Kết nối</p>
          <p className="ml-auto">Thông Báo&nbsp;&nbsp; Hỗ Trợ&nbsp;&nbsp; Tiếng Việt&nbsp;&nbsp; | &nbsp;&nbsp;<Link className="hover:underline" href="/account/profile">Tài khoản</Link></p>
        </div>
        <div className="mt-1 flex h-14 items-center gap-[18px]">
          <Link className="flex h-11 w-40 shrink-0 items-center gap-2.5 text-white" href="/">
            <Image alt="" aria-hidden height={38} src="/rebox/logo-mark.svg" width={38} />
            <strong className="text-[27px] leading-none">REBOX</strong>
          </Link>
          <SearchField className="h-[42px] flex-1 rounded-none lg:w-[650px] lg:flex-none" />
          <Link aria-label="Mở giỏ hàng" className="grid size-[30px] shrink-0 place-items-center" href="/cart">
            <Image alt="" aria-hidden height={30} src="/rebox/cart.svg" width={30} />
          </Link>
        </div>
      </div>
    </header>
  );
}

function SellerUtilityGrid() {
  return (
    <span aria-hidden className="grid size-4 grid-cols-3 gap-[2px]">
      {Array.from({ length: 9 }, (_, index) => <span className="rounded-[1px] bg-[#66758b]" key={index} />)}
    </span>
  );
}

function SellerGuideIcon() {
  return (
    <span aria-hidden className="relative block size-4">
      <span className="absolute left-0 top-[2px] h-[12px] w-[5px] rounded-[1px] border border-[#66758b]" />
      <span className="absolute right-0 top-[2px] h-[12px] w-[8px] rounded-[1px] border border-[#66758b]" />
    </span>
  );
}

function SellerHeader() {
  return (
    <header className="relative z-40 h-[52px] border-b border-[#eef2f7] bg-white">
      <div className="flex h-full items-center px-4">
        <Link aria-label="REBOX" className="grid size-7 shrink-0 place-items-center rounded-[5px] bg-[var(--accent)] text-[13px] font-bold text-white" href="/">R</Link>
        <Link className="ml-3 text-[13px] text-[var(--muted)]" href="/">Trang chủ</Link>
        <span className="mx-1.5 text-[17px] text-[var(--muted)]">›</span>
        <span className="text-[13px] font-medium text-[var(--ink)]">Kênh người bán</span>

        <div className="ml-auto flex items-center gap-[22px] text-[var(--muted)]">
          <SellerUtilityGrid />
          <SellerGuideIcon />
          <span className="h-6 w-px bg-[var(--accent-soft)]" />
          <span className="relative grid size-6 place-items-center overflow-hidden rounded-full text-[10px] font-bold text-[var(--accent)]">
            <Image alt="Tài khoản người bán" fill sizes="24px" src="/rebox/seller-avatar.svg" />
            <span className="relative">R</span>
          </span>
        </div>
      </div>
    </header>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname === "/checkout") return <CheckoutHeader />;
  if (pathname === "/cart") return <MarketplaceHeader cart />;
  if (pathname.startsWith("/account/")) return <AccountHeader />;
  if (pathname === "/" || pathname.startsWith("/listings/") || pathname === "/search") return <MarketplaceHeader />;
  if (pathname.startsWith("/shops/")) return <MarketplaceHeader shop />;
  if (pathname.startsWith("/seller/")) return <SellerHeader />;
  return null;
}
