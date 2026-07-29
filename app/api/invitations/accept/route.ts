import {
  acceptStoreInvitation,
  InvitationRejectedError,
} from "@/auth/invitations";
import { authRuntimeForRequest } from "@/auth/runtime";
import { createFeitaAuth, resolveTrustedOrigins } from "@/auth/server";
import {
  enforceIdentityRateLimit,
  normalizeEmail,
  RateLimitExceededError,
  requestOriginIsTrusted,
} from "@/auth/security";

export async function POST(request: Request): Promise<Response> {
  const runtime = await authRuntimeForRequest(request);
  const trustedOrigins = resolveTrustedOrigins(
    runtime.environment ?? {},
  );
  if (!requestOriginIsTrusted(request, trustedOrigins)) {
    return Response.json({ message: "Solicitação recusada." }, { status: 403 });
  }

  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ message: "Solicitação inválida." }, { status: 400 });
  }

  const email = typeof input.email === "string" ? normalizeEmail(input.email) : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const token = typeof input.token === "string" ? input.token.trim() : "";

  if (!email || !name || !password || !token) {
    return Response.json(
      { message: "Não foi possível aceitar o convite. Confira os dados." },
      { status: 400 },
    );
  }

  try {
    await enforceIdentityRateLimit({
      database: runtime.database,
      hmacSecret:
        runtime.environment?.RATE_LIMIT_HMAC_SECRET ??
        "feita-local-rate-limit-secret-not-valid-for-production-2026",
      action: "invitation-acceptance",
      email,
      windowSeconds: 60,
      max: 5,
    });
    await acceptStoreInvitation({
      database: runtime.database,
      auth: createFeitaAuth(runtime),
      headers: request.headers,
      email,
      name,
      password,
      token,
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof InvitationRejectedError) {
      return Response.json({ message: error.message }, { status: error.status });
    }
    if (error instanceof RateLimitExceededError) {
      return Response.json(
        { message: "Muitas tentativas. Aguarde e tente novamente." },
        { status: 429 },
      );
    }
    return Response.json(
      { message: "Não foi possível aceitar o convite." },
      { status: 500 },
    );
  }
}
