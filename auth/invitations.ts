import type { FeitaAuth } from "./server";
import type {
  TransactionalEmailSender,
} from "./email";
import { normalizeEmail, sha256Hex } from "./security";
import type { StoreRole } from "./authorization";

export class InvitationRejectedError extends Error {
  readonly status = 400;

  constructor() {
    super("Não foi possível aceitar o convite. Confira os dados e tente novamente.");
    this.name = "InvitationRejectedError";
  }
}
export async function createStoreInvitation(options: {
  database: D1Database;
  sender: TransactionalEmailSender;
  email: string;
  storeId: string;
  role: StoreRole;
  expiresInMinutes?: number;
  createdByUserId?: string | null;
  token?: string;
  now?: number;
}): Promise<{ invitationId: string; token: string }> {
  const now = options.now ?? Date.now();
  const expiresInMinutes = options.expiresInMinutes ?? 60 * 24 * 7;
  const token = options.token ?? randomToken();
  const invitationId = crypto.randomUUID();
  const email = normalizeEmail(options.email);
  const tokenDigest = await sha256Hex(token);

  await options.database
    .prepare(
      `INSERT INTO store_invites (
         id, email_normalized, token_digest, store_id, role, expires_at,
         created_at, created_by_user_id
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(
      invitationId,
      email,
      tokenDigest,
      options.storeId,
      options.role,
      now + expiresInMinutes * 60_000,
      now,
      options.createdByUserId ?? null,
    )
    .run();

  await options.sender.send({
    kind: "invitation",
    to: email,
    code: token,
    expiresInMinutes,
  });

  return { invitationId, token };
}

export async function acceptStoreInvitation(options: {
  database: D1Database;
  auth: FeitaAuth;
  headers: Headers;
  email: string;
  name: string;
  password: string;
  token: string;
  now?: number;
}): Promise<void> {
  const now = options.now ?? Date.now();
  const normalizedEmail = normalizeEmail(options.email);
  const tokenDigest = await sha256Hex(options.token.trim());
  const invite = await options.database
    .prepare(
      `UPDATE store_invites
       SET claimed_at = ?1
       WHERE token_digest = ?2
         AND email_normalized = ?3
         AND used_at IS NULL
         AND claimed_at IS NULL
         AND expires_at > ?1
       RETURNING id, store_id, role`,
    )
    .bind(now, tokenDigest, normalizedEmail)
    .first<{ id: string; store_id: string; role: StoreRole }>();

  if (!invite) throw new InvitationRejectedError();

  try {
    await options.auth.api.signUpEmail({
      body: {
        email: normalizedEmail,
        name: options.name.trim(),
        password: options.password,
      },
      headers: options.headers,
    });

    const createdUser = await options.database
      .prepare("SELECT id FROM user WHERE email = ?1 LIMIT 1")
      .bind(normalizedEmail)
      .first<{ id: string }>();
    if (!createdUser) throw new InvitationRejectedError();

    await options.database.batch([
      options.database
        .prepare(
          `INSERT INTO store_memberships (
             id, user_id, store_id, role, created_at
           ) VALUES (?1, ?2, ?3, ?4, ?5)`,
        )
        .bind(
          crypto.randomUUID(),
          createdUser.id,
          invite.store_id,
          invite.role,
          now,
        ),
      options.database
        .prepare("UPDATE user SET email_verified = 1, updated_at = ?1 WHERE id = ?2")
        .bind(now, createdUser.id),
      options.database
        .prepare(
          `UPDATE store_invites
           SET used_at = ?1
           WHERE id = ?2 AND claimed_at = ?1 AND used_at IS NULL`,
        )
        .bind(now, invite.id),
      options.database
        .prepare(
          `INSERT INTO audit_events (
             id, actor_user_id, store_id, action, created_at, metadata_json
           ) VALUES (?1, ?2, ?3, 'invitation.accepted', ?4, '{}')`,
        )
        .bind(
          crypto.randomUUID(),
          createdUser.id,
          invite.store_id,
          now,
        ),
    ]);
  } catch {
    await options.database
      .prepare(
        `UPDATE store_invites
         SET claimed_at = NULL
         WHERE id = ?1 AND claimed_at = ?2 AND used_at IS NULL`,
      )
      .bind(invite.id, now)
      .run();
    throw new InvitationRejectedError();
  }
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
