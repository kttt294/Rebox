import { z } from "zod";

export const notificationPreferencesSchema = z.object({
  orderEmail: z.boolean(),
  promotionEmail: z.boolean(),
  surveyEmail: z.boolean(),
  promotionSms: z.boolean(),
  promotionZalo: z.boolean()
}).strict();
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export const privacyPreferencesSchema = z.object({
  personalizedRecommendations: z.boolean(),
  shareUsageAnalytics: z.boolean(),
  publicPurchaseActivity: z.boolean()
}).strict();
export type PrivacyPreferences = z.infer<typeof privacyPreferencesSchema>;

export const createAccountAddressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  recipientName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^0\d{9}$/, "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0"),
  addressLine: z.string().trim().min(5).max(250),
  ward: z.string().trim().min(2).max(100),
  district: z.string().trim().min(2).max(100),
  province: z.string().trim().min(2).max(100),
  isDefault: z.boolean().default(false)
}).strict();
export type CreateAccountAddressInput = z.infer<typeof createAccountAddressSchema>;

export type AccountAddress = CreateAccountAddressInput & {
  id: string;
  createdAt: string;
};

export type AccountPaymentOverview = {
  cards: Array<{ id: string; brand: string; last4: string }>;
  bankAccounts: Array<{
    id: string;
    bankCode: string;
    maskedAccountNumber: string;
    accountHolder: string | null;
    verified: boolean;
  }>;
};

export type PurchaseOrderSummary = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "SHIPPING" | "COMPLETED" | "CANCELLED";
  totalVnd: number;
  itemCount: number;
  placedAt: string;
};

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
  newPassword: z.string().min(8, "Mật khẩu mới phải có ít nhất 8 ký tự")
}).strict();
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
