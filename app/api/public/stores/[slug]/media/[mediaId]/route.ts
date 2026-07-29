import { getD1Database, getImagesBucket, MissingLocalBindingError } from "@/db";
import { findPublicMedia } from "@/db/store-repository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; mediaId: string }> },
) {
  try {
    const { slug, mediaId } = await params;
    const media = await findPublicMedia(await getD1Database(), slug, mediaId);
    if (!media) return new Response("Imagem não encontrada.", { status: 404 });

    const object = await (await getImagesBucket()).get(media.objectKey);
    if (!object?.body) return new Response("Imagem não encontrada.", { status: 404 });

    return new Response(object.body, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Disposition": "inline",
        "Content-Type": media.contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof MissingLocalBindingError) {
      return new Response("Armazenamento local indisponível.", { status: 503 });
    }
    return new Response("Requisição inválida.", { status: 400 });
  }
}
