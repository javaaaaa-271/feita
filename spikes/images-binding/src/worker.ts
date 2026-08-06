import {
  MAX_INPUT_BYTES,
  MAX_OUTPUT_BYTES,
  dimensionsWithinLimits,
  hasWebPSignature,
  inspectImageStructure,
  isAcceptedStaticRaster,
  mimeForRasterKind,
  resizeOptions,
} from "./inspection";

type ImagesInfo = {
  format?: string;
  fileSize?: number;
  width?: number;
  height?: number;
};

type ImagesBinding = {
  info(stream: ReadableStream): Promise<ImagesInfo>;
  input(stream: ReadableStream): {
    transform(options: Record<string, unknown>): {
      output(options: { format: string }): Promise<{ response(): Response }>;
    };
  };
};

type Env = { IMAGES: ImagesBinding };

class SizeLimitError extends Error {}

const GENERIC_REJECTION = "Imagem rejeitada.";

function bytesStream(bytes: Uint8Array) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

export async function readLimitedStream(
  stream: ReadableStream<Uint8Array> | null,
  maximumBytes: number,
) {
  if (!stream) return new Uint8Array();
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel();
        throw new SizeLimitError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

async function readRequestBytes(request: Request) {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const parsed = Number(declaredLength);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > MAX_INPUT_BYTES) {
      throw new SizeLimitError();
    }
  }
  return readLimitedStream(request.body, MAX_INPUT_BYTES);
}

function genericRejection(status = 400) {
  return Response.json({ ok: false, error: GENERIC_REJECTION }, { status });
}

function normalizedInfo(info: ImagesInfo) {
  return {
    format: typeof info.format === "string" ? info.format : null,
    fileSize: Number.isFinite(info.fileSize) ? Number(info.fileSize) : null,
    width: Number.isFinite(info.width) ? Number(info.width) : null,
    height: Number.isFinite(info.height) ? Number(info.height) : null,
  };
}

async function inspectWithBinding(bytes: Uint8Array, images: ImagesBinding) {
  return normalizedInfo(await images.info(bytesStream(bytes)));
}

async function handleInfo(request: Request, env: Env) {
  try {
    const bytes = await readRequestBytes(request);
    const structure = inspectImageStructure(bytes);
    const info = await inspectWithBinding(bytes, env.IMAGES);
    return Response.json({ ok: true, structure, info });
  } catch (error) {
    return genericRejection(error instanceof SizeLimitError ? 413 : 400);
  }
}

async function handleTransform(request: Request, env: Env) {
  try {
    const bytes = await readRequestBytes(request);
    const structure = inspectImageStructure(bytes);
    if (!isAcceptedStaticRaster(structure)) return genericRejection();

    const info = await inspectWithBinding(bytes, env.IMAGES);
    if (
      !dimensionsWithinLimits(Number(info.width), Number(info.height)) ||
      info.format !== mimeForRasterKind(structure.kind)
    ) {
      return genericRejection();
    }

    const transformed = await env.IMAGES
      .input(bytesStream(bytes))
      .transform(resizeOptions(Number(info.width), Number(info.height)))
      .output({ format: "image/webp" });
    const outputResponse = transformed.response();
    const output = await readLimitedStream(outputResponse.body, MAX_OUTPUT_BYTES);
    if (
      outputResponse.headers.get("content-type")?.split(";", 1)[0].trim() !==
        "image/webp" ||
      !hasWebPSignature(output)
    ) {
      return genericRejection();
    }

    return new Response(output, {
      headers: {
        "Content-Type": "image/webp",
        "X-Feita-Input-Format": String(info.format),
        "X-Feita-Input-Height": String(info.height),
        "X-Feita-Input-Width": String(info.width),
        "X-Feita-Output-Bytes": String(output.byteLength),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return genericRejection(error instanceof SizeLimitError ? 413 : 400);
  }
}

const worker = {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (request.method !== "POST") return new Response("Método não permitido.", { status: 405 });
    if (url.pathname === "/info") return handleInfo(request, env);
    if (url.pathname === "/transform") return handleTransform(request, env);
    return new Response("Recurso não encontrado.", { status: 404 });
  },
};

export default worker;
