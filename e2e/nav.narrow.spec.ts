import { expect, test } from "@playwright/test";
import { navItems } from "../src/content/navigation";
import { usesInlineNav } from "./nav-helpers";

/**
 * Behaviour that only exists below INLINE_NAV_MIN_WIDTH.
 *
 * `*.narrow.spec.ts` is excluded from the wide projects by `testIgnore` in
 * playwright.config.ts, so these are never collected where there is no
 * hamburger to operate — no skips in the report.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  // Turns a config mistake (a wide project forgetting its testIgnore) into a
  // failure rather than a silently passing or skipped test.
  expect(
    usesInlineNav(page),
    "this file must only run on projects narrow enough to collapse the nav",
  ).toBe(false);
});

test("[HOME-3] the sections stay behind the hamburger until it is opened", async ({
  page,
}) => {
  await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();

  const panel = page.getByRole("navigation", { name: "Menu" });
  await expect(panel).toBeHidden();

  await page.getByRole("button", { name: "Open menu" }).click();

  await expect(panel).toBeVisible();
  await expect(panel.getByRole("link")).toHaveCount(navItems.length);
});

test("[HOME-3] Escape collapses the menu", async ({ page }) => {
  const panel = page.getByRole("navigation", { name: "Menu" });

  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(panel).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(panel).toBeHidden();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
});
