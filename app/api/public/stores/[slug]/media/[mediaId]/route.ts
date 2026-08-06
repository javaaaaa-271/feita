import { getD1Database, getImagesBucket, MissingLocalBindingError } from "@/db";
import { respondWithPublicMedia } from "@/db/public-media-response";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; mediaId: string }> },
) {
  try {
    const { slug, mediaId } = await params;
    return await respondWithPublicMedia({
      database: await getD1Database(),
      slug,
      mediaId,
      readObject: async (objectKey) =>
        (await getImagesBucket()).get(objectKey),
    });
  } catch (error) {
    if (error instanceof MissingLocalBindingError) {
      return new Response("Armazenamento local indisponível.", { status: 503 });
    }
    return new Response("Requisição inválida.", { status: 400 });
  }
}
