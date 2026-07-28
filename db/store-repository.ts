import { buildStoreMediaUrl, normalizeSlug, parseStringList } from "@/app/storefront.mjs";
import {
  queryAuthorizedMedia,
  queryPublicProducts,
  queryPublicStore,
} from "./store-queries.mjs";

type D1Row = Record<string, unknown>;

export type PublicProduct = {
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
};

export type PublicStore = {
  id: string;
  slug: string;
  name: string;
  description: string;
  location: string;
  accentColor: string;
  whatsAppE164: string;
  instagram: string;
  purchaseInstructions: string;
  paymentMethods: string[];
  logoUrl: string | null;
  coverUrl: string | null;
  products: PublicProduct[];
};

export async function findPublicStoreBySlug(
  database: D1Database,
  rawSlug: string,
): Promise<PublicStore | null> {
  const slug = normalizeSlug(rawSlug);
  const store = (await queryPublicStore(database, slug)) as D1Row | null;
  if (!store) return null;

  const tenantId = String(store.id);
  const productRows = (await queryPublicProducts(database, tenantId)) as D1Row[];

  return {
    id: tenantId,
    slug: String(store.slug),
    name: String(store.name),
    description: String(store.description),
    location: String(store.location),
    accentColor: String(store.accent_color),
    whatsAppE164: String(store.whatsapp_e164),
    instagram: String(store.instagram),
    purchaseInstructions: String(store.purchase_instructions),
    paymentMethods: parseStringList(store.payment_methods_json),
    logoUrl: buildStoreMediaUrl(slug, store.logo_media_id),
    coverUrl: buildStoreMediaUrl(slug, store.cover_media_id),
    products: productRows.map((product) => ({
      id: String(product.id),
      name: String(product.name),
      description: String(product.description),
      category: String(product.category),
      priceCents: Number(product.price_cents),
      stock: Number(product.stock),
      variations: parseStringList(product.variations_json, "variações"),
      imageUrl: buildStoreMediaUrl(slug, product.image_media_id),
      published: Boolean(product.published),
      available: Boolean(product.available) && Number(product.stock) > 0,
    })),
  };
}

export async function findPublicMedia(
  database: D1Database,
  rawSlug: string,
  mediaId: string,
): Promise<{ objectKey: string; contentType: string } | null> {
  const slug = normalizeSlug(rawSlug);
  const media = (await queryAuthorizedMedia(
    database,
    slug,
    mediaId,
  )) as D1Row | null;
  return media
    ? {
        objectKey: String(media.object_key),
        contentType: String(media.content_type),
      }
    : null;
}
