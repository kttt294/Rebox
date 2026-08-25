import { createApiClient } from "@rebox/api-client";
import { getSupabaseBrowserClient } from "../auth/browser";

export function createBrowserApiClient() {
  return createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001",
    getAccessToken: async () => {
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      return data.session?.access_token ?? null;
    }
  });
}
