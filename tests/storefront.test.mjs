import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { buildWhatsAppUrl } from "../app/order.mjs";
import {
  cartStorageKey,
  normalizeAccentColor,
  normalizeBrazilianWhatsApp,
  normalizeSlug,
  parseStoredCart,
} from "../app/storefront.mjs";
import {
  MissingLocalBindingError,
  requireBinding,
} from "../db/bindings.mjs";
import { processImage, validateStoreImport } from "../scripts/import-store.mjs";

test("normaliza telefone brasileiro e monta destino direto com acentos", () => {
  const phone = normalizeBrazilianWhatsApp("(63) 99999-0000");
  assert.equal(phone, "5563999990000");
  assert.equal(normalizeBrazilianWhatsApp("(55) 99999-0000"), "5555999990000");
  const url = buildWhatsAppUrl("Olá! Pedido de café.", phone);
  assert.equal(
    url,
    "https://wa.me/5563999990000?text=Ol%C3%A1!%20Pedido%20de%20caf%C3%A9.",
  );
});

test("recusa telefone, slug e cor inválidos", () => {
  assert.throws(() => normalizeBrazilianWhatsApp("1199"), /válido/);
  assert.throws(() => normalizeSlug("../outra-loja"), /slug/);
  assert.throws(() => normalizeAccentColor("red"), /hexadecimal/);
});

test("falta de D1 ou R2 gera erro local controlado", () => {
  for (const binding of ["DB", "STORE_IMAGES"]) {
    assert.throws(
      () => requireBinding({}, binding),
      (error) =>
        error instanceof MissingLocalBindingError &&
        error.message.includes(binding) &&
        error.message.includes("nenhum recurso remoto"),
    );
  }
});

test("carrinho é isolado por slug e descarta itens indisponíveis", () => {
  assert.notEqual(cartStorageKey("loja-a"), cartStorageKey("loja-b"));
  const products = [
    {
      id: "available",
      available: true,
      published: true,
      stock: 2,
      variations: ["P", "M"],
    },
    {
      id: "hidden",
      available: true,
      published: false,
      stock: 4,
      variations: [],
    },
  ];
  const cart = parseStoredCart(
    JSON.stringify([
      { productId: "available", variation: "M", quantity: 9 },
      { productId: "hidden", variation: "", quantity: 1 },
      { productId: "missing", variation: "", quantity: 1 },
    ]),
    products,
  );
  assert.deepEqual(cart, [
    { productId: "available", variation: "M", quantity: 2 },
  ]);
});

test("validação do importador mantém preço em centavos e publicação explícita", () => {
  const store = validateStoreImport({
    slug: "loja-teste",
    name: "Loja Teste",
    whatsApp: "63999990000",
    paymentMethods: ["Pix"],
    products: [
      {
        name: "Produto",
        priceCents: 1299,
        stock: 0,
        published: false,
      },
    ],
  });
  assert.equal(store.products[0].priceCents, 1299);
  assert.equal(store.products[0].published, false);
  assert.equal(store.whatsAppE164, "5563999990000");
});

test("upload inválido é recusado antes de chegar ao R2", async () => {
  const directory = await mkdtemp(join(tmpdir(), "feita-image-"));
  const source = join(directory, "arquivo.png");
  try {
    await writeFile(source, "não é uma imagem");
    await assert.rejects(() => processImage(source), /imagem válida/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("imagem válida é reprocessada em WebP, redimensionada e sem metadados", async () => {
  const directory = await mkdtemp(join(tmpdir(), "feita-image-"));
  const source = join(directory, "origem.jpg");
  try {
    await sharp({
      create: {
        width: 2200,
        height: 1200,
        channels: 3,
        background: "#8a3f2d",
      },
    })
      .jpeg()
      .withMetadata({ comment: "metadado que não deve sobreviver" })
      .toFile(source);
    const output = await processImage(source);
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 1800);
    assert.equal(metadata.exif, undefined);
    assert.equal(metadata.icc, undefined);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("imagem acima do limite é recusada antes da decodificação", async () => {
  const directory = await mkdtemp(join(tmpdir(), "feita-image-"));
  const source = join(directory, "grande.jpg");
  try {
    await writeFile(source, Buffer.alloc(10 * 1024 * 1024 + 1));
    await assert.rejects(() => processImage(source), /excede 10 MB/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
