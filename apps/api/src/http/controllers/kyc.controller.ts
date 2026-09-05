import { Body, Controller, Get, Header, Inject, Param, Post } from "@nestjs/common";
import type { KycModule } from "@rebox/backend";
import { DomainError } from "@rebox/backend";
import {
  startKycSchema,
  submitKycBankSchema,
  submitKycDocumentSchema,
  submitKycTaxSchema
} from "@rebox/shared";
import { KYC } from "../../backend.providers";
import { CurrentActor } from "../decorators/current-actor";
import type { Actor } from "../types/authenticated-request";

@Controller("v1/kyc")
export class KycController {
  constructor(@Inject(KYC) private readonly kyc: KycModule) {}

  @Post("start")
  start(@CurrentActor() actor: Actor, @Body() body: unknown) {
    const input = parse(startKycSchema, body);
    return this.kyc.start(actor.id, input.shopId);
  }

  @Post("document/front")
  front(@CurrentActor() actor: Actor, @Body() body: unknown) {
    return this.kyc.submitDocument(actor.id, "front", parse(submitKycDocumentSchema, body));
  }

  @Post("document/back")
  back(@CurrentActor() actor: Actor, @Body() body: unknown) {
    return this.kyc.submitDocument(actor.id, "back", parse(submitKycDocumentSchema, body));
  }

  @Post("selfie")
  selfie(@CurrentActor() actor: Actor, @Body() body: unknown) {
    return this.kyc.submitSelfie(actor.id, parse(submitKycDocumentSchema, body));
  }

  @Post("tax")
  tax(@CurrentActor() actor: Actor, @Body() body: unknown) {
    return this.kyc.submitTax(actor.id, parse(submitKycTaxSchema, body));
  }

  @Post("bank")
  bank(@CurrentActor() actor: Actor, @Body() body: unknown) {
    return this.kyc.submitBank(actor.id, parse(submitKycBankSchema, body));
  }

  @Get(":id/status")
  @Header("Cache-Control", "no-store")
  status(@CurrentActor() actor: Actor, @Param("id") id: string) {
    return this.kyc.getStatus(actor.id, id);
  }
}

function parse<T>(schema: {
  safeParse(value: unknown):
    | { success: true; data: T }
    | { success: false; error: { issues: Array<{ message: string }> } };
}, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new DomainError("VALIDATION_FAILED", 422, result.error.issues[0]?.message ?? "Invalid KYC request");
  return result.data;
}
