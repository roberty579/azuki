import { afterAll, beforeEach, describe, expect, test } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getDb, getPool } from "@/db/client";
import { orderItems, orders, products } from "@/db/schema";
import { submitOrder } from "@/lib/actions/orders";
import { pickupLocations } from "@/content/ordering";

/**
 * The trust boundary.
 *
 * A Server Action is a public POST endpoint — reachable directly, without the
 * form, by anyone who can read the network tab. Every test here calls it the
 * way an attacker would: with a payload the UI would never produce.
 *
 * This is the layer the browser tests cannot replace. E2E proves the happy path
 * through the form; it says nothing about what happens when the form is
 * skipped, which is the only case that matters for the rules below.
 */

const db = getDb();

const SLUG = "integration-widget";
const PRICE = "12.50"; // 1250 cents
const STOCK = 5;

/** A payload the form would produce, for tests to bend one field at a time. */
function validOrder(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: randomUUID(),
    items: [{ slug: SLUG, quantity: 2 }],
    buyer: { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" },
    fulfilment: "shipping" as const,
    shippingAddress: "1 Main St",
    paymentMethod: "zelle" as const,
    ...overrides,
  };
}

async function stock(): Promise<number> {
  const [row] = await db
    .select({ stock: products.stockQuantity })
    .from(products)
    .where(eq(products.slug, SLUG));
  return row.stock;
}

async function orderCount(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders);
  return row.n;
}

beforeEach(async () => {
  await db.execute(sql`TRUNCATE orders, order_items RESTART IDENTITY CASCADE`);
  await db.delete(products).where(eq(products.slug, SLUG));
  await db.insert(products).values({
    slug: SLUG,
    name: "Integration widget",
    category: "shop_item",
    basePrice: PRICE,
    stockQuantity: STOCK,
    isActive: true,
  });
});

afterAll(async () => {
  // Order items reference the product, so they have to go first — the FK is
  // deliberately restrictive so a product with history cannot be deleted.
  await db.execute(sql`TRUNCATE orders, order_items RESTART IDENTITY CASCADE`);
  await db.delete(products).where(eq(products.slug, SLUG));
  await getPool().end();
});

describe("checkout — the happy path", () => {
  test("[SHOP-13] prices the order from the database and records it", async () => {
    const result = await submitOrder(validOrder());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // 2 x $12.50, computed server-side from the row, not from the request.
    expect(result.order.subtotalCents).toBe(2500);
    expect(result.order.totalCents).toBe(2500);
    expect(result.order.lines).toHaveLength(1);
    expect(result.order.lines[0].unitPriceCents).toBe(1250);

    const [row] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, result.order.id));
    expect(row.subtotal).toBe("25.00");
    expect(row.firstName).toBe("Ada");

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, result.order.id));
    // The name is snapshotted, so renaming the product later cannot rewrite
    // this receipt.
    expect(items[0].productName).toBe("Integration widget");
    expect(items[0].unitPrice).toBe("12.50");
  });

  test("[SHOP-10] holds stock for what was ordered", async () => {
    await submitOrder(validOrder());

    expect(await stock()).toBe(STOCK - 2);
  });
});

