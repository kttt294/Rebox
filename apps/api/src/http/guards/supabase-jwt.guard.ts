import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { IS_PUBLIC } from "../decorators/public";
import type { AuthenticatedRequest } from "../types/authenticated-request";

@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  private readonly issuer: string;
  private readonly audience: string;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(@Inject(Reflector) private readonly reflector: Reflector) {
    this.issuer = environmentValue("SUPABASE_ISSUER", "http://127.0.0.1:54321/auth/v1");
    this.audience = process.env.SUPABASE_AUDIENCE ?? "authenticated";
    this.jwks = createRemoteJWKSet(
      new URL(environmentValue("SUPABASE_JWKS_URL", `${this.issuer}/.well-known/jwks.json`))
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
    if (!token) {
      throw new UnauthorizedException({ code: "INVALID_ACCESS_TOKEN", message: "Access token is required" });
    }

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience
      });
      if (typeof payload.sub !== "string") {
        throw new Error("Missing subject");
      }
      request.actor = { id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException({ code: "INVALID_ACCESS_TOKEN", message: "Access token is invalid" });
    }
  }
}

function environmentValue(name: string, developmentDefault: string): string {
  const value = process.env[name];
  if (value) {
    return value;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return developmentDefault;
}
