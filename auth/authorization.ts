import type { FeitaAuth } from "./server";

export type AuthenticatedSession = NonNullable<
  Awaited<ReturnType<FeitaAuth["api"]["getSession"]>>
>;

export type StoreRole = "store_owner" | "platform_admin";

export type StoreMembership = {
  storeId: string;
  storeSlug: string;
  storeName: string;
  role: StoreRole;
};

export class AuthenticationRequiredError extends Error {
  readonly status = 401;

  constructor() {
    super("Autenticação necessária.");
    this.name = "AuthenticationRequiredError";
  }
}

export class StoreMembershipRequiredError extends Error {
  readonly status = 403;

  constructor() {
    super("Vínculo com a loja não encontrado.");
    this.name = "StoreMembershipRequiredError";
  }
}

export async function requireSession(
  auth: FeitaAuth,
  requestHeaders: Headers,
): Promise<AuthenticatedSession> {
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) throw new AuthenticationRequiredError();
  return session;
}

export async function listStoreMemberships(
  database: D1Database,
  userId: string,
): Promise<StoreMembership[]> {
  const result = (await database
    .prepare(
      `SELECT sm.store_id, sm.role, s.slug, s.name
       FROM store_memberships AS sm
       INNER JOIN stores AS s ON s.id = sm.store_id
       WHERE sm.user_id = ?1
       ORDER BY s.name COLLATE NOCASE ASC`,
    )
    .bind(userId)
    .all()) as {
    results: {
      store_id: string;
      role: StoreRole;
      slug: string;
      name: string;
    }[];
  };

  return (result.results ?? []).map((row) => ({
    storeId: String(row.store_id),
    storeSlug: String(row.slug),
    storeName: String(row.name),
    role: row.role,
  }));
}

export async function requireStoreMembership(
  database: D1Database,
  userId: string,
  storeIdFromServerResource: string,
): Promise<StoreMembership> {
  const row = await database
    .prepare(
      `SELECT sm.store_id, sm.role, s.slug, s.name
       FROM store_memberships AS sm
       INNER JOIN stores AS s ON s.id = sm.store_id
       WHERE sm.user_id = ?1 AND sm.store_id = ?2
       LIMIT 1`,
    )
    .bind(userId, storeIdFromServerResource)
    .first<{
      store_id: string;
      role: StoreRole;
      slug: string;
      name: string;
    }>();

  if (!row) throw new StoreMembershipRequiredError();

  return {
    storeId: String(row.store_id),
    storeSlug: String(row.slug),
    storeName: String(row.name),
    role: row.role,
  };
}
