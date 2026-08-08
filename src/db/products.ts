/**
 * Product reads. The only place the shop touches the `products` table.
 *
 * A Data Access Layer in the sense docs/backend.md §9 describes: `server-only`,
 * and it returns DTOs rather than raw rows. Pages and actions never see a
 * database row, so a column added later — a cost price, an admin note — cannot
 * accidentally reach a Client Component just because someone spread the row.
 *
 * It is also where NUMERIC becomes cents. Nothing above this file handles a
 * decimal string.
 */

import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { getDb } from "./client";
import { productImages, products } from "./schema";
import { centsFromNumeric } from "@/lib/money";
import type { Product } from "@/lib/product";

/**
 * One image per product today, ordered by display_order. The schema allows
 * several so a gallery can be added without a migration; the DTO exposes the
 * first, which is what SHOP-1 and SHOP-3 need.
 */
const selection = {
  slug: products.slug,
  name: products.name,
  summary: products.summary,
  description: products.description,
  basePrice: products.basePrice,
  stockQuantity: products.stockQuantity,
  details: products.details,
  imageUrl: productImages.imageUrl,
  altText: productImages.altText,
  displayOrder: productImages.displayOrder,
};

type Row = {
  slug: string;
  name: string;
  summary: string | null;
  description: string | null;
  basePrice: string;
  stockQuantity: number;
  details: string[] | null;
  imageUrl: string | null;
  altText: string | null;
};

function toProduct(row: Row): Product {
  return {
    slug: row.slug,
    name: row.name,
    summary: row.summary ?? "",
    description: row.description ?? "",
    // The conversion, and the only place it happens for products.
    priceCents: centsFromNumeric(row.basePrice),
    image: row.imageUrl ?? "",
    alt: row.altText ?? "",
    stock: row.stockQuantity,
    details: row.details ?? [],
  };
}

/**
 * @implements SHOP-1 — everything for sale, including sold-out items, which
 *   still list and are marked rather than disappearing.
 *
 * Inactive products are excluded: `is_active` is the soft delete, used instead
 * of DELETE so order history keeps resolving.
 */
export async function listProducts(): Promise<Product[]> {
  const rows = await getDb()
    .select(selection)
    .from(products)
    .leftJoin(productImages, eq(productImages.productId, products.id))
    .where(and(eq(products.category, "shop_item"), eq(products.isActive, true)))
    .orderBy(asc(products.createdAt), asc(productImages.displayOrder));

  // The left join yields one row per image; keep the first per slug.
  const seen = new Map<string, Product>();
  for (const row of rows) {
    if (!seen.has(row.slug)) seen.set(row.slug, toProduct(row));
  }

  return [...seen.values()];
}

/**
 * @implements SHOP-3 — resolves a URL segment to a product, or undefined so the
 *   page can 404 rather than render empty.
 */
export async function getProduct(slug: string): Promise<Product | undefined> {
  const rows = await getDb()
    .select(selection)
    .from(products)
    .leftJoin(productImages, eq(productImages.productId, products.id))
    .where(and(eq(products.slug, slug), eq(products.isActive, true)))
    .orderBy(asc(productImages.displayOrder))
    .limit(1);

  return rows.length > 0 ? toProduct(rows[0]) : undefined;
}
