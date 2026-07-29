const encoder = new TextEncoder();

export function normalizeEmail(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

export async function hmacSha256Hex(
  secret: string,
  value: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

export function requestOriginIsTrusted(
  request: Request,
  trustedOrigins: readonly string[],
): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const normalized = new URL(origin).origin;
    return trustedOrigins.includes(normalized);
  } catch {
    return false;
  }
}

export function trustedClientIp(request: Request): string {
  const value = request.headers.get("cf-connecting-ip")?.trim();
  return value && value.length <= 64 ? value : "unknown";
}

export class RateLimitExceededError extends Error {
  constructor() {
    super("Muitas tentativas. Aguarde um pouco e tente novamente.");
    this.name = "RateLimitExceededError";
  }
}

export async function enforceIdentityRateLimit(options: {
  database: D1Database;
  hmacSecret: string;
  action: string;
  email: string;
  now?: number;
  windowSeconds: number;
  max: number;
}): Promise<void> {
  const now = options.now ?? Date.now();
  const windowMs = options.windowSeconds * 1000;
  const normalizedEmail = normalizeEmail(options.email);
  const keyDigest = await hmacSha256Hex(
    options.hmacSecret,
    `${options.action}:${normalizedEmail}`,
  );

  const row = await options.database
    .prepare(
      `INSERT INTO auth_identity_rate_limits (
         key_digest, action, count, window_started_at, updated_at
       ) VALUES (?1, ?2, 1, ?3, ?3)
       ON CONFLICT(key_digest) DO UPDATE SET
         count = CASE
           WHEN auth_identity_rate_limits.window_started_at <= ?4 THEN 1
           ELSE auth_identity_rate_limits.count + 1
         END,
         window_started_at = CASE
           WHEN auth_identity_rate_limits.window_started_at <= ?4 THEN ?3
           ELSE auth_identity_rate_limits.window_started_at
         END,
         updated_at = ?3
       RETURNING count`,
    )
    .bind(keyDigest, options.action, now, now - windowMs)
    .first<{ count: number }>();

  if (!row || Number(row.count) > options.max) {
    throw new RateLimitExceededError();
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
