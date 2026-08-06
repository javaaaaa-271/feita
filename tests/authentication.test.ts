import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  AuthenticationRequiredError,
  requireSession,
  requireStoreMembership,
  StoreMembershipRequiredError,
} from "../auth/authorization";
import {
  acceptStoreInvitation,
  createStoreInvitation,
  InvitationRejectedError,
} from "../auth/invitations";
import { LocalTransactionalEmailSender } from "../auth/email";
import {
  createFeitaAuth,
  resolveAuthRuntimeSecrets,
  resolveTrustedOrigins,
} from "../auth/server";
import { sha256Hex } from "../auth/security";
import { openLocalBindings } from "../scripts/local-bindings.mjs";

const wranglerExecutable = resolve("node_modules/wrangler/bin/wrangler.js");
const baseURL = "http://localhost:3000";
const testSecret = "test-only-better-auth-secret-with-at-least-32-characters";
const rateSecret = "test-only-rate-limit-secret-with-at-least-32-characters";

type CapturedEmail = {
  kind: "password-reset" | "invitation";
  to: string;
  code: string;
};

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

function requestHeaders(
  ip: string,
  cookie?: string,
  origin = baseURL,
): Headers {
  const headers = new Headers({
    "content-type": "application/json",
    origin,
    "cf-connecting-ip": ip,
    "user-agent": "Feita security test",
  });
  if (cookie) headers.set("cookie", cookie);
  return headers;
}

function sessionCookie(response: Response): string {
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "login must set a session cookie");
  return setCookie.split(";")[0];
}

async function authRequest(
  auth: ReturnType<typeof createFeitaAuth>,
  path: string,
  options: {
    body?: Record<string, unknown>;
    cookie?: string;
    ip?: string;
    origin?: string;
  } = {},
) {
  return auth.handler(
    new Request(`${baseURL}/api/auth${path}`, {
      method: options.body ? "POST" : "GET",
      headers: requestHeaders(
        options.ip ?? "203.0.113.10",
        options.cookie,
        options.origin,
      ),
      body: options.body ? JSON.stringify(options.body) : undefined,
    }),
  );
}

async function signIn(
  auth: ReturnType<typeof createFeitaAuth>,
  email: string,
  password: string,
  ip: string,
) {
  return authRequest(auth, "/sign-in/email", {
    body: { email, password },
    ip,
  });
}

