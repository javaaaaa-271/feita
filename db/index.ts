import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import {
  MissingLocalBindingError,
  requireBinding,
} from "./bindings.mjs";

export { MissingLocalBindingError };

export interface StoreImagesBucket {
  get(key: string): Promise<{
    body: ReadableStream;
  } | null>;
  put(
    key: string,
    value: Uint8Array | ReadableStream,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
}

async function getWorkerEnv() {
  const workerModule = await import("cloudflare:workers");
  return workerModule.env as typeof workerModule.env & {
    STORE_IMAGES?: StoreImagesBucket;
  };
}

export async function getWorkerEnvironment() {
  return getWorkerEnv();
}

export async function getD1Database(): Promise<D1Database> {
  const env = await getWorkerEnv();
  return requireBinding(env, "DB") as D1Database;
}

export async function getImagesBucket(): Promise<StoreImagesBucket> {
  return requireBinding(
    await getWorkerEnv(),
    "STORE_IMAGES",
  ) as StoreImagesBucket;
}

export async function getDb() {
  return drizzle(await getD1Database(), { schema });
}
