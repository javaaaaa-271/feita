import assert from "node:assert/strict";
import { timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const productionOrigin =
  "https://projeto-vitrine-mvp.javaaaa-237.chatgpt.site";
const trialSecret = "local-rendered-worker-trial-secret-2026";
const trialSecretHeader = "x-feita-ensaio-secret";

if (typeof crypto.subtle.timingSafeEqual !== "function") {
  Object.defineProperty(crypto.subtle, "timingSafeEqual", {
    configurable: true,
    value(left, right) {
      return timingSafeEqual(asBytes(left), asBytes(right));
    },
  });
}

function asBytes(value) {
  return ArrayBuffer.isView(value)
    ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
    : new Uint8Array(value);
}

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

function workerEnvironment() {
  return {
    MARCO_6_3B_ACCESS_SECRET: trialSecret,
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  };
}

function trialRequest(input, init = {}) {
  const headers = new Headers(init.headers);
  headers.set(trialSecretHeader, trialSecret);
  return new Request(input, { ...init, headers });
}

function executionContext() {
  return {
    waitUntil() {},
    passThroughOnException() {},
  };
}

function meteredTrialEnvironment(budgetResult = null) {
  const accesses = { ASSETS: 0, DB: 0, STORE_IMAGES: 0, IMAGES: 0, prepares: 0 };
  const database = {
    prepare() {
      accesses.prepares += 1;
      const statement = {
        bind() {
          return statement;
        },
        async first() {
          return budgetResult;
        },
      };
      return statement;
    },
  };
  const environment = {
    MARCO_6_3B_ACCESS_SECRET: trialSecret,
    get ASSETS() {
      accesses.ASSETS += 1;
      throw new Error("ASSETS não deveria ser acessado");
    },
    get DB() {
      accesses.DB += 1;
      return database;
    },
    get STORE_IMAGES() {
      accesses.STORE_IMAGES += 1;
      throw new Error("R2 não deveria ser acessado");
    },
    get IMAGES() {
      accesses.IMAGES += 1;
      throw new Error("Images não deveria ser acessado");
    },
  };
  return { accesses, environment };
}

test("barreira secreta do ensaio não alcança bindings sem autorização", async () => {
  const worker = await loadWorker();
  const { accesses, environment } = meteredTrialEnvironment();
  const response = await worker.fetch(
    new Request("https://trial.example.test/"),
    environment,
    executionContext(),
  );

  assert.equal(response.status, 404);
  assert.deepEqual(accesses, {
    ASSETS: 0,
    DB: 0,
    STORE_IMAGES: 0,
    IMAGES: 0,
    prepares: 0,
  });
});

test("orçamento esgotado não entra no aplicativo nem alcança R2, Images ou Assets", async () => {
  const worker = await loadWorker();
  const { accesses, environment } = meteredTrialEnvironment(null);
  const response = await worker.fetch(
    trialRequest(
      "https://trial.example.test/api/painel/stores/store-a/products/product-a/image",
      { method: "PUT", body: new Uint8Array([1, 2, 3]) },
    ),
    environment,
    executionContext(),
  );

  assert.equal(response.status, 429);
  assert.deepEqual(accesses, {
    ASSETS: 0,
    DB: 1,
    STORE_IMAGES: 0,
    IMAGES: 0,
    prepares: 1,
  });
});

test("otimizador Vinext fica indisponível no ensaio antes de Assets e Images", async () => {
  const worker = await loadWorker();
  const { accesses, environment } = meteredTrialEnvironment();
  const response = await worker.fetch(
    trialRequest(
      "https://trial.example.test/_vinext/image?url=%2Fimage.jpg&w=640&q=75",
    ),
    environment,
    executionContext(),
  );

  assert.equal(response.status, 404);
  assert.deepEqual(accesses, {
    ASSETS: 0,
    DB: 0,
    STORE_IMAGES: 0,
    IMAGES: 0,
    prepares: 0,
  });
});

test("segredo do ensaio é removido antes de ASSETS.fetch", async () => {
  const worker = await loadWorker();
  let receivedSecret;
  const response = await worker.fetch(
    trialRequest("https://trial.example.test/favicon.svg"),
    {
      MARCO_6_3B_ACCESS_SECRET: trialSecret,
      ASSETS: {
        fetch: async (request) => {
          receivedSecret = request.headers.get(trialSecretHeader);
          return new Response("asset protegido", {
            headers: { "content-type": "text/plain" },
          });
        },
      },
    },
    executionContext(),
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "asset protegido");
  assert.equal(receivedSecret, null);
});

test("renders product metadata in Brazilian Portuguese", async () => {
  const worker = await loadWorker();

  const response = await worker.fetch(
    trialRequest("http://localhost/", {
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
  const html = await response.text();
  assert.match(html, /<html[^>]*\blang=["']pt-BR["']/i);
  assert.match(html, /<title>Feita — seu negócio, em ordem<\/title>/i);
  assert.match(html, /Venda pelo WhatsApp sem se perder no WhatsApp/i);
  assert.match(html, /href="\/cadastro"/i);
  assert.doesNotMatch(html, /\bcodex-preview\b/i);
  assert.doesNotMatch(html, /Caderno Jardim|Planner Semanal|Cartão Presente/i);
});

test("adds browser hardening headers to application responses", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    trialRequest("https://example.test/", {
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
    trialRequest("https://example.test/"),
    workerEnvironment(),
    executionContext(),
  );
  const httpResponse = await worker.fetch(
    trialRequest("http://localhost/"),
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
    trialRequest(`${productionOrigin}/`, {
      headers: { origin: productionOrigin },
    }),
    workerEnvironment(),
    executionContext(),
  );
  const rejectedResponse = await worker.fetch(
    trialRequest(`${productionOrigin}/`, {
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
    trialRequest("https://example.test/", { method: "POST" }),
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

test("renders accessible authentication and public onboarding interfaces", async () => {
  const worker = await loadWorker();
  const pages = {};

  for (const path of [
    "/entrar",
    "/esqueci-minha-senha",
    "/redefinir-senha",
    "/aceitar-convite",
    "/cadastro",
  ]) {
    const response = await worker.fetch(
      trialRequest(`http://localhost${path}`, {
        headers: { accept: "text/html" },
      }),
      workerEnvironment(),
      executionContext(),
    );
    assert.equal(response.status, 200, path);
    pages[path] = await response.text();
  }

  assert.match(pages["/entrar"], /<label[^>]*for="email"[^>]*>E-mail<\/label>/i);
  assert.match(pages["/entrar"], /autocomplete="email"/i);
  assert.match(pages["/entrar"], /autocomplete="current-password"/i);
  assert.match(pages["/entrar"], />Entrar<\/button>/i);
  assert.match(pages["/entrar"], /Esqueci minha senha/i);
  assert.match(pages["/entrar"], /Crie seu acesso/i);
  assert.match(pages["/redefinir-senha"], /autocomplete="one-time-code"/i);
  assert.match(pages["/redefinir-senha"], /autocomplete="new-password"/i);
  assert.match(pages["/aceitar-convite"], /Código do convite/i);
  assert.match(pages["/cadastro"], /Criar minha loja/i);
  assert.match(pages["/cadastro"], /autocomplete="new-password"/i);
  assert.match(pages["/cadastro"], /código no e-mail protege sua conta/i);
  assert.doesNotMatch(
    Object.values(pages).join("\n"),
    /Entrar com (Google|Apple|telefone)|magic link/i,
  );
});

test("protects panel and store creation with server-side session helpers", async () => {
  const panelSource = await readFile(resolve("app/painel/page.tsx"), "utf8");
  const onboardingSource = await readFile(
    resolve("app/api/onboarding/store/route.ts"),
    "utf8",
  );
  assert.match(panelSource, /requireSession\(auth,\s*requestHeaders\)/);
  assert.match(panelSource, /redirect\("\/entrar"\)/);
  assert.doesNotMatch(panelSource, /searchParams.*(store|tenant)/s);
  assert.match(onboardingSource, /requireSession\(auth, request\.headers\)/);
  assert.match(onboardingSource, /userId: session\.user\.id/);
  assert.doesNotMatch(onboardingSource, /input\.(userId|storeId|tenantId)/);
});
