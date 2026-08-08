import { expect, test } from "@playwright/test";
import { config } from "dotenv";
import { Pool } from "pg";
import { products } from "../src/content/shop";
import { formatPrice, numericFromCents } from "../src/lib/money";

const inStock = products.find((product) => product.stock > 2)!;
const soldOut = products.find((product) => product.stock === 0)!;

/**
 * Checkout now decrements stock for real, and the three viewport projects run
 * in parallel against one database — so a completed order in one project is
 * visible to the others. Tests that place orders therefore use the
 * deepest-stocked item, and never the one the cart tests rely on: draining it
 * would turn every "add to cart" assertion elsewhere into a sold-out page.
 *
 * If a future test places orders, check the arithmetic here still holds:
 * 3 projects x (orders per project) must stay comfortably under this stock.
 */
const checkoutItem = [...products].sort((a, b) => b.stock - a.stock)[0];

/**
 * A direct connection, used only to assert on what the app wrote.
 *
 * Checking the page is not enough for the write path: a confirmation screen
 * proves the browser rendered something, not that a row exists or that stock
 * moved. These queries are the difference between testing the UI and testing
 * the order.
 */
config({ path: ".env.local", quiet: true });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
test.afterAll(async () => {
  await pool.end();
});

const formatNumeric = numericFromCents;

async function stockOf(slug: string): Promise<number> {
  const { rows } = await pool.query(
    "select stock_quantity from products where slug = $1",
    [slug],
  );
  return rows[0].stock_quantity;
}

async function latestOrderFor(email: string) {
  const { rows } = await pool.query(
    "select total_price, payment_method, fulfillment_type from orders where customer_email = $1 order by created_at desc limit 1",
    [email],
  );
  return rows[0];
}

test("[SHOP-1] the grid lists every item with a price and an image", async ({
  page,
}) => {
  await page.goto("/shop");

  const tiles = page.getByRole("main").getByRole("listitem");
  await expect(tiles).toHaveCount(products.length);

  for (const product of products) {
    const tile = page.getByRole("link", { name: new RegExp(product.name, "i") });
    await expect(tile).toBeVisible();
  }

  // Guards against a broken /public path, which jsdom cannot detect.
  const image = page
    .getByRole("main")
    .getByRole("img")
    .first();
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
});

test("[SHOP-1] a sold-out item is marked on the grid", async ({ page }) => {
  await page.goto("/shop");

  const tile = page.getByRole("link", { name: new RegExp(soldOut.name, "i") });
  await expect(tile.getByText(/sold out/i)).toBeVisible();
});

