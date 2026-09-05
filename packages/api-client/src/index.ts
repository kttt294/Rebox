import type {
  AdminKycQueue, AdminKycDetail, KycDecisionInput, KycDecisionResult,
  ActorContext,
  CatalogImageUploadIntent,
  Category,
  CommitReturnManifestResult,
  CreateListingInput,
  CreateShopInput,
  ErrorResponse,
  Listing,
  KycStatusResponse,
  PublicListing,
  PublicListingPage,
  PublicListingsQuery,
  PublishListingResult,
  ReturnManifestPreview,
  SellerDocumentKind,
  UpdateListingDraftInput
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
    if (init.body && !(init.body instanceof FormData)) {
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
    listCategories: () => request<Category[]>("/v1/categories", { cache: "no-store" }),
    getMe: () => request<ActorContext>("/v1/me", { cache: "no-store" }),
    listKycReviews: (cursor?: string) => request<AdminKycQueue>(
      `/v1/admin/kyc?status=MANUAL_REVIEW${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`, { cache: "no-store" }),
    getKycReview: (id: string) => request<AdminKycDetail>(`/v1/admin/kyc/${encodeURIComponent(id)}`, { cache: "no-store" }),
    decideKycReview: (id: string, input: KycDecisionInput, key: string) => request<KycDecisionResult>(
      `/v1/admin/kyc/${encodeURIComponent(id)}/decision`, {
        method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify(input)
      }),
    createShop: (input: CreateShopInput) =>
      request<{ shopId: string }>("/v1/shops", { method: "POST", body: JSON.stringify(input) }),
    startKyc: (shopId: string) =>
      request<KycStatusResponse & { id: string }>("/v1/kyc/start", {
        method: "POST", body: JSON.stringify({ shopId })
      }),
    submitKycDocument: (side: "front" | "back", kycId: string, objectKey: string) =>
      request<KycStatusResponse>(`/v1/kyc/document/${side}`, {
        method: "POST", body: JSON.stringify({ kycId, objectKey })
      }),
    submitKycSelfie: (kycId: string, objectKey: string) =>
      request<KycStatusResponse>("/v1/kyc/selfie", {
        method: "POST", body: JSON.stringify({ kycId, objectKey })
      }),
    submitKycTax: (kycId: string, taxCode: string) =>
      request<KycStatusResponse>("/v1/kyc/tax", {
        method: "POST", body: JSON.stringify({ kycId, taxCode })
      }),
    submitKycBank: (kycId: string, bankCode: string, accountNumber: string) =>
      request<KycStatusResponse>("/v1/kyc/bank", {
        method: "POST", body: JSON.stringify({ kycId, bankCode, accountNumber })
      }),
    getKycStatus: (kycId: string) =>
      request<KycStatusResponse>(`/v1/kyc/${encodeURIComponent(kycId)}/status`, { cache: "no-store" }),
    uploadSellerDocument: async (kind: SellerDocumentKind, file: Blob) => {
      const intent = await request<CatalogImageUploadIntent>("/v1/seller-onboarding/uploads", {
        method: "POST",
        body: JSON.stringify({ kind, mimeType: file.type, sizeBytes: file.size })
      });
      const upload = await fetch(intent.uploadUrl, { method: "PUT", headers: intent.headers, body: file });
      if (!upload.ok) {
        throw new ApiClientError(upload.status, "SELLER_DOCUMENT_UPLOAD_FAILED", "Seller document upload failed");
      }
      return intent.key;
    },
    listShopListings: (shopId: string) => request<Listing[]>(`/v1/shops/${encodeURIComponent(shopId)}/listings`),
    createListing: (shopId: string, input: CreateListingInput) =>
      request<Listing>(`/v1/shops/${encodeURIComponent(shopId)}/listings`, {
        method: "POST",
        body: JSON.stringify(input)
      }),
    previewReturnManifest: (shopId: string, file: File) => {
      const body = new FormData();
      body.set("file", file);
      return request<ReturnManifestPreview>(
        `/v1/shops/${encodeURIComponent(shopId)}/return-imports/preview`,
        { method: "POST", body }
      );
    },
    commitReturnManifest: (shopId: string, batchId: string, idempotencyKey: string) =>
      request<CommitReturnManifestResult>(
        `/v1/shops/${encodeURIComponent(shopId)}/return-imports/${encodeURIComponent(batchId)}/commit`,
        { method: "POST", body: JSON.stringify({ idempotencyKey }) }
      ),
    updateListingDraft: (shopId: string, listingId: string, input: UpdateListingDraftInput) =>
      request<Listing>(
        `/v1/shops/${encodeURIComponent(shopId)}/listings/${encodeURIComponent(listingId)}`,
        { method: "PATCH", body: JSON.stringify(input) }
      ),
    createCatalogImageUploadIntent: (shopId: string, listingId: string, file: Blob) =>
      request<CatalogImageUploadIntent>(
        `/v1/shops/${encodeURIComponent(shopId)}/listings/${encodeURIComponent(listingId)}/images/init`,
        { method: "POST", body: JSON.stringify({ mimeType: file.type, sizeBytes: file.size }) }
      ),
    completeCatalogImageUpload: (shopId: string, listingId: string, key: string) =>
      request<Listing>(
        `/v1/shops/${encodeURIComponent(shopId)}/listings/${encodeURIComponent(listingId)}/images/complete`,
        { method: "POST", body: JSON.stringify({ key }) }
      ),
    uploadCatalogImage: async (shopId: string, listingId: string, file: Blob) => {
      const path = `/v1/shops/${encodeURIComponent(shopId)}/listings/${encodeURIComponent(listingId)}`;
      const intent = await request<CatalogImageUploadIntent>(`${path}/images/init`, {
        method: "POST",
        body: JSON.stringify({ mimeType: file.type, sizeBytes: file.size })
      });
      const upload = await fetch(intent.uploadUrl, { method: "PUT", headers: intent.headers, body: file });
      if (!upload.ok) {
        throw new ApiClientError(upload.status, "CATALOG_UPLOAD_FAILED", "Catalog image upload failed");
      }
      return request<Listing>(`${path}/images/complete`, {
        method: "POST",
        body: JSON.stringify({ key: intent.key })
      });
    },
    publishListing: (shopId: string, listingId: string) =>
      request<PublishListingResult>(
        `/v1/shops/${encodeURIComponent(shopId)}/listings/${encodeURIComponent(listingId)}/publish`,
        { method: "POST" }
      ),
    listPublicListings: (query: Partial<PublicListingsQuery> = {}) => {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value) search.set(key, value);
      }
      const suffix = search.size ? `?${search}` : "";
      return request<PublicListingPage>(`/v1/listings${suffix}`, { cache: "no-store" });
    },
    getPublicListing: (listingId: string) => request<PublicListing>(`/v1/listings/${encodeURIComponent(listingId)}`)
  };
}
