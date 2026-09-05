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
  review: { reason: string; reviewedAt: string } | null;
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

export const kycDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().min(1).max(1000)
}).strict();
export const kycIdempotencyKeySchema = z.string().uuid();
export const adminKycQuerySchema = z.object({
  status: z.literal("MANUAL_REVIEW").default("MANUAL_REVIEW"),
  cursor: z.string().max(200).regex(/^\d{4}-\d{2}-\d{2}T[0-9:.]+Z\|[A-Za-z0-9-]{10,64}$/)
    .refine((value) => z.string().datetime().safeParse(value.split("|")[0]).success).optional()
}).strict();
export type KycDecisionInput = z.infer<typeof kycDecisionSchema>;
export type AdminKycQuery = z.infer<typeof adminKycQuerySchema>;
export type AdminKycQueueItem = {
  kycId: string;
  shopId: string;
  shopDisplayName: string;
  status: "MANUAL_REVIEW";
  provider: string;
  submittedAt: string;
};
export type AdminKycQueue = { items: AdminKycQueueItem[]; nextCursor: string | null };
export type KycDecisionResult = {
  kycId: string;
  kycStatus: "VERIFIED" | "REJECTED";
  review: { reason: string; reviewedAt: string };
};
export type AdminKycDetail = {
  kycId: string;
  shopId: string;
  shopDisplayName: string;
  status: KycStatus;
  provider: string;
  submittedAt: string;
  identity: KycStatusResponse["identity"];
  verification: KycStatusResponse["verification"];
  review: KycStatusResponse["review"];
  tax: { status: "VERIFIED" | "NOT_FOUND" | "UNAVAILABLE" | null; registeredName: string | null };
  bank: {
    bankCode: string | null;
    accountNumber: string | null;
    status: "VERIFIED" | "NOT_FOUND" | "UNAVAILABLE" | null;
    registeredName: string | null;
    nameMatchScore: number | null;
  };
};
