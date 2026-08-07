import { findCatalogProduct, ProductNotFoundError } from "@/catalog/products";
import {
  MAX_INPUT_BYTES,
  MAX_OUTPUT_BYTES,
  dimensionsWithinLimits,
  hasWebPSignature,
  inspectImageStructure,
  isAcceptedStaticRaster,
  mimeForRasterKind,
  resizeOptions,
} from "./inspection";

export type ImagesInfo = {
  format?: string;
  fileSize?: number;
  width?: number;
  height?: number;
};

export type ImagesBinding = {
  info(stream: ReadableStream): Promise<ImagesInfo>;
  input(stream: ReadableStream): {
    transform(options: Record<string, unknown>): {
      output(options: { format: string }): Promise<{ response(): Response }>;
    };
  };
};

export type WritableImagesBucket = {
  get(key: string): Promise<{ body: ReadableStream } | null>;
  put(
    key: string,
    value: Uint8Array | ReadableStream,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
};

export class ImageValidationError extends Error {
  constructor(readonly status: 400 | 413 = 400) {
    super("A imagem enviada não é válida.");
    this.name = "ImageValidationError";
  }
}

export class ImageRateLimitError extends Error {
  readonly status = 429;
  constructor() {
    super("Muitas alterações de imagem. Aguarde e tente novamente.");
    this.name = "ImageRateLimitError";
  }
}

export class ImageStorageError extends Error {
  readonly status = 503;
  constructor() {
    super("O serviço de imagens está temporariamente indisponível.");
    this.name = "ImageStorageError";
  }
}

type ProductMediaRow = {
  id: string;
  image_media_id: string | null;
  object_key: string | null;
};

export async function replaceProductImage(options: {
  database: D1Database;
  bucket: WritableImagesBucket;
  images: ImagesBinding;
  request: Request;
  storeId: string;
  storeSlug: string;
  productId: string;
  actorUserId: string;
  now?: number;
}) {
  const current = await findProductMedia(
    options.database,
    options.storeId,
    options.productId,
  );
  await enforceImageMutationRateLimit({
    database: options.database,
    actorUserId: options.actorUserId,
    storeId: options.storeId,
    now: options.now,
  });

  const output = await transformUpload(options.request, options.images);
  const mediaId = crypto.randomUUID();
  const objectKey = `stores/${encodeURIComponent(options.storeId)}/products/${mediaId}.webp`;
  const now = options.now ?? Date.now();

  try {
    await options.bucket.put(objectKey, output, {
      httpMetadata: { contentType: "image/webp" },
    });
  } catch {
    throw new ImageStorageError();
  }

  try {
    const expected = current.image_media_id;
    const update = expected
      ? options.database
          .prepare(
            `UPDATE products SET image_media_id = ?1, updated_at = ?2
             WHERE id = ?3 AND tenant_id = ?4 AND image_media_id = ?5`,
          )
          .bind(mediaId, now, options.productId, options.storeId, expected)
      : options.database
          .prepare(
            `UPDATE products SET image_media_id = ?1, updated_at = ?2
             WHERE id = ?3 AND tenant_id = ?4 AND image_media_id IS NULL`,
          )
          .bind(mediaId, now, options.productId, options.storeId);
    const results = await options.database.batch([
      options.database
        .prepare(
          `INSERT INTO media (id, tenant_id, object_key, content_type, size_bytes, created_at)
           VALUES (?1, ?2, ?3, 'image/webp', ?4, ?5)`,
        )
        .bind(mediaId, options.storeId, objectKey, output.byteLength, now),
      update,
    ]);
    const changes = Number(results[1]?.meta?.changes ?? 0);
    if (changes !== 1) {
      await removeDetachedMedia(options.database, options.bucket, {
        id: mediaId,
        objectKey,
        storeId: options.storeId,
      });
      throw new ImageStorageError();
    }
  } catch (error) {
    if (!(error instanceof ImageStorageError)) {
      await bestEffortDeleteObject(options.bucket, objectKey);
    }
    throw error instanceof ImageStorageError ? error : new ImageStorageError();
  }

  if (current.image_media_id && current.object_key) {
    await removeDetachedMedia(options.database, options.bucket, {
      id: current.image_media_id,
      objectKey: current.object_key,
      storeId: options.storeId,
    });
  }

  return findCatalogProduct(
    options.database,
    options.storeId,
    options.storeSlug,
    options.productId,
  );
}

export async function removeProductImage(options: {
  database: D1Database;
  bucket: WritableImagesBucket;
  storeId: string;
  storeSlug: string;
  productId: string;
  actorUserId: string;
  now?: number;
}) {
  const current = await findProductMedia(
    options.database,
    options.storeId,
    options.productId,
  );
  await enforceImageMutationRateLimit({
    database: options.database,
    actorUserId: options.actorUserId,
    storeId: options.storeId,
    now: options.now,
  });

  if (current.image_media_id) {
    const result = await options.database
      .prepare(
        `UPDATE products SET image_media_id = NULL, updated_at = ?1
         WHERE id = ?2 AND tenant_id = ?3 AND image_media_id = ?4`,
      )
      .bind(
        options.now ?? Date.now(),
        options.productId,
        options.storeId,
        current.image_media_id,
      )
      .run();
    if (Number(result.meta?.changes ?? 0) !== 1) throw new ImageStorageError();
    if (current.object_key) {
      await removeDetachedMedia(options.database, options.bucket, {
        id: current.image_media_id,
        objectKey: current.object_key,
        storeId: options.storeId,
      });
    }
  }

  return findCatalogProduct(
    options.database,
    options.storeId,
    options.storeSlug,
    options.productId,
  );
}

export async function transformUpload(request: Request, images: ImagesBinding) {
  const bytes = await readRequestBytes(request);
  const structure = inspectImageStructure(bytes);
  if (!isAcceptedStaticRaster(structure)) throw new ImageValidationError();

  let info: ImagesInfo;
  try {
    info = await images.info(bytesStream(bytes));
  } catch {
    throw new ImageValidationError();
  }
  const width = Number(info.width);
  const height = Number(info.height);
  if (
    !dimensionsWithinLimits(width, height) ||
    info.format !== mimeForRasterKind(structure.kind)
  ) {
    throw new ImageValidationError();
  }

  try {
    const transformed = await images
      .input(bytesStream(bytes))
      .transform(resizeOptions(width, height))
      .output({ format: "image/webp" });
    const response = transformed.response();
    const output = await readLimitedStream(response.body, MAX_OUTPUT_BYTES);
    if (
      response.headers.get("content-type")?.split(";", 1)[0].trim() !== "image/webp" ||
      !hasWebPSignature(output)
    ) {
      throw new ImageValidationError();
    }
    return output;
  } catch (error) {
    if (error instanceof ImageValidationError) throw error;
    throw new ImageStorageError();
  }
}

async function findProductMedia(
  database: D1Database,
  storeId: string,
  productId: string,
): Promise<ProductMediaRow> {
  const row = await database
    .prepare(
      `SELECT p.id, p.image_media_id, m.object_key
       FROM products AS p
       LEFT JOIN media AS m
         ON m.id = p.image_media_id AND m.tenant_id = p.tenant_id
       WHERE p.id = ?1 AND p.tenant_id = ?2
       LIMIT 1`,
    )
    .bind(productId, storeId)
    .first<ProductMediaRow>();
  if (!row) throw new ProductNotFoundError();
  return row;
}

async function enforceImageMutationRateLimit(options: {
  database: D1Database;
  actorUserId: string;
  storeId: string;
  now?: number;
}) {
  const now = options.now ?? Date.now();
  const windowStartedAt = now - 60_000;
  const key = `media:${options.actorUserId}:${options.storeId}`;
  const row = await options.database
    .prepare(
      `INSERT INTO rate_limit (id, key, count, last_request)
       VALUES (?1, ?2, 1, ?3)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN last_request <= ?4 THEN 1 ELSE count + 1 END,
         last_request = CASE WHEN last_request <= ?4 THEN ?3 ELSE last_request END
       RETURNING count`,
    )
    .bind(crypto.randomUUID(), key, now, windowStartedAt)
    .first<{ count: number }>();
  if (!row || Number(row.count) > 10) throw new ImageRateLimitError();
}

async function removeDetachedMedia(
  database: D1Database,
  bucket: WritableImagesBucket,
  media: { id: string; objectKey: string; storeId: string },
) {
  const references = Number(
    await database
      .prepare("SELECT COUNT(*) AS total FROM products WHERE image_media_id = ?1")
      .bind(media.id)
      .first<number>("total"),
  );
  if (references > 0) return;
  try {
    await bucket.delete(media.objectKey);
  } catch {
    return;
  }
  await database
    .prepare(
      `DELETE FROM media
       WHERE id = ?1 AND tenant_id = ?2
         AND NOT EXISTS (SELECT 1 FROM products WHERE image_media_id = ?1)`,
    )
    .bind(media.id, media.storeId)
    .run();
}

async function bestEffortDeleteObject(bucket: WritableImagesBucket, key: string) {
  try {
    await bucket.delete(key);
  } catch {
    // The object is not public because no product points to it.
  }
}

async function readRequestBytes(request: Request) {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const parsed = Number(declaredLength);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > MAX_INPUT_BYTES) {
      throw new ImageValidationError(413);
    }
  }
  return readLimitedStream(request.body, MAX_INPUT_BYTES);
}

export async function readLimitedStream(
  stream: ReadableStream<Uint8Array> | null,
  maximumBytes: number,
) {
  if (!stream) return new Uint8Array();
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel();
        throw new ImageValidationError(413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function bytesStream(bytes: Uint8Array) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}
