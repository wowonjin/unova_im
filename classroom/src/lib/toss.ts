import crypto from "crypto";

export function generateTossOrderId(): string {
  // Toss orderId: unique within merchant, keep it short and URL-safe
  // Example: TP-20251225-AB12CD34
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `TP-${y}${m}${day}-${rand}`;
}

export function getTossClientKey(): string {
  const v = process.env.TOSS_CLIENT_KEY || "";
  if (!v) throw new Error("TOSS_CLIENT_KEY_NOT_SET");
  return v;
}

export function getTossSecretKey(): string {
  const v = process.env.TOSS_SECRET_KEY || "";
  if (!v) throw new Error("TOSS_SECRET_KEY_NOT_SET");
  return v;
}

export function basicAuthHeader(secretKey: string): string {
  const token = Buffer.from(`${secretKey}:`).toString("base64");
  return `Basic ${token}`;
}


