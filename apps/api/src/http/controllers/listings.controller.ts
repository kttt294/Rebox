import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { DomainError, type InventoryModule } from "@rebox/backend";
import { createListingSchema, type Listing } from "@rebox/shared";
import { INVENTORY } from "../../backend.providers";
import { CurrentActor } from "../decorators/current-actor";
import { Public } from "../decorators/public";
import type { Actor } from "../types/authenticated-request";

@Controller("v1")
export class ListingsController {
  constructor(@Inject(INVENTORY) private readonly inventory: InventoryModule) {}

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

  @Get("shops/:shopId/listings")
  listShopListings(@CurrentActor() actor: Actor, @Param("shopId") shopId: string): Promise<Listing[]> {
    return this.inventory.listShopListings(actor.id, shopId);
  }

  @Post("shops/:shopId/listings/:listingId/publish")
  publish(
    @CurrentActor() actor: Actor,
    @Param("shopId") shopId: string,
    @Param("listingId") listingId: string
  ): Promise<Listing> {
    return this.inventory.publish(actor.id, shopId, listingId);
  }

  @Public()
  @Get("listings/:listingId")
  getPublicListing(@Param("listingId") listingId: string): Promise<Listing> {
    return this.inventory.getPublicListing(listingId);
  }
}
