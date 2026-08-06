import { findPublicMedia } from "./store-repository";

const PUBLIC_MEDIA_NOT_FOUND = "Imagem não encontrada.";

type PublicMediaObject = {
  body: BodyInit | null;
};

export type PublicMediaReader = (
  objectKey: string,
) => Promise<PublicMediaObject | null>;

function mediaNotFoundResponse() {
  return new Response(PUBLIC_MEDIA_NOT_FOUND, { status: 404 });
}

export async function respondWithPublicMedia(options: {
  database: D1Database;
  slug: string;
  mediaId: string;
  readObject: PublicMediaReader;
}) {
  const media = await findPublicMedia(
    options.database,
    options.slug,
    options.mediaId,
  );
  if (!media) return mediaNotFoundResponse();

  const object = await options.readObject(media.objectKey);
  if (!object?.body) return mediaNotFoundResponse();

  return new Response(object.body, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": "inline",
      "Content-Type": media.contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
