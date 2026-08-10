import assert from "node:assert/strict";
import test from "node:test";
import {
  EXPECTED_BODY_BYTES,
  EXPECTED_BODY_SHA256,
  EXPECTED_BODY,
  EXPECTED_CACHE_CONTROL,
  EXPECTED_HSTS,
  assertActiveDeployment,
  assertIsolatedWorkersDevOrigin,
  classifyClosedGatePair,
  classifyTransportError,
  executeClosedGate,
} from "../scripts/worker-closed-gate.mjs";

function approved(label) {
  return {
    label,
    status: 404,
    bodyBytes: EXPECTED_BODY_BYTES,
    bodySha256: EXPECTED_BODY_SHA256,
    cacheControl: EXPECTED_CACHE_CONTROL,
    cacheControlExpected: true,
    hsts: EXPECTED_HSTS,
    hstsPresent: true,
  };
}

test("classificador aprova somente os dois 404 genéricos idênticos", () => {
  assert.deepEqual(classifyClosedGatePair([approved("missing-route"), approved("favicon")]), {
    state: "approved", reason: "closed-response-confirmed", identical: true,
  });
});

test("classificador trata HTTP 523 exclusivamente como transitório", () => {
  const result = classifyClosedGatePair([
    { label: "missing-route", status: 523, bodyBytes: 0, bodySha256: "" },
    approved("favicon"),
  ]);
  assert.equal(result.state, "transient");
});

test("classificador trata somente falha de rede reconhecida como transitória", () => {
  const transient = classifyClosedGatePair([
    { label: "missing-route", transportError: { kind: "dns", code: "ENOTFOUND", transient: true } },
    approved("favicon"),
  ]);
  assert.equal(transient.state, "transient");
  const unknown = classifyClosedGatePair([
    { label: "missing-route", transportError: { kind: "other", code: "UNKNOWN", transient: false } },
    approved("favicon"),
  ]);
  assert.equal(unknown.state, "blocker");
  assert.deepEqual(classifyTransportError({ name: "TimeoutError" }), {
    kind: "connection", code: "ETIMEDOUT", transient: true,
  });
});

test("classificador bloqueia asset servido com status 200 sem permitir retry", () => {
  const result = classifyClosedGatePair([
    approved("missing-route"),
    { ...approved("favicon"), status: 200 },
  ]);
  assert.equal(result.state, "blocker");
});

test("classificador bloqueia 404 com corpo inesperado", () => {
  const result = classifyClosedGatePair([
    approved("missing-route"),
    { ...approved("favicon"), bodyBytes: 18, bodySha256: "unexpected" },
  ]);
  assert.equal(result.state, "blocker");
});

test("plano de controle exige a versão esperada sozinha em 100%", () => {
  assert.equal(
    assertActiveDeployment({ versions: [{ version_id: "version-approved", percentage: 100 }] }, "version-approved"),
    true,
  );
  for (const deployment of [
    { versions: [{ version_id: "other", percentage: 100 }] },
    { versions: [{ version_id: "version-approved", percentage: 99 }] },
    { versions: [
      { version_id: "version-approved", percentage: 50 },
      { version_id: "other", percentage: 50 },
    ] },
  ]) {
    assert.throws(() => assertActiveDeployment(deployment, "version-approved"));
  }
});

test("executor aceita somente a raiz HTTPS isolada em workers.dev", async () => {
  assert.equal(
    assertIsolatedWorkersDevOrigin("https://trial.example.workers.dev"),
    "https://trial.example.workers.dev",
  );
  for (const origin of [
    "http://trial.example.workers.dev",
    "https://workers.dev",
    "https://trial.example.workers.dev/path",
    "https://production.example.com",
  ]) {
    assert.throws(() => assertIsolatedWorkersDevOrigin(origin));
  }

  let controlPlaneCalls = 0;
  let fetchCalls = 0;
  await assert.rejects(() => executeClosedGate({
    origin: "https://production.example.com",
    expectedVersionId: "version-approved",
    deployedAtMs: 100_000,
    accessSecretPresent: false,
    now: () => 100_000,
    readControlPlane: async () => { controlPlaneCalls += 1; return {}; },
    fetchImpl: async () => { fetchCalls += 1; return closedResponse(404); },
  }));
  assert.equal(controlPlaneCalls, 0);
  assert.equal(fetchCalls, 0);
});

