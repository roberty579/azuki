import { expect, test } from "@playwright/test";
import { navItems } from "../src/content/navigation";
import { site } from "../src/content/site";
import { revealNav } from "./nav-helpers";

/**
 * Navigation behaviour that holds at every width. Layout-specific behaviour
 * lives in nav.wide.spec.ts and nav.narrow.spec.ts, which are scoped to the
 * projects they apply to.
 */

/** The home route's <h1> is the business name; every stub uses its nav label. */
function expectedHeading(item: (typeof navItems)[number]) {
  return item.href === "/" ? site.name : item.label;
}

for (const item of navItems) {
  test(`[HOME-2] [HOME-3] the nav reaches ${item.label}`, async ({ page }) => {
    await page.goto("/");

    const nav = await revealNav(page);
    await nav.getByRole("link", { name: item.label }).click();

    await expect(page).toHaveURL(item.href);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      expectedHeading(item),
    );

    // The panel must not linger over the page it just navigated to.
    await expect(page.getByRole("navigation", { name: "Menu" })).toBeHidden();
  });
}

test("[HOME-4] the nav marks the section you are on", async ({ page }) => {
  await page.goto("/shop");

  const nav = await revealNav(page);
  await expect(nav.getByRole("link", { name: "Shop" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(nav.getByRole("link", { name: "Portfolio" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("[HOME-1] the logo returns home from a sub-page", async ({ page }) => {
  await page.goto("/shop");

  await page.getByRole("link", { name: site.name }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(site.name);
});
