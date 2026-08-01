import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

function keyFrom(envName: string): Buffer {
  const raw = process.env[envName];
  if (!raw) throw new Error(`Missing ${envName}`);
  return createHash("sha256").update(raw).digest();
}

/** AES-256-GCM encrypt a provider auth header so it is never readable in the database. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom("LISTING_ENCRYPTION_KEY"), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decryptSecret(stored: string): string {
  const buf = Buffer.from(stored, "base64");
  const decipher = createDecipheriv("aes-256-gcm", keyFrom("LISTING_ENCRYPTION_KEY"), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

/** Platform API keys: shown once, stored only as a peppered hash. */
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = `rcd_${randomBytes(24).toString("base64url")}`;
  return { key, prefix: key.slice(0, 11), hash: hashApiKey(key) };
}

export function hashApiKey(key: string): string {
  const pepper = process.env["API_KEY_PEPPER"] ?? "";
  return createHash("sha256").update(`${pepper}:${key}`).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
