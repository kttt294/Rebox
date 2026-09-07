import { beforeEach, describe, expect, it, vi } from "vitest";
import { addCartItem, readCart, writeCart } from "./cart-storage";

const values = new Map<string, string>();

beforeEach(() => {
  values.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value)
  });
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
});

describe("cart storage", () => {
  it("keeps one quantity-one line per listing", () => {
    writeCart([
      { listingId: "listing-1", quantity: 5 },
      { listingId: "listing-1", quantity: 2 },
      { listingId: "listing-2", quantity: 9 }
    ]);
    addCartItem("listing-1");
    addCartItem("listing-2");

    expect(readCart()).toEqual([
      { listingId: "listing-1", quantity: 1 },
      { listingId: "listing-2", quantity: 1 }
    ]);
  });
});
