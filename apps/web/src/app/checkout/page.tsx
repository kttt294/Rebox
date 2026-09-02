import { CheckoutPreview } from "../../features/checkout-preview";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ items?: string }> }) {
  const { items = "" } = await searchParams;
  const listingIds = items.split(",").map((id) => id.trim()).filter(Boolean);

  return <CheckoutPreview listingIds={listingIds} />;
}
