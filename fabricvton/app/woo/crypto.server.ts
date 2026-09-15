import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Per-store secrets are what every WooCommerce request is signed with, so they
// are encrypted at rest. They cannot be hashed instead: checking an HMAC means
// recomputing it, which needs the secret itself.

const PREFIX = "v1:";

function encryptionKey(): Buffer {
  const raw = process.env.WOO_SECRET_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("WOO_SECRET_ENCRYPTION_KEY is not set");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("WOO_SECRET_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  }
  return key;
}

/** A new random per-store signing secret (256 bits, base64url). */
export function generateSecret(): string {
  return randomBytes(32).toString("base64url");
}

/** An opaque, URL-safe random id with the given prefix. */
export function generateId(prefix: string, bytes = 12): string {
  return `${prefix}${randomBytes(bytes).toString("base64url")}`;
}

export function encryptSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

export function decryptSecret(stored: string): string {
  if (!stored.startsWith(PREFIX)) throw new Error("Unknown secret format");
  const data = Buffer.from(stored.slice(PREFIX.length), "base64");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8");
}

export function hmacHex(secret: string, message: string): string {
  return createHmac("sha256", secret).update(message).digest("hex");
}

export function hmacBase64Url(secret: string, message: string): string {
  return createHmac("sha256", secret).update(message).digest("base64url");
}

export function sha256Hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Constant-time string comparison, so a signature can't be guessed byte by byte. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
