import { expect, test } from "@playwright/test";
import { navItems } from "../src/content/navigation";
import { usesInlineNav } from "./nav-helpers";

/**
 * Behaviour that only exists at or above INLINE_NAV_MIN_WIDTH.
 *
 * `*.wide.spec.ts` is excluded from the narrow projects by `testIgnore` in
 * playwright.config.ts, so these are never collected where they would be
 * meaningless — no skips in the report.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  // Turns a config mistake (a narrow project forgetting its testIgnore) into a
  // failure rather than a silently passing or skipped test.
  expect(
    usesInlineNav(page),
    "this file must only run on projects wide enough for the inline nav",
  ).toBe(true);
});

test("[HOME-2] every section is listed across the top, with no hamburger", async ({
  page,
}) => {
  const nav = page.getByRole("navigation", { name: "Main" });

  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link")).toHaveCount(navItems.length);

  for (const item of navItems) {
    const link = nav.getByRole("link", { name: item.label });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", item.href);
  }

  await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();
});
