export type CartLine = { listingId: string; quantity: number };

const cartStorageKey = "reboxe.cart.v1";

function normalizeCart(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  const listingIds = new Set<string>();

  for (const line of value) {
    if (typeof line !== "object" || line === null) continue;
    const listingId = (line as Partial<CartLine>).listingId?.trim();
    if (listingId) listingIds.add(listingId);
  }

  return [...listingIds].map((listingId) => ({ listingId, quantity: 1 }));
}

export function readCart(): CartLine[] {
  try {
    const value = JSON.parse(localStorage.getItem(cartStorageKey) ?? "[]") as unknown;
    return normalizeCart(value);
  } catch {
    return [];
  }
}

export function writeCart(lines: CartLine[]): void {
  localStorage.setItem(cartStorageKey, JSON.stringify(normalizeCart(lines)));
  window.dispatchEvent(new Event("reboxe-cart-changed"));
}

export function addCartItem(listingId: string): void {
  const lines = readCart();
  if (!lines.some((line) => line.listingId === listingId)) lines.push({ listingId, quantity: 1 });
  writeCart(lines);
}
