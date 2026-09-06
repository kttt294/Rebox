import { Body, Controller, Delete, Get, Inject, Param, Post, Put } from "@nestjs/common";
import { DomainError, type AccountModule } from "@rebox/backend";
import {
  createAccountAddressSchema,
  notificationPreferencesSchema,
  privacyPreferencesSchema
} from "@rebox/shared";
import { ACCOUNT } from "../../backend.providers";
import { CurrentActor } from "../decorators/current-actor";
import type { Actor } from "../types/authenticated-request";

@Controller("v1/account")
export class AccountController {
  constructor(@Inject(ACCOUNT) private readonly account: AccountModule) {}

  @Get("addresses")
  listAddresses(@CurrentActor() actor: Actor) {
    return this.account.listAddresses(actor.id);
  }

  @Post("addresses")
  createAddress(@CurrentActor() actor: Actor, @Body() body: unknown) {
    const input = parseBody(createAccountAddressSchema.safeParse(body));
    return this.account.createAddress(actor.id, input);
  }

  @Delete("addresses/:id")
  deleteAddress(@CurrentActor() actor: Actor, @Param("id") id: string) {
    if (!/^RBXADDR-[A-Z0-9]{26}$/.test(id)) throw new DomainError("VALIDATION_FAILED", 422, "Invalid address id");
    return this.account.deleteAddress(actor.id, id);
  }

  @Get("notifications")
  getNotifications(@CurrentActor() actor: Actor) {
    return this.account.getNotifications(actor.id);
  }

  @Put("notifications")
  updateNotifications(@CurrentActor() actor: Actor, @Body() body: unknown) {
    return this.account.updateNotifications(actor.id, parseBody(notificationPreferencesSchema.safeParse(body)));
  }

  @Get("privacy")
  getPrivacy(@CurrentActor() actor: Actor) {
    return this.account.getPrivacy(actor.id);
  }

  @Put("privacy")
  updatePrivacy(@CurrentActor() actor: Actor, @Body() body: unknown) {
    return this.account.updatePrivacy(actor.id, parseBody(privacyPreferencesSchema.safeParse(body)));
  }

  @Get("payment-methods")
  getPaymentMethods(@CurrentActor() actor: Actor) {
    return this.account.getPaymentOverview(actor.id);
  }

  @Get("orders")
  listOrders(@CurrentActor() actor: Actor) {
    return this.account.listOrders(actor.id);
  }
}

function parseBody<T>(result: { success: true; data: T } | { success: false; error: { issues: Array<{ message: string }> } }): T {
  if (!result.success) throw new DomainError("VALIDATION_FAILED", 422, result.error.issues[0]?.message ?? "Invalid request");
  return result.data;
}
