import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/schema";
import type {
  LocalEmailCapture,
  TransactionalEmailSender,
} from "./email";
import { createTransactionalEmailSender } from "./email";
import {
  enforceIdentityRateLimit,
  normalizeEmail,
  RateLimitExceededError,
} from "./security";

const PRODUCTION_ORIGIN =
  "https://projeto-vitrine-mvp.javaaaa-237.chatgpt.site";
const LOCAL_ORIGINS = ["http://localhost:3000", "http://localhost:5173"];
const LOCAL_AUTH_SECRET =
  "feita-local-development-secret-not-valid-for-production-2026";
const LOCAL_HMAC_SECRET =
  "feita-local-rate-limit-secret-not-valid-for-production-2026";

export type FeitaAuthEnvironment = {
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  AUTH_TRUSTED_ORIGINS?: string;
  RATE_LIMIT_HMAC_SECRET?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
};

export type FeitaAuthRuntime = {
  database: D1Database;
  environment?: FeitaAuthEnvironment;
  request?: Request;
  waitUntil?: (promise: Promise<unknown>) => void;
  emailSender?: TransactionalEmailSender;
  localEmailCapture?: LocalEmailCapture;
};

export function createFeitaAuth(runtime: FeitaAuthRuntime) {
  const environment = runtime.environment ?? {};
  const requestOrigin = runtime.request
    ? new URL(runtime.request.url).origin
    : LOCAL_ORIGINS[0];
  const trustedOrigins = resolveTrustedOrigins(environment);
  const isProductionOrigin = requestOrigin === PRODUCTION_ORIGIN;
  const secret =
    environment.BETTER_AUTH_SECRET ??
    (isProductionOrigin ? undefined : LOCAL_AUTH_SECRET);
  const hmacSecret =
    environment.RATE_LIMIT_HMAC_SECRET ??
    (isProductionOrigin ? undefined : LOCAL_HMAC_SECRET);

  if (!secret || !hmacSecret) {
    throw new Error(
      "Auth runtime secrets are required for the production origin.",
    );
  }

  const sender =
    runtime.emailSender ??
    createTransactionalEmailSender({
      resendApiKey: environment.RESEND_API_KEY,
      resendFrom: environment.RESEND_FROM,
      localCapture: runtime.localEmailCapture,
    });
  const db = drizzle(runtime.database, { schema });

  return betterAuth({
    appName: "Feita",
    basePath: "/api/auth",
    baseURL: environment.BETTER_AUTH_URL ?? requestOrigin,
    secret,
    trustedOrigins,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
    },
    account: {
      accountLinking: {
        disableImplicitLinking: true,
      },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "rateLimit",
      window: 60,
      max: 30,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/email-otp/request-password-reset": { window: 60, max: 3 },
        "/email-otp/reset-password": { window: 60, max: 5 },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (context) => {
        const action = identityLimitedAction(context.path);
        const email =
          context.body &&
          typeof context.body === "object" &&
          "email" in context.body &&
          typeof context.body.email === "string"
            ? context.body.email
            : null;
        if (!action || !email) return;

        try {
          await enforceIdentityRateLimit({
            database: runtime.database,
            hmacSecret,
            action,
            email: normalizeEmail(email),
            windowSeconds: 60,
            max: action === "password-reset-request" ? 3 : 5,
          });
        } catch (error) {
          if (error instanceof RateLimitExceededError) {
            throw new APIError("TOO_MANY_REQUESTS", {
              message: "Muitas tentativas. Aguarde e tente novamente.",
            });
          }
          throw error;
        }
      }),
    },
    plugins: [
      emailOTP({
        disableSignUp: true,
        otpLength: 6,
        expiresIn: 10 * 60,
        allowedAttempts: 3,
        resendStrategy: "rotate",
        storeOTP: "hashed",
        async sendVerificationOTP({ email, otp, type }) {
          if (type !== "forget-password") return;
          const delivery = sender.send({
            kind: "password-reset",
            to: email,
            code: otp,
            expiresInMinutes: 10,
          });
          if (runtime.waitUntil) {
            runtime.waitUntil(delivery.catch(() => undefined));
            return;
          }
          await delivery;
        },
      }),
    ],
    advanced: {
      useSecureCookies: requestOrigin.startsWith("https://"),
      defaultCookieAttributes: {
        httpOnly: true,
        secure: requestOrigin.startsWith("https://"),
        sameSite: "lax",
        path: "/",
      },
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
      backgroundTasks: runtime.waitUntil
        ? {
            handler: runtime.waitUntil,
          }
        : undefined,
    },
  });
}

export type FeitaAuth = ReturnType<typeof createFeitaAuth>;

export function resolveTrustedOrigins(
  environment: FeitaAuthEnvironment,
): string[] {
  const configured = (environment.AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      if (item.includes("*")) {
        throw new Error("AUTH_TRUSTED_ORIGINS does not accept wildcards.");
      }
      const url = new URL(item);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error("AUTH_TRUSTED_ORIGINS accepts only HTTP(S) origins.");
      }
      return url.origin;
    });

  return Array.from(
    new Set([
      PRODUCTION_ORIGIN,
      ...LOCAL_ORIGINS,
      ...configured,
    ]),
  );
}

function identityLimitedAction(path: string): string | null {
  if (path === "/sign-in/email") return "sign-in";
  if (path === "/email-otp/request-password-reset") {
    return "password-reset-request";
  }
  if (path === "/email-otp/reset-password") return "password-reset";
  return null;
}
