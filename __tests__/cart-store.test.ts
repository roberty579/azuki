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
import { products } from "@/content/shop";

const inStock = products.find((product) => product.stock > 1)!;
const soldOut = products.find((product) => product.stock === 0)!;

beforeEach(() => {
  window.localStorage.clear();
  clearLines();
});

describe("cart store", () => {
  test("[SHOP-4] adding puts an item in the cart", () => {
    addLine(inStock.slug, 2);

    expect(getSnapshot()).toEqual([{ slug: inStock.slug, quantity: 2 }]);
  });

  test("[SHOP-4] adding the same item again increases its quantity", () => {
    addLine(inStock.slug, 1);
    addLine(inStock.slug, 1);

    // One line, not two — a duplicated row would let the same item be priced twice.
    expect(getSnapshot()).toEqual([{ slug: inStock.slug, quantity: 2 }]);
  });

  test("[SHOP-10] a sold-out item cannot be added", () => {
    addLine(soldOut.slug, 1);

    expect(getSnapshot()).toEqual([]);
  });

  test("[SHOP-10] quantity is capped at available stock", () => {
    addLine(inStock.slug, inStock.stock + 5);

    expect(getSnapshot()[0].quantity).toBe(inStock.stock);
  });

  test("[SHOP-5] quantity can be changed", () => {
    addLine(inStock.slug, 1);
    setLineQuantity(inStock.slug, 2);

    expect(getSnapshot()[0].quantity).toBe(2);
  });

  test("[SHOP-5] dropping below one removes the line", () => {
    addLine(inStock.slug, 2);
    setLineQuantity(inStock.slug, 0);

    expect(getSnapshot()).toEqual([]);
  });

  test("[SHOP-5] an item can be removed outright", () => {
    addLine(inStock.slug, 2);
    removeLine(inStock.slug);

    expect(getSnapshot()).toEqual([]);
  });

  test("[SHOP-6] the cart is written to storage", () => {
    addLine(inStock.slug, 2);

    const stored = JSON.parse(window.localStorage.getItem("azuki.cart.v1")!);
    expect(stored).toEqual([{ slug: inStock.slug, quantity: 2 }]);
  });

  test("[SHOP-6] the server renders an empty cart", () => {
    addLine(inStock.slug, 2);

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

  test("[SHOP-6] an item no longer in the catalogue is dropped", () => {
    reload(JSON.stringify([{ slug: "deleted-product", quantity: 2 }]));

    expect(getSnapshot()).toEqual([]);
  });

  test("[SHOP-6] a quantity above stock is clamped", () => {
    reload(JSON.stringify([{ slug: inStock.slug, quantity: 999 }]));

    expect(getSnapshot()).toEqual([
      { slug: inStock.slug, quantity: inStock.stock },
    ]);
  });

  test("[SHOP-6] an item that has since sold out is dropped", () => {
    reload(JSON.stringify([{ slug: soldOut.slug, quantity: 1 }]));

    expect(getSnapshot()).toEqual([]);
  });

  test("[SHOP-6] malformed JSON yields an empty cart rather than throwing", () => {
    reload("{not json");

    expect(getSnapshot()).toEqual([]);
  });

  test("[SHOP-6] entries of the wrong shape are discarded", () => {
    reload(JSON.stringify([null, 42, { slug: 7 }, { quantity: 1 }]));

    expect(getSnapshot()).toEqual([]);
  });
});
