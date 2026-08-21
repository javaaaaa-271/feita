import {
  type FirstStoreInput,
  validateFirstStoreInput,
} from "./store-input";

export { FirstStoreValidationError } from "./store-input";

export type CreatedFirstStore = {
  id: string;
  name: string;
  slug: string;
};

export class FirstStoreAlreadyCreatedError extends Error {
  readonly status = 409;

  constructor() {
    super("Esta conta já está ligada a uma loja.");
    this.name = "FirstStoreAlreadyCreatedError";
  }
}

export class StoreSlugUnavailableError extends Error {
  readonly status = 409;

  constructor() {
    super("Este endereço de loja não está disponível.");
    this.name = "StoreSlugUnavailableError";
  }
}

export async function createFirstStore(options: {
  database: D1Database;
  userId: string;
  input: FirstStoreInput;
  now?: number;
}): Promise<CreatedFirstStore> {
  const values = validateFirstStoreInput(options.input);
  const existingMembership = await options.database
    .prepare("SELECT store_id FROM store_memberships WHERE user_id = ?1 LIMIT 1")
    .bind(options.userId)
    .first<{ store_id: string }>();
  if (existingMembership) throw new FirstStoreAlreadyCreatedError();

  const existingSlug = await options.database
    .prepare("SELECT id FROM stores WHERE slug = ?1 LIMIT 1")
    .bind(values.slug)
    .first<{ id: string }>();
  if (existingSlug) throw new StoreSlugUnavailableError();

  const now = options.now ?? Date.now();
  const storeId = crypto.randomUUID();
  try {
    await options.database.batch([
      options.database
        .prepare(
          `INSERT INTO stores (
             id, slug, name, description, location, accent_color,
             whatsapp_e164, instagram, purchase_instructions,
             payment_methods_json, published, created_at, updated_at
           ) VALUES (?1, ?2, ?3, '', ?4, '#8a3f2d', ?5, '',
             'Escolha os itens e confirme disponibilidade pelo WhatsApp.',
             '["Pix","Dinheiro"]', 0, ?6, ?6)`,
        )
        .bind(storeId, values.slug, values.name, values.location, values.whatsappE164, now),
      options.database
        .prepare(
          `INSERT INTO store_memberships (id, user_id, store_id, role, created_at)
           VALUES (?1, ?2, ?3, 'store_owner', ?4)`,
        )
        .bind(crypto.randomUUID(), options.userId, storeId, now),
      options.database
        .prepare(
          `INSERT INTO store_creation_claims (user_id, store_id, created_at)
           VALUES (?1, ?2, ?3)`,
        )
        .bind(options.userId, storeId, now),
      options.database
        .prepare(
          `INSERT INTO audit_events (
             id, actor_user_id, store_id, action, created_at, metadata_json
           ) VALUES (?1, ?2, ?3, 'store.onboarding.created', ?4, '{}')`,
        )
        .bind(crypto.randomUUID(), options.userId, storeId, now),
    ]);
  } catch (error) {
    const claim = await options.database
      .prepare("SELECT store_id FROM store_creation_claims WHERE user_id = ?1 LIMIT 1")
      .bind(options.userId)
      .first<{ store_id: string }>();
    if (claim) throw new FirstStoreAlreadyCreatedError();
    const slugOwner = await options.database
      .prepare("SELECT id FROM stores WHERE slug = ?1 LIMIT 1")
      .bind(values.slug)
      .first<{ id: string }>();
    if (slugOwner) throw new StoreSlugUnavailableError();
    throw error;
  }

  return { id: storeId, name: values.name, slug: values.slug };
}
