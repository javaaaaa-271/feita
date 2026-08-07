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
import { getWorkerEnvironment, MissingLocalBindingError } from "@/db";
import { requireBinding } from "@/db/bindings.mjs";
import { ProductNotFoundError } from "@/catalog/products";
import {
  ImageRateLimitError,
  ImageStorageError,
  ImageValidationError,
  removeProductImage,
  replaceProductImage,
  type ImagesBinding,
  type WritableImagesBucket,
} from "./product-images";

export type ProductMediaRuntime = FeitaAuthRuntime & {
  bucket: WritableImagesBucket;
  images: ImagesBinding;
};

export type ProductMediaRuntimeFactory = (
  request: Request,
) => Promise<ProductMediaRuntime>;

export async function productMediaRuntimeForRequest(
  request: Request,
): Promise<ProductMediaRuntime> {
  const runtime = await authRuntimeForRequest(request);
  const environment = await getWorkerEnvironment();
  return {
    ...runtime,
    bucket: requireBinding(environment, "STORE_IMAGES") as WritableImagesBucket,
    images: requireBinding(environment, "IMAGES") as ImagesBinding,
  };
}

export async function handleProductImageRequest(options: {
  request: Request;
  storeId: string;
  productId: string;
  method: "PUT" | "DELETE";
  runtimeFactory?: ProductMediaRuntimeFactory;
}): Promise<Response> {
  try {
    const runtime = await (options.runtimeFactory ?? productMediaRuntimeForRequest)(
      options.request,
    );
    const secrets = resolveAuthRuntimeSecrets(runtime);
    const trustedOrigins = resolveTrustedOrigins(
      runtime.environment ?? {},
      secrets.usesLocalDefaults,
    );
    if (!requestOriginIsTrusted(options.request, trustedOrigins)) {
      throw new HostileOriginError();
    }

    const auth = createFeitaAuth(runtime);
    const session = await requireSession(auth, options.request.headers);
    const membership = await requireStoreMembership(
      runtime.database,
      session.user.id,
      options.storeId,
    );
    const common = {
      database: runtime.database,
      bucket: runtime.bucket,
      storeId: membership.storeId,
      storeSlug: membership.storeSlug,
      productId: options.productId,
      actorUserId: session.user.id,
    };
    const product =
      options.method === "PUT"
        ? await replaceProductImage({
            ...common,
            images: runtime.images,
            request: options.request,
          })
        : await removeProductImage(common);
    return Response.json({ product });
  } catch (error) {
    return productImageErrorResponse(error);
  }
}

function productImageErrorResponse(error: unknown): Response {
  if (error instanceof ImageValidationError) {
    return Response.json({ message: error.message }, { status: error.status });
  }
  if (error instanceof ImageRateLimitError) {
    return Response.json(
      { message: error.message },
      { status: error.status, headers: { "Retry-After": "60" } },
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
  if (
    error instanceof ImageStorageError ||
    error instanceof MissingLocalBindingError
  ) {
    return Response.json(
      { message: "Serviço de imagens indisponível." },
      { status: 503 },
    );
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
