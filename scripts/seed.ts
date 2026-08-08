/**
 * Seeds the shop catalogue into Postgres from `src/content/shop.ts`.
 *
 * The content module stays the place a human edits the catalogue; this script
 * is what puts it in the database. That keeps `__tests__/shop-content.test.ts`
 * meaningful — it now guards seed input rather than runtime data — and means
 * the database starts holding exactly the products the existing tests already
 * assert against.
 *
 * Idempotent: products are upserted by slug, so re-running never duplicates and
 * never destroys order history. Nothing here truncates.
 *
 * Deliberately does NOT import src/db/client.ts. That module starts with
 * `import "server-only"`, which throws outside a React Server context — this is
 * a plain Node CLI, so it opens its own connection.
 *
 * Usage:  npm run db:seed
 *         npm run db:seed -- --test   (seeds TEST_DATABASE_URL instead)
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import { productImages, products } from "../src/db/schema";
import { products as catalogue } from "../src/content/shop";
import { numericFromCents } from "../src/lib/money";

config({ path: ".env.local", quiet: true });

const useTestDatabase = process.argv.includes("--test");
const variable = useTestDatabase ? "TEST_DATABASE_URL" : "DATABASE_URL";
const url = process.env[variable];

if (!url) {
  console.error(`${variable} is not set. Copy .env.example to .env.local first.`);
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
const db = drizzle(pool);

async function seed() {
  console.log(`Seeding ${catalogue.length} products into ${variable}…`);

  for (const item of catalogue) {
    const [row] = await db
      .insert(products)
      .values({
        slug: item.slug,
        name: item.name,
        summary: item.summary,
        description: item.description,
        details: [...item.details],
        category: "shop_item",
        basePrice: numericFromCents(item.priceCents),
        stockQuantity: item.stock,
        // These carry stock and ship as-is, unlike a commission.
        isMadeToOrder: false,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: products.slug,
        set: {
          name: item.name,
          summary: item.summary,
          description: item.description,
          details: [...item.details],
          basePrice: numericFromCents(item.priceCents),
          stockQuantity: item.stock,
        },
      })
      .returning({ id: products.id });

    // Images have no natural key, so replace rather than upsert.
    await db.delete(productImages).where(eq(productImages.productId, row.id));
    await db.insert(productImages).values({
      productId: row.id,
      imageUrl: item.image,
      altText: item.alt,
      displayOrder: 0,
    });

    console.log(`  ${item.slug.padEnd(14)} ${numericFromCents(item.priceCents).padStart(9)}  stock ${item.stock}`);
  }

  console.log("Done.");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
