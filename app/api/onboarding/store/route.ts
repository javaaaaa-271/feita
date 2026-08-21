import { requireSession, AuthenticationRequiredError } from "@/auth/authorization";
import { authRuntimeForRequest } from "@/auth/runtime";
import { createFeitaAuth, resolveAuthRuntimeSecrets, resolveTrustedOrigins } from "@/auth/server";
import { requestOriginIsTrusted } from "@/auth/security";
import {
  createFirstStore,
  FirstStoreAlreadyCreatedError,
  FirstStoreValidationError,
  StoreSlugUnavailableError,
} from "@/onboarding/first-store";

const MAX_BODY_BYTES = 4 * 1024;

export async function POST(request: Request): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return Response.json({ message: "Solicitação muito grande." }, { status: 413 });
  }

  const runtime = await authRuntimeForRequest(request);
  let auth: ReturnType<typeof createFeitaAuth>;
  let trustedOrigins: string[];
  try {
    const secrets = resolveAuthRuntimeSecrets(runtime);
    trustedOrigins = resolveTrustedOrigins(runtime.environment ?? {}, secrets.usesLocalDefaults);
    auth = createFeitaAuth(runtime);
  } catch {
    return Response.json({ message: "Serviço indisponível." }, { status: 503 });
  }

  if (!requestOriginIsTrusted(request, trustedOrigins)) {
    return Response.json({ message: "Solicitação recusada." }, { status: 403 });
  }

  let session;
  try {
    session = await requireSession(auth, request.headers);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ message: "Confirme seu e-mail para continuar." }, { status: 401 });
    }
    throw error;
  }
  if (!session.user.emailVerified) {
    return Response.json({ message: "Confirme seu e-mail para continuar." }, { status: 403 });
  }

  let input: Record<string, unknown>;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return Response.json({ message: "Solicitação muito grande." }, { status: 413 });
    }
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("invalid body");
    }
    input = parsed as Record<string, unknown>;
  } catch {
    return Response.json({ message: "Solicitação inválida." }, { status: 400 });
  }

  try {
    const store = await createFirstStore({
      database: runtime.database,
      userId: session.user.id,
      input: {
        name: typeof input.name === "string" ? input.name : "",
        slug: typeof input.slug === "string" ? input.slug : "",
        location: typeof input.location === "string" ? input.location : "",
        whatsapp: typeof input.whatsapp === "string" ? input.whatsapp : "",
      },
    });
    return Response.json({
      ok: true,
      store: {
        name: store.name,
        publicPath: `/loja/${store.slug}`,
        panelPath: `/painel/lojas/${store.id}/produtos`,
      },
    });
  } catch (error) {
    if (
      error instanceof FirstStoreValidationError ||
      error instanceof FirstStoreAlreadyCreatedError ||
      error instanceof StoreSlugUnavailableError
    ) {
      return Response.json({ message: error.message }, { status: error.status });
    }
    return Response.json({ message: "Não foi possível criar a loja agora." }, { status: 500 });
  }
}
