import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { respondWithPublicMedia } from "../db/public-media-response";
import {
  findPublicMedia,
  findPublicStoreBySlug,
} from "../db/store-repository";
import { openLocalBindings } from "../scripts/local-bindings.mjs";

const wranglerExecutable = resolve("node_modules/wrangler/bin/wrangler.js");

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

test("Marco 6.1.1 restringe mídia pública ao produto publicado atual", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "feita-public-media-d1-"));
  migrate(directory);
  const platform = await openLocalBindings(join(directory, "v3"));
  const database = platform.database as unknown as D1Database;
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
      database
        .prepare(
          `INSERT INTO stores (
             id, slug, name, description, location, accent_color, whatsapp_e164,
             instagram, purchase_instructions, payment_methods_json, published,
             created_at, updated_at
           ) VALUES ('store-hidden', 'loja-oculta', 'Loja Oculta', '', '', '#53664e',
             '5563999990002', '', '', '[]', 0, ?1, ?1)`,
        )
        .bind(now),
      ...[
        ["media-current-a", "store-a", "stores/store-a/current.webp"],
        ["media-next-a", "store-a", "stores/store-a/next.webp"],
        ["media-detached-a", "store-a", "stores/store-a/detached.webp"],
        ["media-unpublished-a", "store-a", "stores/store-a/unpublished.webp"],
        ["media-b", "store-b", "stores/store-b/current.webp"],
        ["media-cross-b", "store-b", "stores/store-b/cross.webp"],
        ["media-hidden", "store-hidden", "stores/store-hidden/current.webp"],
      ].map(([id, tenantId, objectKey]) =>
        database
          .prepare(
            `INSERT INTO media (
               id, tenant_id, object_key, content_type, size_bytes, created_at
             ) VALUES (?1, ?2, ?3, 'image/webp', 12, ?4)`,
          )
          .bind(id, tenantId, objectKey, now),
      ),
      database
        .prepare(
          `INSERT INTO products (
             id, tenant_id, name, description, category, price_cents, stock,
             variations_json, image_media_id, published, available, sort_order,
             created_at, updated_at
           ) VALUES ('product-a', 'store-a', 'Produto indisponível', '', 'Teste',
             1000, 3, '[]', 'media-current-a', 1, 0, 0, ?1, ?1)`,
        )
        .bind(now),
      database
        .prepare(
          `INSERT INTO products (
             id, tenant_id, name, description, category, price_cents, stock,
             variations_json, image_media_id, published, available, sort_order,
             created_at, updated_at
           ) VALUES ('product-no-media', 'store-a', 'Produto sem mídia', '', 'Teste',
             2000, 2, '[]', NULL, 1, 1, 1, ?1, ?1)`,
        )
        .bind(now),
      database
        .prepare(
          `INSERT INTO products (
             id, tenant_id, name, description, category, price_cents, stock,
             variations_json, image_media_id, published, available, sort_order,
             created_at, updated_at
           ) VALUES ('product-unpublished-a', 'store-a', 'Produto oculto', '', 'Teste',
             3000, 2, '[]', 'media-unpublished-a', 0, 1, 2, ?1, ?1)`,
        )
        .bind(now),
      database
        .prepare(
          `INSERT INTO products (
             id, tenant_id, name, description, category, price_cents, stock,
             variations_json, image_media_id, published, available, sort_order,
             created_at, updated_at
           ) VALUES ('product-b', 'store-b', 'Produto B', '', 'Teste',
             4000, 2, '[]', 'media-b', 1, 1, 0, ?1, ?1)`,
        )
        .bind(now),
      database
        .prepare(
          `INSERT INTO products (
             id, tenant_id, name, description, category, price_cents, stock,
             variations_json, image_media_id, published, available, sort_order,
             created_at, updated_at
           ) VALUES ('product-cross-a', 'store-a', 'Produto cruzado', '', 'Teste',
             5000, 2, '[]', 'media-cross-b', 1, 1, 3, ?1, ?1)`,
        )
        .bind(now),
      database
        .prepare(
          `INSERT INTO products (
             id, tenant_id, name, description, category, price_cents, stock,
             variations_json, image_media_id, published, available, sort_order,
             created_at, updated_at
           ) VALUES ('product-hidden-store', 'store-hidden', 'Produto da loja oculta', '',
             'Teste', 6000, 2, '[]', 'media-hidden', 1, 1, 0, ?1, ?1)`,
        )
        .bind(now),
    ]);

    await t.test("mídia atual de produto publicado aparece somente na loja correta", async () => {
      assert.deepEqual(await findPublicMedia(database, "loja-a", "media-current-a"), {
        objectKey: "stores/store-a/current.webp",
        contentType: "image/webp",
      });
      assert.equal(await findPublicMedia(database, "loja-b", "media-current-a"), null);
      assert.equal(await findPublicMedia(database, "loja-oculta", "media-hidden"), null);
    });

    await t.test("slug e tenant de outra loja não autorizam a mídia", async () => {
      assert.equal(await findPublicMedia(database, "loja-a", "media-b"), null);
      assert.equal(await findPublicMedia(database, "loja-b", "media-cross-b"), null);
    });

    await t.test("mídia sem produto associado não é pública", async () => {
      assert.equal(await findPublicMedia(database, "loja-a", "media-detached-a"), null);
    });

    await t.test("produto despublicado não expõe sua mídia", async () => {
      assert.equal(
        await findPublicMedia(database, "loja-a", "media-unpublished-a"),
        null,
      );
    });

    await t.test("available=false mantém produto e imagem visíveis, mas indisponíveis", async () => {
      const store = await findPublicStoreBySlug(database, "loja-a");
      const product = store?.products.find(({ id }) => id === "product-a");
      assert.equal(product?.available, false);
      assert.equal(
        product?.imageUrl,
        "/api/public/stores/loja-a/media/media-current-a",
      );
      assert.ok(await findPublicMedia(database, "loja-a", "media-current-a"));
    });

    await t.test("produto sem mídia preserva o fallback da vitrine", async () => {
      const store = await findPublicStoreBySlug(database, "loja-a");
      const product = store?.products.find(({ id }) => id === "product-no-media");
      assert.equal(product?.imageUrl, null);
    });

    await t.test("troca do ponteiro revoga imediatamente a mídia anterior", async () => {
      assert.ok(await findPublicMedia(database, "loja-a", "media-current-a"));
      await database
        .prepare(
          "UPDATE products SET image_media_id = ?1, updated_at = ?2 WHERE id = ?3",
        )
        .bind("media-next-a", now + 1, "product-a")
        .run();
      assert.equal(await findPublicMedia(database, "loja-a", "media-current-a"), null);
      assert.ok(await findPublicMedia(database, "loja-a", "media-next-a"));
    });

    await t.test("conhecer ID ou chave não contorna o join com produto", async () => {
      assert.equal(await findPublicMedia(database, "loja-a", "media-detached-a"), null);
      assert.equal(
        await findPublicMedia(database, "loja-a", "stores/store-a/detached.webp"),
        null,
      );
    });

    await t.test("negação no D1 não chama R2.get e não enumera recursos", async () => {
      let reads = 0;
      const readObject = async () => {
        reads += 1;
        return { body: "bytes que não devem ser lidos" };
      };
      const crossed = await respondWithPublicMedia({
        database,
        slug: "loja-a",
        mediaId: "media-b",
        readObject,
      });
      const missing = await respondWithPublicMedia({
        database,
        slug: "loja-a",
        mediaId: "media-inexistente",
        readObject,
      });
      assert.equal(reads, 0);
      assert.equal(crossed.status, 404);
      assert.equal(missing.status, crossed.status);
      assert.equal(await missing.text(), await crossed.text());
    });

    await t.test("resposta autorizada consulta o objeto e preserva headers seguros", async () => {
      const requestedKeys: string[] = [];
      const response = await respondWithPublicMedia({
        database,
        slug: "loja-a",
        mediaId: "media-next-a",
        readObject: async (objectKey) => {
          requestedKeys.push(objectKey);
          return { body: "webp fictício" };
        },
      });
      assert.equal(response.status, 200);
      assert.deepEqual(requestedKeys, ["stores/store-a/next.webp"]);
      assert.equal(response.headers.get("content-type"), "image/webp");
      assert.equal(response.headers.get("cache-control"), "public, max-age=3600");
      assert.equal(response.headers.get("content-disposition"), "inline");
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    });
  } finally {
    await platform.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});
