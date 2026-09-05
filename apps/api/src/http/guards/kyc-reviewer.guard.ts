import { Inject, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import type { KycModule } from "@rebox/backend";
import { KYC } from "../../backend.providers";
import type { AuthenticatedRequest } from "../types/authenticated-request";

@Injectable()
export class KycReviewerGuard implements CanActivate {
  constructor(@Inject(KYC) private readonly kyc: KycModule) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const actor = context.switchToHttp().getRequest<AuthenticatedRequest>().actor;
    if (!actor) return false;
    await this.kyc.requireReviewer(actor);
    return true;
  }
}
