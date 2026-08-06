import type { FeitaAuth } from "./server";
import type {
  TransactionalEmailSender,
} from "./email";
import { normalizeEmail, sha256Hex } from "./security";
import type { StoreRole } from "./authorization";

const INVITATION_CLAIM_LEASE_MS = 5 * 60_000;

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
         AND (claimed_at IS NULL OR claimed_at <= ?4)
         AND expires_at > ?1
       RETURNING id`,
    )
    .bind(
      now,
      tokenDigest,
      normalizedEmail,
      now - INVITATION_CLAIM_LEASE_MS,
    )
    .first<{ id: string }>();

  if (!invite) throw new InvitationRejectedError();

  let completed = false;
  try {
    let user = await findUserByEmail(options.database, normalizedEmail);
    if (user) {
      await verifyExistingAccountCredentials({
        database: options.database,
        auth: options.auth,
        headers: options.headers,
        email: normalizedEmail,
        password: options.password,
        expectedUserId: user.id,
      });
    } else {
      await options.auth.api.signUpEmail({
        body: {
          email: normalizedEmail,
          name: options.name.trim(),
          password: options.password,
        },
        headers: options.headers,
      });
      user = await findUserByEmail(options.database, normalizedEmail);
    }

    if (!user) throw new InvitationRejectedError();

    await finalizeInvitationAcceptance({
      database: options.database,
      inviteId: invite.id,
      claimedAt: now,
      email: normalizedEmail,
      userId: user.id,
      now,
    });
    completed = true;
  } catch {
    throw new InvitationRejectedError();
  } finally {
    if (!completed) {
      try {
        await options.database
          .prepare(
            `UPDATE store_invites
             SET claimed_at = NULL
             WHERE id = ?1 AND claimed_at = ?2 AND used_at IS NULL`,
          )
          .bind(invite.id, now)
          .run();
      } catch {
        // A failed cleanup remains recoverable after the bounded claim lease.
      }
    }
  }
}

async function findUserByEmail(
  database: D1Database,
  email: string,
): Promise<{ id: string } | null> {
  return database
    .prepare("SELECT id FROM user WHERE email = ?1 LIMIT 1")
    .bind(email)
    .first<{ id: string }>();
}

async function verifyExistingAccountCredentials(options: {
  database: D1Database;
  auth: FeitaAuth;
  headers: Headers;
  email: string;
  password: string;
  expectedUserId: string;
}): Promise<void> {
  const proof = await options.auth.api.signInEmail({
    body: {
      email: options.email,
      password: options.password,
      rememberMe: false,
    },
    headers: options.headers,
  });

  if (
    proof.user.id !== options.expectedUserId ||
    normalizeEmail(proof.user.email) !== options.email
  ) {
    throw new InvitationRejectedError();
  }

  await options.database
    .prepare("DELETE FROM session WHERE token = ?1 AND user_id = ?2")
    .bind(proof.token, options.expectedUserId)
    .run();

  const remainingProofSession = await options.database
    .prepare("SELECT id FROM session WHERE token = ?1 LIMIT 1")
    .bind(proof.token)
    .first<{ id: string }>();
  if (remainingProofSession) throw new InvitationRejectedError();
}

async function finalizeInvitationAcceptance(options: {
  database: D1Database;
  inviteId: string;
  claimedAt: number;
  email: string;
  userId: string;
  now: number;
}): Promise<void> {
  const results = await options.database.batch<{
    results?: { id: string }[];
  }>([
    options.database
      .prepare(
        `INSERT INTO store_memberships (
           id, user_id, store_id, role, created_at
         )
         SELECT ?1, ?2, store_id, role, ?3
         FROM store_invites
         WHERE id = ?4
           AND claimed_at = ?5
           AND email_normalized = ?6
           AND used_at IS NULL
           AND expires_at > ?3
         ON CONFLICT(user_id, store_id) DO NOTHING`,
      )
      .bind(
        crypto.randomUUID(),
        options.userId,
        options.now,
        options.inviteId,
        options.claimedAt,
        options.email,
      ),
    options.database
      .prepare(
        `UPDATE user
         SET email_verified = 1, updated_at = ?1
         WHERE id = ?2
           AND EXISTS (
             SELECT 1
             FROM store_invites
             WHERE id = ?3
               AND claimed_at = ?4
               AND email_normalized = ?5
               AND used_at IS NULL
               AND expires_at > ?1
           )`,
      )
      .bind(
        options.now,
        options.userId,
        options.inviteId,
        options.claimedAt,
        options.email,
      ),
    options.database
      .prepare(
        `UPDATE store_invites
         SET used_at = ?1
         WHERE id = ?2
           AND claimed_at = ?3
           AND email_normalized = ?4
           AND used_at IS NULL
           AND expires_at > ?1
           AND EXISTS (
             SELECT 1
             FROM store_memberships
             WHERE user_id = ?5
               AND store_id = store_invites.store_id
           )
         RETURNING id`,
      )
      .bind(
        options.now,
        options.inviteId,
        options.claimedAt,
        options.email,
        options.userId,
      ),
    options.database
      .prepare(
        `INSERT INTO audit_events (
           id, actor_user_id, store_id, action, created_at, metadata_json
         )
         SELECT ?1, ?2, store_id, 'invitation.accepted', ?3, '{}'
         FROM store_invites
         WHERE id = ?4 AND claimed_at = ?5 AND used_at = ?3`,
      )
      .bind(
        crypto.randomUUID(),
        options.userId,
        options.now,
        options.inviteId,
        options.claimedAt,
      ),
  ]);

  if (!results[2]?.results?.some((row) => row.id === options.inviteId)) {
    throw new InvitationRejectedError();
  }
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
