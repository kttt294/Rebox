import { describe, expect, it } from "vitest";
import { normalizeIdentity } from "../src/platform/kyc/vnpt-kyc-provider";

describe("VNPT response normalization", () => {
  it("maps provider OCR fields without leaking provider-only data", () => {
    expect(normalizeIdentity({
      id: "001203000001",
      name: "NGUYEN VAN TEST",
      birth_day: "01/01/2003",
      gender: "Nam",
      recent_location: "Ha Noi",
      issue_date: "01/01/2022",
      provider_only_field: "must not leak"
    })).toEqual({
      citizenId: "001203000001",
      fullName: "NGUYEN VAN TEST",
      dateOfBirth: "01/01/2003",
      gender: "Nam",
      address: "Ha Noi",
      issuedAt: "01/01/2022"
    });
  });
});
