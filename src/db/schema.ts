/**
 * The database schema — authoritative.
 *
 * Converted once from the hand-written `schema.sql` (kept as
 * `docs/schema-original.sql` for reference). From here on this file is the
 * source of truth: `npm run db:generate` derives migrations from it, and query
 * result types are inferred from it, so a renamed column is a type error rather
 * than a runtime surprise.
 *
 * Conventions carried over from the original SQL:
 *   - status/enum columns are TEXT with a CHECK, not pgEnum. Altering a Postgres
 *     enum is awkward; adding a value to a CHECK is a one-line migration.
 *   - money is NUMERIC(10,2), converted to integer cents at the data-access
 *     boundary (see src/lib/money.ts). The scale is what guarantees no third
 *     decimal place ever reaches `centsFromNumeric`; see `money()` below.
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * NUMERIC(10,2), the shape every money column takes.
 *
 * The scale is the guarantee, and it is the reason `centsFromNumeric` in
 * src/lib/money.ts can trust what it reads: Postgres will not store a third
 * decimal place in this column, whoever writes it.
 *
 * Note it *rounds* rather than rejecting — writing 48.005 from psql stores
 * 48.01 silently. A CHECK cannot change that, because rounding to scale happens
 * before constraints are evaluated, which makes `col = round(col, 2)` always
 * true and the constraint dead weight. The app never relies on this anyway: it
 * writes through `numericFromCents`, which emits exactly two decimals.
 */
function money(name: string) {
  return numeric(name, { precision: 10, scale: 2 });
}

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

/* ------------------------------------------------------------------ *
 * 1. Commissions — the Forms page, and the admin cost-tracking record
 * ------------------------------------------------------------------ */

export const commissions = pgTable(
  "commissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),

    yarnColor: text("yarn_color").notNull(),
    yarnType: text("yarn_type").notNull(),
    yarnThickness: text("yarn_thickness").notNull(),
    itemDescription: text("item_description").notNull(),
    isGift: boolean("is_gift").notNull().default(false),

    paymentMethod: text("payment_method"),
    paymentStatus: text("payment_status").notNull().default("unpaid"),

    fulfilmentType: text("fulfillment_type").notNull(),
    // Structured, unlike `orders` below: the commission form does not exist
    // yet, so it can be built to collect these fields properly.
    shippingAddressLine1: text("shipping_address_line1"),
    shippingAddressLine2: text("shipping_address_line2"),
    shippingCity: text("shipping_city"),
    shippingState: text("shipping_state"),
    shippingZip: text("shipping_zip"),
    dropoffLocationName: text("dropoff_location_name"),
    dropoffLocationAddress: text("dropoff_location_address"),

    termsAccepted: boolean("terms_accepted").notNull().default(false),
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),

    status: text("status").notNull().default("submitted"),

    finalPrice: money("final_price"),
    materialsCost: money("materials_cost"),
    shippingCost: money("shipping_cost"),
    deadline: date("deadline"),

    contractSigned: boolean("contract_signed").notNull().default(false),
    contractSignedAt: timestamp("contract_signed_at", { withTimezone: true }),
    contractDocumentUrl: text("contract_document_url"),

    adminNotes: text("admin_notes"),

    ...timestamps,
  },
  (table) => [
    check(
      "commissions_payment_method",
      sql`${table.paymentMethod} IS NULL OR ${table.paymentMethod} IN ('zelle', 'venmo', 'cash')`,
    ),
    check(
      "commissions_payment_status",
      sql`${table.paymentStatus} IN ('unpaid', 'partial', 'paid')`,
    ),
    // 'pickup', not the original 'local_dropoff': the app's FulfilmentMethod is
    // "shipping" | "pickup" (src/content/ordering.ts) and SHOP-8/SHOP-9 test
    // those strings. One renamed CHECK beats a mapping maintained forever.
    check(
      "commissions_fulfillment_type",
      sql`${table.fulfilmentType} IN ('shipping', 'pickup')`,
    ),
    check(
      "commissions_status",
      sql`${table.status} IN ('submitted', 'consulted', 'quoted', 'confirmed', 'in_progress', 'completed', 'shipped', 'cancelled')`,
    ),
    index("idx_commissions_status").on(table.status),
    index("idx_commissions_deadline").on(table.deadline),
  ],
);

