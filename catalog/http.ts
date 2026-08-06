import {
  AuthenticationRequiredError,
  requireSession,
  requireStoreMembership,
  StoreMembershipRequiredError,
} from "@/auth/authorization";
import { authRuntimeForRequest } from "@/auth/runtime";
import {
  AuthRuntimeConfigurationError,
  createFeitaAuth,
  resolveAuthRuntimeSecrets,
  resolveTrustedOrigins,
  type FeitaAuthRuntime,
} from "@/auth/server";
import { requestOriginIsTrusted } from "@/auth/security";
import {
  createCatalogProduct,
  findCatalogProduct,
  listCatalogProducts,
  parseProductInput,
  PRODUCT_LIMITS,
  ProductNotFoundError,
  ProductValidationError,
  updateCatalogProduct,
  type ProductInput,
  type ProductPatch,
} from "./products";

export type CatalogRuntimeFactory = (
  request: Request,
) => Promise<FeitaAuthRuntime>;

export async function handleProductCollectionRequest(options: {
  request: Request;
  storeId: string;
  method: "GET" | "POST";
  runtimeFactory?: CatalogRuntimeFactory;
}): Promise<Response> {
  try {
    const context = await authorizeCatalogRequest({
      request: options.request,
      storeId: options.storeId,
      mutation: options.method === "POST",
      runtimeFactory: options.runtimeFactory,
    });
    if (options.method === "GET") {
      return Response.json({
        store: context.membership,
        products: await listCatalogProducts(
          context.runtime.database,
          context.membership.storeId,
          context.membership.storeSlug,
        ),
      });
    }

    const body = await readProductBody(options.request);
    const input = parseProductInput(body, "create") as ProductInput;
    const product = await createCatalogProduct({
      database: context.runtime.database,
      storeId: context.membership.storeId,
      storeSlug: context.membership.storeSlug,
      input,
    });
    return Response.json({ product }, { status: 201 });
  } catch (error) {
    return catalogErrorResponse(error);
  }
}

export async function handleProductResourceRequest(options: {
  request: Request;
  storeId: string;
  productId: string;
  method: "GET" | "PATCH";
  runtimeFactory?: CatalogRuntimeFactory;
}): Promise<Response> {
  try {
    const context = await authorizeCatalogRequest({
      request: options.request,
      storeId: options.storeId,
      mutation: options.method === "PATCH",
      runtimeFactory: options.runtimeFactory,
    });
    if (options.method === "GET") {
      return Response.json({
        product: await findCatalogProduct(
          context.runtime.database,
          context.membership.storeId,
          context.membership.storeSlug,
          options.productId,
        ),
      });
    }

    const body = await readProductBody(options.request);
    const patch = parseProductInput(body, "patch") as ProductPatch;
    const product = await updateCatalogProduct({
      database: context.runtime.database,
      storeId: context.membership.storeId,
      storeSlug: context.membership.storeSlug,
      productId: options.productId,
      patch,
    });
    return Response.json({ product });
  } catch (error) {
    return catalogErrorResponse(error);
  }
}

async function authorizeCatalogRequest(options: {
  request: Request;
  storeId: string;
  mutation: boolean;
  runtimeFactory?: CatalogRuntimeFactory;
}) {
  const runtime = await (options.runtimeFactory ?? authRuntimeForRequest)(
    options.request,
  );
  const secrets = resolveAuthRuntimeSecrets(runtime);
  const trustedOrigins = resolveTrustedOrigins(
    runtime.environment ?? {},
    secrets.usesLocalDefaults,
  );
  if (
    options.mutation &&
    !requestOriginIsTrusted(options.request, trustedOrigins)
  ) {
    throw new HostileOriginError();
  }
  const auth = createFeitaAuth(runtime);
  const session = await requireSession(auth, options.request.headers);
  const membership = await requireStoreMembership(
    runtime.database,
    session.user.id,
    options.storeId,
  );
  return { runtime, membership };
}

async function readProductBody(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (
    !Number.isFinite(declaredLength) ||
    declaredLength < 0 ||
    declaredLength > PRODUCT_LIMITS.payloadBytes
  ) {
    throw new ProductValidationError({ _form: "A solicitação é muito extensa." });
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > PRODUCT_LIMITS.payloadBytes) {
    throw new ProductValidationError({ _form: "A solicitação é muito extensa." });
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ProductValidationError({ _form: "Solicitação inválida." });
  }
}

function catalogErrorResponse(error: unknown): Response {
  if (error instanceof ProductValidationError) {
    return Response.json(
      { message: error.message, fields: error.fields },
      { status: error.status },
    );
  }
  if (error instanceof ProductNotFoundError) {
    return Response.json({ message: error.message }, { status: error.status });
  }
  if (error instanceof AuthenticationRequiredError) {
    return Response.json({ message: "Autenticação necessária." }, { status: 401 });
  }
  if (error instanceof StoreMembershipRequiredError) {
    return Response.json({ message: "Acesso não autorizado." }, { status: 403 });
  }
  if (error instanceof HostileOriginError) {
    return Response.json({ message: "Solicitação recusada." }, { status: 403 });
  }
  if (error instanceof AuthRuntimeConfigurationError) {
    return Response.json(
      { message: "Serviço de autenticação indisponível." },
      { status: 503 },
    );
  }
  return Response.json(
    { message: "Não foi possível concluir a solicitação." },
    { status: 500 },
  );
}

class HostileOriginError extends Error {}
