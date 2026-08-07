import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { createFeitaAuth } from "../auth/server";
import { handleProductImageRequest, type ProductMediaRuntime } from "../media/http";
import {
  ImageRateLimitError,
  removeProductImage,
  transformUpload,
  type ImagesBinding,
  type WritableImagesBucket,
} from "../media/product-images";
import { findPublicMedia } from "../db/store-repository";
import { openLocalBindings } from "../scripts/local-bindings.mjs";
import { generateFixtures } from "../spikes/images-binding/generate-fixtures.mjs";

const wranglerExecutable = resolve("node_modules/wrangler/bin/wrangler.js");
const baseURL = "http://localhost:3000";
const authSecret = "images-test-auth-secret-with-at-least-32-characters";
const rateSecret = "images-test-rate-secret-with-at-least-32-characters";
const password = "frase segura das imagens de produto 2026";

function migrate(persistPath: string) {
  const result = spawnSync(
    process.execPath,
    [
      wranglerExecutable,
      "d1",
      "migrations",
      "apply",
      "feita-local",
      "--local",
      "--persist-to",
      persistPath,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}

function headers(cookie?: string, origin = baseURL) {
  const result = new Headers({
    origin,
    "cf-connecting-ip": "203.0.113.91",
    "user-agent": "Feita product images test",
  });
  if (cookie) result.set("cookie", cookie);
  return result;
}

function imageRequest(options: {
  path: string;
  method: "PUT" | "DELETE";
  cookie?: string;
  origin?: string;
  bytes?: Uint8Array;
  declaredType?: string;
}) {
  const requestHeaders = headers(options.cookie, options.origin);
  if (options.declaredType) requestHeaders.set("content-type", options.declaredType);
  return new Request(`${baseURL}${options.path}`, {
    method: options.method,
    headers: requestHeaders,
    body: options.bytes?.slice().buffer,
  });
}

class MemoryBucket implements WritableImagesBucket {
  readonly objects = new Map<string, Uint8Array>();
  failPut = false;
  failDelete = false;

  async get(key: string) {
    const bytes = this.objects.get(key);
    return bytes ? { body: bytesStream(bytes) } : null;
  }

  async put(key: string, value: Uint8Array | ReadableStream) {
    if (this.failPut) throw new Error("synthetic put failure");
    const bytes =
      value instanceof Uint8Array
        ? value
        : new Uint8Array(await new Response(value).arrayBuffer());
    this.objects.set(key, bytes);
  }

  async delete(key: string) {
    if (this.failDelete) throw new Error("synthetic delete failure");
    this.objects.delete(key);
  }
}

function createImagesBinding(outputWebP: Uint8Array): ImagesBinding {
  return {
    async info(stream) {
      const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
      const metadata = await sharp(bytes).metadata();
      const format =
        metadata.format === "jpeg"
          ? "image/jpeg"
          : metadata.format === "png"
            ? "image/png"
            : metadata.format === "webp"
              ? "image/webp"
              : metadata.format;
      return {
        format,
        fileSize: bytes.byteLength,
        width: metadata.width,
        height: metadata.height,
      };
    },
    input() {
      return {
        transform() {
          return {
            async output() {
              return {
                response: () =>
                  new Response(outputWebP.slice().buffer, {
                    headers: { "content-type": "image/webp" },
                  }),
              };
            },
          };
        },
      };
    },
  };
}

test("Marco 6.2 prova imagens autenticadas, isolamento e falhas parciais", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "feita-product-images-d1-"));
  migrate(directory);
  const platform = await openLocalBindings(join(directory, "v3"));
  const database = platform.database as unknown as D1Database;
  const fixtures = await generateFixtures();
  const fixture = (name: string) => {
    const found = fixtures.find((item) => item.name === name);
    assert.ok(found, `fixture ${name}`);
    return new Uint8Array(found.bytes);
  };
  const images = createImagesBinding(fixture("static-webp"));
  const bucket = new MemoryBucket();
  const environment = {
    BETTER_AUTH_SECRET: authSecret,
    RATE_LIMIT_HMAC_SECRET: rateSecret,
    AUTH_TRUSTED_ORIGINS: baseURL,
  };
  const auth = createFeitaAuth({
    database,
    request: new Request(`${baseURL}/api/auth/ok`),
    environment,
  });
  const now = Date.now();

  try {
    await database.batch([
      database
        .prepare(
          `INSERT INTO stores (
             id, slug, name, description, location, accent_color, whatsapp_e164,
             instagram, purchase_instructions, payment_methods_json, published,
             created_at, updated_at
           ) VALUES ('store-a', 'loja-a', 'Loja A', '', '', '#8a3f2d',
             '5563999990000', '', '', '["Pix"]', 1, ?1, ?1)`,
        )
        .bind(now),
      database
        .prepare(
          `INSERT INTO stores (
             id, slug, name, description, location, accent_color, whatsapp_e164,
             instagram, purchase_instructions, payment_methods_json, published,
             created_at, updated_at
           ) VALUES ('store-b', 'loja-b', 'Loja B', '', '', '#53664e',
             '5563999990001', '', '', '["Pix"]', 1, ?1, ?1)`,
        )
        .bind(now),
      ...["a", "b"].map((suffix) =>
        database
          .prepare(
            `INSERT INTO products (
               id, tenant_id, name, description, category, price_cents, stock,
               variations_json, published, available, sort_order, created_at, updated_at
             ) VALUES (?1, ?2, ?3, '', 'Teste', 1000, 3, '[]', 1, 1, 0, ?4, ?4)`,
          )
          .bind(`product-${suffix}`, `store-${suffix}`, `Produto ${suffix.toUpperCase()}`, now),
      ),
    ]);

    async function createUser(email: string, name: string, storeId: string) {
      await auth.api.signUpEmail({ body: { email, name, password }, headers: headers() });
      const userId = String(
        await database
          .prepare("SELECT id FROM user WHERE email = ?1")
          .bind(email)
          .first<string>("id"),
      );
      await database
        .prepare(
          "INSERT INTO store_memberships (id, user_id, store_id, role, created_at) VALUES (?1, ?2, ?3, 'store_owner', ?4)",
        )
        .bind(crypto.randomUUID(), userId, storeId, now)
        .run();
      return userId;
    }

    async function signIn(email: string) {
      const requestHeaders = headers();
      requestHeaders.set("content-type", "application/json");
      const response = await auth.handler(
        new Request(`${baseURL}/api/auth/sign-in/email`, {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify({ email, password }),
        }),
      );
      assert.equal(response.status, 200, await response.text());
      const cookie = response.headers.get("set-cookie")?.split(";")[0];
      assert.ok(cookie);
      return cookie;
    }

    const userA = await createUser("dona-a-images@example.test", "Dona A", "store-a");
    await createUser("dona-b-images@example.test", "Dona B", "store-b");
    const cookieA = await signIn("dona-a-images@example.test");
    const cookieB = await signIn("dona-b-images@example.test");
    const runtimeFactory = async (request: Request): Promise<ProductMediaRuntime> => ({
      database,
      request,
      environment,
      bucket,
      images,
    });
    const pathA = "/api/painel/stores/store-a/products/product-a/image";

    await t.test("upload identifica bytes reais, grava WebP e publica só no tenant correto", async () => {
      const response = await handleProductImageRequest({
        request: imageRequest({
          path: pathA,
          method: "PUT",
          cookie: cookieA,
          bytes: fixture("static-jpeg"),
          declaredType: "text/plain",
        }),
        storeId: "store-a",
        productId: "product-a",
        method: "PUT",
        runtimeFactory,
      });
      assert.equal(response.status, 200, await response.text());
      const mediaId = await database
        .prepare("SELECT image_media_id FROM products WHERE id = 'product-a'")
        .first<string>("image_media_id");
      assert.ok(mediaId);
      const row = await database
        .prepare("SELECT object_key, content_type FROM media WHERE id = ?1")
        .bind(mediaId)
        .first<{ object_key: string; content_type: string }>();
      assert.equal(row?.content_type, "image/webp");
      assert.ok(row && bucket.objects.has(row.object_key));
      assert.ok(await findPublicMedia(database, "loja-a", mediaId));
      assert.equal(await findPublicMedia(database, "loja-b", mediaId), null);
    });

    await t.test("IDOR falha antes de transformar ou gravar", async () => {
      const before = bucket.objects.size;
      let infoCalls = 0;
      const guardedImages: ImagesBinding = {
        ...images,
        async info(stream) {
          infoCalls += 1;
          return images.info(stream);
        },
      };
      const response = await handleProductImageRequest({
        request: imageRequest({
          path: "/api/painel/stores/store-a/products/product-b/image",
          method: "PUT",
          cookie: cookieA,
          bytes: fixture("static-png"),
        }),
        storeId: "store-a",
        productId: "product-b",
        method: "PUT",
        runtimeFactory: async (request) => ({
          database,
          request,
          environment,
          bucket,
          images: guardedImages,
        }),
      });
      assert.equal(response.status, 404);
      assert.equal(infoCalls, 0);
      assert.equal(bucket.objects.size, before);
    });

    await t.test("sessão, vínculo e origem hostil são recusados", async () => {
      const cases = [
        { cookie: undefined, origin: baseURL, status: 401 },
        { cookie: cookieB, origin: baseURL, status: 403 },
        { cookie: cookieA, origin: "https://attacker.example", status: 403 },
      ];
      for (const entry of cases) {
        const response = await handleProductImageRequest({
          request: imageRequest({
            path: pathA,
            method: "DELETE",
            cookie: entry.cookie,
            origin: entry.origin,
          }),
          storeId: "store-a",
          productId: "product-a",
          method: "DELETE",
          runtimeFactory,
        });
        assert.equal(response.status, entry.status);
      }
    });

    await t.test("falha de gravação preserva a mídia anterior", async () => {
      const beforeMedia = await database
        .prepare("SELECT image_media_id FROM products WHERE id = 'product-a'")
        .first<string>("image_media_id");
      const beforeObjects = new Map(bucket.objects);
      bucket.failPut = true;
      const response = await handleProductImageRequest({
        request: imageRequest({
          path: pathA,
          method: "PUT",
          cookie: cookieA,
          bytes: fixture("static-png"),
        }),
        storeId: "store-a",
        productId: "product-a",
        method: "PUT",
        runtimeFactory,
      });
      bucket.failPut = false;
      assert.equal(response.status, 503);
      assert.equal(
        await database
          .prepare("SELECT image_media_id FROM products WHERE id = 'product-a'")
          .first<string>("image_media_id"),
        beforeMedia,
      );
      assert.deepEqual(bucket.objects, beforeObjects);
    });

    await t.test("substituição revoga e limpa a mídia anterior", async () => {
      const oldMediaId = await database
        .prepare("SELECT image_media_id FROM products WHERE id = 'product-a'")
        .first<string>("image_media_id");
      assert.ok(oldMediaId);
      const oldKey = await database
        .prepare("SELECT object_key FROM media WHERE id = ?1")
        .bind(oldMediaId)
        .first<string>("object_key");
      assert.ok(oldKey);
      const response = await handleProductImageRequest({
        request: imageRequest({
          path: pathA,
          method: "PUT",
          cookie: cookieA,
          bytes: fixture("static-webp"),
        }),
        storeId: "store-a",
        productId: "product-a",
        method: "PUT",
        runtimeFactory,
      });
      assert.equal(response.status, 200);
      assert.equal(await findPublicMedia(database, "loja-a", oldMediaId), null);
      assert.equal(bucket.objects.has(oldKey), false);
      assert.equal(
        await database.prepare("SELECT id FROM media WHERE id = ?1").bind(oldMediaId).first(),
        null,
      );
    });

    await t.test("remoção revoga antes da limpeza e tolera falha no R2", async () => {
      const mediaId = await database
        .prepare("SELECT image_media_id FROM products WHERE id = 'product-a'")
        .first<string>("image_media_id");
      assert.ok(mediaId);
      bucket.failDelete = true;
      const response = await handleProductImageRequest({
        request: imageRequest({ path: pathA, method: "DELETE", cookie: cookieA }),
        storeId: "store-a",
        productId: "product-a",
        method: "DELETE",
        runtimeFactory,
      });
      bucket.failDelete = false;
      assert.equal(response.status, 200, await response.text());
      assert.equal(
        await database
          .prepare("SELECT image_media_id FROM products WHERE id = 'product-a'")
          .first("image_media_id"),
        null,
      );
      assert.equal(await findPublicMedia(database, "loja-a", mediaId), null);
      assert.ok(
        await database.prepare("SELECT id FROM media WHERE id = ?1").bind(mediaId).first(),
      );
    });

    await t.test("formatos proibidos e limites falham antes do armazenamento", async () => {
      for (const name of ["svg", "animated-gif", "animated-webp", "apng", "truncated", "fake-image", "oversized-pixels"]) {
        await assert.rejects(
          transformUpload(
            imageRequest({ path: pathA, method: "PUT", bytes: fixture(name) }),
            images,
          ),
        );
      }
      await assert.rejects(
        transformUpload(
          imageRequest({ path: pathA, method: "PUT", bytes: fixture("raw-too-large") }),
          images,
        ),
      );
    });

    await t.test("rate limit bloqueia a décima primeira mutação no minuto", async () => {
      for (let index = 0; index < 10; index += 1) {
        await removeProductImage({
          database,
          bucket,
          storeId: "store-a",
          storeSlug: "loja-a",
          productId: "product-a",
          actorUserId: `${userA}-rate-test`,
          now: now + 30_000,
        });
      }
      await assert.rejects(
        removeProductImage({
          database,
          bucket,
          storeId: "store-a",
          storeSlug: "loja-a",
          productId: "product-a",
          actorUserId: `${userA}-rate-test`,
          now: now + 30_000,
        }),
        ImageRateLimitError,
      );
    });
  } finally {
    await platform.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});

function bytesStream(bytes: Uint8Array) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}
