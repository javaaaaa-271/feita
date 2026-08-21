import { authRuntimeForRequest } from "@/auth/runtime";
import { createFeitaAuth } from "@/auth/server";
import type { FeitaAuthEnvironment } from "@/auth/server";
import {
  turnstileGateResponse,
  verifyTurnstileForAuthRequest,
} from "@/auth/turnstile";
import { getWorkerEnvironment } from "@/db";

export async function GET(request: Request): Promise<Response> {
  return handleAuthRequest(request);
}

export async function POST(request: Request): Promise<Response> {
  return handleAuthRequest(request);
}

async function handleAuthRequest(request: Request): Promise<Response> {
  const environment = await getWorkerEnvironment();
  const gateResponse = turnstileGateResponse(
    await verifyTurnstileForAuthRequest({
      request,
      environment: environment as FeitaAuthEnvironment,
    }),
  );
  if (gateResponse) return gateResponse;

  const runtime = await authRuntimeForRequest(
    request,
    environment as Record<string, unknown>,
  );
  const auth = createFeitaAuth(runtime);
  return auth.handler(request);
}
