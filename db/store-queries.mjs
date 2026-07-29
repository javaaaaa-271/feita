export const PUBLIC_STORE_QUERY = `
  SELECT id, slug, name, description, location, accent_color, whatsapp_e164,
         instagram, purchase_instructions, payment_methods_json,
         logo_media_id, cover_media_id
  FROM stores
  WHERE slug = ?1 AND published = 1
  LIMIT 1
`;

export const PUBLIC_PRODUCTS_QUERY = `
  SELECT id, name, description, category, price_cents, stock, variations_json,
         image_media_id, published, available
  FROM products
  WHERE tenant_id = ?1 AND published = 1
  ORDER BY sort_order ASC, name COLLATE NOCASE ASC
`;

export const AUTHORIZED_MEDIA_QUERY = `
  SELECT m.object_key, m.content_type
  FROM media AS m
  INNER JOIN stores AS s ON s.id = m.tenant_id
  WHERE s.slug = ?1 AND s.published = 1 AND m.id = ?2 AND m.tenant_id = s.id
  LIMIT 1
`;

export async function queryPublicStore(database, slug) {
  return database.prepare(PUBLIC_STORE_QUERY).bind(slug).first();
}

export async function queryPublicProducts(database, tenantId) {
  const result = await database
    .prepare(PUBLIC_PRODUCTS_QUERY)
    .bind(tenantId)
    .all();
  return result.results;
}

export async function queryAuthorizedMedia(database, slug, mediaId) {
  return database
    .prepare(AUTHORIZED_MEDIA_QUERY)
    .bind(slug, mediaId)
    .first();
}