test("Marco 5 prova autenticação, recuperação e isolamento em D1 limpo", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "feita-auth-d1-"));
  migrate(directory);
  const platform = await openLocalBindings(join(directory, "v3"));
  const database = platform.database as unknown as D1Database;
  const captured: CapturedEmail[] = [];
  const sender = new LocalTransactionalEmailSender((message) => {
    captured.push(message);
  });
  const auth = createFeitaAuth({
    database,
    request: new Request(`${baseURL}/api/auth/ok`),
    environment: {
      BETTER_AUTH_SECRET: testSecret,
      RATE_LIMIT_HMAC_SECRET: rateSecret,
      AUTH_TRUSTED_ORIGINS: baseURL,
    },
    emailSender: sender,
  });
  const now = Date.now();
  const passwordA = "frase segura de teste A 2026";
  const passwordB = "frase segura de teste B 2026";

  try {
    await t.test("defaults de segredo existem somente em origens loopback", () => {
      for (const origin of [
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://[::1]:8787",
      ]) {
        assert.doesNotThrow(() =>
          resolveAuthRuntimeSecrets({
            database,
            request: new Request(`${origin}/api/auth/ok`),
          }),
        );
      }

      for (const origin of [
        "https://projeto-vitrine-mvp.javaaaa-237.chatgpt.site",
        "https://preview-feita.example.test",
        "https://alias-feita.example.test",
        "https://attacker.example",
        "http://192.0.2.10:3000",
      ]) {
        assert.throws(
          () =>
            resolveAuthRuntimeSecrets({
              database,
              request: new Request(`${origin}/api/auth/ok`),
            }),
          /required outside local development/,
        );
      }

      assert.throws(
        () =>
          resolveAuthRuntimeSecrets({
            database,
            request: new Request("http://localhost:3000/api/auth/ok"),
            environment: {
              BETTER_AUTH_URL: "https://preview-feita.example.test",
            },
          }),
        /required outside local development/,
      );

      assert.doesNotThrow(() =>
        resolveAuthRuntimeSecrets({
          database,
          request: new Request("https://preview-feita.example.test/api/auth/ok"),
          environment: {
            BETTER_AUTH_SECRET: testSecret,
            RATE_LIMIT_HMAC_SECRET: rateSecret,
          },
        }),
      );

      const localSecrets = resolveAuthRuntimeSecrets({
        database,
        request: new Request("http://localhost:3000/api/auth/ok"),
      });
      assert.equal(localSecrets.usesLocalDefaults, true);
      assert.doesNotThrow(() => resolveTrustedOrigins({}, true));
      assert.throws(
        () =>
          resolveTrustedOrigins(
            { AUTH_TRUSTED_ORIGINS: "https://preview-feita.example.test" },
            true,
          ),
        /only loopback origins/,
      );
    });

    await t.test("migration cria todas as tabelas do marco", async () => {
      const tables = await database
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all();
      const names = (tables.results as { name: string }[]).map((row) => row.name);
      for (const name of [
        "user",
        "session",
        "account",
        "verification",
        "rate_limit",
        "store_memberships",
        "store_invites",
        "audit_events",
        "auth_identity_rate_limits",
      ]) {
        assert.ok(names.includes(name), `missing table ${name}`);
      }
    });

    await database.batch([
      database
        .prepare(
          `INSERT INTO stores (
             id, slug, name, description, location, accent_color, whatsapp_e164,
             instagram, purchase_instructions, payment_methods_json, published,
             created_at, updated_at
           ) VALUES ('store-a', 'loja-a', 'Loja A', '', '', '#8a3f2d',
             '5563999990000', '', '', '[]', 1, ?1, ?1)`,
        )
        .bind(now),
      database
        .prepare(
          `INSERT INTO stores (
             id, slug, name, description, location, accent_color, whatsapp_e164,
             instagram, purchase_instructions, payment_methods_json, published,
             created_at, updated_at
           ) VALUES ('store-b', 'loja-b', 'Loja B', '', '', '#53664e',
             '5563999990001', '', '', '[]', 1, ?1, ?1)`,
        )
        .bind(now),
    ]);

    await t.test("aceitação normal é de uso único e não guarda token puro", async () => {
      const token = "convite-local-a-2026";
      await createStoreInvitation({
        database,
        sender,
        email: "dona-a@example.test",
        storeId: "store-a",
        role: "store_owner",
        token,
      });
      await acceptStoreInvitation({
        database,
        auth,
        headers: requestHeaders("203.0.113.11"),
        email: "DONA-A@example.test",
        name: "Dona A",
        password: passwordA,
        token,
      });

      const invite = await database
        .prepare(
          "SELECT token_digest, used_at FROM store_invites WHERE email_normalized = ?1",
        )
        .bind("dona-a@example.test")
        .first<{ token_digest: string; used_at: number }>();
      assert.ok(invite?.used_at);
      assert.equal(invite?.token_digest, await sha256Hex(token));
      assert.notEqual(invite?.token_digest, token);
      assert.equal(
        Number(
          await database
            .prepare(
              `SELECT COUNT(*) AS total
               FROM store_memberships AS sm
               INNER JOIN user AS u ON u.id = sm.user_id
               WHERE u.email = ?1 AND sm.store_id = 'store-a'`,
            )
            .bind("dona-a@example.test")
            .first<number>("total"),
        ),
        1,
      );
      await assert.rejects(
        () =>
          acceptStoreInvitation({
            database,
            auth,
            headers: requestHeaders("203.0.113.12"),
            email: "dona-a@example.test",
            name: "Dona A",
            password: passwordA,
            token,
          }),
        InvitationRejectedError,
      );
      assert.equal(
        Number(
          await database
            .prepare(
              `SELECT COUNT(*) AS total
               FROM store_memberships AS sm
               INNER JOIN user AS u ON u.id = sm.user_id
               WHERE u.email = ?1 AND sm.store_id = 'store-a'`,
            )
            .bind("dona-a@example.test")
            .first<number>("total"),
        ),
        1,
      );
    });

    await t.test(
      "retry conclui convite após conta criada e lote interrompido",
      async () => {
        const email = "retry-convite@example.test";
        const password = "frase segura para recuperar convite 2026";
        const token = "convite-retry-seguro-2026";
        await createStoreInvitation({
          database,
          sender,
          email,
          storeId: "store-a",
          role: "store_owner",
          token,
        });
        await database
          .prepare(
            `CREATE TRIGGER reject_membership_for_retry
             BEFORE INSERT ON store_memberships
             BEGIN
               SELECT RAISE(ABORT, 'simulated membership failure');
             END`,
          )
          .run();

        await assert.rejects(
          () =>
            acceptStoreInvitation({
              database,
              auth,
              headers: requestHeaders("203.0.113.13"),
              email,
              name: "Retry Seguro",
              password,
              token,
            }),
          InvitationRejectedError,
        );
        await database.exec("DROP TRIGGER reject_membership_for_retry");

        assert.ok(
          await database
            .prepare("SELECT id FROM user WHERE email = ?1")
            .bind(email)
            .first(),
        );
        assert.deepEqual(
          await database
            .prepare(
              "SELECT claimed_at, used_at FROM store_invites WHERE email_normalized = ?1",
            )
            .bind(email)
            .first(),
          { claimed_at: null, used_at: null },
        );
        assert.equal(
          Number(
            await database
              .prepare(
                `SELECT COUNT(*) AS total
                 FROM store_memberships AS sm
                 INNER JOIN user AS u ON u.id = sm.user_id
                 WHERE u.email = ?1`,
              )
              .bind(email)
              .first<number>("total"),
          ),
          0,
        );

        await assert.rejects(
          () =>
            acceptStoreInvitation({
              database,
              auth,
              headers: requestHeaders("203.0.113.19"),
              email,
              name: "Retry Seguro",
              password: "credencial incorreta no retry 2026",
              token,
            }),
          InvitationRejectedError,
        );
        assert.deepEqual(
          await database
            .prepare(
              "SELECT claimed_at, used_at FROM store_invites WHERE email_normalized = ?1",
            )
            .bind(email)
            .first(),
          { claimed_at: null, used_at: null },
        );

        await acceptStoreInvitation({
          database,
          auth,
          headers: requestHeaders("203.0.113.14"),
          email,
          name: "Retry Seguro",
          password,
          token,
        });

        assert.equal(
          Number(
            await database
              .prepare(
                `SELECT COUNT(*) AS total
                 FROM store_memberships AS sm
                 INNER JOIN user AS u ON u.id = sm.user_id
                 WHERE u.email = ?1 AND sm.store_id = 'store-a'`,
              )
              .bind(email)
              .first<number>("total"),
          ),
          1,
        );
        assert.equal(
          Number(
            await database
              .prepare(
                `SELECT COUNT(*) AS total
                 FROM session AS s
                 INNER JOIN user AS u ON u.id = s.user_id
                 WHERE u.email = ?1`,
              )
              .bind(email)
              .first<number>("total"),
          ),
          0,
        );
      },
    );

    await t.test(
      "código sozinho não assume conta existente com credencial incorreta",
      async () => {
        const email = "conta-existente@example.test";
        const password = "frase segura da conta existente 2026";
        const token = "convite-conta-existente-2026";
        await auth.api.signUpEmail({
          body: { email, name: "Conta Existente", password },
          headers: requestHeaders("203.0.113.15"),
        });
        await createStoreInvitation({
          database,
          sender,
          email,
          storeId: "store-b",
          role: "store_owner",
          token,
        });

        await assert.rejects(
          () =>
            acceptStoreInvitation({
              database,
              auth,
              headers: requestHeaders("203.0.113.16"),
              email,
              name: "Conta Existente",
              password: "credencial incorreta deliberada 2026",
              token,
            }),
          InvitationRejectedError,
        );
        assert.deepEqual(
          await database
            .prepare(
              "SELECT claimed_at, used_at FROM store_invites WHERE email_normalized = ?1",
            )
            .bind(email)
            .first(),
          { claimed_at: null, used_at: null },
        );
        assert.equal(
          Number(
            await database
              .prepare(
                `SELECT COUNT(*) AS total
                 FROM store_memberships AS sm
                 INNER JOIN user AS u ON u.id = sm.user_id
                 WHERE u.email = ?1`,
              )
              .bind(email)
              .first<number>("total"),
          ),
          0,
        );
      },
    );

    await t.test(
      "e-mail divergente, convite expirado e código inválido falham iguais",
      async () => {
        const email = "validacoes-convite@example.test";
        const token = "convite-validacoes-2026";
        await createStoreInvitation({
          database,
          sender,
          email,
          storeId: "store-a",
          role: "store_owner",
          token,
          now,
          expiresInMinutes: 1,
        });
        const attempts = [
          {
            email: "outro-email@example.test",
            token,
            attemptNow: now,
          },
          { email, token: "codigo-invalido", attemptNow: now },
          { email, token, attemptNow: now + 2 * 60_000 },
        ];

        for (const attempt of attempts) {
          await assert.rejects(
            () =>
              acceptStoreInvitation({
                database,
                auth,
                headers: requestHeaders("203.0.113.17"),
                email: attempt.email,
                name: "Validação",
                password: "frase segura de validação 2026",
                token: attempt.token,
                now: attempt.attemptNow,
              }),
            (error: unknown) =>
              error instanceof InvitationRejectedError &&
              error.message ===
                "Não foi possível aceitar o convite. Confira os dados e tente novamente.",
          );
        }
      },
    );

    await t.test(
      "falha no lote não consome convite nem deixa membership isolado",
      async () => {
        const email = "falha-lote@example.test";
        const token = "convite-falha-lote-2026";
        await createStoreInvitation({
          database,
          sender,
          email,
          storeId: "store-b",
          role: "store_owner",
          token,
        });
        await database
          .prepare(
            `CREATE TRIGGER reject_invitation_audit
             BEFORE INSERT ON audit_events
             WHEN NEW.action = 'invitation.accepted'
             BEGIN
               SELECT RAISE(ABORT, 'simulated audit failure');
             END`,
          )
          .run();

        await assert.rejects(
          () =>
            acceptStoreInvitation({
              database,
              auth,
              headers: requestHeaders("203.0.113.18"),
              email,
              name: "Falha no lote",
              password: "frase segura da falha no lote 2026",
              token,
            }),
          InvitationRejectedError,
        );
        await database.exec("DROP TRIGGER reject_invitation_audit");

        assert.deepEqual(
          await database
            .prepare(
              "SELECT claimed_at, used_at FROM store_invites WHERE email_normalized = ?1",
            )
            .bind(email)
            .first(),
          { claimed_at: null, used_at: null },
        );
        assert.equal(
          Number(
            await database
              .prepare(
                `SELECT COUNT(*) AS total
                 FROM store_memberships AS sm
                 INNER JOIN user AS u ON u.id = sm.user_id
                 WHERE u.email = ?1`,
              )
              .bind(email)
              .first<number>("total"),
          ),
          0,
        );
      },
    );

    await t.test("anônimo é recusado e login correto cria sessão", async () => {
      await assert.rejects(
        () => requireSession(auth, new Headers()),
        AuthenticationRequiredError,
      );
      const response = await signIn(
        auth,
        "dona-a@example.test",
        passwordA,
        "203.0.113.20",
      );
      assert.equal(response.status, 200, await response.text());
      const session = await requireSession(
        auth,
        new Headers({ cookie: sessionCookie(response) }),
      );
      assert.equal(session.user.email, "dona-a@example.test");
    });

    await t.test("logout invalida a sessão", async () => {
      const login = await signIn(
        auth,
        "dona-a@example.test",
        passwordA,
        "203.0.113.21",
      );
      const cookie = sessionCookie(login);
      assert.equal(
        (
          await authRequest(auth, "/sign-out", {
            body: {},
            cookie,
            ip: "203.0.113.21",
          })
        ).status,
        200,
      );
      await assert.rejects(
        () => requireSession(auth, new Headers({ cookie })),
        AuthenticationRequiredError,
      );
    });

    await t.test("sessões expiradas ou revogadas são recusadas", async () => {
      const expired = await signIn(
        auth,
        "dona-a@example.test",
        passwordA,
        "203.0.113.22",
      );
      const expiredCookie = sessionCookie(expired);
      await database
        .prepare(
          "UPDATE session SET expires_at = 0 WHERE id = (SELECT id FROM session ORDER BY created_at DESC LIMIT 1)",
        )
        .run();
      await assert.rejects(
        () => requireSession(auth, new Headers({ cookie: expiredCookie })),
        AuthenticationRequiredError,
      );

      const revoked = await signIn(
        auth,
        "dona-a@example.test",
        passwordA,
        "203.0.113.23",
      );
      const revokedCookie = sessionCookie(revoked);
      await database
        .prepare(
          "DELETE FROM session WHERE user_id = (SELECT id FROM user WHERE email = ?1)",
        )
        .bind("dona-a@example.test")
        .run();
      await assert.rejects(
        () => requireSession(auth, new Headers({ cookie: revokedCookie })),
        AuthenticationRequiredError,
      );
    });

    await t.test("loja A não lê loja B nem aceita store_id adulterado", async () => {
      const token = "convite-local-b-2026";
      await createStoreInvitation({
        database,
        sender,
        email: "dona-b@example.test",
        storeId: "store-b",
        role: "store_owner",
        token,
      });
      await acceptStoreInvitation({
        database,
        auth,
        headers: requestHeaders("203.0.113.31"),
        email: "dona-b@example.test",
        name: "Dona B",
        password: passwordB,
        token,
      });
      const userAId = String(
        await database
          .prepare("SELECT id FROM user WHERE email = ?1")
          .bind("dona-a@example.test")
          .first<string>("id"),
      );
      assert.equal(
        (await requireStoreMembership(database, userAId, "store-a")).storeName,
        "Loja A",
      );
      await assert.rejects(
        () => requireStoreMembership(database, userAId, "store-b"),
        StoreMembershipRequiredError,
      );
    });

    await t.test("cookie HTTPS é HttpOnly, Secure e SameSite=Lax", async () => {
      const productionURL =
        "https://projeto-vitrine-mvp.javaaaa-237.chatgpt.site";
      const secureAuth = createFeitaAuth({
        database,
        request: new Request(`${productionURL}/api/auth/ok`),
        environment: {
          BETTER_AUTH_SECRET: testSecret,
          RATE_LIMIT_HMAC_SECRET: rateSecret,
          BETTER_AUTH_URL: productionURL,
          AUTH_TRUSTED_ORIGINS: productionURL,
        },
        emailSender: sender,
      });
      const response = await secureAuth.handler(
        new Request(`${productionURL}/api/auth/sign-in/email`, {
          method: "POST",
          headers: requestHeaders(
            "203.0.113.33",
            undefined,
            productionURL,
          ),
          body: JSON.stringify({
            email: "dona-b@example.test",
            password: passwordB,
          }),
        }),
      );
      assert.equal(response.status, 200, await response.text());
      const setCookie = response.headers.get("set-cookie") ?? "";
      assert.match(setCookie, /;\s*HttpOnly/i);
      assert.match(setCookie, /;\s*Secure/i);
      assert.match(setCookie, /;\s*SameSite=Lax/i);
      assert.match(setCookie, /;\s*Path=\//i);
      assert.doesNotMatch(setCookie, /;\s*Domain=/i);
      assert.equal(
        await database
          .prepare(
            "SELECT ip_address FROM session WHERE user_id = (SELECT id FROM user WHERE email = ?1) ORDER BY created_at DESC LIMIT 1",
          )
          .bind("dona-b@example.test")
          .first<string>("ip_address"),
        "203.0.113.33",
      );
    });

    await t.test("usuária sem membership recebe 403", async () => {
      await auth.api.signUpEmail({
        body: {
          email: "sem-loja@example.test",
          name: "Sem Loja",
          password: "frase segura sem loja 2026",
        },
        headers: requestHeaders("203.0.113.32"),
      });
      const userId = String(
        await database
          .prepare("SELECT id FROM user WHERE email = ?1")
          .bind("sem-loja@example.test")
          .first<string>("id"),
      );
      await assert.rejects(
        () => requireStoreMembership(database, userId, "store-a"),
        StoreMembershipRequiredError,
      );
    });

    await t.test("recuperação não enumera e código expirado é recusado", async () => {
      await database.prepare("DELETE FROM auth_identity_rate_limits").run();
      const existing = await authRequest(
        auth,
        "/email-otp/request-password-reset",
        {
          body: { email: "dona-a@example.test" },
          ip: "203.0.113.40",
        },
      );
      const missing = await authRequest(
        auth,
        "/email-otp/request-password-reset",
        {
          body: { email: "inexistente@example.test" },
          ip: "203.0.113.41",
        },
      );
      assert.equal(existing.status, missing.status);
      assert.deepEqual(await existing.json(), await missing.json());

      const code = captured
        .toReversed()
        .find((item) => item.kind === "password-reset")?.code;
      assert.ok(code);
      await database.prepare("UPDATE verification SET expires_at = 0").run();
      const response = await authRequest(auth, "/email-otp/reset-password", {
        body: {
          email: "dona-a@example.test",
          otp: code,
          password: "nova frase segura expirada 2026",
        },
        ip: "203.0.113.42",
      });
      assert.notEqual(response.status, 200);
    });

    await t.test(
      "redefinição usa código uma vez e revoga sessões anteriores",
      async () => {
        await database.prepare("DELETE FROM auth_identity_rate_limits").run();
        const login1 = await signIn(
          auth,
          "dona-a@example.test",
          passwordA,
          "203.0.113.50",
        );
        const login2 = await signIn(
          auth,
          "dona-a@example.test",
          passwordA,
          "203.0.113.51",
        );
        const cookie1 = sessionCookie(login1);
        const cookie2 = sessionCookie(login2);
        await authRequest(auth, "/email-otp/request-password-reset", {
          body: { email: "dona-a@example.test" },
          ip: "203.0.113.52",
        });
        const code = captured
          .toReversed()
          .find(
            (item) =>
              item.kind === "password-reset" &&
              item.to === "dona-a@example.test",
          )?.code;
        assert.ok(code);
        const body = {
          email: "dona-a@example.test",
          otp: code,
          password: "nova frase segura da dona A 2026",
        };
        const reset = await authRequest(auth, "/email-otp/reset-password", {
          body,
          ip: "203.0.113.53",
        });
        assert.equal(reset.status, 200, await reset.text());
        assert.notEqual(
          (
            await authRequest(auth, "/email-otp/reset-password", {
              body,
              ip: "203.0.113.54",
            })
          ).status,
          200,
        );
        await assert.rejects(
          () => requireSession(auth, new Headers({ cookie: cookie1 })),
          AuthenticationRequiredError,
        );
        await assert.rejects(
          () => requireSession(auth, new Headers({ cookie: cookie2 })),
          AuthenticationRequiredError,
        );
      },
    );

    await t.test("rate limit persistente retorna 429", async () => {
      await database.prepare("DELETE FROM auth_identity_rate_limits").run();
      await database.prepare("DELETE FROM rate_limit").run();
      let last: Response | undefined;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        last = await signIn(
          auth,
          "dona-a@example.test",
          "senha deliberadamente incorreta",
          "203.0.113.60",
        );
      }
      assert.equal(last?.status, 429);
      assert.ok(
        Number(
          await database
            .prepare("SELECT COUNT(*) AS total FROM auth_identity_rate_limits")
            .first<number>("total"),
        ) > 0,
      );
    });

    await t.test("CSRF externo é recusado e signup público está fechado", async () => {
      await database.prepare("DELETE FROM auth_identity_rate_limits").run();
      await database.prepare("DELETE FROM rate_limit").run();
      const hostile = await authRequest(auth, "/sign-in/email", {
        body: {
          email: "dona-a@example.test",
          password: "nova frase segura da dona A 2026",
        },
        ip: "203.0.113.71",
        origin: "https://attacker.example",
      });
      assert.equal(hostile.status, 403);
      const source = await readFile(
        resolve("app/api/auth/[...all]/route.ts"),
        "utf8",
      );
      assert.match(source, /sign-up\/email/);
      assert.match(source, /status:\s*404/);
      assert.throws(
        () =>
          resolveTrustedOrigins({
            AUTH_TRUSTED_ORIGINS: "https://*.example.test",
          }),
        /does not accept wildcards/,
      );
    });

    await t.test("segredo não aparece no bundle nem nas respostas", async () => {
      const worker = await readFile(resolve("dist/server/index.js"), "utf8");
      assert.doesNotMatch(worker, /test-only-better-auth-secret/);
      const response = await authRequest(auth, "/ok", {
        ip: "203.0.113.80",
      });
      assert.doesNotMatch(await response.text(), new RegExp(testSecret));
    });
  } finally {
    await platform.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});
