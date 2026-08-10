import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");
const expectedBindings = ["ASSETS", "DB", "STORE_IMAGES", "IMAGES"];
const trialSecret = "local-static-assets-routing-secret-2026";
const trialSecretHeader = "x-feita-ensaio-secret";

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(projectRoot, relativePath), "utf8"));
}

function collectBindings(config) {
  return [
    config.assets?.binding,
    ...(config.d1_databases ?? []).map(({ binding }) => binding),
    ...(config.r2_buckets ?? []).map(({ binding }) => binding),
    config.images?.binding,
  ].filter(Boolean);
}

test("Wrangler is the single source of the four direct Worker bindings", async () => {
  const config = await readJson("wrangler.jsonc");
  const bindings = collectBindings(config);

  assert.deepEqual(bindings.toSorted(), expectedBindings.toSorted());
  for (const binding of expectedBindings) {
    assert.equal(bindings.filter((candidate) => candidate === binding).length, 1);
  }
  assert.equal(config.main, "worker/index.ts");
  assert.equal(config.assets.directory, "./dist/client");
  assert.equal(config.assets.run_worker_first, true);
});

test("Vite consumes wrangler.jsonc without recreating D1 or R2 bindings", async () => {
  const source = await readFile(path.join(projectRoot, "vite.config.ts"), "utf8");

  assert.match(source, /configPath:\s*["']\.\/wrangler\.jsonc["']/);
  assert.doesNotMatch(source, /localBindingConfig/);
  assert.doesNotMatch(source, /d1_databases|r2_buckets/);
});

test("Vinext build emits one deployable binding of each kind", async () => {
  const outputConfig = await readJson("dist/server/wrangler.json");
  const bindings = collectBindings(outputConfig);

  assert.deepEqual(bindings.toSorted(), expectedBindings.toSorted());
  assert.equal(outputConfig.main, "index.js");
  assert.equal(outputConfig.assets.directory, "../client");
  assert.equal(outputConfig.assets.run_worker_first, true);
  await readFile(path.join(projectRoot, "dist/server/index.js"));
});

test("Static Assets passam primeiro pela barreira secreta no roteamento real", async () => {
  const port = await availablePort();
  const child = spawn(
    process.execPath,
    [
      path.join(projectRoot, "node_modules/wrangler/bin/wrangler.js"),
      "dev",
      "--local",
      "--ip",
      "127.0.0.1",
      "--port",
      String(port),
      "--var",
      `MARCO_6_3B_ACCESS_SECRET:${trialSecret}`,
      "--log-level",
      "error",
    ],
    { cwd: projectRoot, stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output += chunk;
  });

  try {
    const assetURL = `http://127.0.0.1:${port}/favicon.svg`;
    const unauthorized = await waitForLocalWorker(child, assetURL, () => output);
    assert.equal(unauthorized.status, 404);
    assert.equal(unauthorized.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await unauthorized.json(), {
      message: "Recurso indisponível.",
    });

    const authorized = await fetch(assetURL, {
      headers: { [trialSecretHeader]: trialSecret },
    });
    assert.equal(authorized.status, 200);
    assert.match(authorized.headers.get("content-type") ?? "", /^image\/svg\+xml\b/i);
    assert.deepEqual(
      Buffer.from(await authorized.arrayBuffer()),
      await readFile(path.join(projectRoot, "dist/client/favicon.svg")),
    );
  } finally {
    await stopLocalWorker(child);
  }
});

test("Worker dry-run bundles the Vinext artifact and validates all bindings", () => {
  const result = spawnSync("bash", ["scripts/worker-deploy-dry-run.sh"], {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env, WORKER_DRY_RUN_SKIP_BUILD: "1" },
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

  assert.equal(result.status, 0, output);
  assert.match(output, /Validated direct Worker entry: dist\/server\/index\.js/);
  assert.match(
    output,
    /Validated direct Worker bindings: ASSETS, DB, STORE_IMAGES, IMAGES/,
  );
});

async function availablePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.notEqual(address, null);
  assert.equal(typeof address, "object");
  const port = address.port;
  await new Promise((resolveClose) => server.close(resolveClose));
  return port;
}

async function waitForLocalWorker(child, url, readOutput) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Wrangler local encerrou antes do teste.\n${readOutput()}`);
    }
    try {
      return await fetch(url);
    } catch {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    }
  }
  throw new Error(`Wrangler local não iniciou a tempo.\n${readOutput()}`);
}

async function stopLocalWorker(child) {
  if (child.exitCode !== null) return;
  child.kill();
  await Promise.race([
    once(child, "exit"),
    new Promise((resolveDelay) => setTimeout(resolveDelay, 5_000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}
