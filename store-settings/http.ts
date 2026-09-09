import { AuthenticationRequiredError, requireSession, requireStoreMembership, StoreMembershipRequiredError } from "@/auth/authorization";
import { authRuntimeForRequest } from "@/auth/runtime";
import { AuthRuntimeConfigurationError, createFeitaAuth, resolveAuthRuntimeSecrets, resolveTrustedOrigins, type FeitaAuthRuntime } from "@/auth/server";
import { requestOriginIsTrusted } from "@/auth/security";
import { readStoreSettings, saveStoreSettings } from "./repository";
import { parseStoreSettings, SETTINGS_PAYLOAD_BYTES, StoreSettingsValidationError } from "./validation";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function readBody(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(declared) || declared < 0 || declared > SETTINGS_PAYLOAD_BYTES) {
    throw new StoreSettingsValidationError({ _form: "A solicitação é muito extensa." });
  }
  const reader = request.body?.getReader();
  if (!reader) throw new StoreSettingsValidationError({ _form: "Solicitação inválida." });
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > SETTINGS_PAYLOAD_BYTES) {
        await reader.cancel();
        throw new StoreSettingsValidationError({ _form: "A solicitação é muito extensa." });
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new StoreSettingsValidationError({ _form: "Solicitação inválida." }); }
}

export async function handleStoreSettingsRequest(options: {
  request: Request; storeId: string;
  runtimeFactory?: (request: Request) => Promise<FeitaAuthRuntime>;
}): Promise<Response> {
  const { request } = options;
  if (!["GET", "PATCH"].includes(request.method)) {
    return new Response(null, { status: 405, headers: { Allow: "GET, PATCH", "Cache-Control": "no-store" } });
  }
  try {
    const runtime = await (options.runtimeFactory ?? authRuntimeForRequest)(request);
    const secrets = resolveAuthRuntimeSecrets(runtime);
    const origins = resolveTrustedOrigins(runtime.environment ?? {}, secrets.usesLocalDefaults);
    if (request.method === "PATCH" && (!request.headers.get("origin") || !requestOriginIsTrusted(request, origins))) {
      return json({ message: "Solicitação recusada." }, 403);
    }
    const session = await requireSession(createFeitaAuth(runtime), request.headers);
    const membership = await requireStoreMembership(runtime.database, session.user.id, options.storeId);
    if (request.method === "GET") return json({ store: await readStoreSettings(runtime.database, membership) });
    const input = parseStoreSettings(await readBody(request));
    const store = await saveStoreSettings({ database: runtime.database, membership, userId: session.user.id, input });
    return json({ store });
  } catch (error) {
    if (error instanceof StoreSettingsValidationError) return json({ message: error.message, fields: error.fields }, 400);
    if (error instanceof AuthenticationRequiredError) return json({ message: "Autenticação necessária." }, 401);
    if (error instanceof StoreMembershipRequiredError) return json({ message: "Acesso não autorizado." }, 403);
    if (error instanceof AuthRuntimeConfigurationError) return json({ message: "Serviço de autenticação indisponível." }, 503);
    return json({ message: "Não foi possível salvar as configurações. Tente novamente." }, 500);
  }
}