/* ------------------------------------------------------------------ *
 * 2. Bookings — the Schedule page's consultation calls
 * ------------------------------------------------------------------ */

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone"),

    scheduledDate: date("scheduled_date").notNull(),
    scheduledTime: time("scheduled_time").notNull(),

    meetingPlatform: text("meeting_platform").notNull(),
    meetingLink: text("meeting_link"),
    googleCalendarEventId: text("google_calendar_event_id"),

    status: text("status").notNull().default("pending"),

    commissionId: uuid("commission_id").references(() => commissions.id, {
      onDelete: "set null",
    }),

    ...timestamps,
  },
  (table) => [
    check(
      "bookings_meeting_platform",
      sql`${table.meetingPlatform} IN ('google_meet', 'discord', 'zoom')`,
    ),
    check(
      "bookings_status",
      sql`${table.status} IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')`,
    ),
    index("idx_bookings_date").on(table.scheduledDate),
  ],
);

/* ------------------------------------------------------------------ *
 * 3. Products — shop items, and later the Build a Bunny catalogue
 * ------------------------------------------------------------------ */

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * The URL segment under /shop. Not in the original SQL, and the shop cannot
     * work without it: /shop/[slug] is built and prerendered, and SHOP-11 tests
     * that slugs are lowercase-hyphenated and never collide with /shop/cart.
     * Without a slug every product URL would be a UUID.
     */
    slug: text("slug").notNull(),

    name: text("name").notNull(),
    /** The one-line grid caption (SHOP-1) — distinct from `description`. */
    summary: text("summary"),
    /** The long detail-page copy (SHOP-3). */
    description: text("description"),
    /** The size/material list on the detail page (SHOP-3). */
    details: text("details").array(),

    category: text("category").notNull(),
    basePrice: money("base_price").notNull(),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    isMadeToOrder: boolean("is_made_to_order").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    designerCredit: text("designer_credit"),

    createdAt: timestamps.createdAt,
  },
  (table) => [
    uniqueIndex("products_slug_key").on(table.slug),
    check(
      "products_category",
      sql`${table.category} IN ('shop_item', 'bunny_base', 'bunny_outfit', 'bunny_addon')`,
    ),
    check("products_stock_non_negative", sql`${table.stockQuantity} >= 0`),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /**
     * A path under /public, e.g. "/shop/bunny-plush.svg" — never an absolute
     * URL. next/image resolves a src beginning with "/" against the local
     * deployment and optimises it in place; an external host would additionally
     * need images.remotePatterns in next.config.ts, and a query string would
     * need images.localPatterns.search (both Next 16).
     *
     * The CHECK keeps that contract true for writers that bypass the seed —
     * psql, or a future admin upload. Relaxing it later, if images ever move to
     * a CDN, is one migration.
     */
    imageUrl: text("image_url").notNull(),
    altText: text("alt_text"),
    displayOrder: integer("display_order").notNull().default(0),
  },
  (table) => [
    check(
      "product_images_local_path",
      sql`${table.imageUrl} LIKE '/%' AND ${table.imageUrl} NOT LIKE '%?%'`,
    ),
    index("idx_product_images_product_id").on(table.productId),
  ],
);

/** Colour/style options per product. Unused this pass; Build a Bunny still reads its typed module. */
export const productOptions = pgTable(
  "product_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    optionType: text("option_type").notNull(),
    optionValue: text("option_value").notNull(),
    priceModifier: money("price_modifier").notNull().default("0"),
  },
);

