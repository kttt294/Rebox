import { Controller, Get, Inject, Param } from "@nestjs/common";
import type { FinanceModule } from "@reboxe/backend";
import { FINANCE } from "../../backend.providers";
import { CurrentActor } from "../decorators/current-actor";
import type { Actor } from "../types/authenticated-request";

@Controller("v1/shops/:shopId/finance")
export class FinanceController {
  constructor(@Inject(FINANCE) private readonly finance: FinanceModule) {}

  @Get()
  getSnapshot(@CurrentActor() actor: Actor, @Param("shopId") shopId: string) {
    return this.finance.getSnapshot(actor.id, shopId);
  }
}
