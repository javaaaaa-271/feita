import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { buildStoreMediaUrl } from "@/app/storefront.mjs";
import { products } from "@/db/schema";

export const PRODUCT_LIMITS = {
  name: 120,
  description: 1_000,
  category: 80,
  variations: 20,
  variation: 80,
  variationsTotal: 1_000,
  priceCents: 99_999_999,
  stock: 1_000_000,
  payloadBytes: 16 * 1_024,
} as const;

export type CatalogProduct = {
  id: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  stock: number;
  variations: string[];
  imageUrl: string | null;
  published: boolean;
  available: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ProductInput = {
  name: string;
  description: string;
  category: string;
  priceCents: number;
  stock: number;
  variations: string[];
  published: boolean;
  available: boolean;
};

export type ProductPatch = Partial<ProductInput>;

export class ProductValidationError extends Error {
  readonly status = 400;

  constructor(readonly fields: Record<string, string>) {
    super("Confira os campos destacados.");
    this.name = "ProductValidationError";
  }
}

export class ProductNotFoundError extends Error {
  readonly status = 404;

  constructor() {
    super("Produto não encontrado.");
    this.name = "ProductNotFoundError";
  }
}

const PRODUCT_FIELDS = new Set([
  "name",
  "description",
  "category",
  "price",
  "stock",
  "variations",
  "published",
  "available",
]);

export function parseBrazilianPriceToCents(value: unknown): number {
  if (typeof value !== "string") {
    throw new ProductValidationError({ price: "Informe o preço em reais." });
  }

  const input = value.trim();
  const plain = /^(?:0|[1-9]\d*)(?:,\d{1,2})?$/;
  const grouped = /^(?:[1-9]\d{0,2})(?:\.\d{3})+(?:,\d{1,2})?$/;
  if (!plain.test(input) && !grouped.test(input)) {
    throw new ProductValidationError({
      price: "Use reais com vírgula e no máximo duas casas decimais.",
    });
  }

  const normalized = input.replaceAll(".", "");
  const [reais, decimals = ""] = normalized.split(",");
  const cents = Number(reais) * 100 + Number(decimals.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > PRODUCT_LIMITS.priceCents) {
    throw new ProductValidationError({ price: "O preço informado é muito alto." });
  }
  return cents;
}

export function parseProductInput(
  value: unknown,
  mode: "create" | "patch",
): ProductInput | ProductPatch {
  if (!isRecord(value)) {
    throw new ProductValidationError({ _form: "Solicitação inválida." });
  }

  const unknownFields = Object.keys(value).filter(
    (field) => !PRODUCT_FIELDS.has(field),
  );
  if (unknownFields.length > 0) {
    throw new ProductValidationError({
      _form: "A solicitação contém campos não permitidos.",
    });
  }
  if (mode === "patch" && Object.keys(value).length === 0) {
    throw new ProductValidationError({ _form: "Nenhuma alteração foi informada." });
  }

  const errors: Record<string, string> = {};
  const parsed: ProductPatch = {};

  parseTextField(value, parsed, errors, "name", "Nome", PRODUCT_LIMITS.name, {
    required: mode === "create",
    allowEmpty: false,
  });
  parseTextField(
    value,
    parsed,
    errors,
    "description",
    "Descrição",
    PRODUCT_LIMITS.description,
    { required: mode === "create", allowEmpty: true },
  );
  parseTextField(
    value,
    parsed,
    errors,
    "category",
    "Categoria",
    PRODUCT_LIMITS.category,
    { required: mode === "create", allowEmpty: false },
  );

  if ("price" in value || mode === "create") {
    try {
      parsed.priceCents = parseBrazilianPriceToCents(value.price);
    } catch (error) {
      Object.assign(errors, validationFields(error, "price"));
    }
  }

  if ("stock" in value || mode === "create") {
    try {
      parsed.stock = parseStock(value.stock);
    } catch (error) {
      Object.assign(errors, validationFields(error, "stock"));
    }
  }

  if ("variations" in value || mode === "create") {
    try {
      parsed.variations = parseVariations(value.variations);
    } catch (error) {
      Object.assign(errors, validationFields(error, "variations"));
    }
  }

  for (const field of ["published", "available"] as const) {
    if (field in value || mode === "create") {
      if (typeof value[field] !== "boolean") {
        errors[field] = "Escolha uma opção válida.";
      } else {
        parsed[field] = value[field];
      }
    }
  }

  if (Object.keys(errors).length > 0) throw new ProductValidationError(errors);
  return parsed as ProductInput | ProductPatch;
}

export async function listCatalogProducts(
  database: D1Database,
  storeId: string,
  storeSlug: string,
): Promise<CatalogProduct[]> {
  const db = drizzle(database);
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.tenantId, storeId))
    .orderBy(asc(products.sortOrder), asc(products.name));
  return rows.map((row) => mapProduct(row, storeSlug));
}

