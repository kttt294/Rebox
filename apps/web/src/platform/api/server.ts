import { createApiClient } from "@rebox/api-client";

export function createPublicApiClient() {
  return createApiClient({
    baseUrl: process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001"
  });
}
