import { Body, Controller, Get, Inject, Post } from "@nestjs/common";
import type { IdentityModule } from "@rebox/backend";
import { DomainError } from "@rebox/backend";
import {
  createSellerDocumentUploadSchema,
  createShopSchema,
  type ActorContext,
  type CatalogImageUploadIntent
} from "@rebox/shared";
import { IDENTITY } from "../../backend.providers";
import { CurrentActor } from "../decorators/current-actor";
import type { Actor } from "../types/authenticated-request";

@Controller("v1")
export class IdentityController {
  constructor(@Inject(IDENTITY) private readonly identity: IdentityModule) {}

  @Get("me")
  getMe(@CurrentActor() actor: Actor): Promise<ActorContext> {
    return this.identity.getActorContext(actor.id);
  }

  @Post("shops")
  createShop(@CurrentActor() actor: Actor, @Body() body: unknown) {
    const parsed = createShopSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainError("VALIDATION_FAILED", 422, parsed.error.issues[0]?.message ?? "Invalid shop");
    }
    return this.identity.onboardShop(actor.id, parsed.data);
  }

  @Post("seller-onboarding/uploads")
  createSellerDocumentUpload(
    @CurrentActor() actor: Actor,
    @Body() body: unknown
  ): Promise<CatalogImageUploadIntent> {
    const parsed = createSellerDocumentUploadSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainError("VALIDATION_FAILED", 422, parsed.error.issues[0]?.message ?? "Invalid seller document");
    }
    return this.identity.createSellerDocumentUploadIntent(actor.id, parsed.data);
  }
}
