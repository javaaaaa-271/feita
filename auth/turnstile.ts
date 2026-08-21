export const TURNSTILE_TOKEN_HEADER = "x-feita-turnstile-token";
export const LOCAL_TURNSTILE_SITE_KEY = "1x00000000000000000000AA";
const LOCAL_TURNSTILE_SECRET_KEY =
  "1x0000000000000000000000000000000AA";
const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN_LENGTH = 2_048;

const TEST_SITE_KEYS = new Set([
  LOCAL_TURNSTILE_SITE_KEY,
  "2x00000000000000000000AB",
  "1x00000000000000000000BB",
  "2x00000000000000000000BB",
  "3x00000000000000000000FF",
]);
const TEST_SECRET_KEYS = new Set([
  LOCAL_TURNSTILE_SECRET_KEY,
  "2x0000000000000000000000000000000AA",
  "3x0000000000000000000000000000000AA",
]);

const PROTECTED_ACTIONS: Readonly<Record<string, string>> = {
  "/api/auth/sign-up/email": "signup",
  "/api/auth/email-otp/request-password-reset": "password_reset",
  "/api/auth/email-otp/send-verification-otp": "email_resend",
};

export type TurnstileEnvironment = {
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
};

export type TurnstileGateResult =
  | { status: "not-required" }
  | { status: "verified" }
  | { status: "rejected" }
  | { status: "unavailable" };

type SiteverifyResponse = {
  success?: boolean;
  hostname?: string;
  action?: string;
};

export class TurnstileConfigurationError extends Error {
  constructor() {
    super("Turnstile keys are required outside local development.");
    this.name = "TurnstileConfigurationError";
  }
}

export function resolveTurnstileConfiguration(
  environment: TurnstileEnvironment,
  requestURL: string,
): { siteKey: string; secretKey: string; usesLocalDefaults: boolean } {
  const local = isLocalTurnstileURL(requestURL);
  if (local) {
    return {
      siteKey: LOCAL_TURNSTILE_SITE_KEY,
      secretKey: LOCAL_TURNSTILE_SECRET_KEY,
      usesLocalDefaults: true,
    };
  }

  const configuredSiteKey = nonEmpty(environment.TURNSTILE_SITE_KEY);
  const configuredSecretKey = nonEmpty(environment.TURNSTILE_SECRET_KEY);
  const siteKey = configuredSiteKey;
  const secretKey = configuredSecretKey;

  if (
    !siteKey ||
    !secretKey ||
    TEST_SITE_KEYS.has(siteKey) ||
    TEST_SECRET_KEYS.has(secretKey)
  ) {
    throw new TurnstileConfigurationError();
  }

  return {
    siteKey,
    secretKey,
    usesLocalDefaults: false,
  };
}

export function turnstileActionForRequest(request: Request): string | null {
  if (request.method !== "POST") return null;
  return PROTECTED_ACTIONS[new URL(request.url).pathname] ?? null;
}

export async function verifyTurnstileForAuthRequest(options: {
  request: Request;
  environment: TurnstileEnvironment;
  fetcher?: typeof fetch;
}): Promise<TurnstileGateResult> {
  const action = turnstileActionForRequest(options.request);
  if (!action) return { status: "not-required" };

  let configuration: ReturnType<typeof resolveTurnstileConfiguration>;
  try {
    configuration = resolveTurnstileConfiguration(
      options.environment,
      options.request.url,
    );
  } catch {
    return { status: "unavailable" };
  }

  const token = options.request.headers.get(TURNSTILE_TOKEN_HEADER)?.trim();
  if (!token || token.length > MAX_TOKEN_LENGTH) {
    return { status: "rejected" };
  }

  const requestURL = new URL(options.request.url);
  const remoteIP = options.request.headers.get("cf-connecting-ip")?.trim();

  try {
    const response = await (options.fetcher ?? fetch)(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: configuration.secretKey,
        response: token,
        ...(remoteIP ? { remoteip: remoteIP } : {}),
        idempotency_key: crypto.randomUUID(),
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return { status: "unavailable" };

    const result = (await response.json()) as SiteverifyResponse;
    if (
      result.success !== true ||
      result.action !== action ||
      normalizeHostname(result.hostname) !== normalizeHostname(requestURL.hostname)
    ) {
      return { status: "rejected" };
    }

    return { status: "verified" };
  } catch {
    return { status: "unavailable" };
  }
}

export function turnstileGateResponse(
  result: TurnstileGateResult,
): Response | null {
  if (result.status === "not-required" || result.status === "verified") {
    return null;
  }

  if (result.status === "unavailable") {
    return Response.json(
      { message: "A proteção está indisponível. Tente novamente." },
      { status: 503 },
    );
  }

  return Response.json(
    { message: "Confirme a proteção e tente novamente." },
    { status: 403 },
  );
}

export function isLocalTurnstileURL(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

function normalizeHostname(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/^\[|\]$/g, "");
}

function nonEmpty(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
