export type KycImage = { bytes: Buffer; mimeType: string };

export type KycIdentity = {
  citizenId?: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  issuedAt?: string;
};

export interface KycProvider {
  readonly name: string;
  analyzeDocument(side: "front" | "back", image: KycImage): Promise<{
    identity: KycIdentity;
    documentValid: boolean;
    reference?: string;
  }>;
  compareFace(document: KycImage, selfie: KycImage): Promise<{
    matched: boolean;
    score: number;
    reference?: string;
  }>;
  checkLiveness(selfie: KycImage): Promise<{
    passed: boolean;
    score: number;
    reference?: string;
  }>;
}

export type VerificationResult = {
  status: "VERIFIED" | "NOT_FOUND" | "UNAVAILABLE";
  registeredName?: string;
};

export interface BusinessVerificationProvider {
  verifyTax(taxCode: string): Promise<VerificationResult>;
  verifyBank(bankCode: string, accountNumber: string): Promise<VerificationResult>;
}
