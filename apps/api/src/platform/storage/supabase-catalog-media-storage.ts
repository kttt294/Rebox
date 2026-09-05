import type {
  CatalogImageObject,
  CatalogImageUploadIntent,
  CatalogMediaStorage
} from "@rebox/backend";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import sharp from "sharp";

const signedUploadLifetimeMs = 2 * 60 * 60 * 1_000;

export class SupabaseCatalogMediaStorage implements CatalogMediaStorage {
  private readonly client: SupabaseClient;

  constructor(
    url: string,
    secretKey: string,
    private readonly bucketName = "catalog-media"
  ) {
    this.client = createClient(url, secretKey, { auth: { persistSession: false } });
  }

  async createUploadIntent(input: {
    key: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<CatalogImageUploadIntent> {
    const { data, error } = await this.client.storage
      .from(this.bucketName)
      .createSignedUploadUrl(input.key, { upsert: false });
    if (error) throw error;
    return {
      key: input.key,
      uploadUrl: data.signedUrl,
      expiresAt: new Date(Date.now() + signedUploadLifetimeMs).toISOString(),
      headers: { "content-type": input.mimeType }
    };
  }

  async inspectObject(key: string): Promise<CatalogImageObject | null> {
    const bucket = this.client.storage.from(this.bucketName);
    const { data: info, error: infoError } = await bucket.info(key);
    if (infoError && (infoError.status === 404 || infoError.statusCode === "404")) return null;
    if (infoError) throw infoError;

    const { data: file, error: downloadError } = await bucket.download(key);
    if (downloadError) throw downloadError;
    const bytes = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(bytes).metadata().catch(() => undefined);
    const expectedFormat = info.contentType === "image/jpeg" ? "jpeg" : info.contentType?.slice("image/".length);
    const formatMatches = metadata?.format === expectedFormat;
    return {
      key,
      mimeType: info.contentType ?? "",
      sizeBytes: info.size ?? 0,
      width: formatMatches ? metadata?.width ?? 0 : 0,
      height: formatMatches ? metadata?.height ?? 0 : 0,
      sha256: createHash("sha256").update(bytes).digest("hex")
    };
  }

  async deleteObject(key: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucketName).remove([key]);
    if (error) throw error;
  }

  publicUrl(key: string): string {
    return this.client.storage.from(this.bucketName).getPublicUrl(key).data.publicUrl;
  }
}
