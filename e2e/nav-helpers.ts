import { expect, type Locator, type Page } from "@playwright/test";

/**
 * The width at which the header stops collapsing behind a hamburger and lists
 * every section inline. Must stay in sync with the `lg:` prefixes in
 * components/navbar.tsx.
 */
export const INLINE_NAV_MIN_WIDTH = 1024;

export function usesInlineNav(page: Page): boolean {
  const viewport = page.viewportSize();
  return viewport !== null && viewport.width >= INLINE_NAV_MIN_WIDTH;
}

/**
 * Returns the nav holding the section links for the current viewport, opening
 * the hamburger panel first if this viewport collapses it.
 */
export async function revealNav(page: Page): Promise<Locator> {
  if (usesInlineNav(page)) {
    return page.getByRole("navigation", { name: "Main" });
  }

  await page.getByRole("button", { name: "Open menu" }).click();
  const panel = page.getByRole("navigation", { name: "Menu" });
  await expect(panel).toBeVisible();
  return panel;
}