describe("checkout — payloads the form would never send", () => {
  test("[SHOP-9] refuses cash on a shipped order", async () => {
    // The form hides the cash option when shipping is selected. That is UX;
    // this is the enforcement, and it is the only one an attacker meets.
    const result = await submitOrder(
      validOrder({ paymentMethod: "cash", fulfilment: "shipping" }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/local pick-up only/i);
    expect(await orderCount()).toBe(0);
  });

  test("[SHOP-9] allows cash on local pick-up", async () => {
    const result = await submitOrder(
      validOrder({
        fulfilment: "pickup",
        paymentMethod: "cash",
        shippingAddress: undefined,
        pickupLocation: pickupLocations[0],
      }),
    );

    expect(result.ok).toBe(true);
  });

  test("[SHOP-8] refuses a drop-off spot that is not offered", async () => {
    const result = await submitOrder(
      validOrder({
        fulfilment: "pickup",
        shippingAddress: undefined,
        pickupLocation: "Behind the bins, 3am",
      }),
    );

    expect(result.ok).toBe(false);
    expect(await orderCount()).toBe(0);
  });

  test("[SHOP-8] refuses shipping with no address", async () => {
    const result = await submitOrder(
      validOrder({ shippingAddress: undefined }),
    );

    expect(result.ok).toBe(false);
    expect(await orderCount()).toBe(0);
  });

  test("[SHOP-12] ignores a price supplied by the client", async () => {
    // The schema has no price field, so an injected one is stripped rather than
    // trusted. The order must still be priced from the database.
    const result = await submitOrder({
      ...validOrder(),
      items: [{ slug: SLUG, quantity: 2, priceCents: 1 }],
      subtotalCents: 2,
      totalCents: 2,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.order.totalCents).toBe(2500);
  });

  test("[SHOP-10] refuses more units than there is stock", async () => {
    const result = await submitOrder(
      validOrder({ items: [{ slug: SLUG, quantity: STOCK + 1 }] }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/only has/i);
    expect(await stock()).toBe(STOCK);
    expect(await orderCount()).toBe(0);
  });

  test("[SHOP-3] refuses a slug that does not exist", async () => {
    const result = await submitOrder(
      validOrder({ items: [{ slug: "no-such-product", quantity: 1 }] }),
    );

    expect(result.ok).toBe(false);
    expect(await orderCount()).toBe(0);
  });

  test("[SHOP-13] refuses a malformed payload without touching the database", async () => {
    for (const bad of [
      {},
      null,
      validOrder({ idempotencyKey: "not-a-uuid" }),
      validOrder({ items: [] }),
      validOrder({ items: [{ slug: SLUG, quantity: 0 }] }),
      validOrder({ items: [{ slug: SLUG, quantity: -1 }] }),
      validOrder({ buyer: { firstName: "", lastName: "B", email: "a@b.co" } }),
      validOrder({ buyer: { firstName: "A", lastName: "B", email: "nope" } }),
      validOrder({ paymentMethod: "bitcoin" }),
      validOrder({ fulfilment: "teleport" }),
    ]) {
      const result = await submitOrder(bad);
      expect(result.ok, `expected rejection for ${JSON.stringify(bad)}`).toBe(false);
    }

    expect(await orderCount()).toBe(0);
  });

  test("[SHOP-10] collapses duplicate slugs rather than pricing them twice", async () => {
    const result = await submitOrder(
      validOrder({
        items: [
          { slug: SLUG, quantity: 2 },
          { slug: SLUG, quantity: 2 },
        ],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.order.lines).toHaveLength(1);
    expect(result.order.lines[0].quantity).toBe(4);
    expect(result.order.totalCents).toBe(5000);
  });
});

describe("checkout — idempotency", () => {
  test("[SHOP-13] a replayed key returns the original order, not a second one", async () => {
    const payload = validOrder();

    const first = await submitOrder(payload);
    const second = await submitOrder(payload);

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(second.order.id).toBe(first.order.id);
    expect(second.order.replayed).toBe(true);
    expect(await orderCount()).toBe(1);
    // Crucially, stock moved once. A double-click must not take four units.
    expect(await stock()).toBe(STOCK - 2);
  });

  test("[SHOP-13] concurrent submissions of one key produce one order", async () => {
    const payload = validOrder();

    // Both start before either finishes, so the pre-check cannot help; the
    // unique constraint is what has to catch this.
    const [a, b] = await Promise.all([
      submitOrder(payload),
      submitOrder(payload),
    ]);

    expect(a.ok && b.ok).toBe(true);
    expect(await orderCount()).toBe(1);
    expect(await stock()).toBe(STOCK - 2);
  });

  test("[SHOP-10] a second order cannot take a unit the first already took", async () => {
    await db
      .update(products)
      .set({ stockQuantity: 1 })
      .where(eq(products.slug, SLUG));

    /**
     * Named for what it actually proves. Issuing these together does *not*
     * make them overlap in the database — the first transaction commits before
     * the second opens, so the second simply reads zero stock. Removing the
     * row lock leaves this test passing, which is how that was discovered.
     *
     * What genuinely exercises the lock is the test below.
     */
    const [a, b] = await Promise.all([
      submitOrder(validOrder({ items: [{ slug: SLUG, quantity: 1 }] })),
      submitOrder(validOrder({ items: [{ slug: SLUG, quantity: 1 }] })),
    ]);

    const succeeded = [a, b].filter((result) => result.ok);
    expect(succeeded).toHaveLength(1);
    expect(await stock()).toBe(0);
    expect(await orderCount()).toBe(1);
  });
});

describe("checkout — the row lock itself", () => {
  /**
   * The guarantee `submitOrder` depends on, exercised directly.
   *
   * Two genuinely overlapping transactions on separate connections, which is
   * the situation two simultaneous customers create and which the tests above
   * cannot reproduce through one process. If the SELECT did not take a row
   * lock, both would read the same stock figure and both would pass their
   * check — the classic oversell.
   */
  test("[SHOP-10] a locked product row blocks a second reader until commit", async () => {
    await db
      .update(products)
      .set({ stockQuantity: 1 })
      .where(eq(products.slug, SLUG));

    const pool = getPool();
    const first = await pool.connect();
    const second = await pool.connect();

    try {
      await first.query("BEGIN");
      await second.query("BEGIN");

      const lockQuery =
        "SELECT stock_quantity FROM products WHERE slug = $1 FOR UPDATE";

      const firstRead = await first.query(lockQuery, [SLUG]);
      expect(firstRead.rows[0].stock_quantity).toBe(1);

      // The second reader must not get an answer while the first holds the row.
      let secondResolved = false;
      const secondRead = second
        .query(lockQuery, [SLUG])
        .then((result) => {
          secondResolved = true;
          return result;
        });

      await new Promise((resolve) => setTimeout(resolve, 250));
      expect(
        secondResolved,
        "the second transaction read the row while it was locked — it would oversell",
      ).toBe(false);

      // The first takes the unit and commits; only now may the second proceed.
      await first.query(
        "UPDATE products SET stock_quantity = stock_quantity - 1 WHERE slug = $1",
        [SLUG],
      );
      await first.query("COMMIT");

      const result = await secondRead;
      // It sees the decrement, so its own stock check fails rather than
      // succeeding against a stale figure.
      expect(result.rows[0].stock_quantity).toBe(0);
      await second.query("COMMIT");
    } finally {
      first.release();
      second.release();
    }
  });
});
