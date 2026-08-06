import { handleProductResourceRequest } from "@/catalog/http";

type RouteContext = {
  params: Promise<{ storeId: string; productId: string }>;
};

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { storeId, productId } = await context.params;
  return handleProductResourceRequest({
    request,
    storeId,
    productId,
    method: "GET",
  });
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { storeId, productId } = await context.params;
  return handleProductResourceRequest({
    request,
    storeId,
    productId,
    method: "PATCH",
  });
}
