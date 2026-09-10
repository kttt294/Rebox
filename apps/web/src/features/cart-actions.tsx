"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowserClient } from "../platform/auth/browser";
import { addCartItem } from "./cart-storage";

export function CartActions({ listingId, available = true }: { listingId: string; available?: boolean }) {
  const [added, setAdded] = useState(false);
  const router = useRouter();

  async function addToCart() {
    const { data } = await getSupabaseBrowserClient().auth.getSession();
    if (!data.session) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    addCartItem(listingId);
    setAdded(true);
  }

  return (
    <div className="mt-auto grid gap-3 sm:grid-cols-2">
      <button
        className="h-12 rounded-md border border-[var(--accent)] bg-[var(--accent-soft)] font-medium text-[var(--accent-strong)] disabled:opacity-50"
        disabled={!available}
        onClick={() => void addToCart()}
        type="button"
      >
        {added ? "Đã thêm vào giỏ" : "Thêm vào giỏ hàng"}
      </button>
      {available ? <Link className="grid h-12 place-items-center rounded-md bg-[var(--accent-strong)] font-medium text-white" href={`/checkout?items=${encodeURIComponent(listingId)}`}>Mua ngay</Link> : <span className="grid h-12 place-items-center rounded-md bg-slate-300 font-medium text-slate-600">Đã hết hàng</span>}
    </div>
  );
}
