import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
