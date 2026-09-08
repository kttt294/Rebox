import { Body, Controller, Delete, Get, Inject, Param, Post, Put } from "@nestjs/common";
import { DomainError, type AccountModule } from "@reboxe/backend";
import {
  changePasswordSchema,
  createAccountAddressSchema,
  notificationPreferencesSchema,
  privacyPreferencesSchema
} from "@reboxe/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ACCOUNT, SUPABASE_AUTH } from "../../backend.providers";
import { CurrentActor } from "../decorators/current-actor";
import type { Actor } from "../types/authenticated-request";

@Controller("v1/account")
export class AccountController {
  constructor(
    @Inject(ACCOUNT) private readonly account: AccountModule,
    @Inject(SUPABASE_AUTH) private readonly supabase: SupabaseClient
  ) {}

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

  @Post("change-password")
  async changePassword(@CurrentActor() actor: Actor, @Body() body: unknown) {
    const { currentPassword, newPassword } = parseBody(changePasswordSchema.safeParse(body));

    // Lấy email để xác thực mật khẩu cũ
    const { data: userData, error: getUserError } = await this.supabase.auth.admin.getUserById(actor.id);
    if (getUserError || !userData.user?.email) {
      throw new DomainError("INTERNAL_ERROR", 500, "Không thể xác minh tài khoản");
    }

    // Xác thực mật khẩu hiện tại
    const { error: signInError } = await this.supabase.auth.signInWithPassword({
      email: userData.user.email,
      password: currentPassword
    });
    if (signInError) {
      throw new DomainError("INVALID_CREDENTIALS", 401, "Mật khẩu hiện tại không đúng");
    }

    // Đổi mật khẩu
    const { error: updateError } = await this.supabase.auth.admin.updateUserById(actor.id, { password: newPassword });
    if (updateError) {
      throw new DomainError("INTERNAL_ERROR", 500, "Không thể đổi mật khẩu");
    }

    return { changed: true };
  }
}

function parseBody<T>(result: { success: true; data: T } | { success: false; error: { issues: Array<{ message: string }> } }): T {
  if (!result.success) throw new DomainError("VALIDATION_FAILED", 422, result.error.issues[0]?.message ?? "Invalid request");
  return result.data;
}
