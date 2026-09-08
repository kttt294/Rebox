import type { ErrorCode } from "@reboxe/shared";

export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "DomainError";
  }
}
