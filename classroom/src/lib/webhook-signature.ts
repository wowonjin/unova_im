import crypto from "node:crypto";

export type SignatureConfig = {
  headerName: string;
  secret: string;
  algorithm: "sha256" | "sha1" | "sha512";
  encoding: "hex" | "base64";
  prefix: string | null; // e.g. "sha256="
};

export function getImwebSignatureConfig(): SignatureConfig | null {
  const secret = process.env.IMWEB_WEBHOOK_SECRET;
  if (!secret) return null;

  const headerName = (process.env.IMWEB_WEBHOOK_SIGNATURE_HEADER || "x-imweb-signature").toLowerCase();
  const algorithm = (process.env.IMWEB_WEBHOOK_HMAC_ALG || "sha256") as SignatureConfig["algorithm"];
  const encoding = (process.env.IMWEB_WEBHOOK_SIGNATURE_ENCODING || "hex") as SignatureConfig["encoding"];
  const prefixRaw = process.env.IMWEB_WEBHOOK_SIGNATURE_PREFIX;
  const prefix = prefixRaw && prefixRaw.trim().length ? prefixRaw.trim() : null;

  return { headerName, secret, algorithm, encoding, prefix };
}

export function verifyHmacSignature(rawBody: string, signatureHeader: string | null, cfg: SignatureConfig | null) {
  if (!cfg) return true; // 미설정이면 검증 스킵(초기 세팅 편의)
  if (!signatureHeader) return false;

  const expected = crypto.createHmac(cfg.algorithm, cfg.secret).update(rawBody).digest(cfg.encoding);

  let provided = signatureHeader.trim();
  if (cfg.prefix && provided.startsWith(cfg.prefix)) {
    provided = provided.slice(cfg.prefix.length);
  }

  // timingSafeEqual은 길이가 다르면 throw → 먼저 길이 체크
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}


