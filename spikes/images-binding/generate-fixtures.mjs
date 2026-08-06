import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export const METADATA_MARKER = "FEITA_SYNTHETIC_METADATA_6_2B";

const fixtureRoot = resolve(dirname(fileURLToPath(import.meta.url)), ".generated/fixtures");

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.byteLength);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function insertApngControl(png) {
  const signature = png.subarray(0, 8);
  const ihdrLength = png.readUInt32BE(8);
  const ihdrEnd = 8 + 12 + ihdrLength;
  const ihdrData = png.subarray(16, 16 + ihdrLength);
  const width = ihdrData.readUInt32BE(0);
  const height = ihdrData.readUInt32BE(4);
  const animationControl = Buffer.alloc(8);
  animationControl.writeUInt32BE(1, 0);
  animationControl.writeUInt32BE(0, 4);
  const frameControl = Buffer.alloc(26);
  frameControl.writeUInt32BE(0, 0);
  frameControl.writeUInt32BE(width, 4);
  frameControl.writeUInt32BE(height, 8);
  frameControl.writeUInt32BE(0, 12);
  frameControl.writeUInt32BE(0, 16);
  frameControl.writeUInt16BE(1, 20);
  frameControl.writeUInt16BE(10, 22);
  frameControl[24] = 0;
  frameControl[25] = 0;
  return Buffer.concat([
    signature,
    png.subarray(8, ihdrEnd),
    pngChunk("acTL", animationControl),
    pngChunk("fcTL", frameControl),
    png.subarray(ihdrEnd),
  ]);
}

function animatedGifBytes() {
  return Buffer.from([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
    0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
    0x00, 0x00, 0x00, 0xff, 0xff, 0xff,
    0x21, 0xff, 0x0b, 0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30,
    0x03, 0x01, 0x00, 0x00, 0x00,
    0x21, 0xf9, 0x04, 0x00, 0x0a, 0x00, 0x00, 0x00,
    0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0x02, 0x02, 0x44, 0x01, 0x00,
    0x21, 0xf9, 0x04, 0x00, 0x0a, 0x00, 0x00, 0x00,
    0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0x02, 0x02, 0x4c, 0x01, 0x00,
    0x3b,
  ]);
}

async function solid(format, width = 64, height = 40) {
  return sharp({
    create: { width, height, channels: 3, background: "#8a3f2d" },
  })[format]().toBuffer();
}

export async function generateFixtures() {
  await mkdir(fixtureRoot, { recursive: true });
  const jpeg = await solid("jpeg");
  const png = await solid("png");
  const webp = await solid("webp");
  const orientedJpeg = await sharp({
    create: { width: 40, height: 20, channels: 3, background: "#53664e" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const metadataJpeg = await sharp({
    create: { width: 48, height: 32, channels: 3, background: "#c77755" },
  })
    .jpeg()
    .withMetadata({ exif: { IFD0: { Artist: METADATA_MARKER } } })
    .toBuffer();
  const animatedGif = animatedGifBytes();
  const animatedWebp = await sharp(animatedGif, { animated: true })
    .webp()
    .toBuffer();
  const apng = insertApngControl(png);
  const oversizedPixels = await solid("png", 4096, 4096);

  const fixtures = [
    { name: "static-jpeg", fileName: "static.jpg", bytes: jpeg, declaredType: "image/jpeg" },
    { name: "static-png", fileName: "static.png", bytes: png, declaredType: "image/png" },
    { name: "static-webp", fileName: "static.webp", bytes: webp, declaredType: "image/webp" },
    { name: "exif-orientation", fileName: "orientation.jpg", bytes: orientedJpeg, declaredType: "image/jpeg" },
    { name: "synthetic-metadata", fileName: "metadata.jpg", bytes: metadataJpeg, declaredType: "image/jpeg" },
    { name: "svg", fileName: "vector.svg", bytes: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>'), declaredType: "image/svg+xml" },
    { name: "animated-gif", fileName: "animated.gif", bytes: animatedGif, declaredType: "image/gif" },
    { name: "animated-webp", fileName: "animated.webp", bytes: animatedWebp, declaredType: "image/webp" },
    { name: "apng", fileName: "animated.png", bytes: apng, declaredType: "image/png" },
    { name: "truncated", fileName: "truncated.jpg", bytes: jpeg.subarray(0, Math.floor(jpeg.byteLength / 2)), declaredType: "image/jpeg" },
    { name: "fake-image", fileName: "fake.png", bytes: Buffer.from("conteúdo sintético que não é uma imagem"), declaredType: "image/png" },
    { name: "content-type-mismatch", fileName: "mismatch.png", bytes: jpeg, declaredType: "image/png" },
    { name: "oversized-pixels", fileName: "oversized.png", bytes: oversizedPixels, declaredType: "image/png" },
    { name: "raw-too-large", fileName: "raw-too-large.bin", bytes: Buffer.alloc(8 * 1024 * 1024 + 1), declaredType: "image/jpeg" },
  ];

  for (const fixture of fixtures) {
    await writeFile(resolve(fixtureRoot, fixture.fileName), fixture.bytes);
  }
  await writeFile(
    resolve(fixtureRoot, "manifest.json"),
    `${JSON.stringify(fixtures.map(({ bytes, ...fixture }) => ({ ...fixture, bytes: bytes.byteLength })), null, 2)}\n`,
  );
  return fixtures;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const fixtures = await generateFixtures();
  console.log(`Geradas ${fixtures.length} fixtures sintéticas em ${fixtureRoot}.`);
}
