import { z } from "zod";

export const kycStatusSchema = z.enum(["PENDING", "PROCESSING", "VERIFIED", "REJECTED", "MANUAL_REVIEW"]);
export type KycStatus = z.infer<typeof kycStatusSchema>;

const kycRequestSchema = z.object({ kycId: z.string().min(10).max(64) }).strict();

export const startKycSchema = z.object({ shopId: z.string().min(5).max(64) }).strict();
export const submitKycDocumentSchema = kycRequestSchema.extend({
  objectKey: z.string().min(1).max(500)
}).strict();
export const submitKycTaxSchema = kycRequestSchema.extend({
  taxCode: z.string().trim().regex(/^\d{10}(?:-\d{3})?$/, "Mã số thuế không hợp lệ")
}).strict();
export const submitKycBankSchema = kycRequestSchema.extend({
  bankCode: z.string().trim().min(2).max(30),
  accountNumber: z.string().trim().regex(/^\d{6,30}$/, "Số tài khoản không hợp lệ")
}).strict();

export type StartKycInput = z.infer<typeof startKycSchema>;
export type SubmitKycDocumentInput = z.infer<typeof submitKycDocumentSchema>;
export type SubmitKycTaxInput = z.infer<typeof submitKycTaxSchema>;
export type SubmitKycBankInput = z.infer<typeof submitKycBankSchema>;

export type KycStatusResponse = {
  success: boolean;
  kycStatus: KycStatus;
  identity: {
    citizenId: string | null;
    fullName: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    address: string | null;
    issuedAt: string | null;
  };
  verification: {
    documentValid: boolean | null;
    faceMatched: boolean | null;
    faceScore: number | null;
    livenessPassed: boolean | null;
    livenessScore: number | null;
  };
};
