import Link from "next/link";

export default function NotFoundPage() {
  return <main className="mx-auto max-w-xl px-5 py-24 text-center"><h1 className="text-4xl font-black">Không tìm thấy listing</h1><p className="mt-3 text-[var(--muted)]">Listing có thể chưa được đăng công khai hoặc đã được gỡ.</p><Link className="mt-7 inline-block rounded-full bg-[var(--ink)] px-5 py-3 font-bold text-white" href="/">Về trang chủ</Link></main>;
}
