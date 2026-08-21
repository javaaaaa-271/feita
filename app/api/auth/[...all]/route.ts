import { authForRequest } from "@/auth/runtime";

export async function GET(request: Request): Promise<Response> {
  const auth = await authForRequest(request);
  return auth.handler(request);
}

export async function POST(request: Request): Promise<Response> {
  const auth = await authForRequest(request);
  return auth.handler(request);
}
