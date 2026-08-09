#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "${script_dir}/.." && pwd)"
worker="${project_root}/dist/server/index.js"
config="${project_root}/wrangler.jsonc"
wrangler="${project_root}/node_modules/.bin/wrangler"

if [[ "${WORKER_DRY_RUN_SKIP_BUILD:-0}" != "1" ]]; then
  npm --prefix "${project_root}" run build
fi

[[ -f "${worker}" ]] || {
  echo "Missing direct Worker entry: dist/server/index.js" >&2
  exit 66
}
[[ -x "${wrangler}" ]] || {
  echo "Wrangler is unavailable. Install the locked dependencies before running the dry-run." >&2
  exit 69
}

temporary_root="${TMPDIR:-/tmp}"
temporary_dir="$(mktemp -d "${temporary_root%/}/feita-worker-dry-run.XXXXXX")"
cleanup() {
  if [[ -n "${temporary_dir:-}" && "${temporary_dir}" == "${temporary_root%/}/feita-worker-dry-run."* ]]; then
    rm -rf -- "${temporary_dir}"
  else
    echo "Refusing to remove an unexpected dry-run path: ${temporary_dir:-<empty>}" >&2
    return 70
  fi
}
trap cleanup EXIT

output_file="${temporary_dir}/wrangler-output.txt"
metafile="${temporary_dir}/bundle-meta.json"

cd "${project_root}"
"${wrangler}" deploy "${worker}" \
  --config "${config}" \
  --dry-run \
  --outdir "${temporary_dir}/bundle" \
  --metafile "${metafile}" \
  2>&1 | tee "${output_file}"

node --input-type=module - "${output_file}" "${metafile}" "${project_root}" <<'NODE'
import { readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

const [outputPath, metafilePath, projectRoot] = process.argv.slice(2);
const output = (await readFile(outputPath, "utf8")).replace(/\u001b\[[0-9;]*m/g, "");
const metadata = JSON.parse(await readFile(metafilePath, "utf8"));
const expectedBindings = ["ASSETS", "DB", "STORE_IMAGES", "IMAGES"];

for (const binding of expectedBindings) {
  const matches = output.match(new RegExp(`\\benv\\.${binding}\\b`, "g")) ?? [];
  if (matches.length !== 1) {
    throw new Error(
      `Wrangler dry-run must expose env.${binding} exactly once; found ${matches.length}.`,
    );
  }
}

const unexpectedBindings = [...output.matchAll(/\benv\.([A-Z][A-Z0-9_]*)\b/g)]
  .map((match) => match[1])
  .filter((binding) => !expectedBindings.includes(binding));
if (unexpectedBindings.length > 0) {
  throw new Error(`Wrangler dry-run exposed unexpected bindings: ${unexpectedBindings.join(", ")}`);
}

const entryPoints = Object.values(metadata.outputs ?? {})
  .map((entry) => entry.entryPoint)
  .filter((entryPoint) => typeof entryPoint === "string")
  .map((entryPoint) => resolve(projectRoot, entryPoint));
const expectedEntry = resolve(projectRoot, "dist/server/index.js");
if (entryPoints.length !== 1 || entryPoints[0] !== expectedEntry) {
  const rendered = entryPoints.map((entryPoint) => relative(projectRoot, entryPoint).split(sep).join("/"));
  throw new Error(
    `Wrangler dry-run must bundle only dist/server/index.js; found ${rendered.join(", ") || "none"}.`,
  );
}

console.log(`Validated direct Worker entry: ${relative(projectRoot, expectedEntry).split(sep).join("/")}`);
console.log(`Validated direct Worker bindings: ${expectedBindings.join(", ")}`);
NODE
