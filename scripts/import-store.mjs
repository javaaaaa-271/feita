import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  normalizeAccentColor,
  normalizeBrazilianWhatsApp,
  normalizeSlug,
  parseStringList,
} from "../app/storefront.mjs";
import { openLocalBindings } from "./local-bindings.mjs";

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
const MAX_PRODUCTS = 200;

export function parseImportArguments(args) {
  const apply = args.includes("--apply");
  const unsupported = args.filter((arg) => arg.startsWith("--") && arg !== "--apply");
  const file = args.find((arg) => !arg.startsWith("--"));
  if (unsupported.length > 0 || !file) {
    throw new Error("Uso: npm run store:import -- caminho/loja.json [--apply]");
  }
  return { apply, file: resolve(file) };
}

function requiredText(value, field, maxLength = 300) {
  const text = String(value ?? "").trim();
  if (!text || text.length > maxLength) {
    throw new Error(`${field} é obrigatório e deve ter até ${maxLength} caracteres.`);
  }
  return text;
}

function optionalText(value, field, maxLength = 500) {
  const text = String(value ?? "").trim();
  if (text.length > maxLength) {
    throw new Error(`${field} deve ter até ${maxLength} caracteres.`);
  }
  return text;
}

function integer(value, field, { min = 0, max = 10_000_000 } = {}) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`${field} deve ser um número inteiro entre ${min} e ${max}.`);
  }
  return number;
}

function imagePath(value, baseDirectory) {
  const text = String(value ?? "").trim();
  return text ? resolve(baseDirectory, text) : null;
}

export function validateStoreImport(raw, baseDirectory = process.cwd()) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("O arquivo deve conter um objeto JSON.");
  }
  if (!Array.isArray(raw.products) || raw.products.length > MAX_PRODUCTS) {
    throw new Error(`products deve ser uma lista com até ${MAX_PRODUCTS} itens.`);
  }

  const products = raw.products.map((product, index) => ({
    name: requiredText(product?.name, `products[${index}].name`, 120),
    description: optionalText(product?.description, `products[${index}].description`, 1000),
    category: requiredText(product?.category ?? "Outros", `products[${index}].category`, 80),
    priceCents: integer(product?.priceCents, `products[${index}].priceCents`, {
      min: 0,
      max: 100_000_000,
    }),
    stock: integer(product?.stock, `products[${index}].stock`, {
      min: 0,
      max: 1_000_000,
    }),
    variations: parseStringList(product?.variations ?? [], "variações"),
    published: product?.published !== false,
    available: product?.available !== false,
    image: imagePath(product?.image, baseDirectory),
  }));

  const paymentMethods = parseStringList(raw.paymentMethods);
  if (paymentMethods.length === 0) {
    throw new Error("paymentMethods deve conter pelo menos uma forma de pagamento.");
  }
  const instagram = optionalText(raw.instagram, "instagram", 80).replace(/^@/, "");
  if (instagram && !/^[a-zA-Z0-9._]{1,30}$/.test(instagram)) {
    throw new Error("instagram deve conter somente um nome de usuário válido.");
  }

  return {
    slug: normalizeSlug(raw.slug),
    name: requiredText(raw.name, "name", 120),
    description: optionalText(raw.description, "description", 500),
    location: optionalText(raw.location, "location", 120),
    accentColor: normalizeAccentColor(raw.accentColor ?? "#8a3f2d"),
    whatsAppE164: normalizeBrazilianWhatsApp(raw.whatsApp),
    instagram,
    purchaseInstructions: optionalText(
      raw.purchaseInstructions,
      "purchaseInstructions",
      500,
    ),
    paymentMethods,
    published: raw.published !== false,
    logo: imagePath(raw.logo, baseDirectory),
    cover: imagePath(raw.cover, baseDirectory),
    products,
  };
}

export async function processImage(sourcePath) {
  const source = await readFile(sourcePath);
  if (source.byteLength > MAX_SOURCE_BYTES) {
    throw new Error(`Imagem excede 10 MB: ${sourcePath}`);
  }

  let metadata;
  try {
    metadata = await sharp(source, { failOn: "warning" }).metadata();
  } catch {
    throw new Error(`Arquivo não é uma imagem válida: ${sourcePath}`);
  }
  if (!["jpeg", "png", "webp", "avif"].includes(metadata.format ?? "")) {
    throw new Error(`Formato não permitido em ${sourcePath}; use JPEG, PNG, WebP ou AVIF.`);
  }

  const output = await sharp(source, { failOn: "warning" })
    .rotate()
    .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  if (output.byteLength > MAX_OUTPUT_BYTES) {
    throw new Error(`Imagem processada excede 5 MB: ${sourcePath}`);
  }
  return output;
}

