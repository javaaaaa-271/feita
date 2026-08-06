import {
  acceptStoreInvitation,
  InvitationRejectedError,
} from "@/auth/invitations";
import { authRuntimeForRequest } from "@/auth/runtime";
import {
  createFeitaAuth,
  resolveAuthRuntimeSecrets,
  resolveTrustedOrigins,
} from "@/auth/server";
import {
  enforceIdentityRateLimit,
  normalizeEmail,
  RateLimitExceededError,
  requestOriginIsTrusted,
} from "@/auth/security";

export async function POST(request: Request): Promise<Response> {
  const runtime = await authRuntimeForRequest(request);
  let hmacSecret: string;
  let auth: ReturnType<typeof createFeitaAuth>;
  let trustedOrigins: string[];
  try {
    const secrets = resolveAuthRuntimeSecrets(runtime);
    hmacSecret = secrets.hmacSecret;
    trustedOrigins = resolveTrustedOrigins(
      runtime.environment ?? {},
      secrets.usesLocalDefaults,
    );
    auth = createFeitaAuth(runtime);
  } catch {
    return Response.json(
      { message: "Serviço de autenticação indisponível." },
      { status: 503 },
    );
  }
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
      hmacSecret,
      action: "invitation-acceptance",
      email,
      windowSeconds: 60,
      max: 5,
    });
    await acceptStoreInvitation({
      database: runtime.database,
      auth,
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
