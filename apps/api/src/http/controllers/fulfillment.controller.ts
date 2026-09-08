import { Body, Controller, Inject, Param, Post } from "@nestjs/common";
import { DomainError, type FulfillmentModule } from "@reboxe/backend";
import { fakeCarrierEventSchema } from "@reboxe/shared";
import { FULFILLMENT } from "../../backend.providers";
import { CurrentActor } from "../decorators/current-actor";
import type { Actor } from "../types/authenticated-request";

@Controller("v1")
export class FulfillmentController {
  constructor(@Inject(FULFILLMENT) private readonly fulfillment: FulfillmentModule) {}

  @Post("shops/:shopId/orders/:orderId/shipment")
  create(@CurrentActor() actor: Actor, @Param("shopId") shopId: string, @Param("orderId") orderId: string) {
    return this.fulfillment.createShipment(actor.id, shopId, orderId);
  }

  @Post("sandbox/fulfillment/orders/:orderId/events")
  event(@Param("orderId") orderId: string, @Body() body: unknown) {
    if (process.env.NODE_ENV === "production") throw new DomainError("RESOURCE_NOT_FOUND", 404, "Route not found");
    const parsed = fakeCarrierEventSchema.safeParse(body);
    if (!parsed.success) throw new DomainError("VALIDATION_FAILED", 422, "Invalid fake carrier event");
    return this.fulfillment.applyEvent(parsed.data.eventId, orderId, parsed.data.status);
  }

  @Post("sandbox/fulfillment/orders/:orderId/complete")
  complete(@Param("orderId") orderId: string) {
    if (process.env.NODE_ENV === "production") throw new DomainError("RESOURCE_NOT_FOUND", 404, "Route not found");
    return this.fulfillment.completeDelivery(orderId);
  }
}
