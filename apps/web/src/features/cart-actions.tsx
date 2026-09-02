"use client";

import Link from "next/link";
import { useState } from "react";
import { addCartItem } from "./cart-storage";

export function CartActions({ listingId }: { listingId: string }) {
  const [added, setAdded] = useState(false);

  return (
    <div className="mt-auto grid gap-3 sm:grid-cols-2">
      <button
        className="h-12 rounded-md border border-[var(--accent)] bg-[var(--accent-soft)] font-medium text-[var(--accent-strong)]"
        onClick={() => { addCartItem(listingId); setAdded(true); }}
        type="button"
      >
        {added ? "Đã thêm vào giỏ" : "Thêm vào giỏ hàng"}
      </button>
      <Link
        className="grid h-12 place-items-center rounded-md bg-[var(--accent-strong)] font-medium text-white"
        href={`/checkout?items=${encodeURIComponent(listingId)}`}
      >
        Mua ngay
      </Link>
    </div>
  );
}
