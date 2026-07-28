import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

const productionOrigin =
  "https://projeto-vitrine-mvp.javaaaa-237.chatgpt.site";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

function workerEnvironment() {
  return {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  };
}

function executionContext() {
  return {
    waitUntil() {},
    passThroughOnException() {},
  };
}

test("renders development preview metadata", async () => {
  const worker = await loadWorker();

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    workerEnvironment(),
    executionContext(),
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("adds browser hardening headers to application responses", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://example.test/", {
      headers: { accept: "text/html" },
    }),
    workerEnvironment(),
    executionContext(),
  );

  const contentSecurityPolicy =
    response.headers.get("content-security-policy") ?? "";

  assert.match(contentSecurityPolicy, /frame-ancestors 'none'(?:;|$)/);
  assert.match(contentSecurityPolicy, /object-src 'none'(?:;|$)/);
  assert.match(contentSecurityPolicy, /base-uri 'self'(?:;|$)/);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(
    response.headers.get("referrer-policy"),
    "strict-origin-when-cross-origin",
  );
  assert.equal(
    response.headers.get("permissions-policy"),
    "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  );
  assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin");
  assert.equal(
    response.headers.get("cross-origin-resource-policy"),
    "same-origin",
  );
});

test("adds HSTS only to HTTPS responses", async () => {
  const worker = await loadWorker();
  const httpsResponse = await worker.fetch(
    new Request("https://example.test/"),
    workerEnvironment(),
    executionContext(),
  );
  const httpResponse = await worker.fetch(
    new Request("http://localhost/"),
    workerEnvironment(),
    executionContext(),
  );

  assert.equal(
    httpsResponse.headers.get("strict-transport-security"),
    "max-age=31536000; includeSubDomains",
  );
  assert.equal(httpResponse.headers.get("strict-transport-security"), null);
});

test("uses a fixed CORS allowlist without reflecting arbitrary origins", async () => {
  const worker = await loadWorker();
  const allowedResponse = await worker.fetch(
    new Request(`${productionOrigin}/`, {
      headers: { origin: productionOrigin },
    }),
    workerEnvironment(),
    executionContext(),
  );
  const rejectedResponse = await worker.fetch(
    new Request(`${productionOrigin}/`, {
      headers: { origin: "https://attacker.example" },
    }),
    workerEnvironment(),
    executionContext(),
  );

  assert.equal(
    allowedResponse.headers.get("access-control-allow-origin"),
    productionOrigin,
  );
  assert.match(allowedResponse.headers.get("vary") ?? "", /\bOrigin\b/i);
  assert.equal(
    rejectedResponse.headers.get("access-control-allow-origin"),
    null,
  );
  assert.equal(
    rejectedResponse.headers.get("access-control-allow-credentials"),
    null,
  );
});

test("keeps hardening headers on rejected mutable methods", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://example.test/", { method: "POST" }),
    workerEnvironment(),
    executionContext(),
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(
    response.headers.get("content-security-policy") ?? "",
    /frame-ancestors 'none'(?:;|$)/,
  );
});
