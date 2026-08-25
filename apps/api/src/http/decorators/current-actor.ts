import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Actor, AuthenticatedRequest } from "../types/authenticated-request";

export const CurrentActor = createParamDecorator((_data: unknown, context: ExecutionContext): Actor => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!request.actor) {
    throw new Error("Authenticated actor is missing");
  }
  return request.actor;
});
