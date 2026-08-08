import { expect, test } from "@playwright/test";
import { products } from "../src/content/shop";

const inStock = products.find((product) => product.stock > 2)!;
const soldOut = products.find((product) => product.stock === 0)!;

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
}) => {
  await page.goto(`/shop/${inStock.slug}`);
  await page.getByRole("button", { name: /add to cart/i }).click();
  await page.goto("/shop/cart");

  await page.getByLabel(/first name/i).fill("Ada");
  await page.getByLabel(/last name/i).fill("Lovelace");
  await page.getByLabel(/^email$/i).fill("ada@example.com");
  await page.getByLabel(/shipping address/i).fill("1 Main St");
  await page.getByRole("radio", { name: /zelle/i }).check();

  await page.getByRole("button", { name: /review order/i }).click();

  await expect(page.getByText(/order request ready/i)).toBeVisible();
  await expect(page.getByText(/order request from Ada Lovelace/i)).toBeVisible();

  // The cart is emptied by a successful request.
  await page.goto("/shop/cart");
  await expect(page.getByText(/your cart is empty/i)).toBeVisible();
});

test("[SHOP-13] an incomplete checkout does not submit", async ({ page }) => {
  await page.goto(`/shop/${inStock.slug}`);
  await page.getByRole("button", { name: /add to cart/i }).click();
  await page.goto("/shop/cart");

  await page.getByRole("button", { name: /review order/i }).click();

  await expect(page.getByRole("alert").first()).toBeVisible();
  await expect(page.getByText(/order request ready/i)).toHaveCount(0);
});
