export const MARCO_6_3B_SECRET_HEADER = "x-feita-ensaio-secret";
export const MARCO_6_3B_MINIMUM_SECRET_BYTES = 32;
export const MARCO_6_3B_MAX_UPLOAD_ATTEMPTS = 25;
export const MARCO_6_3B_MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
export const MARCO_6_3B_MAX_SINGLE_UPLOAD_BYTES = 8 * 1024 * 1024;

const UPLOAD_BUDGET_SCOPE = "marco-6-3b";
const PRODUCT_IMAGE_UPLOAD_PATH =
  /^\/api\/painel\/stores\/[^/]+\/products\/[^/]+\/image\/?$/;

type TrialGuardEnvironment = {
  DB: D1Database;
  MARCO_6_3B_ACCESS_SECRET?: string;
};

export type TrialGuardResult =
  | { request: Request; response?: never }
  | { request?: never; response: Response };

export async function guardMarco63BRequest(
  request: Request,
  environment: TrialGuardEnvironment,
): Promise<TrialGuardResult> {
  if (
    !(await secretsMatch(
      environment.MARCO_6_3B_ACCESS_SECRET,
      request.headers.get(MARCO_6_3B_SECRET_HEADER),
    ))
  ) {
    return { response: deniedResponse() };
  }

  if (new URL(request.url).pathname === "/_vinext/image") {
    return { response: deniedResponse() };
  }
  if (!isProductImageUpload(request)) return { request: withoutTrialSecret(request) };
  return guardUploadBudget(request, environment);
}

export async function reserveMarco63BUpload(
  database: D1Database,
  byteLength: number,
  now = Date.now(),
): Promise<boolean> {
  if (
    !Number.isSafeInteger(byteLength) ||
    byteLength < 0 ||
    byteLength > MARCO_6_3B_MAX_SINGLE_UPLOAD_BYTES
  ) {
    return false;
  }

  const row = await database
    .prepare(
      `INSERT INTO marco_6_3b_upload_budget (
         scope, upload_attempts, upload_bytes, updated_at
       ) VALUES (?1, 1, ?2, ?3)
       ON CONFLICT(scope) DO UPDATE SET
         upload_attempts = upload_attempts + 1,
         upload_bytes = upload_bytes + excluded.upload_bytes,
         updated_at = excluded.updated_at
       WHERE upload_attempts < ?4
         AND upload_bytes <= ?5 - excluded.upload_bytes
       RETURNING upload_attempts, upload_bytes`,
    )
    .bind(
      UPLOAD_BUDGET_SCOPE,
      byteLength,
      now,
      MARCO_6_3B_MAX_UPLOAD_ATTEMPTS,
      MARCO_6_3B_MAX_UPLOAD_BYTES,
    )
    .first<{ upload_attempts: number; upload_bytes: number }>();

  return row !== null;
}

async function guardUploadBudget(
  request: Request,
  environment: TrialGuardEnvironment,
): Promise<TrialGuardResult> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const parsed = Number(declaredLength);
    if (
      !Number.isSafeInteger(parsed) ||
      parsed < 0 ||
      parsed > MARCO_6_3B_MAX_SINGLE_UPLOAD_BYTES
    ) {
      return { response: uploadTooLargeResponse() };
    }
  }

  let bytes: Uint8Array | null;
  try {
    bytes = await readBoundedBody(request.body);
  } catch {
    return { response: invalidUploadResponse() };
  }
  if (!bytes) return { response: uploadTooLargeResponse() };

  let reserved: boolean;
  try {
    reserved = await reserveMarco63BUpload(environment.DB, bytes.byteLength);
  } catch {
    return { response: budgetUnavailableResponse() };
  }
  if (!reserved) return { response: budgetExhaustedResponse() };

  const headers = new Headers(request.headers);
  headers.set("content-length", String(bytes.byteLength));
  headers.delete(MARCO_6_3B_SECRET_HEADER);
  return {
    request: new Request(request, {
      body: bytes.buffer as ArrayBuffer,
      headers,
    }),
  };
}

async function secretsMatch(
  configuredSecret: string | undefined,
  suppliedSecret: string | null,
): Promise<boolean> {
  if (
    !configuredSecret ||
    !suppliedSecret ||
    new TextEncoder().encode(configuredSecret).byteLength <
      MARCO_6_3B_MINIMUM_SECRET_BYTES
  ) {
    return false;
  }

  const [configuredDigest, suppliedDigest] = await Promise.all([
    digest(configuredSecret),
    digest(suppliedSecret),
  ]);
  return crypto.subtle.timingSafeEqual(configuredDigest, suppliedDigest);
}

async function digest(value: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
}

async function readBoundedBody(
  stream: ReadableStream<Uint8Array> | null,
): Promise<Uint8Array | null> {
  if (!stream) return new Uint8Array();
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MARCO_6_3B_MAX_SINGLE_UPLOAD_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function isProductImageUpload(request: Request): boolean {
  return (
    request.method === "PUT" &&
    PRODUCT_IMAGE_UPLOAD_PATH.test(new URL(request.url).pathname)
  );
}

function withoutTrialSecret(request: Request): Request {
  const headers = new Headers(request.headers);
  headers.delete(MARCO_6_3B_SECRET_HEADER);
  return new Request(request, { headers });
}

function deniedResponse(): Response {
  return trialJsonResponse(404, "Recurso indisponível.");
}

function uploadTooLargeResponse(): Response {
  return trialJsonResponse(413, "A imagem excede o limite permitido.");
}

function invalidUploadResponse(): Response {
  return trialJsonResponse(400, "A imagem enviada não é válida.");
}

function budgetExhaustedResponse(): Response {
  return trialJsonResponse(429, "O limite do ensaio foi atingido.");
}

function budgetUnavailableResponse(): Response {
  return trialJsonResponse(503, "O ensaio está temporariamente indisponível.");
}

function trialJsonResponse(status: number, message: string): Response {
  return Response.json(
    { message },
    {
      status,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
