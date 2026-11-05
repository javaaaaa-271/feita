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

export const MAX_INVITATION_BODY_BYTES = 4 * 1024;

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
    auth = createFeitaAuth({
      ...runtime,
      allowUnverifiedPasswordProof: true,
    });
  } catch {
    return Response.json(
      { message: "Serviço de autenticação indisponível." },
      { status: 503 },
    );
  }
  if (!requestOriginIsTrusted(request, trustedOrigins)) {
    return Response.json({ message: "Solicitação recusada." }, { status: 403 });
  }

  const parsed = await readJsonObjectBody(request);
  if (!parsed.ok) {
    return Response.json(
      { message: parsed.status === 413 ? "Solicitação muito grande." : "Solicitação inválida." },
      { status: parsed.status },
    );
  }

  const input = parsed.value;

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

export async function readJsonObjectBody(
  request: Request,
): Promise<
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; status: 400 | 413 }
> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (
      !Number.isSafeInteger(length) ||
      length < 0 ||
      length > MAX_INVITATION_BODY_BYTES
    ) {
      return { ok: false, status: 413 };
    }
  }

  const reader = request.body?.getReader();
  if (!reader) return { ok: false, status: 400 };

  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > MAX_INVITATION_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, status: 413 };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400 };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    return value && typeof value === "object" && !Array.isArray(value)
      ? { ok: true, value: value as Record<string, unknown> }
      : { ok: false, status: 400 };
  } catch {
    return { ok: false, status: 400 };
  }
}