/* ------------------------------------------------------------------ *
 * 4. Orders — shop purchases and Build a Bunny checkouts
 * ------------------------------------------------------------------ */

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderType: text("order_type").notNull(),

    /**
     * Not in the original SQL. docs/backend.md §3: a double-click or a retry on
     * a flaky connection otherwise creates two orders. Unique-constrained, so a
     * replay is caught by the database rather than by a race-prone read.
     */
    idempotencyKey: text("idempotency_key").notNull(),

    // Split, matching `commissions` — the checkout form collects them
    // separately, and the original schema disagreed with itself here.
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone"),

    paymentMethod: text("payment_method"),
    paymentStatus: text("payment_status").notNull().default("unpaid"),

    fulfilmentType: text("fulfillment_type").notNull(),
    /**
     * One field, unlike `commissions` above. The checkout form collects a single
     * free-text address today; writing a multi-line blob into a column named
     * "line1" would rot. Splitting the form is a tracked open item in
     * requirements/shop_requirements.md.
     */
    shippingAddress: text("shipping_address"),
    dropoffLocationName: text("dropoff_location_name"),

    /** Server-computed. Never taken from the client — docs/backend.md §3. */
    subtotal: money("subtotal").notNull(),
    shippingCost: money("shipping_cost").notNull().default("0"),
    totalPrice: money("total_price").notNull(),

    status: text("status").notNull().default("received"),
    deadline: date("deadline"),

    ...timestamps,
  },
  (table) => [
    uniqueIndex("orders_idempotency_key_key").on(table.idempotencyKey),
    check("orders_type", sql`${table.orderType} IN ('shop', 'build_a_bunny')`),
    check(
      "orders_payment_method",
      sql`${table.paymentMethod} IS NULL OR ${table.paymentMethod} IN ('zelle', 'venmo', 'cash', 'card')`,
    ),
    check(
      "orders_payment_status",
      sql`${table.paymentStatus} IN ('unpaid', 'paid', 'refunded')`,
    ),
    check(
      "orders_fulfillment_type",
      sql`${table.fulfilmentType} IN ('shipping', 'pickup')`,
    ),
    /**
     * SHOP-9 as a database constraint, not just a rule in the action. Cash is
     * local-only, and this is the copy that survives a bug in the action.
     */
    check(
      "orders_cash_is_local_only",
      sql`${table.paymentMethod} IS DISTINCT FROM 'cash' OR ${table.fulfilmentType} = 'pickup'`,
    ),
    check(
      "orders_status",
      sql`${table.status} IN ('received', 'in_progress', 'completed', 'shipped', 'cancelled')`,
    ),
    index("idx_orders_status").on(table.status),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /**
     * No ON DELETE: a product with order history cannot be deleted, only
     * deactivated via products.is_active. Erasing it would rewrite receipts.
     */
    productId: uuid("product_id").references(() => products.id),

    /**
     * Snapshots, both of them. `unitPrice` was already in the original SQL —
     * docs/backend.md §4 calls it the decision people regret skipping. The name
     * needs the same treatment, or renaming a product rewrites last month's
     * orders.
     */
    productName: text("product_name").notNull(),
    unitPrice: money("unit_price").notNull(),

    quantity: integer("quantity").notNull().default(1),

    /** Build a Bunny's configuration, which is option ids only (BUNNY-11). */
    selectedOptions: jsonb("selected_options").notNull().default([]),
  },
  (table) => [
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
    index("idx_order_items_order_id").on(table.orderId),
  ],
);

/* ------------------------------------------------------------------ *
 * 5. Portfolio
 * ------------------------------------------------------------------ */

export const portfolioItems = pgTable(
  "portfolio_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    description: text("description"),
    yarnType: text("yarn_type"),
    yarnColor: text("yarn_color"),
    designerCredit: text("designer_credit"),
    isFeatured: boolean("is_featured").notNull().default(false),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    check(
      "portfolio_items_category",
      sql`${table.category} IN ('clothing', 'plushie', 'crochet', 'engineering', 'jewelry')`,
    ),
  ],
);

export const portfolioImages = pgTable(
  "portfolio_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portfolioItemId: uuid("portfolio_item_id")
      .notNull()
      .references(() => portfolioItems.id, { onDelete: "cascade" }),
    /** A path under /public, same contract as product_images.image_url. */
    imageUrl: text("image_url").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
  },
  (table) => [
    check(
      "portfolio_images_local_path",
      sql`${table.imageUrl} LIKE '/%' AND ${table.imageUrl} NOT LIKE '%?%'`,
    ),
    index("idx_portfolio_images_item_id").on(table.portfolioItemId),
  ],
);

/* ------------------------------------------------------------------ *
 * 6. Admin
 * ------------------------------------------------------------------ *
 *
 * A local-development placeholder, as the original SQL's comment says. Do not
 * build a password flow on it: docs/backend.md §9 recommends reusing the Google
 * OAuth that the Schedule page needs anyway for Calendar, which makes admin
 * login close to free and avoids owning password resets.
 */

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamps.createdAt,
});
