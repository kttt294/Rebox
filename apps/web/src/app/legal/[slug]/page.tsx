import { notFound } from "next/navigation";
import { createPublicApiClient } from "../../../platform/api/server";

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let artifact: { title: string; body: string; version: string; effectiveAt: string };
  try { artifact = await createPublicApiClient().getLegalArtifact(slug); } catch { notFound(); }
  return <main className="mx-auto max-w-3xl px-5 py-14"><h1 className="text-3xl font-black">{artifact.title}</h1><p className="mt-2 text-sm text-[var(--muted)]">Phiên bản {artifact.version} · hiệu lực {new Date(artifact.effectiveAt).toLocaleDateString("vi-VN")}</p><p className="mt-8 whitespace-pre-wrap leading-7">{artifact.body}</p></main>;
}
