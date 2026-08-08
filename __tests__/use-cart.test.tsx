import { beforeEach, describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { CatalogueProvider } from "@/components/shop/catalogue";
import { addLine, clearLines } from "@/components/shop/cart-store";
import { useCart } from "@/components/shop/use-cart";
import type { Product } from "@/lib/product";

/**
 * Reconciling a stored cart with the catalogue.
 *
 * This behaviour used to live in cart-store.ts, which imported the catalogue
 * directly. That stopped being possible when products moved to Postgres — the
 * browser cannot query it — so the catalogue now arrives as server-rendered
 * props and resolution happens on read, here.
 *
 * Reading rather than writing matters: a cart stored last week is corrected the
 * moment it is displayed, without needing to know what changed in between.
 */

function product(overrides: Partial<Product> = {}): Product {
  return {
    slug: "bunny",
    name: "Bunny",
    summary: "A bunny.",
    description: "A bunny, at length.",
    priceCents: 1000,
    image: "/bunny.svg",
    alt: "A bunny",
    stock: 5,
    details: [],
    ...overrides,
  };
}

/** Renders the resolved cart as text, which is all these assertions need. */
function Probe() {
  const { lines, count, subtotalCents } = useCart();

  return (
    <div>
      <span data-testid="count">{count}</span>
      <span data-testid="subtotal">{subtotalCents}</span>
      <ul>
        {lines.map((line) => (
          <li key={line.product.slug} data-testid="line">
            {line.product.slug}:{line.quantity}:{line.lineTotalCents}
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderCart(catalogue: Product[]) {
  return render(
    <CatalogueProvider products={catalogue}>
      <Probe />
    </CatalogueProvider>,
  );
}

function lines(): string[] {
  return screen.queryAllByTestId("line").map((node) => node.textContent!);
}

beforeEach(() => {
  window.localStorage.clear();
  clearLines();
});

describe("resolving the cart against the catalogue", () => {
  test("[SHOP-5] a stored line becomes a priced line", () => {
    addLine("bunny", 3, 5);
    renderCart([product()]);

    expect(lines()).toEqual(["bunny:3:3000"]);
    expect(screen.getByTestId("count")).toHaveTextContent("3");
    expect(screen.getByTestId("subtotal")).toHaveTextContent("3000");
  });

  test("[SHOP-6] an item no longer in the catalogue is dropped", () => {
    addLine("deleted-product", 2, 5);
    renderCart([product()]);

    expect(lines()).toEqual([]);
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  test("[SHOP-6] [SHOP-10] a quantity above current stock is clamped on read", () => {
    // Stored while stock was plentiful; stock has since dropped to 2.
    addLine("bunny", 9, 99);
    renderCart([product({ stock: 2 })]);

    expect(lines()).toEqual(["bunny:2:2000"]);
    expect(screen.getByTestId("subtotal")).toHaveTextContent("2000");
  });

  test("[SHOP-6] an item that has since sold out is dropped", () => {
    addLine("bunny", 1, 5);
    renderCart([product({ stock: 0 })]);

    expect(lines()).toEqual([]);
  });

  test("[SHOP-6] the price shown is the catalogue's, not the one stored", () => {
    // Only slug and quantity are persisted, so a repriced item cannot show a
    // stale price — there is no stale price to show.
    addLine("bunny", 2, 5);
    renderCart([product({ priceCents: 2500 })]);

    expect(lines()).toEqual(["bunny:2:5000"]);
  });

  test("[SHOP-5] the subtotal is the exact sum of its lines", () => {
    addLine("bunny", 2, 5);
    addLine("scarf", 3, 5);
    renderCart([
      product({ slug: "bunny", priceCents: 1999 }),
      product({ slug: "scarf", priceCents: 799 }),
    ]);

    expect(screen.getByTestId("subtotal")).toHaveTextContent(
      String(2 * 1999 + 3 * 799),
    );
  });
});
