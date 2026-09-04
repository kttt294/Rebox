export type CatalogImageObject = {
  key: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
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
  deleteObject(key: string): Promise<void>;
  publicUrl(key: string): string;
}