export async function findCatalogProduct(
  database: D1Database,
  storeId: string,
  storeSlug: string,
  productId: string,
): Promise<CatalogProduct> {
  const db = drizzle(database);
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.tenantId, storeId)))
    .limit(1);
  if (!rows[0]) throw new ProductNotFoundError();
  return mapProduct(rows[0], storeSlug);
}

export async function createCatalogProduct(options: {
  database: D1Database;
  storeId: string;
  storeSlug: string;
  input: ProductInput;
  now?: number;
}): Promise<CatalogProduct> {
  const db = drizzle(options.database);
  const now = options.now ?? Date.now();
  const rows = await db
    .insert(products)
    .values({
      id: crypto.randomUUID(),
      tenantId: options.storeId,
      name: options.input.name,
      description: options.input.description,
      category: options.input.category,
      priceCents: options.input.priceCents,
      stock: options.input.stock,
      variationsJson: JSON.stringify(options.input.variations),
      published: options.input.published,
      available: options.input.available,
      sortOrder: 0,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    })
    .returning();
  return mapProduct(rows[0], options.storeSlug);
}

export async function updateCatalogProduct(options: {
  database: D1Database;
  storeId: string;
  storeSlug: string;
  productId: string;
  patch: ProductPatch;
  now?: number;
}): Promise<CatalogProduct> {
  const db = drizzle(options.database);
  const changes: Partial<typeof products.$inferInsert> = {
    updatedAt: new Date(options.now ?? Date.now()),
  };
  if (options.patch.name !== undefined) changes.name = options.patch.name;
  if (options.patch.description !== undefined) {
    changes.description = options.patch.description;
  }
  if (options.patch.category !== undefined) changes.category = options.patch.category;
  if (options.patch.priceCents !== undefined) {
    changes.priceCents = options.patch.priceCents;
  }
  if (options.patch.stock !== undefined) changes.stock = options.patch.stock;
  if (options.patch.variations !== undefined) {
    changes.variationsJson = JSON.stringify(options.patch.variations);
  }
  if (options.patch.published !== undefined) {
    changes.published = options.patch.published;
  }
  if (options.patch.available !== undefined) {
    changes.available = options.patch.available;
  }

  const rows = await db
    .update(products)
    .set(changes)
    .where(
      and(
        eq(products.id, options.productId),
        eq(products.tenantId, options.storeId),
      ),
    )
    .returning();
  if (!rows[0]) throw new ProductNotFoundError();
  return mapProduct(rows[0], options.storeSlug);
}

function mapProduct(
  row: typeof products.$inferSelect,
  storeSlug: string,
): CatalogProduct {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    priceCents: row.priceCents,
    stock: row.stock,
    variations: parseStoredVariations(row.variationsJson),
    imageUrl: buildStoreMediaUrl(storeSlug, row.imageMediaId),
    published: row.published,
    available: row.available,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

function parseStoredVariations(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function parseStock(value: unknown): number {
  if (typeof value !== "string" || !/^(?:0|[1-9]\d*)$/.test(value.trim())) {
    throw new ProductValidationError({ stock: "Use somente números inteiros." });
  }
  const stock = Number(value);
  if (!Number.isSafeInteger(stock) || stock > PRODUCT_LIMITS.stock) {
    throw new ProductValidationError({ stock: "O estoque informado é muito alto." });
  }
  return stock;
}

function parseVariations(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > PRODUCT_LIMITS.variations) {
    throw new ProductValidationError({
      variations: `Informe no máximo ${PRODUCT_LIMITS.variations} opções.`,
    });
  }
  const variations: string[] = [];
  let total = 0;
  for (const item of value) {
    if (typeof item !== "string") {
      throw new ProductValidationError({ variations: "As opções são inválidas." });
    }
    const variation = item.trim();
    if (!variation || variation.length > PRODUCT_LIMITS.variation) {
      throw new ProductValidationError({
        variations: `Cada opção deve ter até ${PRODUCT_LIMITS.variation} caracteres.`,
      });
    }
    total += variation.length;
    if (total > PRODUCT_LIMITS.variationsTotal) {
      throw new ProductValidationError({ variations: "As opções são muito extensas." });
    }
    if (!variations.includes(variation)) variations.push(variation);
  }
  return variations;
}

function parseTextField(
  source: Record<string, unknown>,
  target: ProductPatch,
  errors: Record<string, string>,
  field: "name" | "description" | "category",
  label: string,
  limit: number,
  options: { required: boolean; allowEmpty: boolean },
) {
  if (!(field in source)) {
    if (options.required) errors[field] = `${label} é obrigatório.`;
    return;
  }
  if (typeof source[field] !== "string") {
    errors[field] = `${label} é inválido.`;
    return;
  }
  const text = source[field].trim();
  if (!options.allowEmpty && !text) {
    errors[field] = `${label} é obrigatório.`;
  } else if (text.length > limit) {
    errors[field] = `${label} deve ter até ${limit} caracteres.`;
  } else {
    target[field] = text;
  }
}

function validationFields(error: unknown, fallbackField: string) {
  return error instanceof ProductValidationError
    ? error.fields
    : { [fallbackField]: "Valor inválido." };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
