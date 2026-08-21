import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  createFirstStore,
  FirstStoreAlreadyCreatedError,
  StoreSlugUnavailableError,
} from "../onboarding/first-store";
import {
  FirstStoreValidationError,
  normalizeWhatsApp,
  slugifyStoreName,
} from "../onboarding/store-input";
import { openLocalBindings } from "../scripts/local-bindings.mjs";

const wranglerExecutable = resolve("node_modules/wrangler/bin/wrangler.js");

function migrate(persistPath: string) {
  const result = spawnSync(
    process.execPath,
    [wranglerExecutable, "d1", "migrations", "apply", "feita-local", "--local", "--persist-to", persistPath],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}

async function createUser(database: D1Database, id: string, email: string) {
  const now = Date.now();
  await database
    .prepare("INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?1, ?2, ?3, 1, ?4, ?4)")
    .bind(id, `Usuária ${id}`, email, now)
    .run();
}

test("Marco 7 cria somente a primeira loja da conta verificada", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "feita-onboarding-d1-"));
  migrate(directory);
  const platform = await openLocalBindings(join(directory, "v3"));
  const database = platform.database as unknown as D1Database;

  try {
    await createUser(database, "user-a", "a@example.test");
    await createUser(database, "user-b", "b@example.test");
    await createUser(database, "user-c", "c@example.test");

    await t.test("normaliza endereço e WhatsApp sem confiar no navegador", () => {
      assert.equal(slugifyStoreName("  Ateliê da Júlia  "), "atelie-da-julia");
      assert.equal(normalizeWhatsApp("(63) 99999-9999"), "+5563999999999");
      assert.throws(() => normalizeWhatsApp("123"), FirstStoreValidationError);
    });

    await t.test("cria loja fechada, ownership e auditoria no mesmo lote", async () => {
      const store = await createFirstStore({
        database,
        userId: "user-a",
        now: 1_787_000_000_000,
        input: {
          name: "Ateliê da Júlia",
          slug: "atelie-da-julia",
          location: "Palmas, TO",
          whatsapp: "(63) 99999-9999",
        },
      });
      assert.equal(store.slug, "atelie-da-julia");
      const row = await database
        .prepare(
          `SELECT s.published, s.whatsapp_e164, sm.role, sc.user_id,
                  ae.action
           FROM stores s
           JOIN store_memberships sm ON sm.store_id = s.id
           JOIN store_creation_claims sc ON sc.store_id = s.id
           JOIN audit_events ae ON ae.store_id = s.id
           WHERE s.id = ?1`,
        )
        .bind(store.id)
        .first<Record<string, unknown>>();
      assert.deepEqual(row, {
        published: 0,
        whatsapp_e164: "+5563999999999",
        role: "store_owner",
        user_id: "user-a",
        action: "store.onboarding.created",
      });
    });

    await t.test("a mesma conta não cria uma segunda loja", async () => {
      await assert.rejects(
        () => createFirstStore({
          database,
          userId: "user-a",
          input: { name: "Outra loja", slug: "outra-loja", location: "", whatsapp: "63999999999" },
        }),
        FirstStoreAlreadyCreatedError,
      );
      assert.equal(
        await database.prepare("SELECT COUNT(*) AS total FROM stores WHERE slug = 'outra-loja'").first<number>("total"),
        0,
      );
    });

    await t.test("slug de outra loja não é sobrescrito", async () => {
      await assert.rejects(
        () => createFirstStore({
          database,
          userId: "user-b",
          input: { name: "Ateliê da Júlia", slug: "atelie-da-julia", location: "", whatsapp: "63988888888" },
        }),
        StoreSlugUnavailableError,
      );
      assert.equal(
        await database.prepare("SELECT COUNT(*) AS total FROM store_memberships WHERE user_id = 'user-b'").first<number>("total"),
        0,
      );
    });

    await t.test("duas requisições concorrentes deixam somente uma loja", async () => {
      const attempts = await Promise.allSettled([
        createFirstStore({ database, userId: "user-c", input: { name: "Loja C1", slug: "loja-c1", location: "", whatsapp: "63977777777" } }),
        createFirstStore({ database, userId: "user-c", input: { name: "Loja C2", slug: "loja-c2", location: "", whatsapp: "63977777777" } }),
      ]);
      assert.equal(attempts.filter((item) => item.status === "fulfilled").length, 1);
      assert.equal(attempts.filter((item) => item.status === "rejected").length, 1);
      assert.equal(
        await database.prepare("SELECT COUNT(*) AS total FROM store_memberships WHERE user_id = 'user-c'").first<number>("total"),
        1,
      );
      assert.equal(
        await database.prepare("SELECT COUNT(*) AS total FROM stores WHERE slug IN ('loja-c1', 'loja-c2')").first<number>("total"),
        1,
      );
    });
  } finally {
    await platform.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});
