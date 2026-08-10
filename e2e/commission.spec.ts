import { expect, test } from "@playwright/test";
import { nextSteps, terms, yarnThicknesses } from "../src/content/commission";
import { pickupLocations } from "../src/content/ordering";

test.beforeEach(async ({ page }) => {
  await page.goto("/commission");
});

/** Fills everything except fulfilment-specific fields, payment, and terms. */
async function fillCore(page: import("@playwright/test").Page) {
  await page.getByLabel(/first name/i).fill("Ada");
  await page.getByLabel(/last name/i).fill("Lovelace");
  await page.getByLabel(/^email$/i).fill("ada@example.com");
  await page
    .getByLabel(/describe the piece/i)
    .fill("A cardigan with balloon sleeves.");
  await page.getByRole("radio", { name: /it's for me/i }).check();
  await page.getByLabel(/^colour$/i).fill("Sage green");
  await page.getByLabel(/^type$/i).fill("Cotton blend");
  await page.getByLabel(/thickness/i).selectOption(yarnThicknesses[0].id);
}

test("[COMM-1] the page loads with one heading and the contact fields", async ({
  page,
}) => {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /commission a piece/i,
  );
  await expect(page.getByLabel(/first name/i)).toBeVisible();
  await expect(page.getByLabel(/^email$/i)).toBeVisible();
  // Optional, and labelled as such rather than silently accepting nothing.
  await expect(page.getByLabel(/phone/i)).toBeVisible();
});

test("[COMM-4] the address and drop-off list swap, never both at once", async ({
  page,
}) => {
  // Shipping is the default.
  await expect(page.getByLabel(/street address/i)).toBeVisible();
  await expect(page.getByLabel(/drop-off spot/i)).toHaveCount(0);

  await page.getByRole("radio", { name: /local drop-off/i }).check();

  await expect(page.getByLabel(/drop-off spot/i)).toBeVisible();
  await expect(page.getByLabel(/street address/i)).toHaveCount(0);
});

test("[COMM-5] cash appears only for local drop-off", async ({ page }) => {
  await expect(page.getByRole("radio", { name: /cash/i })).toHaveCount(0);

  await page.getByRole("radio", { name: /local drop-off/i }).check();
  await expect(page.getByRole("radio", { name: /cash/i })).toBeVisible();

  await page.getByRole("radio", { name: /ship it to me/i }).check();
  await expect(page.getByRole("radio", { name: /cash/i })).toHaveCount(0);
});

test("[COMM-6] the terms are shown in full on the page", async ({ page }) => {
  // Not behind a link that could go stale — what was agreed to is on screen.
  await expect(page.getByText(terms.body)).toBeVisible();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
});

test("[COMM-7] an incomplete form does not submit", async ({ page }) => {
  await page.getByRole("button", { name: /review request/i }).click();

  await expect(page.getByRole("alert").first()).toBeVisible();
  await expect(page.getByText(/ready to send/i)).toHaveCount(0);
});

test("[COMM-8] [COMM-9] a completed request reaches the summary and next steps", async ({
  page,
}) => {
  await fillCore(page);
  await page.getByLabel(/street address/i).fill("1 Main St");
  await page.getByLabel(/^city$/i).fill("Springfield");
  await page.getByLabel(/^state$/i).fill("IL");
  await page.getByLabel(/postcode/i).fill("62701");
  await page.getByRole("radio", { name: /zelle/i }).check();
  await page.getByRole("checkbox").check();

  await page.getByRole("button", { name: /review request/i }).click();

  const summary = page.getByRole("region", { name: /ready to send/i });
  await expect(summary).toBeVisible();
  await expect(summary).toContainText("Ada Lovelace");
  await expect(summary).toContainText("A cardigan with balloon sleeves.");
  await expect(summary).toContainText("1 Main St");

  const steps = page.getByRole("region", { name: /what happens next/i });
  await expect(steps.getByRole("listitem")).toHaveCount(nextSteps.length);
  await expect(steps).toContainText(/nothing is due now/i);

  await expect(summary.getByRole("link", { name: /send to/i })).toHaveAttribute(
    "href",
    /^mailto:/,
  );
});

test("[COMM-8] a drop-off request carries the spot and not an address", async ({
  page,
}) => {
  await fillCore(page);
  await page.getByRole("radio", { name: /local drop-off/i }).check();
  await page.getByLabel(/drop-off spot/i).selectOption(pickupLocations[0]);
  await page.getByRole("radio", { name: /cash/i }).check();
  await page.getByRole("checkbox").check();

  await page.getByRole("button", { name: /review request/i }).click();

  const summary = page.getByRole("region", { name: /ready to send/i });
  await expect(summary).toContainText(pickupLocations[0]);
  await expect(summary).not.toContainText(/ship to/i);
});

test("[COMM-8] the form quotes no price anywhere", async ({ page }) => {
  // A commission has no price until after the consultation. A figure on this
  // page would imply one had been agreed.
  await expect(page.getByRole("main")).not.toContainText(/\$\d/);
});
