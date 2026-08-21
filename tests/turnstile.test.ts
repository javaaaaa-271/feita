import assert from "node:assert/strict";
import test from "node:test";
import {
  LOCAL_TURNSTILE_SITE_KEY,
  resolveTurnstileConfiguration,
  TURNSTILE_TOKEN_HEADER,
  turnstileActionForRequest,
  turnstileGateResponse,
  verifyTurnstileForAuthRequest,
} from "../auth/turnstile";

const productionEnvironment = {
  TURNSTILE_SITE_KEY: "0x4AAAA-production-site-key",
  TURNSTILE_SECRET_KEY: "0x4AAAA-production-secret-key",
};

test("chaves de teste são defaults somente em loopback", () => {
  assert.equal(
    resolveTurnstileConfiguration({}, "http://localhost:5173/cadastro").siteKey,
    LOCAL_TURNSTILE_SITE_KEY,
  );
  assert.throws(() =>
    resolveTurnstileConfiguration({}, "https://feita.example/cadastro"),
  );
  assert.throws(() =>
    resolveTurnstileConfiguration(
      {
        TURNSTILE_SITE_KEY: LOCAL_TURNSTILE_SITE_KEY,
        TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
      },
      "https://feita.example/cadastro",
    ),
  );
  assert.equal(
    resolveTurnstileConfiguration(
      productionEnvironment,
      "https://feita.example/cadastro",
    ).usesLocalDefaults,
    false,
  );
});

test("somente ações que enviam e-mail exigem Turnstile", () => {
  assert.equal(
    turnstileActionForRequest(
      new Request("https://feita.example/api/auth/sign-up/email", {
        method: "POST",
      }),
    ),
    "signup",
  );
  assert.equal(
    turnstileActionForRequest(
      new Request(
        "https://feita.example/api/auth/email-otp/request-password-reset",
        { method: "POST" },
      ),
    ),
    "password_reset",
  );
  assert.equal(
    turnstileActionForRequest(
      new Request("https://feita.example/api/auth/sign-in/email", {
        method: "POST",
      }),
    ),
    null,
  );
});

test("validação envia token e IP somente ao Siteverify", async () => {
  let sentURL = "";
  let sentBody: Record<string, string> = {};
  const fetcher: typeof fetch = async (input, init) => {
    sentURL = String(input);
    sentBody = JSON.parse(String(init?.body)) as Record<string, string>;
    return Response.json({
      success: true,
      hostname: "feita.example",
      action: "signup",
    });
  };
  const request = new Request("https://feita.example/api/auth/sign-up/email", {
    method: "POST",
    headers: {
      [TURNSTILE_TOKEN_HEADER]: "token-unico",
      "cf-connecting-ip": "203.0.113.90",
    },
  });

  assert.deepEqual(
    await verifyTurnstileForAuthRequest({
      request,
      environment: productionEnvironment,
      fetcher,
    }),
    { status: "verified" },
  );
  assert.equal(
    sentURL,
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  );
  assert.equal(sentBody.response, "token-unico");
  assert.equal(sentBody.remoteip, "203.0.113.90");
  assert.equal(sentBody.secret, productionEnvironment.TURNSTILE_SECRET_KEY);
  assert.match(sentBody.idempotency_key, /^[0-9a-f-]{36}$/i);
});

test("token ausente, ação ou hostname divergentes falham fechados", async () => {
  const baseRequest = new Request(
    "https://feita.example/api/auth/sign-up/email",
    { method: "POST" },
  );
  assert.deepEqual(
    await verifyTurnstileForAuthRequest({
      request: baseRequest,
      environment: productionEnvironment,
    }),
    { status: "rejected" },
  );

  for (const result of [
    { success: true, hostname: "attacker.example", action: "signup" },
    { success: true, hostname: "feita.example", action: "login" },
    { success: false },
  ]) {
    const request = new Request(baseRequest, {
      headers: { [TURNSTILE_TOKEN_HEADER]: "token-unico" },
    });
    assert.deepEqual(
      await verifyTurnstileForAuthRequest({
        request,
        environment: productionEnvironment,
        fetcher: async () => Response.json(result),
      }),
      { status: "rejected" },
    );
  }
});

test("configuração ou Siteverify indisponíveis retornam 503 genérico", async () => {
  const request = new Request(
    "https://feita.example/api/auth/sign-up/email",
    {
      method: "POST",
      headers: { [TURNSTILE_TOKEN_HEADER]: "token-unico" },
    },
  );
  const missingConfiguration = await verifyTurnstileForAuthRequest({
    request,
    environment: {},
  });
  const networkFailure = await verifyTurnstileForAuthRequest({
    request,
    environment: productionEnvironment,
    fetcher: async () => {
      throw new Error("offline");
    },
  });

  assert.deepEqual(missingConfiguration, { status: "unavailable" });
  assert.deepEqual(networkFailure, { status: "unavailable" });
  assert.equal(turnstileGateResponse(networkFailure)?.status, 503);
});
