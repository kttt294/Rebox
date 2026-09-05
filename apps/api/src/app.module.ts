import { AdminKycController } from "./http/controllers/admin-kyc.controller";
import { KycReviewerGuard } from "./http/guards/kyc-reviewer.guard";
import { Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import type { DatabaseContext } from "@rebox/backend";
import { backendProviders, DATABASE } from "./backend.providers";
import { HealthController } from "./http/controllers/health.controller";
import { IdentityController } from "./http/controllers/identity.controller";
import { ListingsController } from "./http/controllers/listings.controller";
import { KycController } from "./http/controllers/kyc.controller";
import { HttpExceptionFilter } from "./http/filters/http-exception.filter";
import { SupabaseJwtGuard } from "./http/guards/supabase-jwt.guard";
import { RequestContextInterceptor } from "./http/interceptors/request-context.interceptor";

@Module({
  controllers: [AdminKycController, HealthController, IdentityController, KycController, ListingsController],
  providers: [
    ...backendProviders,
    KycReviewerGuard,
    { provide: APP_GUARD, useClass: SupabaseJwtGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter }
  ]
})
export class AppModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE) private readonly database: DatabaseContext) {}

  async onApplicationShutdown(): Promise<void> {
    await this.database.pool.end();
  }
}
