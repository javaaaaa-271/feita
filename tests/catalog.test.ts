import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { resolveStoreSelection } from "../auth/authorization";
import { summarizeDashboard } from "../app/painel/dashboard-summary";
import { createFeitaAuth, type FeitaAuthRuntime } from "../auth/server";
import {
  handleProductCollectionRequest,
  handleProductResourceRequest,
} from "../catalog/http";
import {
  parseBrazilianPriceToCents,
  parseProductInput,
  ProductValidationError,
} from "../catalog/products";
import { findPublicStoreBySlug } from "../db/store-repository";
import { handleStoreSettingsRequest } from "../store-settings/http";
import { isReadableStoreColor, parseStoreSettings, StoreSettingsValidationError } from "../store-settings/validation";
import { saveStoreSettings } from "../store-settings/repository";
import { requireStoreMembership, StoreMembershipRequiredError } from "../auth/authorization";
import { openLocalBindings } from "../scripts/local-bindings.mjs";

const wranglerExecutable = resolve("node_modules/wrangler/bin/wrangler.js");
const baseURL = "http://localhost:3000";
const authSecret = "catalog-test-auth-secret-with-at-least-32-characters";
const rateSecret = "catalog-test-rate-secret-with-at-least-32-characters";
const password = "frase segura do catálogo persistente 2026";

test("painel resume o catálogo e escolhe a próxima ação sem inventar vendas", () => {
  const empty = summarizeDashboard([]);
  assert.deepEqual(
    {
      completedSteps: empty.completedSteps,
      nextAction: empty.nextAction,
      publishedProducts: empty.publishedProducts,
      totalProducts: empty.totalProducts,
      unavailableProducts: empty.unavailableProducts,
    },
    {
      completedSteps: 1,
      nextAction: "create-product",
      publishedProducts: 0,
      totalProducts: 0,
      unavailableProducts: 0,
    },
  );

  const withProducts = summarizeDashboard([
    {
      available: true,
      imageUrl: "/foto.webp",
      published: true,
      stock: 4,
    },
    {
      available: false,
      imageUrl: null,
      published: false,
      stock: 0,
    },
  ]);
  assert.equal(withProducts.completedSteps, 4);
  assert.equal(withProducts.nextAction, "review-store");
  assert.equal(withProducts.publishedProducts, 1);
  assert.equal(withProducts.totalProducts, 2);
  assert.equal(withProducts.unavailableProducts, 1);
});

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
    "content-type": "application/json",
    "cf-connecting-ip": "203.0.113.90",
    "user-agent": "Feita catalog test",
  });
  if (cookie) result.set("cookie", cookie);
  return result;
}

