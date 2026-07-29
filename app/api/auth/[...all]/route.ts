import { authForRequest } from "@/auth/runtime";

export async function GET(request: Request): Promise<Response> {
  const auth = await authForRequest(request);
  return auth.handler(request);
}

export async function POST(request: Request): Promise<Response> {
  // Account creation is deliberately available only through the invitation
  // acceptance service. This keeps Better Auth's public sign-up endpoint shut.
  const pathname = new URL(request.url).pathname.replace(/\/+$/, "");
  if (pathname === "/api/auth/sign-up/email") {
    return Response.json(
      { message: "Cadastro disponível somente por convite." },
      { status: 404 },
    );
  }

  const auth = await authForRequest(request);
  return auth.handler(request);
}
