import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { generateFixtures, METADATA_MARKER } from "./generate-fixtures.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const baseURL = process.argv[2] ?? "http://127.0.0.1:8792";
const mode = process.argv[3] ?? "local-offline";

function webpSignature(bytes) {
  return (
    bytes.byteLength >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

async function requestFixture(path, fixture) {
  const response = await fetch(`${baseURL}${path}`, {
    method: "POST",
    headers: { "content-type": fixture.declaredType },
    body: fixture.bytes,
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.startsWith("image/webp")) {
    let error = "Imagem rejeitada.";
    try {
      error = (await response.json()).error ?? error;
    } catch {
      await response.arrayBuffer();
    }
    return { status: response.status, accepted: false, error };
  }

  const output = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(output, { animated: true }).metadata();
  return {
    status: response.status,
    accepted: true,
    inputInfo: {
      format: response.headers.get("x-feita-input-format"),
      width: Number(response.headers.get("x-feita-input-width")),
      height: Number(response.headers.get("x-feita-input-height")),
    },
    output: {
      contentType: contentType.split(";", 1)[0],
      validWebPSignature: webpSignature(output),
      bytes: output.byteLength,
      width: metadata.width ?? null,
      height: metadata.pageHeight ?? metadata.height ?? null,
      pages: metadata.pages ?? 1,
      metadataMarkerPresent: output.includes(Buffer.from(METADATA_MARKER)),
      exifPresent: Boolean(metadata.exif),
      iccPresent: Boolean(metadata.icc),
      xmpPresent: Boolean(metadata.xmp),
    },
    bytes: output,
  };
}

async function requestInfo(fixture) {
  const response = await fetch(`${baseURL}/info`, {
    method: "POST",
    headers: { "content-type": fixture.declaredType },
    body: fixture.bytes,
  });
  try {
    return { status: response.status, ...(await response.json()) };
  } catch {
    return { status: response.status, ok: false, error: "Imagem rejeitada." };
  }
}

const fixtures = await generateFixtures();
const resultDirectory = resolve(root, ".results", mode);
await mkdir(resultDirectory, { recursive: true });
const results = [];
const uniqueTransformations = new Set();

for (const fixture of fixtures) {
  const info = await requestInfo(fixture);
  const transformed = await requestFixture("/transform", fixture);
  if (transformed.accepted) {
    const fingerprint = createHash("sha256").update(fixture.bytes).digest("hex");
    uniqueTransformations.add(`${fingerprint}:webp:1800`);
    await writeFile(resolve(resultDirectory, `${fixture.name}.webp`), transformed.bytes);
  }
  const safeTransform = Object.fromEntries(
    Object.entries(transformed).filter(([key]) => key !== "bytes"),
  );
  results.push({
    fixture: fixture.name,
    sourceBytes: fixture.bytes.byteLength,
    declaredType: fixture.declaredType,
    info,
    transform: safeTransform,
    orientationNormalized:
      fixture.name === "exif-orientation" &&
      safeTransform.accepted &&
      safeTransform.output.width === 20 &&
      safeTransform.output.height === 40,
    metadataRemoved:
      fixture.name === "synthetic-metadata" &&
      safeTransform.accepted &&
      !safeTransform.output.metadataMarkerPresent &&
      !safeTransform.output.exifPresent &&
      !safeTransform.output.iccPresent &&
      !safeTransform.output.xmpPresent,
  });
}

const report = {
  mode,
  baseURL,
  executedAt: new Date().toISOString(),
  fixtureCount: results.length,
  uniqueTransformations: uniqueTransformations.size,
  results,
};
await writeFile(resolve(resultDirectory, "results.json"), `${JSON.stringify(report, null, 2)}\n`);

for (const result of results) {
  const infoFormat = result.info.info?.format ?? "-";
  const dimensions = result.info.info?.width
    ? `${result.info.info.width}x${result.info.info.height}`
    : "-";
  const outcome = result.transform.accepted ? "aceita" : `rejeitada (${result.transform.status})`;
  console.log(`${result.fixture.padEnd(22)} ${outcome.padEnd(16)} info=${infoFormat} ${dimensions}`);
}
console.log(`Transformações únicas aceitas: ${uniqueTransformations.size}.`);
console.log(`Resultado local: ${resolve(resultDirectory, "results.json")}`);
