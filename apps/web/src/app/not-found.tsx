import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="text-4xl font-bold">Không tìm thấy listing</h1>
      <p className="mt-3 text-[var(--muted)]">Listing có thể chưa được đăng công khai hoặc đã được gỡ.</p>
      <Link className="mt-7 inline-block rounded-md bg-[var(--accent-strong)] px-5 py-3 font-medium text-white" href="/">Về trang chủ</Link>
    </main>
  );
}
