import { expect, test } from "@playwright/test";
import {
  addOns,
  bases,
  bunnyColors,
  outfitColors,
  sample,
} from "../src/content/bunny";
import { formatPrice } from "../src/lib/money";

const naked = bases.find((base) => !base.hasOutfit)!;
const outfitted = bases.find((base) => base.hasOutfit)!;

/** Catalogue labels contain "[Placeholder]", which a RegExp reads as a class. */
function label(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/build-a-bunny");
});

test("[BUNNY-8] the sample photo loads and credits its designer", async ({
  page,
}) => {
  const image = page.getByRole("img", { name: sample.alt });
  await expect(image).toBeVisible();

  // A broken /public path is invisible to jsdom; only a real browser sees it.
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);

  await expect(page.getByText(label(sample.designer.name))).toBeVisible();
});

test("[BUNNY-1] the page opens configured, showing a price for each base", async ({
  page,
}) => {
  const group = page.getByRole("group", { name: /^base$/i });

  await expect(group.getByRole("radio")).toHaveCount(bases.length);
  await expect(group.getByRole("radio").first()).toBeChecked();
  for (const base of bases) {
    await expect(group.getByText(formatPrice(base.priceCents))).toBeVisible();
  }
});

test("[BUNNY-2] the bunny colours are visible and named", async ({ page }) => {
  const group = page.getByRole("group", { name: /bunny colour/i });

  await expect(group.getByRole("radio")).toHaveCount(bunnyColors.length);
  for (const color of bunnyColors) {
    await expect(group.getByText(color.label, { exact: true })).toBeVisible();
  }
});

test("[BUNNY-3] the outfit colour appears and disappears with the outfit", async ({
  page,
}) => {
  await page.getByRole("radio", { name: label(naked.label) }).check();
  await expect(page.getByRole("group", { name: /outfit colour/i })).toHaveCount(
    0,
  );

  await page.getByRole("radio", { name: label(outfitted.label) }).check();
  const group = page.getByRole("group", { name: /outfit colour/i });
  await expect(group).toBeVisible();
  await expect(group.getByRole("radio")).toHaveCount(outfitColors.length);
});

test("[BUNNY-4] [BUNNY-5] [BUNNY-6] the estimate tracks every choice", async ({
  page,
}) => {
  const totalLine = page.getByText(/estimated total/i).locator("..");

  await page.getByRole("radio", { name: label(naked.label) }).check();
  await expect(totalLine).toContainText(formatPrice(naked.priceCents));

  await page.getByRole("radio", { name: label(outfitted.label) }).check();
  await expect(totalLine).toContainText(formatPrice(outfitted.priceCents));

  const first = page.getByRole("checkbox", { name: label(addOns[0].label) });
  const second = page.getByRole("checkbox", { name: label(addOns[1].label) });

  await first.check();
  await second.check();
  await expect(totalLine).toContainText(
    formatPrice(
      outfitted.priceCents + addOns[0].priceCents + addOns[1].priceCents,
    ),
  );

  // Itemised, not a single number (BUNNY-6).
  const estimate = page.getByRole("region", { name: /estimate/i });
  await expect(estimate.getByText(addOns[0].label, { exact: true })).toBeVisible();
  await expect(estimate.getByText(addOns[1].label, { exact: true })).toBeVisible();

  await second.uncheck();
  await expect(totalLine).toContainText(
    formatPrice(outfitted.priceCents + addOns[0].priceCents),
  );
});

test("[BUNNY-10] submitting produces the request without clearing the form", async ({
  page,
}) => {
  const color = bunnyColors[2];

  await page.getByRole("radio", { name: label(outfitted.label) }).check();
  await page.getByRole("radio", { name: color.label }).check();
  await page.getByRole("checkbox", { name: label(addOns[0].label) }).check();
  await page.getByRole("button", { name: /review request/i }).click();

  const summary = page.getByRole("region", { name: /ready to send/i });
  await expect(summary).toBeVisible();
  await expect(summary.getByText(outfitted.label, { exact: true })).toBeVisible();
  await expect(summary.getByText(color.label, { exact: true })).toBeVisible();

  const mailto = summary.getByRole("link", { name: /send to/i });
  await expect(mailto).toHaveAttribute("href", /^mailto:/);

  // BUNNY-11: the estimate is in the mail body as an estimate, and the choices
  // travel as ids the recipient can re-price.
  const href = decodeURIComponent((await mailto.getAttribute("href"))!);
  expect(href).toContain(`Options: ${outfitted.id}, ${color.id}`);
  expect(href).toContain("estimate only");

  await expect(
    page.getByRole("radio", { name: label(outfitted.label) }),
  ).toBeChecked();
  await expect(page.getByRole("radio", { name: color.label })).toBeChecked();
});

test("[BUNNY-7] prices render as currency, never as raw cents", async ({
  page,
}) => {
  const estimate = page.getByRole("region", { name: /estimate/i });

  await expect(estimate).toContainText(formatPrice(bases[0].priceCents));
  await expect(estimate).not.toContainText(String(bases[0].priceCents));
});

test("[BUNNY-9] the placeholder catalogue is marked as placeholder", async ({
  page,
}) => {
  await expect(page.getByText(/while the shop is being set up/i)).toBeVisible();
});
