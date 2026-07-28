const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export function normalizeSlug(value) {
  const slug = String(value ?? "").trim().toLowerCase();
  if (!SLUG_PATTERN.test(slug) || slug.length > 63) {
    throw new Error("O slug deve usar apenas letras minúsculas, números e hífens.");
  }
  return slug;
}

export function normalizeBrazilianWhatsApp(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }

  if (!/^[2-9]\d{9,10}$/.test(digits)) {
    throw new Error("Informe um WhatsApp brasileiro válido, com DDD.");
  }

  return `55${digits}`;
}

export function normalizeAccentColor(value) {
  const color = String(value ?? "").trim();
  if (!HEX_COLOR_PATTERN.test(color)) {
    throw new Error("A cor de destaque deve estar no formato hexadecimal #RRGGBB.");
  }
  return color.toLowerCase();
}

export function parseStringList(value, fieldName = "lista") {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, fieldName === "variações" ? 20 : 10);
}

export function buildStoreMediaUrl(slug, mediaId) {
  if (!mediaId) return null;
  return `/api/public/stores/${encodeURIComponent(slug)}/media/${encodeURIComponent(mediaId)}`;
}

export function cartStorageKey(slug) {
  return `feita:cart:${normalizeSlug(slug)}:v1`;
}

export function parseStoredCart(value, products) {
  let candidate;
  try {
    candidate = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return [];
  }
  if (!Array.isArray(candidate)) return [];

  const productsById = new Map(products.map((product) => [product.id, product]));
  return candidate.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const product = productsById.get(item.productId);
    const quantity = Number(item.quantity);
    const variation =
      typeof item.variation === "string" ? item.variation.trim() : "";
    if (
      !product ||
      !product.available ||
      !product.published ||
      product.stock < 1 ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return [];
    }
    if (variation && !product.variations.includes(variation)) return [];
    return [
      {
        productId: product.id,
        variation,
        quantity: Math.min(quantity, product.stock),
      },
    ];
  });
}
