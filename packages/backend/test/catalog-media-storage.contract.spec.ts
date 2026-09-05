import { describe, expect, it } from "vitest";
import type {
  CatalogImageObject,
  CatalogImageUploadIntent,
  CatalogMediaStorage
} from "../src/modules/inventory";

class FakeCatalogMediaStorage implements CatalogMediaStorage {
  private readonly objects = new Map<string, CatalogImageObject>();

  async createUploadIntent(input: { key: string; mimeType: string; sizeBytes: number }): Promise<CatalogImageUploadIntent> {
    this.objects.set(input.key, { ...input, width: 1200, height: 900, sha256: "a".repeat(64) });
    return {
      key: input.key,
      uploadUrl: `https://storage.test/${input.key}`,
      expiresAt: "2026-09-02T01:00:00.000Z",
      headers: { "content-type": input.mimeType }
    };
  }

  async inspectObject(key: string): Promise<CatalogImageObject | null> {
    return this.objects.get(key) ?? null;
  }

  async readObject(key: string): Promise<Buffer> {
    if (!this.objects.has(key)) throw new Error("Object not found");
    return Buffer.from(key);
  }

  async deleteObject(key: string): Promise<void> {
    this.objects.delete(key);
  }

  publicUrl(key: string): string {
    return `https://storage.test/public/${key}`;
  }
}

describe("CatalogMediaStorage contract", () => {
  it("creates an intent, reads authoritative metadata and deletes the object", async () => {
    const storage: CatalogMediaStorage = new FakeCatalogMediaStorage();
    const input = { key: "catalog/shop/listing/image", mimeType: "image/webp", sizeBytes: 42_000 };

    const intent = await storage.createUploadIntent(input);
    expect(intent).toMatchObject({ key: input.key, headers: { "content-type": input.mimeType } });
    expect(storage.publicUrl(input.key)).toBe(`https://storage.test/public/${input.key}`);
    await expect(storage.inspectObject(input.key)).resolves.toMatchObject(input);
    await expect(storage.readObject(input.key)).resolves.toEqual(Buffer.from(input.key));

    await storage.deleteObject(input.key);
    await expect(storage.inspectObject(input.key)).resolves.toBeNull();
  });
});
