import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { findProduct, products } from "@/content/shop";
import {
  availablePaymentMethods,
  paymentMethods,
  pickupLocations,
} from "@/content/ordering";

/**
 * The catalogue is hand-edited whenever stock changes, so these guard the data
 * itself — a malformed price or a slug that collides with a route would
 * otherwise only surface in the browser.
 */
describe("shop catalogue", () => {
  test("[SHOP-11] is not empty", () => {
    expect(products.length).toBeGreaterThan(0);
  });

  test("[SHOP-11] every product has complete copy", () => {
    for (const product of products) {
      expect(product.name.trim()).not.toBe("");
      expect(product.summary.trim()).not.toBe("");
      expect(product.description.trim().length).toBeGreaterThan(20);
      expect(product.alt.trim()).not.toBe("");
      expect(product.details.length).toBeGreaterThan(0);
    }
  });

  test("[SHOP-11] slugs are unique and URL-safe", () => {
    const slugs = products.map((product) => product.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  test("[SHOP-11] no slug collides with a sibling route under /shop", () => {
    // /shop/cart is a real directory; a product slugged "cart" would be
    // unreachable, because a static segment always wins over a dynamic one.
    const siblings = readdirSync(join(process.cwd(), "src", "app", "shop"), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("["))
      .map((entry) => entry.name);

    expect(siblings).toContain("cart");
    for (const product of products) {
      expect(siblings).not.toContain(product.slug);
    }
  });

  test("[SHOP-11] images are local and free of query strings", () => {
    for (const product of products) {
      expect(product.image.startsWith("/")).toBe(true);
      // Query strings would require images.localPatterns.search in Next 16.
      expect(product.image).not.toContain("?");
    }
  });

  test("[SHOP-12] prices are whole cents", () => {
    for (const product of products) {
      expect(Number.isInteger(product.priceCents)).toBe(true);
      expect(product.priceCents).toBeGreaterThan(0);
    }
  });

  test("[SHOP-10] stock is a non-negative whole number", () => {
    for (const product of products) {
      expect(Number.isInteger(product.stock)).toBe(true);
      expect(product.stock).toBeGreaterThanOrEqual(0);
    }
  });

  test("[SHOP-3] findProduct resolves a slug, and only a real one", () => {
    expect(findProduct(products[0].slug)).toBe(products[0]);
    expect(findProduct("not-a-real-product")).toBeUndefined();
  });
});

describe("ordering options", () => {
  test("[SHOP-9] shipping cannot pay in cash", () => {
    const shipping = availablePaymentMethods("shipping");

    expect(shipping.length).toBeGreaterThan(0);
    expect(shipping.every((method) => !method.localOnly)).toBe(true);
    expect(shipping.map((method) => method.id)).not.toContain("cash");
  });

  test("[SHOP-9] local pick-up may pay in cash", () => {
    const pickup = availablePaymentMethods("pickup");

    expect(pickup).toEqual(paymentMethods);
    expect(pickup.map((method) => method.id)).toContain("cash");
  });

  test("[SHOP-8] every payment method and drop-off spot is labelled", () => {
    for (const method of paymentMethods) {
      expect(method.label.trim()).not.toBe("");
      expect(method.instructions.trim()).not.toBe("");
    }

    expect(pickupLocations.length).toBeGreaterThan(0);
    for (const location of pickupLocations) {
      expect(location.trim()).not.toBe("");
    }
  });
});