test("executor repete somente o transitório a cada cinco segundos", async () => {
  let now = 100_000;
  let calls = 0;
  const delays = [];
  const result = await executeClosedGate({
    origin: "https://trial.example.workers.dev",
    expectedVersionId: "version-approved",
    deployedAtMs: now,
    accessSecretPresent: false,
    now: () => now,
    sleep: async (delay) => {
      delays.push(delay);
      now += delay;
    },
    readControlPlane: async () => ({
      versions: [{ version_id: "version-approved", percentage: 100 }],
    }),
    fetchImpl: async () => {
      calls += 1;
      if (calls <= 2) return new Response("upstream unavailable", { status: 523 });
      return closedResponse(404);
    },
  });
  assert.equal(result.state, "approved");
  assert.equal(result.attempts, 2);
  assert.deepEqual(delays, [5_000]);
});

test("executor não inicia novo retry que ultrapasse sessenta segundos desde o deploy", async () => {
  let now = 156_000;
  let fetchCalls = 0;
  let sleepCalls = 0;
  const result = await executeClosedGate({
    origin: "https://trial.example.workers.dev",
    expectedVersionId: "version-approved",
    deployedAtMs: 100_000,
    accessSecretPresent: false,
    now: () => now,
    sleep: async (delay) => { sleepCalls += 1; now += delay; },
    readControlPlane: async () => ({
      versions: [{ version_id: "version-approved", percentage: 100 }],
    }),
    fetchImpl: async () => {
      fetchCalls += 1;
      return new Response("upstream unavailable", { status: 523 });
    },
  });
  assert.equal(result.state, "transient");
  assert.equal(result.attempts, 1);
  assert.equal(fetchCalls, 2);
  assert.equal(sleepCalls, 0);
});

test("executor não repete bloqueador e não consulta antes do controle de tráfego", async () => {
  let fetchCalls = 0;
  let sleepCalls = 0;
  const common = {
    origin: "https://trial.example.workers.dev",
    expectedVersionId: "version-approved",
    deployedAtMs: 100_000,
    accessSecretPresent: false,
    now: () => 100_000,
    sleep: async () => { sleepCalls += 1; },
  };

  const blocked = await executeClosedGate({
    ...common,
    readControlPlane: async () => ({
      versions: [{ version_id: "version-approved", percentage: 100 }],
    }),
    fetchImpl: async (url) => {
      fetchCalls += 1;
      return closedResponse(new URL(url).pathname === "/favicon.svg" ? 200 : 404);
    },
  });
  assert.equal(blocked.state, "blocker");
  assert.equal(blocked.attempts, 1);
  assert.equal(fetchCalls, 2);
  assert.equal(sleepCalls, 0);

  fetchCalls = 0;
  await assert.rejects(() => executeClosedGate({
    ...common,
    readControlPlane: async () => ({
      versions: [{ version_id: "other", percentage: 100 }],
    }),
    fetchImpl: async () => { fetchCalls += 1; return closedResponse(404); },
  }));
  assert.equal(fetchCalls, 0);
});

test("consultas usam nonce, bypass de cache e nunca enviam o segredo", async () => {
  const observed = [];
  const result = await executeClosedGate({
    origin: "https://trial.example.workers.dev",
    expectedVersionId: "version-approved",
    deployedAtMs: 100_000,
    accessSecretPresent: false,
    now: () => 100_000,
    readControlPlane: async () => ({
      versions: [{ version_id: "version-approved", percentage: 100 }],
    }),
    fetchImpl: async (url, init) => {
      observed.push({ url: new URL(url), headers: new Headers(init.headers) });
      return closedResponse(404);
    },
  });
  assert.equal(result.state, "approved");
  assert.equal(observed.length, 2);
  for (const entry of observed) {
    assert.ok(entry.url.searchParams.get("feita_closed_gate"));
    assert.equal(entry.headers.get("cache-control"), "no-cache, no-store");
    assert.equal(entry.headers.has("x-feita-ensaio-secret"), false);
  }
});

function closedResponse(status) {
  return new Response(EXPECTED_BODY, {
    status,
    headers: {
      "Cache-Control": EXPECTED_CACHE_CONTROL,
      "Strict-Transport-Security": EXPECTED_HSTS,
    },
  });
}
