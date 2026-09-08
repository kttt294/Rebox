import { Body, Controller, Get, Inject, Param, Patch, Post } from "@nestjs/common";
import { DomainError, type OperationsModule } from "@reboxe/backend";
import { createSupportTicketSchema, legalAcceptanceSchema, privacyRequestSchema, supportReplySchema } from "@reboxe/shared";
import { OPERATIONS } from "../../backend.providers";
import { CurrentActor } from "../decorators/current-actor";
import { Public } from "../decorators/public";
import type { Actor } from "../types/authenticated-request";

@Controller("v1")
export class OperationsController {
  constructor(@Inject(OPERATIONS) private readonly operations: OperationsModule) {}

  @Get("notifications") listNotifications(@CurrentActor() actor: Actor) { return this.operations.listNotifications(actor.id); }
  @Patch("notifications/:id/read") read(@CurrentActor() actor: Actor, @Param("id") id: string) { return this.operations.markNotificationRead(actor.id, id); }

  @Public()
  @Get("legal/:slug") legal(@Param("slug") slug: string) { return this.operations.getLegalArtifact(slug); }
  @Post("legal/:slug/accept")
  accept(@CurrentActor() actor: Actor, @Param("slug") slug: string, @Body() body: unknown) {
    const parsed = legalAcceptanceSchema.safeParse(body);
    if (!parsed.success) throw new DomainError("VALIDATION_FAILED", 422, "Invalid legal acceptance");
    return this.operations.acceptLegalArtifact(actor.id, slug, parsed.data.version, parsed.data.source);
  }

  @Post("support/tickets")
  ticket(@CurrentActor() actor: Actor, @Body() body: unknown) {
    const parsed = createSupportTicketSchema.safeParse(body);
    if (!parsed.success) throw new DomainError("VALIDATION_FAILED", 422, "Invalid support ticket");
    return this.operations.createSupportTicket(actor.id, parsed.data);
  }
  @Get("support/tickets/:id") ticketDetail(@CurrentActor() actor: Actor, @Param("id") id: string) { return this.operations.getSupportTicket(actor.id, id); }
  @Get("admin/support/tickets") supportQueue(@CurrentActor() actor: Actor) { return this.operations.listSupportQueue(actor); }
  @Post("admin/support/tickets/:id/reply")
  supportReply(@CurrentActor() actor: Actor, @Param("id") id: string, @Body() body: unknown) {
    const parsed = supportReplySchema.safeParse(body);
    if (!parsed.success) throw new DomainError("VALIDATION_FAILED", 422, "Invalid support reply");
    return this.operations.replySupport(actor, id, parsed.data.body, parsed.data.status);
  }

  @Post("privacy/requests")
  privacy(@CurrentActor() actor: Actor, @Body() body: unknown) {
    const parsed = privacyRequestSchema.safeParse(body);
    if (!parsed.success) throw new DomainError("VALIDATION_FAILED", 422, "Invalid privacy request");
    return this.operations.createPrivacyRequest(actor, parsed.data.type);
  }
  @Get("privacy/requests/:id") privacyDetail(@CurrentActor() actor: Actor, @Param("id") id: string) { return this.operations.getPrivacyRequest(actor.id, id); }
}
