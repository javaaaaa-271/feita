import { handleProductCollectionRequest } from "@/catalog/http";

type RouteContext = { params: Promise<{ storeId: string }> };

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { storeId } = await context.params;
  return handleProductCollectionRequest({ request, storeId, method: "GET" });
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { storeId } = await context.params;
  return handleProductCollectionRequest({ request, storeId, method: "POST" });
}
