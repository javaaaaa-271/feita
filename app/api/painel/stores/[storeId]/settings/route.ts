import { handleStoreSettingsRequest } from "@/store-settings/http";

type RouteContext = { params: Promise<{ storeId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  return handleStoreSettingsRequest({ request, storeId });
}

export const PATCH = GET;
