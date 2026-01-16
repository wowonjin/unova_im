import crypto from "crypto";

const VERSION_PREFIX = "v1:";

function keyFromSecret(): Buffer {
  const secret = process.env.PASSWORD_VAULT_SECRET;
  if (secret && secret.trim()) {
    return crypto.createHash("sha256").update(secret.trim(), "utf8").digest();
  }

  // Fallback: 관리자 비밀번호로부터 키 유도(개발 편의). 운영에서는 PASSWORD_VAULT_SECRET 설정 권장.
  const fallback = process.env.ADMIN_PASSWORD || "admin";
  // eslint-disable-next-line no-console
  console.warn("[password-vault] PASSWORD_VAULT_SECRET is not set. Falling back to key derived from ADMIN_PASSWORD.");
  return crypto.createHash("sha256").update(fallback, "utf8").digest();
}

export function encryptPassword(plain: string): string {
  const key = keyFromSecret(); // 32 bytes
  const iv = crypto.randomBytes(12); // GCM recommended 96-bit IV
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION_PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptPassword(payload: string): string {
  if (!payload || typeof payload !== "string") throw new Error("INVALID_PAYLOAD");
  if (!payload.startsWith(VERSION_PREFIX)) throw new Error("UNSUPPORTED_VERSION");
  const rest = payload.slice(VERSION_PREFIX.length);
  const [ivB64u, tagB64u, ctB64u] = rest.split(".");
  if (!ivB64u || !tagB64u || !ctB64u) throw new Error("MALFORMED_PAYLOAD");

  const key = keyFromSecret();
  const iv = Buffer.from(ivB64u, "base64url");
  const tag = Buffer.from(tagB64u, "base64url");
  const ciphertext = Buffer.from(ctB64u, "base64url");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}

