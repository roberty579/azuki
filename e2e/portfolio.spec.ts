import { expect, test } from "@playwright/test";
import {
  categories,
  itemsByCategory,
  portfolioItems,
} from "../src/content/portfolio";

/** Catalogue titles carry a "[Placeholder]" prefix, which a RegExp would read as a class. */
function label(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

const credited = portfolioItems.find((item) => item.designer !== null)!;
const uncredited = portfolioItems.find((item) => item.designer === null)!;

test("[PORT-1] the gallery lists every piece with an image that loads", async ({
  page,
}) => {
  await page.goto("/portfolio");

  const tiles = page.getByRole("main").getByRole("listitem");
  await expect(tiles).toHaveCount(portfolioItems.length);

  // A broken /public path is invisible to jsdom; only a real browser sees it.
  const image = page.getByRole("main").getByRole("img").first();
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
});

test("[PORT-2] pieces are grouped under their category headings", async ({
  page,
}) => {
  await page.goto("/portfolio");

  for (const group of itemsByCategory()) {
    const section = page.getByRole("region", { name: label(group.label) });
    await expect(section).toBeVisible();
    await expect(section.getByRole("listitem")).toHaveCount(group.items.length);
  }
});

test("[PORT-2] categories with no work do not render", async ({ page }) => {
  await page.goto("/portfolio");

  const planned = categories.filter((category) => !category.launched);
  expect(planned.length).toBeGreaterThan(0);

  for (const category of planned) {
    await expect(
      page.getByRole("region", { name: label(category.label) }),
    ).toHaveCount(0);
  }
});

test("[PORT-3] [PORT-4] a tile opens the piece and shows what it is made of", async ({
  page,
}) => {
  await page.goto("/portfolio");

  await page.getByRole("link", { name: label(credited.title) }).click();

  await expect(page).toHaveURL(`/portfolio/${credited.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    credited.title,
  );
  await expect(page.getByText(credited.description)).toBeVisible();
  await expect(page.getByText(credited.yarnType)).toBeVisible();
  await expect(page.getByText(credited.yarnColor)).toBeVisible();
});

test("[PORT-5] a designer is credited only where there is one", async ({
  page,
}) => {
  await page.goto(`/portfolio/${credited.slug}`);
  await expect(page.getByText(/pattern by/i)).toBeVisible();
  await expect(page.getByText(label(credited.designer!))).toBeVisible();

  // The maker's own design shows no credit at all — not an empty label, and
  // not "unknown".
  await page.goto(`/portfolio/${uncredited.slug}`);
  await expect(page.getByText(/pattern by/i)).toHaveCount(0);
});

test("[PORT-6] the detail page leads back and onward", async ({ page }) => {
  await page.goto(`/portfolio/${uncredited.slug}`);

  await expect(
    page.getByRole("link", { name: /request something similar/i }),
  ).toHaveAttribute("href", "/commission");

  await page.getByRole("link", { name: /back to portfolio/i }).click();
  await expect(page).toHaveURL("/portfolio");
});

test("[PORT-4] an unknown piece 404s rather than rendering empty", async ({
  page,
}) => {
  const response = await page.goto("/portfolio/not-a-real-piece");

  expect(response?.status()).toBe(404);
});

test("[PORT-1] nothing in the portfolio is priced or purchasable", async ({
  page,
}) => {
  await page.goto(`/portfolio/${credited.slug}`);

  // The route onward is a commission, never a cart.
  await expect(page.getByRole("main")).not.toContainText(/\$\d/);
  await expect(
    page.getByRole("button", { name: /add to cart/i }),
  ).toHaveCount(0);
});
