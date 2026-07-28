import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  queryAuthorizedMedia,
  queryPublicProducts,
  queryPublicStore,
} from "../db/store-queries.mjs";
import { openLocalBindings } from "../scripts/local-bindings.mjs";

const wranglerExecutable = resolve("node_modules/wrangler/bin/wrangler.js");

function migrate(persistPath) {
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

test("migração limpa persiste e consultas públicas não vazam entre duas lojas", async () => {
  const directory = await mkdtemp(join(tmpdir(), "feita-d1-"));
  try {
    migrate(directory);
    let platform = await openLocalBindings(join(directory, "v3"));
    const db = platform.database;
    const now = Date.now();
    await platform.bucket.put(
      "stores/store-b/media.webp",
      new Uint8Array([82, 50]),
      { httpMetadata: { contentType: "image/webp" } },
    );

    await db.batch([
      db.prepare(
        `INSERT INTO stores (
          id, slug, name, description, location, accent_color, whatsapp_e164,
          instagram, purchase_instructions, payment_methods_json, published,
          created_at, updated_at
        ) VALUES (?1, ?2, ?3, '', '', '#8a3f2d', '5563999990000', '', '', '[]', ?4, ?5, ?5)`,
      ).bind("store-a", "loja-a", "Loja A", 1, now),
      db.prepare(
        `INSERT INTO stores (
          id, slug, name, description, location, accent_color, whatsapp_e164,
          instagram, purchase_instructions, payment_methods_json, published,
          created_at, updated_at
        ) VALUES (?1, ?2, ?3, '', '', '#53664e', '5563999990001', '', '', '[]', ?4, ?5, ?5)`,
      ).bind("store-b", "loja-b", "Loja B", 1, now),
      db.prepare(
        `INSERT INTO stores (
          id, slug, name, description, location, accent_color, whatsapp_e164,
          instagram, purchase_instructions, payment_methods_json, published,
          created_at, updated_at
        ) VALUES ('hidden-store', 'oculta', 'Oculta', '', '', '#53664e',
          '5563999990002', '', '', '[]', 0, ?1, ?1)`,
      ).bind(now),
      db.prepare(
        `INSERT INTO products (
          id, tenant_id, name, description, category, price_cents, stock,
          variations_json, published, available, sort_order, created_at, updated_at
        ) VALUES (?1, ?2, ?3, '', 'Teste', 1000, 2, '[]', ?4, 1, 0, ?5, ?5)`,
      ).bind("product-a", "store-a", "Produto A", 1, now),
      db.prepare(
        `INSERT INTO products (
          id, tenant_id, name, description, category, price_cents, stock,
          variations_json, published, available, sort_order, created_at, updated_at
        ) VALUES (?1, ?2, ?3, '', 'Teste', 2000, 2, '[]', ?4, 1, 0, ?5, ?5)`,
      ).bind("product-b", "store-b", "Produto B", 1, now),
      db.prepare(
        `INSERT INTO products (
          id, tenant_id, name, description, category, price_cents, stock,
          variations_json, published, available, sort_order, created_at, updated_at
        ) VALUES ('hidden-product', 'store-a', 'Oculto', '', 'Teste', 1, 1,
          '[]', 0, 1, 1, ?1, ?1)`,
      ).bind(now),
      db.prepare(
        `INSERT INTO media (id, tenant_id, object_key, content_type, size_bytes, created_at)
         VALUES ('media-b', 'store-b', 'stores/store-b/media.webp', 'image/webp', 10, ?1)`,
      ).bind(now),
    ]);

    const storeA = await queryPublicStore(db, "loja-a");
    assert.equal(storeA.name, "Loja A");
    assert.equal(storeA.accent_color, "#8a3f2d");
    assert.equal(storeA.whatsapp_e164, "5563999990000");
    assert.equal(await queryPublicStore(db, "inexistente"), null);
    assert.equal(await queryPublicStore(db, "oculta"), null);
    assert.deepEqual(
      (await queryPublicProducts(db, "store-a")).map((row) => row.name),
      ["Produto A"],
    );
    assert.equal(await queryAuthorizedMedia(db, "loja-a", "media-b"), null);
    assert.equal(
      (await queryAuthorizedMedia(db, "loja-b", "media-b")).object_key,
      "stores/store-b/media.webp",
    );
    await platform.dispose();

    platform = await openLocalBindings(join(directory, "v3"));
    assert.equal((await queryPublicStore(platform.database, "loja-a")).name, "Loja A");
    const persistedImage = await platform.bucket.get("stores/store-b/media.webp");
    assert.deepEqual(
      Array.from(new Uint8Array(await persistedImage.arrayBuffer())),
      [82, 50],
    );
    await platform.dispose();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("superfície pública expõe somente leitura e fixture não entra na aplicação", () => {
  const apiRoot = resolve("app/api");
  const routeFiles = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name === "route.ts") routeFiles.push(path);
    }
  };
  walk(apiRoot);
  assert.ok(routeFiles.length > 0);
  for (const routeFile of routeFiles) {
    const source = readFileSync(routeFile, "utf8");
    assert.match(source, /export async function GET/);
    assert.doesNotMatch(source, /export async function (POST|PUT|PATCH|DELETE)/);
  }

  const applicationSources = [
    resolve("app/page.tsx"),
    resolve("app/loja/[slug]/storefront-client.tsx"),
  ];
  assert.ok(existsSync(resolve("data/first-store.example.json")));
  for (const source of applicationSources.map((path) => readFileSync(path, "utf8"))) {
    assert.doesNotMatch(source, /Ateliê Aurora|atelie-aurora/);
  }
});
