export const MAX_INPUT_BYTES = 8 * 1024 * 1024;
export const MAX_WIDTH = 4096;
export const MAX_HEIGHT = 4096;
export const MAX_PIXELS = 16_000_000;
export const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
export const OUTPUT_MAX_DIMENSION = 1800;

export type RasterKind = "jpeg" | "png" | "webp" | "gif" | "svg" | "unknown";

export type StructuralInspection = {
  kind: RasterKind;
  animated: boolean;
  truncated: boolean;
};

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function hasPrefix(bytes: Uint8Array, prefix: readonly number[]) {
  return prefix.every((value, index) => bytes[index] === value);
}

function looksLikeSvg(bytes: Uint8Array) {
  const prefix = new TextDecoder()
    .decode(bytes.subarray(0, Math.min(bytes.byteLength, 1024)))
    .replace(/^\uFEFF/, "")
    .trimStart()
    .toLowerCase();
  return prefix.startsWith("<svg") || /^<\?xml\b[\s\S]*?<svg\b/.test(prefix);
}

function inspectGif(bytes: Uint8Array): StructuralInspection {
  if (bytes.byteLength < 13) return { kind: "gif", animated: false, truncated: true };
  let offset = 13;
  const packed = bytes[10];
  if (packed & 0x80) offset += 3 * (1 << ((packed & 0x07) + 1));
  let frames = 0;

  while (offset < bytes.byteLength) {
    const marker = bytes[offset++];
    if (marker === 0x3b) {
      return { kind: "gif", animated: frames > 1, truncated: false };
    }
    if (marker === 0x2c) {
      if (offset + 9 > bytes.byteLength) break;
      const imagePacked = bytes[offset + 8];
      offset += 9;
      if (imagePacked & 0x80) offset += 3 * (1 << ((imagePacked & 0x07) + 1));
      if (offset >= bytes.byteLength) break;
      offset += 1;
      frames += 1;
    } else if (marker === 0x21) {
      if (offset >= bytes.byteLength) break;
      offset += 1;
    } else {
      break;
    }

    while (offset < bytes.byteLength) {
      const size = bytes[offset++];
      if (size === 0) break;
      if (offset + size > bytes.byteLength) {
        offset = bytes.byteLength + 1;
        break;
      }
      offset += size;
    }
  }

  return { kind: "gif", animated: frames > 1, truncated: true };
}

function inspectWebP(bytes: Uint8Array): StructuralInspection {
  if (bytes.byteLength < 12) return { kind: "webp", animated: false, truncated: true };
  const declaredSize = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    .getUint32(4, true) + 8;
  let offset = 12;
  let animated = false;
  let truncated = declaredSize > bytes.byteLength;

  while (offset + 8 <= Math.min(declaredSize, bytes.byteLength)) {
    const chunk = ascii(bytes, offset, 4);
    const size = new DataView(bytes.buffer, bytes.byteOffset + offset + 4, 4)
      .getUint32(0, true);
    const end = offset + 8 + size;
    if (end > bytes.byteLength) {
      truncated = true;
      break;
    }
    if (chunk === "ANIM" || chunk === "ANMF") animated = true;
    offset = end + (size % 2);
  }

  return { kind: "webp", animated, truncated };
}

function inspectPng(bytes: Uint8Array): StructuralInspection {
  if (bytes.byteLength < 8) return { kind: "png", animated: false, truncated: true };
  let offset = 8;
  let animated = false;
  let foundEnd = false;

  while (offset + 12 <= bytes.byteLength) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4)
      .getUint32(0, false);
    const chunk = ascii(bytes, offset + 4, 4);
    const end = offset + 12 + length;
    if (end > bytes.byteLength) {
      return { kind: "png", animated, truncated: true };
    }
    if (chunk === "acTL") animated = true;
    if (chunk === "IEND") {
      foundEnd = true;
      break;
    }
    offset = end;
  }

  return { kind: "png", animated, truncated: !foundEnd };
}

export function inspectImageStructure(bytes: Uint8Array): StructuralInspection {
  if (looksLikeSvg(bytes)) return { kind: "svg", animated: false, truncated: false };
  if (hasPrefix(bytes, [0xff, 0xd8, 0xff])) {
    return {
      kind: "jpeg",
      animated: false,
      truncated: bytes.byteLength < 4 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9,
    };
  }
  if (hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return inspectPng(bytes);
  }
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return inspectWebP(bytes);
  }
  const gifHeader = ascii(bytes, 0, 6);
  if (gifHeader === "GIF87a" || gifHeader === "GIF89a") return inspectGif(bytes);
  return { kind: "unknown", animated: false, truncated: false };
}

export function isAcceptedStaticRaster(inspection: StructuralInspection) {
  return (
    !inspection.animated &&
    !inspection.truncated &&
    (inspection.kind === "jpeg" ||
      inspection.kind === "png" ||
      inspection.kind === "webp")
  );
}

export function mimeForRasterKind(kind: RasterKind) {
  if (kind === "jpeg") return "image/jpeg";
  if (kind === "png") return "image/png";
  if (kind === "webp") return "image/webp";
  if (kind === "gif") return "image/gif";
  if (kind === "svg") return "image/svg+xml";
  return null;
}

export function dimensionsWithinLimits(width: number, height: number) {
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width > 0 &&
    height > 0 &&
    width <= MAX_WIDTH &&
    height <= MAX_HEIGHT &&
    width * height <= MAX_PIXELS
  );
}

export function hasWebPSignature(bytes: Uint8Array) {
  return (
    bytes.byteLength >= 12 &&
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 4) === "WEBP"
  );
}

export function resizeOptions(width: number, height: number) {
  if (width <= OUTPUT_MAX_DIMENSION && height <= OUTPUT_MAX_DIMENSION) return {};
  return width >= height
    ? { width: OUTPUT_MAX_DIMENSION }
    : { height: OUTPUT_MAX_DIMENSION };
}
