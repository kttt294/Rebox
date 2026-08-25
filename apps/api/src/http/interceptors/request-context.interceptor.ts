import {
  Injectable,
  Logger
} from "@nestjs/common";
import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { tap, type Observable } from "rxjs";
import type { AuthenticatedRequest } from "../types/authenticated-request";

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HttpRequest");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<{ statusCode: number; setHeader(name: string, value: string): void }>();
    const requestId = request.header("x-request-id") ?? randomUUID();
    const startedAt = performance.now();
    request.requestId = requestId;
    response.setHeader("x-request-id", requestId);

    return next.handle().pipe(
      tap({
        complete: () => {
        this.logger.log({
          requestId,
          actorId: request.actor?.id,
          method: request.method,
          route: request.route?.path ?? request.path,
          status: response.statusCode,
          durationMs: Math.round(performance.now() - startedAt)
        });
        }
      })
    );
  }
}
