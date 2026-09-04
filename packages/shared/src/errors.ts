export const errorCodes = [
  "INVALID_ACCESS_TOKEN",
  "RESOURCE_NOT_FOUND",
  "SHOP_NOT_VERIFIED",
  "SHOP_NOT_ACTIVE",
  "FORBIDDEN",
  "INVALID_LISTING_STATE",
  "INVALID_CATEGORY",
  "LISTING_CATEGORY_BANNED",
  "LISTING_DISCLOSURE_REQUIRED",
  "CATALOG_IMAGE_LIMIT",
  "LISTING_IMAGE_REQUIRED",
  "VALIDATION_FAILED",
  "INTERNAL_ERROR"
] as const;

export type ErrorCode = (typeof errorCodes)[number];

export type ErrorResponse = {
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
  };
};
