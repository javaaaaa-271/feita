import { getWorkerEnvironment } from "@/db";
import { requireBinding } from "@/db/bindings.mjs";
import {
  createFeitaAuth,
  type FeitaAuthEnvironment,
  type FeitaAuthRuntime,
} from "./server";

export async function authRuntimeForRequest(
  request: Request,
  providedEnvironment?: Record<string, unknown>,
): Promise<FeitaAuthRuntime> {
  const environment = providedEnvironment ?? (await getWorkerEnvironment());
  let waitUntil: FeitaAuthRuntime["waitUntil"];

  try {
    const workerModule = await import("cloudflare:workers");
    waitUntil = workerModule.ctx?.waitUntil?.bind(workerModule.ctx);
  } catch {
    waitUntil = undefined;
  }

  return {
    database: requireBinding(environment, "DB") as D1Database,
    environment: environment as FeitaAuthEnvironment,
    request,
    waitUntil,
  };
}
export async function authForRequest(request: Request) {
  return createFeitaAuth(await authRuntimeForRequest(request));
}
