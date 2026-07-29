import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const stores = sqliteTable(
  "stores",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    location: text("location").notNull().default(""),
    accentColor: text("accent_color").notNull().default("#8a3f2d"),
    whatsAppE164: text("whatsapp_e164").notNull(),
    instagram: text("instagram").notNull().default(""),
    purchaseInstructions: text("purchase_instructions").notNull().default(""),
    paymentMethodsJson: text("payment_methods_json").notNull().default("[]"),
    logoMediaId: text("logo_media_id"),
    coverMediaId: text("cover_media_id"),
    published: integer("published", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("stores_slug_unique").on(table.slug)],
);

export const media = sqliteTable(
  "media",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("media_tenant_idx").on(table.tenantId),
    uniqueIndex("media_object_key_unique").on(table.objectKey),
  ],
);

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull().default("Outros"),
    priceCents: integer("price_cents").notNull(),
    stock: integer("stock").notNull().default(0),
    variationsJson: text("variations_json").notNull().default("[]"),
    imageMediaId: text("image_media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    published: integer("published", { mode: "boolean" }).notNull().default(false),
    available: integer("available", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("products_tenant_idx").on(table.tenantId),
    index("products_tenant_public_idx").on(
      table.tenantId,
      table.published,
      table.available,
      table.sortOrder,
    ),
  ],
);

// Better Auth core tables. Property names intentionally follow Better Auth's
// Drizzle contract while SQL column names stay explicit for D1 operations.
export const user = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: integer("email_verified", { mode: "boolean" })
      .notNull()
      .default(false),
    image: text("image"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email)],
);

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_id_idx").on(table.userId),
  ],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const rateLimit = sqliteTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: integer("last_request").notNull(),
});

export const storeMemberships = sqliteTable(
  "store_memberships",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["store_owner", "platform_admin"] }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("store_memberships_user_store_unique").on(
      table.userId,
      table.storeId,
    ),
    index("store_memberships_user_idx").on(table.userId),
    index("store_memberships_store_idx").on(table.storeId),
  ],
);

export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    storeId: text("store_id").references(() => stores.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    metadataJson: text("metadata_json").notNull().default("{}"),
  },
  (table) => [
    index("audit_events_actor_idx").on(table.actorUserId),
    index("audit_events_store_idx").on(table.storeId),
    index("audit_events_created_at_idx").on(table.createdAt),
  ],
);

export const storeInvites = sqliteTable(
  "store_invites",
  {
    id: text("id").primaryKey(),
    emailNormalized: text("email_normalized").notNull(),
    tokenDigest: text("token_digest").notNull(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["store_owner", "platform_admin"] }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    claimedAt: integer("claimed_at", { mode: "timestamp_ms" }),
    usedAt: integer("used_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    uniqueIndex("store_invites_token_digest_unique").on(table.tokenDigest),
    index("store_invites_email_idx").on(table.emailNormalized),
    index("store_invites_store_idx").on(table.storeId),
    index("store_invites_expires_at_idx").on(table.expiresAt),
  ],
);

// Complements Better Auth's IP limiter with a durable, non-PII key derived
// from the normalized e-mail address.
export const authIdentityRateLimits = sqliteTable(
  "auth_identity_rate_limits",
  {
    keyDigest: text("key_digest").primaryKey(),
    action: text("action").notNull(),
    count: integer("count").notNull(),
    windowStartedAt: integer("window_started_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("auth_identity_rate_limits_window_idx").on(table.windowStartedAt),
  ],
);