async function prepareImages(store) {
  const jobs = [
    store.logo && { owner: "store", slot: "logo", path: store.logo },
    store.cover && { owner: "store", slot: "cover", path: store.cover },
    ...store.products.flatMap((product, index) =>
      product.image
        ? [{ owner: "product", productIndex: index, slot: "image", path: product.image }]
        : [],
    ),
  ].filter(Boolean);

  const prepared = [];
  for (const job of jobs) {
    prepared.push({ ...job, bytes: await processImage(job.path) });
  }
  return prepared;
}

export async function importStore(store, images, { persistPath = ".wrangler/state/v3" } = {}) {
  const localBindings = await openLocalBindings(persistPath);
  const { database, bucket } = localBindings;
  const uploadedKeys = [];

  try {
    const existing = await database
      .prepare("SELECT id FROM stores WHERE slug = ?1 LIMIT 1")
      .bind(store.slug)
      .first();
    if (existing) {
      throw new Error(`A loja "${store.slug}" já existe; o importador não sobrescreve dados.`);
    }

    const storeId = crypto.randomUUID();
    const now = Date.now();
    const mediaIds = new Map();
    for (const image of images) {
      const mediaId = crypto.randomUUID();
      const objectKey = `stores/${storeId}/${mediaId}.webp`;
      await bucket.put(objectKey, image.bytes, {
        httpMetadata: { contentType: "image/webp" },
      });
      uploadedKeys.push(objectKey);
      mediaIds.set(image, { mediaId, objectKey });
    }

    const storeLogo = images.find((image) => image.owner === "store" && image.slot === "logo");
    const storeCover = images.find((image) => image.owner === "store" && image.slot === "cover");
    const statements = [
      database
        .prepare(
          `INSERT INTO stores (
            id, slug, name, description, location, accent_color, whatsapp_e164,
            instagram, purchase_instructions, payment_methods_json,
            logo_media_id, cover_media_id, published, created_at, updated_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`,
        )
        .bind(
          storeId,
          store.slug,
          store.name,
          store.description,
          store.location,
          store.accentColor,
          store.whatsAppE164,
          store.instagram,
          store.purchaseInstructions,
          JSON.stringify(store.paymentMethods),
          storeLogo ? mediaIds.get(storeLogo).mediaId : null,
          storeCover ? mediaIds.get(storeCover).mediaId : null,
          store.published ? 1 : 0,
          now,
          now,
        ),
      ...images.map((image) => {
        const media = mediaIds.get(image);
        return database
          .prepare(
            `INSERT INTO media (
              id, tenant_id, object_key, content_type, size_bytes, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
          )
          .bind(
            media.mediaId,
            storeId,
            media.objectKey,
            "image/webp",
            image.bytes.byteLength,
            now,
          );
      }),
      ...store.products.map((product, index) => {
        const productImage = images.find(
          (image) => image.owner === "product" && image.productIndex === index,
        );
        return database
          .prepare(
            `INSERT INTO products (
              id, tenant_id, name, description, category, price_cents, stock,
              variations_json, image_media_id, published, available, sort_order,
              created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`,
          )
          .bind(
            crypto.randomUUID(),
            storeId,
            product.name,
            product.description,
            product.category,
            product.priceCents,
            product.stock,
            JSON.stringify(product.variations),
            productImage ? mediaIds.get(productImage).mediaId : null,
            product.published ? 1 : 0,
            product.available ? 1 : 0,
            index,
            now,
            now,
          );
      }),
    ];
    await database.batch(statements);
    return { storeId, slug: store.slug, products: store.products.length, images: images.length };
  } catch (error) {
    await Promise.all(uploadedKeys.map((key) => bucket.delete(key)));
    throw error;
  } finally {
    await localBindings.dispose();
  }
}

async function main() {
  const { apply, file } = parseImportArguments(process.argv.slice(2));
  const raw = JSON.parse(await readFile(file, "utf8"));
  const store = validateStoreImport(raw, dirname(file));
  const images = await prepareImages(store);

  if (!apply) {
    console.log(
      `Dry-run válido: ${store.name} (${store.slug}), ${store.products.length} produtos, ${images.length} imagens processadas.`,
    );
    console.log("Nenhum dado foi gravado. Acrescente --apply para importar apenas no D1/R2 local.");
    return;
  }

  const result = await importStore(store, images);
  console.log(
    `Importação local concluída: /loja/${result.slug} · ${result.products} produtos · ${result.images} imagens.`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
