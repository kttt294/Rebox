import { describe, expect, it } from "vitest";
import { evaluateKycStatus, normalizePersonName } from "../src/modules/kyc";

describe("KYC name matching", () => {
  it("matches authoritative names despite Vietnamese accents and spacing", () => {
    expect(normalizePersonName("Nguyễn  Văn Đạt")).toBe("NGUYENVANDAT");
    expect(normalizePersonName("NGUYEN-VAN-DAT")).toBe("NGUYENVANDAT");
    expect(normalizePersonName("Nguyễn Văn Đạt")).not.toBe(normalizePersonName("Nguyễn Văn An"));
  });

  it("keeps conservative final-state gates", () => {
    const passed = {
      frontValid: true,
      backValid: true,
      faceMatched: true,
      livenessPassed: true,
      taxStatus: "VERIFIED" as const,
      bankStatus: "VERIFIED" as const,
      taxNameMatched: true,
      bankNameMatched: true
    };
    expect(evaluateKycStatus(passed)).toBe("VERIFIED");
    expect(evaluateKycStatus({ ...passed, faceMatched: false })).toBe("REJECTED");
    expect(evaluateKycStatus({ ...passed, bankStatus: "UNAVAILABLE" })).toBe("MANUAL_REVIEW");
    expect(evaluateKycStatus({ ...passed, bankNameMatched: false })).toBe("MANUAL_REVIEW");
    expect(evaluateKycStatus({ ...passed, livenessPassed: null })).toBe("PROCESSING");
  });
});
