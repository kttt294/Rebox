export type CatalogImageObject = {
  key: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  sha256: string;
};

export type CatalogImageUploadIntent = {
  key: string;
  uploadUrl: string;
  expiresAt: string;
  headers: Record<string, string>;
};

export interface CatalogMediaStorage {
  createUploadIntent(input: { key: string; mimeType: string; sizeBytes: number }): Promise<CatalogImageUploadIntent>;
  inspectObject(key: string): Promise<CatalogImageObject | null>;
  readObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
  publicUrl(key: string): string;
}
