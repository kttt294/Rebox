import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto grid min-h-[75vh] max-w-6xl place-items-center px-5 py-16">
      <section className="max-w-3xl text-center">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Hàng hoàn, cơ hội mới</p>
        <h1 className="text-5xl font-black leading-tight sm:text-7xl">Món hàng tốt không nên bị bỏ quên.</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
          REBOX giúp shop đăng bán minh bạch hàng hoàn và giúp người mua tìm được sản phẩm phù hợp với mức giá dễ tiếp cận.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link className="rounded-full bg-[var(--accent)] px-6 py-3 font-bold text-white" href="/seller">Bắt đầu đăng bán</Link>
          <Link className="rounded-full border border-[var(--line)] bg-white px-6 py-3 font-bold" href="/login">Đăng nhập</Link>
        </div>
      </section>
    </main>
  );
}
