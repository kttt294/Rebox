import { ApiClientError } from "@rebox/api-client";
import { notFound } from "next/navigation";
import { createPublicApiClient } from "../../../../platform/api/server";

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let listing;
  try {
    listing = await createPublicApiClient().getPublicListing(id);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) notFound();
    throw error;
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <article className="grid gap-8 rounded-3xl border border-[var(--line)] bg-white p-7 md:grid-cols-[1fr_1.1fr]">
        <div className="grid min-h-80 place-items-center rounded-2xl bg-[#eef1eb] text-sm font-semibold text-[var(--muted)]">Ảnh catalog sẽ có ở Sprint 2</div>
        <div><p className="text-sm font-bold text-[var(--accent)]">{listing.shopDisplayName}</p><h1 className="mt-3 text-4xl font-black">{listing.title}</h1><p className="mt-6 text-3xl font-black">{listing.price.toLocaleString("vi-VN")}đ</p><dl className="mt-8 grid gap-3 border-t border-[var(--line)] pt-6"><div><dt className="text-sm text-[var(--muted)]">Tình trạng</dt><dd className="font-bold">{listing.conditionGrade}</dd></div><div><dt className="text-sm text-[var(--muted)]">Mô tả trung thực</dt><dd>{listing.conditionNotes}</dd></div>{listing.description ? <div><dt className="text-sm text-[var(--muted)]">Chi tiết</dt><dd>{listing.description}</dd></div> : null}</dl></div>
      </article>
    </main>
  );
}
