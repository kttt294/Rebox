import { Body, Controller, Get, Header, Headers, HttpCode, Inject, Param, Post, Query, UseGuards } from "@nestjs/common";
import { DomainError, type KycModule } from "@rebox/backend";
import { adminKycQuerySchema, kycDecisionSchema } from "@rebox/shared";
import { KYC } from "../../backend.providers";
import { CurrentActor } from "../decorators/current-actor";
import { KycReviewerGuard } from "../guards/kyc-reviewer.guard";
import type { Actor } from "../types/authenticated-request";

@Controller("v1/admin/kyc")
@UseGuards(KycReviewerGuard)
export class AdminKycController {
  constructor(@Inject(KYC) private readonly kyc: KycModule) {}

  @Get()
  @Header("Cache-Control", "no-store")
  list(@CurrentActor() actor: Actor, @Query() query: unknown) {
    const parsed = adminKycQuerySchema.safeParse(query);
    if (!parsed.success) throw new DomainError("VALIDATION_FAILED", 422, "Invalid queue query");
    return this.kyc.listReviews(actor, parsed.data);
  }

  @Get(":id")
  @Header("Cache-Control", "no-store")
  detail(@CurrentActor() actor: Actor, @Param("id") id: string) {
    return this.kyc.getReviewDetail(actor, id);
  }

  @Post(":id/decision")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  decision(@CurrentActor() actor: Actor, @Param("id") id: string,
    @Body() body: unknown, @Headers("idempotency-key") key: string) {
    const parsed = kycDecisionSchema.safeParse(body);
    if (!parsed.success) throw new DomainError("VALIDATION_FAILED", 422, "Invalid decision or reason");
    return this.kyc.decideReview(actor, id, parsed.data, key);
  }
}
