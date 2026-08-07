import { handleProductImageRequest } from "@/media/http";

type RouteContext = {
  params: Promise<{ storeId: string; productId: string }>;
};

export async function PUT(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { storeId, productId } = await context.params;
  return handleProductImageRequest({
    request,
    storeId,
    productId,
    method: "PUT",
  });
}

export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { storeId, productId } = await context.params;
  return handleProductImageRequest({
    request,
    storeId,
    productId,
    method: "DELETE",
  });
}
