import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";

function key() {
  const value = process.env.EMAIL_ENCRYPTION_KEY;
  if (!value || !/^[a-f\d]{64}$/i.test(value)) throw new Error("EMAIL_ENCRYPTION_KEY deve conter 32 bytes em hexadecimal.");
  return Buffer.from(value, "hex");
}

export function seal(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function unseal<T>(value: string): T {
  const data = Buffer.from(value, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8")) as T;
}

export function fingerprint(value: string): string {
  return createHmac("sha256", key()).update(value).digest("hex");
}
export function hashSession(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
