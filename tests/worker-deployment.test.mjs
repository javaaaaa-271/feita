import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");
const expectedBindings = ["ASSETS", "DB", "STORE_IMAGES", "IMAGES"];

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
  await readFile(path.join(projectRoot, "dist/server/index.js"));
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
