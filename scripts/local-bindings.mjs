import { resolve } from "node:path";
import { Miniflare } from "miniflare";

export async function openLocalBindings(
  persistRoot = resolve(".wrangler/state/v3"),
) {
  const root = resolve(persistRoot);
  const miniflare = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('local only'); } }",
    compatibilityDate: "2026-07-28",
    d1Databases: { DB: "00000000-0000-4000-8000-000000000000" },
    r2Buckets: ["STORE_IMAGES"],
    d1Persist: resolve(root, "d1"),
    r2Persist: resolve(root, "r2"),
  });

  return {
    database: await miniflare.getD1Database("DB"),
    bucket: await miniflare.getR2Bucket("STORE_IMAGES"),
    dispose: () => miniflare.dispose(),
  };
}
