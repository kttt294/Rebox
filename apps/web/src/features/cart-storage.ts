export type CartLine = { listingId: string; quantity: number };

const cartStorageKey = "rebox.cart.v1";

export function readCart(): CartLine[] {
  try {
    const value = JSON.parse(localStorage.getItem(cartStorageKey) ?? "[]") as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((line): line is CartLine => {
      if (typeof line !== "object" || line === null) return false;
      const candidate = line as Partial<CartLine>;
      return typeof candidate.listingId === "string"
        && Number.isInteger(candidate.quantity)
        && (candidate.quantity ?? 0) > 0;
    });
  } catch {
    return [];
  }
}

export function writeCart(lines: CartLine[]): void {
  localStorage.setItem(cartStorageKey, JSON.stringify(lines));
  window.dispatchEvent(new Event("rebox-cart-changed"));
}

export function addCartItem(listingId: string): void {
  const lines = readCart();
  const existing = lines.find((line) => line.listingId === listingId);
  if (existing) existing.quantity += 1;
  else lines.push({ listingId, quantity: 1 });
  writeCart(lines);
}
