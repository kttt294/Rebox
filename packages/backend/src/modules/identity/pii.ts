import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export function createPiiKey(secret: string): Buffer {
  if (secret.length < 32) throw new Error("Seller PII encryption secret must be at least 32 characters");
  return createHash("sha256").update(secret).digest();
}

export function encryptPii(value: string, key: Buffer): Buffer {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), encrypted]);
}

export function decryptPii(value: Buffer | null, key: Buffer): string | null {
  if (!value) return null;
  const decipher = createDecipheriv("aes-256-gcm", key, value.subarray(0, 12));
  decipher.setAuthTag(value.subarray(12, 28));
  return Buffer.concat([decipher.update(value.subarray(28)), decipher.final()]).toString("utf8");
}
