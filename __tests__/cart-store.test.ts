import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  addLine,
  clearLines,
  getServerSnapshot,
  getSnapshot,
  removeLine,
  setLineQuantity,
  subscribe,
} from "@/components/shop/cart-store";

/**
 * The store is now catalogue-agnostic: it persists slugs and quantities, and
 * takes stock caps as arguments. Resolving a stored cart against the catalogue
 * — dropping items that no longer exist, clamping to current stock — moved to
 * use-cart.ts once products moved to Postgres, and is tested there.
 *
 * These use bare slugs rather than real products for that reason: the store has
 * no opinion about whether a slug is real.
 */

const SLUG = "a-product";
const OTHER = "another-product";
const STOCK = 4;

beforeEach(() => {
  window.localStorage.clear();
  clearLines();
});

describe("cart store", () => {
  test("[SHOP-4] adding puts an item in the cart", () => {
    addLine(SLUG, 2, STOCK);

    expect(getSnapshot()).toEqual([{ slug: SLUG, quantity: 2 }]);
  });

  test("[SHOP-4] adding the same item again increases its quantity", () => {
    addLine(SLUG, 1, STOCK);
    addLine(SLUG, 1, STOCK);

    // One line, not two — a duplicated row would let the same item be priced twice.
    expect(getSnapshot()).toEqual([{ slug: SLUG, quantity: 2 }]);
  });

  test("[SHOP-10] an item with no stock cannot be added", () => {
    addLine(SLUG, 1, 0);

    expect(getSnapshot()).toEqual([]);
  });

  test("[SHOP-10] quantity is capped at the stock passed in", () => {
    addLine(SLUG, STOCK + 5, STOCK);

    expect(getSnapshot()[0].quantity).toBe(STOCK);
  });

  test("[SHOP-10] accumulating across adds still respects the cap", () => {
    addLine(SLUG, 3, STOCK);
    addLine(SLUG, 3, STOCK);

    expect(getSnapshot()[0].quantity).toBe(STOCK);
  });

  test("[SHOP-5] quantity can be changed", () => {
    addLine(SLUG, 1, STOCK);
    setLineQuantity(SLUG, 2, STOCK);

    expect(getSnapshot()[0].quantity).toBe(2);
  });

  test("[SHOP-5] dropping below one removes the line", () => {
    addLine(SLUG, 2, STOCK);
    setLineQuantity(SLUG, 0, STOCK);

    expect(getSnapshot()).toEqual([]);
  });

  test("[SHOP-5] an item can be removed outright", () => {
    addLine(SLUG, 2, STOCK);
    addLine(OTHER, 1, STOCK);
    removeLine(SLUG);

    expect(getSnapshot()).toEqual([{ slug: OTHER, quantity: 1 }]);
  });

  test("[SHOP-6] the cart is written to storage", () => {
    addLine(SLUG, 2, STOCK);

    const stored = JSON.parse(window.localStorage.getItem("azuki.cart.v1")!);
    expect(stored).toEqual([{ slug: SLUG, quantity: 2 }]);
  });

  test("[SHOP-6] the server renders an empty cart", () => {
    addLine(SLUG, 2, STOCK);

    // Server-side there is no storage; returning anything else would desync
    // the hydrated markup.
    expect(getServerSnapshot()).toEqual([]);
  });
});

describe("cart store — recovering from bad stored data", () => {
  // The store only listens for storage events while something is subscribed,
  // exactly as it does in the browser once a component has mounted.
  let unsubscribe: () => void;
  beforeEach(() => {
    unsubscribe = subscribe(() => {});
  });
  afterEach(() => unsubscribe());

  /** Force a re-read from storage, as another tab or a fresh load would. */
  function reload(raw: string) {
    window.localStorage.setItem("azuki.cart.v1", raw);
    window.dispatchEvent(new StorageEvent("storage", { key: "azuki.cart.v1" }));
  }

  test("[SHOP-6] malformed JSON yields an empty cart rather than throwing", () => {
    reload("{not json");

    expect(getSnapshot()).toEqual([]);
  });

  test("[SHOP-6] entries of the wrong shape are discarded", () => {
    reload(JSON.stringify([null, 42, { slug: 7 }, { quantity: 1 }, { slug: "" }]));

    expect(getSnapshot()).toEqual([]);
  });

  test("[SHOP-6] non-finite and non-positive quantities are discarded", () => {
    reload(
      JSON.stringify([
        { slug: SLUG, quantity: Number.NaN },
        { slug: SLUG, quantity: 0 },
        { slug: SLUG, quantity: -3 },
      ]),
    );

    expect(getSnapshot()).toEqual([]);
  });

  test("[SHOP-6] a fractional quantity is floored, not rejected", () => {
    reload(JSON.stringify([{ slug: SLUG, quantity: 2.7 }]));

    expect(getSnapshot()).toEqual([{ slug: SLUG, quantity: 2 }]);
  });
});