function request(options: {
  path: string;
  method?: string;
  cookie?: string;
  origin?: string;
  body?: unknown;
}) {
  return new Request(`${baseURL}${options.path}`, {
    method: options.method ?? "GET",
    headers: headers(options.cookie, options.origin),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

function productInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Caderno Persistente",
    description: "Feito à mão com capa dura.",
    category: "Papelaria",
    price: "29,90",
    stock: "8",
    variations: ["Azul", "Verde"],
    published: false,
    available: true,
    ...overrides,
  };
}

test("Marco 6.1 prova catálogo autenticado e isolamento entre lojas", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "feita-catalog-d1-"));
  migrate(directory);
  const platform = await openLocalBindings(join(directory, "v3"));
  const database = platform.database as unknown as D1Database;
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
  const runtimeFactory = async (incoming: Request): Promise<FeitaAuthRuntime> => ({
    database,
    request: incoming,
    environment,
  });
  const now = Date.now();

  async function createUser(email: string, name: string) {
    await auth.api.signUpEmail({
      body: { email, name, password },
      headers: headers(),
    });
    const userId = String(
      await database
        .prepare("SELECT id FROM user WHERE email = ?1")
        .bind(email)
        .first<string>("id"),
    );
    await database
      .prepare("UPDATE user SET email_verified = 1, updated_at = ?1 WHERE id = ?2")
      .bind(Date.now(), userId)
      .run();
    return userId;
  }

  async function signIn(email: string) {
    const response = await auth.handler(
      request({
        path: "/api/auth/sign-in/email",
        method: "POST",
        body: { email, password },
      }),
    );
    assert.equal(response.status, 200, await response.text());
    const cookie = response.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie);
    return cookie;
  }

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
          `INSERT INTO products (
             id, tenant_id, name, description, category, price_cents, stock,
             variations_json, image_media_id, published, available, sort_order,
             created_at, updated_at
           ) VALUES ('product-a', 'store-a', 'Produto A', '', 'Teste', 1000, 3,
             '[]', NULL, 1, 1, 0, ?1, ?1)`,
        )
        .bind(now),
      database
        .prepare(
          `INSERT INTO products (
             id, tenant_id, name, description, category, price_cents, stock,
             variations_json, image_media_id, published, available, sort_order,
             created_at, updated_at
           ) VALUES ('product-b', 'store-b', 'Produto B', '', 'Teste', 2000, 4,
             '[]', NULL, 1, 1, 0, ?1, ?1)`,
        )
        .bind(now),
    ]);

    const userA = await createUser("dona-a-catalogo@example.test", "Dona A");
    const userB = await createUser("dona-b-catalogo@example.test", "Dona B");
    const userNoStore = await createUser("sem-loja-catalogo@example.test", "Sem Loja");
    const userMulti = await createUser("multi-catalogo@example.test", "Duas Lojas");
    await database.batch([
      database
        .prepare(
          "INSERT INTO store_memberships (id, user_id, store_id, role, created_at) VALUES (?1, ?2, 'store-a', 'store_owner', ?3)",
        )
        .bind(crypto.randomUUID(), userA, now),
      database
        .prepare(
          "INSERT INTO store_memberships (id, user_id, store_id, role, created_at) VALUES (?1, ?2, 'store-b', 'store_owner', ?3)",
        )
        .bind(crypto.randomUUID(), userB, now),
      database
        .prepare(
          "INSERT INTO store_memberships (id, user_id, store_id, role, created_at) VALUES (?1, ?2, 'store-a', 'store_owner', ?3)",
        )
        .bind(crypto.randomUUID(), userMulti, now),
      database
        .prepare(
          "INSERT INTO store_memberships (id, user_id, store_id, role, created_at) VALUES (?1, ?2, 'store-b', 'store_owner', ?3)",
        )
        .bind(crypto.randomUUID(), userMulti, now),
    ]);
    void userNoStore;

    const cookieA = await signIn("dona-a-catalogo@example.test");
    const cookieB = await signIn("dona-b-catalogo@example.test");
    const cookieNoStore = await signIn("sem-loja-catalogo@example.test");

    await t.test("cada lojista lista somente os produtos da própria loja", async () => {
      const responseA = await handleProductCollectionRequest({
        request: request({ path: "/api/painel/stores/store-a/products", cookie: cookieA }),
        storeId: "store-a",
        method: "GET",
        runtimeFactory,
      });
      const responseB = await handleProductCollectionRequest({
        request: request({ path: "/api/painel/stores/store-b/products", cookie: cookieB }),
        storeId: "store-b",
        method: "GET",
        runtimeFactory,
      });
      assert.equal(responseA.status, 200);
      assert.equal(responseB.status, 200);
      assert.deepEqual(
        ((await responseA.json()) as { products: { id: string }[] }).products.map((item) => item.id),
        ["product-a"],
      );
      assert.deepEqual(
        ((await responseB.json()) as { products: { id: string }[] }).products.map((item) => item.id),
        ["product-b"],
      );
    });

    let createdProductId = "";
    await t.test("criação ignora qualquer tentativa de trocar o tenant", async () => {
      const created = await handleProductCollectionRequest({
        request: request({
          path: "/api/painel/stores/store-a/products",
          method: "POST",
          cookie: cookieA,
          body: productInput(),
        }),
        storeId: "store-a",
        method: "POST",
        runtimeFactory,
      });
      assert.equal(created.status, 201);
      const createdBody = (await created.json()) as { product: { id: string } };
      createdProductId = createdBody.product.id;
      assert.equal(
        await database
          .prepare("SELECT tenant_id FROM products WHERE id = ?1")
          .bind(createdProductId)
          .first<string>("tenant_id"),
        "store-a",
      );

      for (const injectedField of ["storeId", "tenantId", "userId"]) {
        const injected = await handleProductCollectionRequest({
          request: request({
            path: "/api/painel/stores/store-a/products",
            method: "POST",
            cookie: cookieA,
            body: productInput({ [injectedField]: "store-b" }),
          }),
          storeId: "store-a",
          method: "POST",
          runtimeFactory,
        });
        assert.equal(injected.status, 400);
      }
      assert.equal(
        Number(
          await database
            .prepare("SELECT COUNT(*) AS total FROM products WHERE tenant_id = 'store-b'")
            .first<number>("total"),
        ),
        1,
      );
    });

    await t.test("produto criado persiste e alterações ficam na Loja A", async () => {
      const listed = await handleProductCollectionRequest({
        request: request({ path: "/api/painel/stores/store-a/products", cookie: cookieA }),
        storeId: "store-a",
        method: "GET",
        runtimeFactory,
      });
      const ids = ((await listed.json()) as { products: { id: string }[] }).products.map(
        (item) => item.id,
      );
      assert.ok(ids.includes(createdProductId));

      const updated = await handleProductResourceRequest({
        request: request({
          path: `/api/painel/stores/store-a/products/${createdProductId}`,
          method: "PATCH",
          cookie: cookieA,
          body: { name: "Caderno Atualizado", price: "1.234,56", stock: "5" },
        }),
        storeId: "store-a",
        productId: createdProductId,
        method: "PATCH",
        runtimeFactory,
      });
      assert.equal(updated.status, 200, await updated.text());
      assert.deepEqual(
        await database
          .prepare("SELECT name, price_cents, stock FROM products WHERE id = 'product-b'")
          .first(),
        { name: "Produto B", price_cents: 2000, stock: 4 },
      );
    });

    await t.test("IDOR de leitura e mutação responde 404 e não altera a Loja B", async () => {
      const before = await database
        .prepare("SELECT * FROM products WHERE id = 'product-b'")
        .first();
      const read = await handleProductResourceRequest({
        request: request({ path: "/api/painel/stores/store-a/products/product-b", cookie: cookieA }),
        storeId: "store-a",
        productId: "product-b",
        method: "GET",
        runtimeFactory,
      });
      assert.equal(read.status, 404);
      const missing = await handleProductResourceRequest({
        request: request({
          path: "/api/painel/stores/store-a/products/product-inexistente",
          cookie: cookieA,
        }),
        storeId: "store-a",
        productId: "product-inexistente",
        method: "GET",
        runtimeFactory,
      });
      assert.equal(missing.status, read.status);
      assert.deepEqual(await missing.json(), await read.json());

      for (const body of [
        { name: "Ataque cruzado" },
        { published: false },
        { published: true },
        { available: false },
      ]) {
        const response = await handleProductResourceRequest({
          request: request({
            path: "/api/painel/stores/store-a/products/product-b",
            method: "PATCH",
            cookie: cookieA,
            body,
          }),
          storeId: "store-a",
          productId: "product-b",
          method: "PATCH",
          runtimeFactory,
        });
        assert.equal(response.status, 404);
        assert.deepEqual(
          await database.prepare("SELECT * FROM products WHERE id = 'product-b'").first(),
          before,
        );
      }
    });

    await t.test("sessão ausente, inválida e conta sem vínculo são recusadas", async () => {
      for (const cookie of [undefined, "better-auth.session_token=invalido"]) {
        const response = await handleProductCollectionRequest({
          request: request({ path: "/api/painel/stores/store-a/products", cookie }),
          storeId: "store-a",
          method: "GET",
          runtimeFactory,
        });
        assert.equal(response.status, 401);
      }
      const forbidden = await handleProductCollectionRequest({
        request: request({
          path: "/api/painel/stores/store-a/products",
          cookie: cookieNoStore,
        }),
        storeId: "store-a",
        method: "GET",
        runtimeFactory,
      });
      assert.equal(forbidden.status, 403);
    });

    await t.test("múltiplos vínculos exigem seleção explícita", () => {
      const memberships = [
        { storeId: "store-a", storeSlug: "loja-a", storeName: "Loja A", role: "store_owner" as const },
        { storeId: "store-b", storeSlug: "loja-b", storeName: "Loja B", role: "store_owner" as const },
      ];
      assert.deepEqual(resolveStoreSelection([]), { kind: "forbidden" });
      assert.equal(resolveStoreSelection([memberships[0]]).kind, "selected");
      const selection = resolveStoreSelection(memberships);
      assert.equal(selection.kind, "selection_required");
      assert.equal(selection.kind === "selection_required" && selection.memberships.length, 2);
    });

    await t.test("publicar e despublicar controla somente a vitrine correta", async () => {
      const publish = await handleProductResourceRequest({
        request: request({
          path: `/api/painel/stores/store-a/products/${createdProductId}`,
          method: "PATCH",
          cookie: cookieA,
          body: { published: true, available: true },
        }),
        storeId: "store-a",
        productId: createdProductId,
        method: "PATCH",
        runtimeFactory,
      });
      assert.equal(publish.status, 200);
      assert.ok((await findPublicStoreBySlug(database, "loja-a"))?.products.some((item) => item.id === createdProductId));
      assert.ok(!(await findPublicStoreBySlug(database, "loja-b"))?.products.some((item) => item.id === createdProductId));

      const unpublish = await handleProductResourceRequest({
        request: request({
          path: `/api/painel/stores/store-a/products/${createdProductId}`,
          method: "PATCH",
          cookie: cookieA,
          body: { published: false },
        }),
        storeId: "store-a",
        productId: createdProductId,
        method: "PATCH",
        runtimeFactory,
      });
      assert.equal(unpublish.status, 200);
      assert.ok(!(await findPublicStoreBySlug(database, "loja-a"))?.products.some((item) => item.id === createdProductId));
    });

    await t.test("preço e estoque usam parsing estrito e exato", () => {
      assert.equal(parseBrazilianPriceToCents("0"), 0);
      assert.equal(parseBrazilianPriceToCents("12,3"), 1230);
      assert.equal(parseBrazilianPriceToCents("1.234,56"), 123456);
      for (const invalid of [
        "-1",
        "NaN",
        "Infinity",
        "1e3",
        "12.34",
        "1,234",
        "1000000,00",
      ]) {
        assert.throws(() => parseBrazilianPriceToCents(invalid), ProductValidationError);
      }
      for (const stock of ["-1", "1,5", "1.5", "1000001"]) {
        assert.throws(
          () => parseProductInput(productInput({ stock }), "create"),
          ProductValidationError,
        );
      }
    });

    await t.test("payloads inválidos, excessivos e origem hostil não alteram o banco", async () => {
      const before = Number(
        await database
          .prepare("SELECT COUNT(*) AS total FROM products")
          .first<number>("total"),
      );
      for (const overrides of [
        { name: "" },
        { description: "x".repeat(1001) },
        { category: "x".repeat(81) },
        { variations: Array.from({ length: 21 }, (_, index) => `Opção ${index}`) },
        { published: "sim" },
      ]) {
        const response = await handleProductCollectionRequest({
          request: request({
            path: "/api/painel/stores/store-a/products",
            method: "POST",
            cookie: cookieA,
            body: productInput(overrides),
          }),
          storeId: "store-a",
          method: "POST",
          runtimeFactory,
        });
        assert.equal(response.status, 400);
      }

      const oversized = await handleProductCollectionRequest({
        request: request({
          path: "/api/painel/stores/store-a/products",
          method: "POST",
          cookie: cookieA,
          body: productInput({ description: "x".repeat(17_000) }),
        }),
        storeId: "store-a",
        method: "POST",
        runtimeFactory,
      });
      assert.equal(oversized.status, 400);

      const hostile = await handleProductResourceRequest({
        request: request({
          path: "/api/painel/stores/store-a/products/product-a",
          method: "PATCH",
          cookie: cookieA,
          origin: "https://attacker.example",
          body: { name: "Ataque de origem" },
        }),
        storeId: "store-a",
        productId: "product-a",
        method: "PATCH",
        runtimeFactory,
      });
      assert.equal(hostile.status, 403);
      assert.equal(
        await database
          .prepare("SELECT name FROM products WHERE id = 'product-a'")
          .first<string>("name"),
        "Produto A",
      );
      assert.equal(
        Number(
          await database
            .prepare("SELECT COUNT(*) AS total FROM products")
            .first<number>("total"),
        ),
        before,
      );
    });

    const settingsInput = { name: "Ateliê da Ana", whatsAppE164: "+55 (63) 99999-0012", accentColor: "#315575" };
    const settingsRequest = (storeId: string, cookie: string | undefined, method = "GET", body?: unknown, origin = baseURL) =>
      handleStoreSettingsRequest({ storeId, runtimeFactory, request: request({
        path: `/api/painel/stores/${storeId}/settings`, cookie, method, body, origin,
      }) });

    await t.test("configurações persistem em novas leituras e chegam à vitrine pública", async () => {
      const beforeB = await database.prepare("SELECT * FROM stores WHERE id = 'store-b'").first();
      const beforeA = await database.prepare("SELECT * FROM stores WHERE id = 'store-a'").first();
      const saved = await settingsRequest("store-a", cookieA, "PATCH", settingsInput);
      assert.equal(saved.status, 200);
      assert.equal(saved.headers.get("cache-control"), "private, no-store");
      const fresh = await settingsRequest("store-a", cookieA);
      const { store } = await fresh.json() as { store: Record<string, unknown> };
      assert.equal(store.name, settingsInput.name);
      assert.equal(store.whatsAppE164, "5563999990012");
      assert.equal(store.accentColor, "#315575");
      const publicStore = await findPublicStoreBySlug(database, "loja-a");
      assert.equal(publicStore?.name, settingsInput.name);
      assert.equal(publicStore?.whatsAppE164, "5563999990012");
      assert.equal(publicStore?.accentColor, "#315575");
      assert.deepEqual(await database.prepare("SELECT * FROM stores WHERE id = 'store-b'").first(), beforeB);
      const afterA = await database.prepare("SELECT * FROM stores WHERE id = 'store-a'").first();
      for (const key of Object.keys(beforeA!)) {
        if (!["name", "whatsapp_e164", "accent_color", "updated_at"].includes(key)) assert.deepEqual(afterA![key], beforeA![key]);
      }
      assert.deepEqual(Object.keys(store).sort(), ["name", "whatsAppE164", "accentColor", "slug", "published", "description", "location"].sort());
    });

    await t.test("IDOR nas configurações nega leitura e edição nas duas direções", async () => {
      const before = await database.prepare("SELECT * FROM stores ORDER BY id").all();
      for (const [cookie, forbiddenStore] of [[cookieA, "store-b"], [cookieB, "store-a"]]) {
        for (const method of ["GET", "PATCH"]) {
          const denied = await settingsRequest(forbiddenStore, cookie, method, method === "PATCH" ? settingsInput : undefined);
          const missing = await settingsRequest("loja-inexistente", cookie, method, method === "PATCH" ? settingsInput : undefined);
          assert.equal(denied.status, 403);
          assert.equal(missing.status, denied.status);
          assert.deepEqual(await denied.json(), await missing.json());
        }
      }
      assert.deepEqual((await database.prepare("SELECT * FROM stores ORDER BY id").all()).results, before.results);
    });

    await t.test("configurações recusam sessão ausente, falsa, sem vínculo e origem hostil", async () => {
      for (const method of ["GET", "PATCH"]) {
        for (const cookie of [undefined, "better-auth.session_token=invalido", cookieNoStore]) {
          const response = await settingsRequest("store-a", cookie, method, method === "PATCH" ? settingsInput : undefined);
          assert.equal(response.status, cookie === cookieNoStore ? 403 : 401);
        }
      }
      for (const origin of ["https://attacker.example", "null"]) {
        assert.equal((await settingsRequest("store-a", cookieA, "PATCH", settingsInput, origin)).status, 403);
      }
      const noOrigin = request({ path: "/api/painel/stores/store-a/settings", cookie: cookieA, method: "PATCH", body: settingsInput });
      noOrigin.headers.delete("origin");
      assert.equal((await handleStoreSettingsRequest({ request: noOrigin, storeId: "store-a", runtimeFactory })).status, 403);
      assert.equal((await settingsRequest("store-a", cookieA, "DELETE")).status, 405);
    });

    await t.test("configurações rejeitam campos de autorização, publicação e dados inválidos sem gravação parcial", async () => {
      const before = await database.prepare("SELECT * FROM stores ORDER BY id").all();
      for (const field of ["storeId", "tenantId", "userId", "store_id", "tenant_id", "published", "slug", "role"]) {
        assert.equal((await settingsRequest("store-a", cookieA, "PATCH", { ...settingsInput, [field]: "store-b" })).status, 400);
      }
      for (const body of [null, [], {}, { ...settingsInput, name: " " }, { ...settingsInput, name: "x".repeat(121) },
        { ...settingsInput, whatsAppE164: "abc63999990012" }, { ...settingsInput, whatsAppE164: 63999990012 },
        { ...settingsInput, accentColor: "#ffffff" }, { ...settingsInput, accentColor: "red; background:url(https://example.test)" },
        { ...settingsInput, name: "x".repeat(3000) }]) {
        assert.equal((await settingsRequest("store-a", cookieA, "PATCH", body)).status, 400);
      }
      const malformed = new Request(`${baseURL}/api/painel/stores/store-a/settings`, { method: "PATCH", headers: headers(cookieA), body: "{" });
      assert.equal((await handleStoreSettingsRequest({ request: malformed, storeId: "store-a", runtimeFactory })).status, 400);
      const oversized = request({ path: "/api/painel/stores/store-a/settings", cookie: cookieA, method: "PATCH", body: settingsInput });
      oversized.headers.set("content-length", "9999999");
      assert.equal((await handleStoreSettingsRequest({ request: oversized, storeId: "store-a", runtimeFactory })).status, 400);
      assert.deepEqual((await database.prepare("SELECT * FROM stores ORDER BY id").all()).results, before.results);
    });

    await t.test("IDs injetados em query e cabeçalhos não trocam a loja autorizada", async () => {
      const beforeB = await database.prepare("SELECT * FROM stores WHERE id = 'store-b'").first();
      const incoming = request({ path: "/api/painel/stores/store-a/settings?storeId=store-b&tenant_id=store-b", cookie: cookieA, method: "PATCH",
        body: { ...settingsInput, name: "Ana's atelier'; UPDATE stores SET name='invadida' --" } });
      incoming.headers.set("x-store-id", "store-b");
      incoming.headers.set("x-user-id", userB);
      assert.equal((await handleStoreSettingsRequest({ request: incoming, storeId: "store-a", runtimeFactory })).status, 200);
      assert.deepEqual(await database.prepare("SELECT * FROM stores WHERE id = 'store-b'").first(), beforeB);
      assert.equal(await database.prepare("SELECT name FROM stores WHERE id = 'store-a'").first("name"), "Ana's atelier'; UPDATE stores SET name='invadida' --");
    });

    await t.test("salvar configurações mantém uma loja em preparação fora da vitrine pública", async () => {
      await database.prepare("UPDATE stores SET published = 0 WHERE id = 'store-a'").run();
      assert.equal((await settingsRequest("store-a", cookieA, "PATCH", settingsInput)).status, 200);
      assert.equal(await findPublicStoreBySlug(database, "loja-a"), null);
      const { store } = await (await settingsRequest("store-a", cookieA)).json() as { store: { published: boolean } };
      assert.equal(store.published, false);
    });

    await t.test("revogar vínculo impede gravar mesmo após a autorização inicial", async () => {
      const membership = await requireStoreMembership(database, userA, "store-a");
      await database.prepare("DELETE FROM store_memberships WHERE user_id = ?1").bind(userA).run();
      const before = await database.prepare("SELECT * FROM stores WHERE id = 'store-a'").first();
      await assert.rejects(() => saveStoreSettings({ database, membership, userId: userA, input: parseStoreSettings(settingsInput) }), StoreMembershipRequiredError);
      assert.equal((await settingsRequest("store-a", cookieA, "PATCH", settingsInput)).status, 403);
      assert.deepEqual(await database.prepare("SELECT * FROM stores WHERE id = 'store-a'").first(), before);
    });
  } finally {
    await platform.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});


test("configurações normalizam contato e validam contraste das cores", () => {
  const input = { name: "  Ateliê da Ana  ", whatsAppE164: "(63) 99999-0000", accentColor: "#8A3F2D" };
  assert.deepEqual(parseStoreSettings(input), { name: "Ateliê da Ana", whatsAppE164: "5563999990000", accentColor: "#8a3f2d" });
  assert.equal(parseStoreSettings({ ...input, whatsAppE164: "(11) 99999-0000" }).whatsAppE164, "5511999990000");
  assert.equal(parseStoreSettings({ ...input, whatsAppE164: "+55 (11) 99999-0000" }).whatsAppE164, "5511999990000");
  for (const color of ["#8a3f2d", "#7e3328", "#365749", "#315575", "#684263", "#363632"]) assert.equal(isReadableStoreColor(color), true);
  for (const color of ["#ffffff", "#ffff00", "#aaaaaa", "red", "#123"]) assert.equal(isReadableStoreColor(color), false);
  assert.throws(() => parseStoreSettings({ ...input, name: "Loja\nA" }), StoreSettingsValidationError);
});
