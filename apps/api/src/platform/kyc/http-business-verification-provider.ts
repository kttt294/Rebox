import type { BusinessVerificationProvider, VerificationResult } from "@rebox/backend";

export class HttpBusinessVerificationProvider implements BusinessVerificationProvider {
  constructor(
    private readonly taxUrl?: string,
    private readonly bankUrl?: string,
    private readonly token?: string
  ) {}

  verifyTax(taxCode: string): Promise<VerificationResult> {
    return this.verify(this.taxUrl, { taxCode });
  }

  verifyBank(bankCode: string, accountNumber: string): Promise<VerificationResult> {
    return this.verify(this.bankUrl, { bankCode, accountNumber });
  }

  private async verify(url: string | undefined, body: Record<string, string>): Promise<VerificationResult> {
    if (!url) return { status: "UNAVAILABLE" };
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.token ? { authorization: `Bearer ${this.token}` } : {})
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000)
      });
      if (response.status === 404) return { status: "NOT_FOUND" };
      if (!response.ok) return { status: "UNAVAILABLE" };
      const result = await response.json() as { verified?: unknown; registeredName?: unknown };
      if (result.verified !== true) return { status: "NOT_FOUND" };
      return typeof result.registeredName === "string" && result.registeredName.trim()
        ? { status: "VERIFIED", registeredName: result.registeredName.trim() }
        : { status: "UNAVAILABLE" };
    } catch {
      return { status: "UNAVAILABLE" };
    }
  }
}
