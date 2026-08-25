import {
  Catch,
  HttpException,
  HttpStatus,
  Logger
} from "@nestjs/common";
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { DomainError } from "@rebox/backend";
import type { ErrorCode, ErrorResponse } from "@rebox/shared";
import { randomUUID } from "node:crypto";
import type { AuthenticatedRequest } from "../types/authenticated-request";

type HttpResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): HttpResponse;
  json(body: ErrorResponse): void;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<HttpResponse>();
    const normalized = normalizeException(exception);
    const requestId = request.requestId ?? request.header("x-request-id") ?? randomUUID();
    response.setHeader("x-request-id", requestId);
    const body: ErrorResponse = {
      error: {
        code: normalized.code,
        message: normalized.message,
        requestId
      }
    };
    const log = {
      requestId,
      actorId: request.actor?.id,
      method: request.method,
      route: request.route?.path ?? request.path,
      status: normalized.status,
      code: normalized.code
    };
    if (normalized.status >= 500) this.logger.error(log);
    else this.logger.warn(log);
    response.status(normalized.status).json(body);
  }
}

function normalizeException(exception: unknown): { status: number; code: ErrorCode; message: string } {
  if (exception instanceof DomainError) {
    return { status: exception.status, code: exception.code, message: exception.message };
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const body = exception.getResponse();
    if (typeof body === "object" && body !== null && "code" in body && "message" in body) {
      return {
        status,
        code: String(body.code) as ErrorCode,
        message: String(body.message)
      };
    }
    return {
      status,
      code: status === HttpStatus.UNAUTHORIZED ? "INVALID_ACCESS_TOKEN" : "VALIDATION_FAILED",
      message: exception.message
    };
  }
  return { status: 500, code: "INTERNAL_ERROR", message: "Internal server error" };
}