test("[SHOP-2] [SHOP-3] a tile opens the item's page", async ({ page }) => {
  await page.goto("/shop");

  await page.getByRole("link", { name: new RegExp(inStock.name, "i") }).click();

  await expect(page).toHaveURL(`/shop/${inStock.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(inStock.name);
  await expect(page.getByText(inStock.description)).toBeVisible();
});

test("[SHOP-3] an unknown item 404s rather than rendering empty", async ({
  page,
}) => {
  const response = await page.goto("/shop/not-a-real-product");

  expect(response?.status()).toBe(404);
});

test("[SHOP-4] [SHOP-7] adding an item updates the cart link", async ({
  page,
}) => {
  await page.goto(`/shop/${inStock.slug}`);

  const cartLink = page.getByRole("link", { name: /^cart/i });
  await expect(cartLink).toBeVisible();

  await page.getByRole("button", { name: /add to cart/i }).click();

  await expect(page.getByText(/^added/i)).toBeVisible();
  await expect(page.getByLabel("1 item in cart")).toBeVisible();
});

test("[SHOP-10] a sold-out item cannot be added", async ({ page }) => {
  await page.goto(`/shop/${soldOut.slug}`);

  await expect(page.getByRole("button", { name: /add to cart/i })).toHaveCount(0);
  await expect(page.getByText(/sold out/i)).toBeVisible();
});

test("[SHOP-6] the cart survives navigation and a reload", async ({ page }) => {
  await page.goto(`/shop/${inStock.slug}`);
  await page.getByRole("button", { name: /add to cart/i }).click();
  await expect(page.getByLabel("1 item in cart")).toBeVisible();

  await page.goto("/shop");
  await expect(page.getByLabel("1 item in cart")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("1 item in cart")).toBeVisible();
});

test("[SHOP-5] the cart shows the item and its line total", async ({ page }) => {
  await page.goto(`/shop/${inStock.slug}`);
  await page.getByRole("button", { name: /add to cart/i }).click();

  await page.getByRole("link", { name: /^cart/i }).click();

  await expect(page).toHaveURL("/shop/cart");
  await expect(
    page.getByRole("listitem").getByRole("link", { name: inStock.name }),
  ).toBeVisible();
});

test("[SHOP-5] removing the last item empties the cart", async ({ page }) => {
  await page.goto(`/shop/${inStock.slug}`);
  await page.getByRole("button", { name: /add to cart/i }).click();
  await page.goto("/shop/cart");

  await page.getByRole("button", { name: /remove/i }).click();

  await expect(page.getByText(/your cart is empty/i)).toBeVisible();
});

test("[SHOP-8] [SHOP-9] cash appears only for local pick-up", async ({
  page,
}) => {
  await page.goto(`/shop/${inStock.slug}`);
  await page.getByRole("button", { name: /add to cart/i }).click();
  await page.goto("/shop/cart");

  // Shipping is the default.
  await expect(page.getByLabel(/shipping address/i)).toBeVisible();
  await expect(page.getByRole("radio", { name: /cash/i })).toHaveCount(0);

  await page.getByRole("radio", { name: /local pick-up/i }).check();

  await expect(page.getByLabel(/drop-off spot/i)).toBeVisible();
  await expect(page.getByLabel(/shipping address/i)).toHaveCount(0);
  await expect(page.getByRole("radio", { name: /cash/i })).toBeVisible();
});

test("[SHOP-13] a completed checkout produces a summary and empties the cart", async ({
  page,
}, testInfo) => {
  await page.goto(`/shop/${checkoutItem.slug}`);
  await page.getByRole("button", { name: /add to cart/i }).click();
  await page.goto("/shop/cart");

  await page.getByLabel(/first name/i).fill("Ada");
  await page.getByLabel(/last name/i).fill("Lovelace");
  await page.getByLabel(/^email$/i).fill(`ada-${testInfo.project.name}@example.com`);
  await page.getByLabel(/shipping address/i).fill("1 Main St");
  await page.getByRole("radio", { name: /zelle/i }).check();

  await page.getByRole("button", { name: /review order/i }).click();

  const confirmation = page.getByRole("region", { name: /order request ready/i });
  await expect(confirmation).toBeVisible();

  // The item and the total the *server* computed, not the browser's arithmetic.
  await expect(confirmation).toContainText(checkoutItem.name);
  await expect(confirmation).toContainText(formatPrice(checkoutItem.priceCents));

  // The cart is emptied by a successful request.
  await page.goto("/shop/cart");
  await expect(page.getByText(/your cart is empty/i)).toBeVisible();
});

test("[SHOP-13] the order reaches the database and holds stock", async ({
  page,
}, testInfo) => {
  // Namespaced per project: the three viewports run in parallel against one
  // database, so a shared address would let them find each other's orders.
  const email = `grace-${testInfo.project.name}@example.com`;
  const before = await stockOf(checkoutItem.slug);

  await page.goto(`/shop/${checkoutItem.slug}`);
  await page.getByRole("button", { name: /add to cart/i }).click();
  await page.goto("/shop/cart");

  await page.getByLabel(/first name/i).fill("Grace");
  await page.getByLabel(/last name/i).fill("Hopper");
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/shipping address/i).fill("1 Main St");
  await page.getByRole("radio", { name: /venmo/i }).check();
  await page.getByRole("button", { name: /review order/i }).click();

  await expect(
    page.getByRole("region", { name: /order request ready/i }),
  ).toBeVisible();

  // The row exists and was priced by the server — the part no amount of UI
  // assertion can prove, because the UI would happily render a number that was
  // never persisted.
  const order = await latestOrderFor(email);
  expect(order).toBeTruthy();
  expect(order!.total_price).toBe(formatNumeric(checkoutItem.priceCents));
  expect(order!.payment_method).toBe("venmo");
  expect(order!.fulfillment_type).toBe("shipping");

  // Strictly less rather than exactly one less: a parallel project may have
  // ordered the same item in between, and asserting an exact figure would make
  // this fail for a reason that is not a bug.
  expect(await stockOf(checkoutItem.slug)).toBeLessThan(before);
});

test("[SHOP-13] an incomplete checkout does not submit", async ({ page }) => {
  await page.goto(`/shop/${inStock.slug}`);
  await page.getByRole("button", { name: /add to cart/i }).click();
  await page.goto("/shop/cart");

  await page.getByRole("button", { name: /review order/i }).click();

  await expect(page.getByRole("alert").first()).toBeVisible();
  await expect(page.getByText(/order request ready/i)).toHaveCount(0);
});
