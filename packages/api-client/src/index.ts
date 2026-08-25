import type {
  ActorContext,
  CreateListingInput,
  CreateShopInput,
  ErrorResponse,
  Listing
} from "@rebox/shared";

export type { paths } from "./generated";

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type ApiClientOptions = {
  baseUrl: string;
  getAccessToken?: () => Promise<string | null>;
};

export function createApiClient(options: ApiClientOptions) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await options.getAccessToken?.();
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    headers.set("x-request-id", crypto.randomUUID());
    if (init.body) {
      headers.set("content-type", "application/json");
    }
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${options.baseUrl}${path}`, { ...init, headers });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ErrorResponse | null;
      throw new ApiClientError(
        response.status,
        body?.error.code ?? "HTTP_ERROR",
        body?.error.message ?? `Request failed with status ${response.status}`,
        body?.error.requestId
      );
    }
    return (await response.json()) as T;
  }

  return {
    getMe: () => request<ActorContext>("/v1/me"),
    createShop: (input: CreateShopInput) =>
      request<{ shopId: string }>("/v1/shops", { method: "POST", body: JSON.stringify(input) }),
    listShopListings: (shopId: string) => request<Listing[]>(`/v1/shops/${encodeURIComponent(shopId)}/listings`),
    createListing: (shopId: string, input: CreateListingInput) =>
      request<Listing>(`/v1/shops/${encodeURIComponent(shopId)}/listings`, {
        method: "POST",
        body: JSON.stringify(input)
      }),
    publishListing: (shopId: string, listingId: string) =>
      request<Listing>(
        `/v1/shops/${encodeURIComponent(shopId)}/listings/${encodeURIComponent(listingId)}/publish`,
        { method: "POST" }
      ),
    getPublicListing: (listingId: string) => request<Listing>(`/v1/listings/${encodeURIComponent(listingId)}`)
  };
}
