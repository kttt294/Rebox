import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { DomainError, type InventoryModule } from "@rebox/backend";
import {
  completeCatalogImageUploadSchema,
  commitReturnManifestSchema,
  createCatalogImageUploadSchema,
  createListingSchema,
  type CatalogImageUploadIntent,
  type Category,
  type CommitReturnManifestResult,
  type Listing,
  type PublicListing,
  type PublicListingPage,
  type PublishListingResult,
  type ReturnManifestPreview,
  maxReturnManifestFileBytes,
  publicListingsQuerySchema,
  updateListingDraftSchema
} from "@rebox/shared";
import { INVENTORY } from "../../backend.providers";
import { CurrentActor } from "../decorators/current-actor";
import { Public } from "../decorators/public";
import type { Actor } from "../types/authenticated-request";

type UploadedManifestFile = {
  originalname: string;
  buffer: Buffer;
};

@Controller("v1")
export class ListingsController {
  constructor(@Inject(INVENTORY) private readonly inventory: InventoryModule) {}

  @Public()
  @Get("categories")
  listCategories(): Promise<Category[]> {
    return this.inventory.listCategories();
  }

  @Post("shops/:shopId/listings")
  createDraft(
    @CurrentActor() actor: Actor,
    @Param("shopId") shopId: string,
    @Body() body: unknown
  ): Promise<Listing> {
    const parsed = createListingSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainError("VALIDATION_FAILED", 422, parsed.error.issues[0]?.message ?? "Invalid listing");
    }
    return this.inventory.createDraft(actor.id, shopId, parsed.data);
  }

  @Post("shops/:shopId/return-imports/preview")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: maxReturnManifestFileBytes, files: 1 } }))
  previewReturnManifest(
    @CurrentActor() actor: Actor,
    @Param("shopId") shopId: string,
    @UploadedFile() file?: UploadedManifestFile
  ): Promise<ReturnManifestPreview> {
    if (!file) throw new DomainError("SPREADSHEET_FORMAT_INVALID", 422, "A CSV or XLSX file is required");
    return this.inventory.previewReturnManifest(actor.id, shopId, file.originalname, file.buffer);
  }

  @Post("shops/:shopId/return-imports/:batchId/commit")
  commitReturnManifest(
    @CurrentActor() actor: Actor,
    @Param("shopId") shopId: string,
    @Param("batchId") batchId: string,
    @Body() body: unknown
  ): Promise<CommitReturnManifestResult> {
    const parsed = commitReturnManifestSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainError("VALIDATION_FAILED", 422, parsed.error.issues[0]?.message ?? "Invalid commit request");
    }
    return this.inventory.commitReturnManifest(actor.id, shopId, batchId, parsed.data.idempotencyKey);
  }

  @Get("shops/:shopId/listings")
  listShopListings(@CurrentActor() actor: Actor, @Param("shopId") shopId: string): Promise<Listing[]> {
    return this.inventory.listShopListings(actor.id, shopId);
  }

  @Patch("shops/:shopId/listings/:listingId")
  updateDraft(
    @CurrentActor() actor: Actor,
    @Param("shopId") shopId: string,
    @Param("listingId") listingId: string,
    @Body() body: unknown
  ): Promise<Listing> {
    const parsed = updateListingDraftSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainError("VALIDATION_FAILED", 422, parsed.error.issues[0]?.message ?? "Invalid listing");
    }
    return this.inventory.updateDraft(actor.id, shopId, listingId, parsed.data);
  }

  @Post("shops/:shopId/listings/:listingId/images/init")
  createImageUploadIntent(
    @CurrentActor() actor: Actor,
    @Param("shopId") shopId: string,
    @Param("listingId") listingId: string,
    @Body() body: unknown
  ): Promise<CatalogImageUploadIntent> {
    const parsed = createCatalogImageUploadSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainError("VALIDATION_FAILED", 422, parsed.error.issues[0]?.message ?? "Invalid catalog image");
    }
    return this.inventory.createImageUploadIntent(actor.id, shopId, listingId, parsed.data);
  }

  @Post("shops/:shopId/listings/:listingId/images/complete")
  completeImageUpload(
    @CurrentActor() actor: Actor,
    @Param("shopId") shopId: string,
    @Param("listingId") listingId: string,
    @Body() body: unknown
  ): Promise<Listing> {
    const parsed = completeCatalogImageUploadSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainError("VALIDATION_FAILED", 422, parsed.error.issues[0]?.message ?? "Invalid catalog image");
    }
    return this.inventory.completeImageUpload(actor.id, shopId, listingId, parsed.data.key);
  }

  @Post("shops/:shopId/listings/:listingId/publish")
  publish(
    @CurrentActor() actor: Actor,
    @Param("shopId") shopId: string,
    @Param("listingId") listingId: string
  ): Promise<PublishListingResult> {
    return this.inventory.publish(actor.id, shopId, listingId);
  }

  @Public()
  @Get("listings")
  listPublicListings(@Query() query: unknown): Promise<PublicListingPage> {
    const parsed = publicListingsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new DomainError("VALIDATION_FAILED", 422, parsed.error.issues[0]?.message ?? "Invalid catalog query");
    }
    return this.inventory.listPublicListings(parsed.data);
  }

  @Public()
  @Get("listings/:listingId")
  getPublicListing(@Param("listingId") listingId: string): Promise<PublicListing> {
    return this.inventory.getPublicListing(listingId);
  }
}
