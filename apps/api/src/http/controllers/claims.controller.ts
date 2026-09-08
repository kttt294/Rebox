import { Body, Controller, Get, Headers, Inject, Param, Post } from "@nestjs/common";
import { DomainError, type ClaimsModule } from "@reboxe/backend";
import { createDisputeSchema, createEvidenceSchema, disputeDecisionSchema, disputeReplySchema, processingRecordSchema } from "@reboxe/shared";
import { CLAIMS } from "../../backend.providers";
import { CurrentActor } from "../decorators/current-actor";
import type { Actor } from "../types/authenticated-request";

@Controller("v1")
export class ClaimsController {
  constructor(@Inject(CLAIMS) private readonly claims: ClaimsModule) {}

  @Post("processing-records")
  processing(@CurrentActor() actor: Actor, @Body() body: unknown) {
    const parsed = processingRecordSchema.safeParse(body);
    if (!parsed.success) throw new DomainError("VALIDATION_FAILED", 422, "Invalid processing record");
    return this.claims.createProcessingRecord(actor.id, parsed.data);
  }

  @Post("orders/:orderId/disputes")
  open(@CurrentActor() actor: Actor, @Param("orderId") orderId: string, @Body() body: unknown) {
    const parsed = createDisputeSchema.safeParse(body);
    if (!parsed.success) throw new DomainError("VALIDATION_FAILED", 422, "Invalid dispute reason");
    return this.claims.openDispute(actor.id, orderId, parsed.data.reason);
  }

  @Post("disputes/:caseId/evidence")
  evidence(@CurrentActor() actor: Actor, @Param("caseId") caseId: string, @Body() body: unknown) {
    const parsed = createEvidenceSchema.safeParse(body);
    if (!parsed.success) throw new DomainError("VALIDATION_FAILED", 422, "Invalid evidence metadata");
    return this.claims.addEvidence(actor.id, caseId, parsed.data);
  }

  @Get("disputes/:caseId/evidence")
  evidenceList(@CurrentActor() actor: Actor, @Param("caseId") caseId: string) { return this.claims.listEvidence(actor, caseId); }

  @Post("disputes/:caseId/replies")
  reply(@CurrentActor() actor: Actor, @Param("caseId") caseId: string, @Body() body: unknown) {
    const parsed = disputeReplySchema.safeParse(body);
    if (!parsed.success) throw new DomainError("VALIDATION_FAILED", 422, "Invalid reply");
    return this.claims.reply(actor.id, caseId, parsed.data.body);
  }

  @Post("disputes/:caseId/appeal")
  appeal(@CurrentActor() actor: Actor, @Param("caseId") caseId: string, @Body() body: unknown) {
    const parsed = disputeReplySchema.safeParse(body);
    if (!parsed.success) throw new DomainError("VALIDATION_FAILED", 422, "Invalid appeal");
    return this.claims.appeal(actor.id, caseId, parsed.data.body);
  }

  @Get("admin/disputes")
  adminList(@CurrentActor() actor: Actor) { return this.claims.listAdmin(actor); }

  @Get("shops/:shopId/disputes")
  sellerList(@CurrentActor() actor: Actor, @Param("shopId") shopId: string) { return this.claims.listForShop(actor.id, shopId); }

  @Post("admin/disputes/:caseId/decision")
  decide(@CurrentActor() actor: Actor, @Param("caseId") caseId: string, @Body() body: unknown, @Headers("idempotency-key") key: string) {
    const parsed = disputeDecisionSchema.safeParse(body);
    if (!parsed.success) throw new DomainError("VALIDATION_FAILED", 422, "Decision reason must contain at least 30 characters");
    if (!key) throw new DomainError("VALIDATION_FAILED", 422, "Idempotency-Key is required");
    return this.claims.resolve(actor, caseId, parsed.data, key);
  }
}
