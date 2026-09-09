import { StoreMembershipRequiredError, type StoreMembership } from "@/auth/authorization";
import type { StoreSettingsInput } from "./validation";

export type StoreSettings = StoreSettingsInput & {
  slug: string;
  published: boolean;
  description: string;
  location: string;
};

export async function readStoreSettings(database: D1Database, membership: StoreMembership): Promise<StoreSettings> {
  const row = await database.prepare(
    `SELECT name, whatsapp_e164, accent_color, slug, published, description, location
     FROM stores WHERE id = ?1 LIMIT 1`,
  ).bind(membership.storeId).first<{
    name: string; whatsapp_e164: string; accent_color: string; slug: string;
    published: number; description: string; location: string;
  }>();
  if (!row) throw new StoreMembershipRequiredError();
  return {
    name: row.name, whatsAppE164: row.whatsapp_e164, accentColor: row.accent_color,
    slug: row.slug, published: Boolean(row.published), description: row.description,
    location: row.location,
  };
}

export async function saveStoreSettings(options: {
  database: D1Database; membership: StoreMembership; userId: string; input: StoreSettingsInput;
}): Promise<StoreSettings> {
  const { database, membership, userId, input } = options;
  // Recheck membership in the write itself, including revocation after authorization.
  const updated = await database.prepare(
    `UPDATE stores SET name = ?1, whatsapp_e164 = ?2, accent_color = ?3, updated_at = ?4
     WHERE id = ?5 AND EXISTS (
       SELECT 1 FROM store_memberships WHERE user_id = ?6 AND store_id = stores.id
     ) RETURNING id`,
  ).bind(input.name, input.whatsAppE164, input.accentColor, Date.now(), membership.storeId, userId).first();
  if (!updated) throw new StoreMembershipRequiredError();
  return readStoreSettings(database, membership);
}
