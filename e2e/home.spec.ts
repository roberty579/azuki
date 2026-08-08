import { expect, test } from "@playwright/test";
import { navItems } from "../src/content/navigation";
import { site } from "../src/content/site";
import { usesInlineNav } from "./nav-helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("[HOME-5] [HOME-6] [HOME-12] renders the title, business name, tagline, and about blurb", async ({
  page,
}) => {
  await expect(page).toHaveTitle(`${site.name} — ${site.tagline}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(site.name);
  await expect(page.getByText(site.about)).toBeVisible();
});

test("[HOME-1] keeps the logo visible at this viewport", async ({ page }) => {
  await expect(page.getByRole("link", { name: site.name })).toBeVisible();
});

test("[HOME-2] [HOME-3] offers exactly one way into the sections at this viewport", async ({
  page,
}) => {
  // Runs under every project: wide viewports get the inline list, narrow ones
  // get the hamburger, and neither should show both at once.
  const header = page.getByRole("banner");
  const inlineNav = header.getByRole("navigation", { name: "Main" });
  const toggle = header.getByRole("button", { name: "Open menu" });

  if (usesInlineNav(page)) {
    await expect(inlineNav).toBeVisible();
    await expect(inlineNav.getByRole("link")).toHaveCount(navItems.length);
    await expect(toggle).toBeHidden();
  } else {
    await expect(inlineNav).toBeHidden();
    await expect(toggle).toBeVisible();
  }
});

test("[HOME-10] the content fills the screen width and sits close under the header", async ({
  page,
}) => {
  const viewport = page.viewportSize()!;
  const main = page.getByRole("main");

  // Compare against clientWidth, not the viewport: a scrollbar takes real width.
  const available = await page.evaluate(
    () => document.documentElement.clientWidth,
  );
  const box = (await main.boundingBox())!;
  expect(box.x).toBe(0);
  expect(box.width).toBe(available);

  // Padding steps up with the breakpoint rather than staying fixed.
  const paddingLeft = await main.evaluate(
    (el) => Number.parseFloat(getComputedStyle(el).paddingLeft),
  );
  const expectedPadding =
    viewport.width >= 1024 ? 40 : viewport.width >= 640 ? 24 : 16;
  expect(paddingLeft).toBe(expectedPadding);

  // The first line of copy must not float away from the header.
  const headerBottom = (await page.getByRole("banner").boundingBox())!;
  const firstLine = (await main.getByText(site.tagline).boundingBox())!;
  expect(firstLine.y - (headerBottom.y + headerBottom.height)).toBeLessThanOrEqual(64);
});

test("[HOME-9] gallery images actually load", async ({ page }) => {
  const images = page.getByRole("region", { name: /recent work/i }).getByRole("img");

  await expect(images).toHaveCount(site.gallery.length);

  for (let i = 0; i < site.gallery.length; i++) {
    const image = images.nth(i);
    await expect(image).toBeVisible();
    // Guards against a broken /public path, which a jsdom test cannot detect.
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
  }
});

test("[HOME-8] offers the contact email as a mailto link", async ({ page }) => {
  await expect(page.getByRole("link", { name: site.email })).toHaveAttribute(
    "href",
    `mailto:${site.email}`,
  );
});

test("[HOME-8] social links open safely in a new tab", async ({ page }) => {
  for (const social of site.socials) {
    const link = page.getByRole("link", { name: social.label });
    await expect(link).toHaveAttribute("href", social.href);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }
});

test("[HOME-7] calls out the scheduling and shop entry points", async ({
  page,
}) => {
  await expect(
    page.getByRole("link", { name: /book a consultation/i }),
  ).toHaveAttribute("href", "/schedule");
  await expect(
    page.getByRole("link", { name: /browse the shop/i }),
  ).toHaveAttribute("href", "/shop");
});
