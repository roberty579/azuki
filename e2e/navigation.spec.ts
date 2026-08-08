import { expect, test } from "@playwright/test";
import { navItems } from "../content/navigation";
import { site } from "../content/site";
import { revealNav, usesInlineNav } from "./nav-helpers";

/** The home route's <h1> is the business name; every stub uses its nav label. */
function expectedHeading(item: (typeof navItems)[number]) {
  return item.href === "/" ? site.name : item.label;
}

test("[HOME-2] wide viewports list every section without opening anything", async ({
  page,
}) => {
  await page.goto("/");
  test.skip(!usesInlineNav(page), "This viewport collapses the nav.");

  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link")).toHaveCount(navItems.length);

  for (const item of navItems) {
    await expect(nav.getByRole("link", { name: item.label })).toBeVisible();
  }

  // No hamburger competes with the inline list.
  await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();
});

test("[HOME-3] narrow viewports keep the sections behind the hamburger", async ({
  page,
}) => {
  await page.goto("/");
  test.skip(usesInlineNav(page), "This viewport lists the nav inline.");

  await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();

  const panel = page.getByRole("navigation", { name: "Menu" });
  await expect(panel).toBeHidden();

  await page.getByRole("button", { name: "Open menu" }).click();

  await expect(panel).toBeVisible();
  await expect(panel.getByRole("link")).toHaveCount(navItems.length);
});

test("[HOME-3] Escape collapses the menu", async ({ page }) => {
  await page.goto("/");
  test.skip(usesInlineNav(page), "There is no collapsible panel to close.");

  const panel = page.getByRole("navigation", { name: "Menu" });

  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(panel).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(panel).toBeHidden();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
});

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
