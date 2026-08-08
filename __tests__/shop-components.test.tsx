import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddToCart from "@/components/shop/add-to-cart";
import CartLink from "@/components/shop/cart-link";
import CartView from "@/components/shop/cart-view";
import OrderForm from "@/components/shop/order-form";
import ProductCard from "@/components/shop/product-card";
import { addLine, clearLines } from "@/components/shop/cart-store";
import { CatalogueProvider } from "@/components/shop/catalogue";
import { formatPrice } from "@/lib/money";
import { products } from "@/content/shop";
import { submitOrder } from "@/lib/actions/orders";

/**
 * The Server Action is mocked, for two reasons. It reaches a database, which
 * jsdom has no business talking to — and it imports `server-only`, which throws
 * outside a React Server context by design.
 *
 * The split that leaves is the right one: these tests own what the *form* does
 * — which fields it shows, what it sends, what it renders back, what it keeps
 * when the server says no. What the action itself does with that payload is
 * tested against a real database in integration/.
 */
vi.mock("@/lib/actions/orders", () => ({
  submitOrder: vi.fn(async () => ({
    ok: false as const,
    error: "not configured in this test",
  })),
}));

/**
 * Every cart component resolves slugs through the catalogue the server passes
 * down, so tests have to supply it. The content module is the right source:
 * it is exactly what `npm run db:seed` loads into Postgres.
 */
function renderShop(ui: React.ReactElement) {
  return render(<CatalogueProvider products={products}>{ui}</CatalogueProvider>);
}

/** addLine with the stock cap the calling component would have supplied. */
function add(slug: string, quantity: number) {
  addLine(slug, quantity, products.find((product) => product.slug === slug)!.stock);
}

const inStock = products.find((product) => product.stock > 2)!;
const soldOut = products.find((product) => product.stock === 0)!;

beforeEach(() => {
  window.localStorage.clear();
  clearLines();
  vi.mocked(submitOrder).mockClear();
});

describe("ProductCard", () => {
  test("[SHOP-1] shows name, price, and image", () => {
    renderShop(<ProductCard product={inStock} />);

    expect(screen.getByRole("heading", { name: inStock.name })).toBeInTheDocument();
    expect(
      screen.getByText(formatPrice(inStock.priceCents)),
    ).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(inStock.alt);
  });

  test("[SHOP-2] the whole tile links to the item", () => {
    renderShop(<ProductCard product={inStock} />);

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      `/shop/${inStock.slug}`,
    );
  });

  test("[SHOP-1] a sold-out item is marked", () => {
    renderShop(<ProductCard product={soldOut} />);

    expect(screen.getByText(/sold out/i)).toBeInTheDocument();
  });
});

describe("AddToCart", () => {
  test("[SHOP-4] adds the chosen quantity", async () => {
    const user = userEvent.setup();
    renderShop(<AddToCart product={inStock} />);

    // fireEvent, not type(): this is a controlled number input, and clearing it
    // snaps the value back to 1, so typing "2" would leave "12".
    fireEvent.change(screen.getByLabelText(/quantity/i), {
      target: { value: "2" },
    });
    await user.click(screen.getByRole("button", { name: /add to cart/i }));

    expect(screen.getByText(/added/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view cart/i }),
    ).toHaveAttribute("href", "/shop/cart");
  });

  test("[SHOP-10] a sold-out item offers no add control", () => {
    renderShop(<AddToCart product={soldOut} />);

    expect(screen.queryByRole("button", { name: /add to cart/i })).toBeNull();
    expect(screen.getByText(/sold out/i)).toBeInTheDocument();
  });

  test("[SHOP-10] the button disables once all stock is in the cart", async () => {
    const user = userEvent.setup();
    renderShop(<AddToCart product={inStock} />);

    fireEvent.change(screen.getByLabelText(/quantity/i), {
      target: { value: String(inStock.stock) },
    });
    await user.click(screen.getByRole("button", { name: /add to cart/i }));

    expect(screen.getByRole("button", { name: /add to cart/i })).toBeDisabled();
    expect(
      screen.getByText(new RegExp(`all ${inStock.stock} in stock`, "i")),
    ).toBeInTheDocument();
  });
});

describe("CartLink", () => {
  test("[SHOP-7] links to the cart", () => {
    renderShop(<CartLink />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/shop/cart");
  });

  test("[SHOP-7] shows no count while the cart is empty", () => {
    renderShop(<CartLink />);

    expect(screen.queryByText(/in cart/i)).toBeNull();
    expect(screen.getByRole("link")).toHaveTextContent(/^Cart$/);
  });

  test("[SHOP-7] counts total units, not lines", () => {
    const second = products.find(
      (product) => product.stock > 0 && product.slug !== inStock.slug,
    )!;
    add(inStock.slug, 2);
    add(second.slug, 1);

    renderShop(<CartLink />);

    expect(screen.getByLabelText("3 items in cart")).toHaveTextContent("3");
  });

  test("[SHOP-7] labels a single item in the singular", () => {
    add(inStock.slug, 1);
    renderShop(<CartLink />);

    expect(screen.getByLabelText("1 item in cart")).toBeInTheDocument();
  });
});

describe("CartView", () => {
  test("[SHOP-5] an empty cart says so and offers a way back", () => {
    renderShop(<CartView />);

    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /browse the shop/i }),
    ).toHaveAttribute("href", "/shop");
  });

  test("[SHOP-5] shows a row per item with its line total", () => {
    add(inStock.slug, 2);
    renderShop(<CartView />);

    const row = screen.getByRole("listitem");
    expect(within(row).getByRole("link", { name: inStock.name })).toBeInTheDocument();
    expect(
      within(row).getByText(formatPrice(inStock.priceCents * 2)),
    ).toBeInTheDocument();
  });

  test("[SHOP-12] the subtotal equals the sum of the line totals", () => {
    const second = products.find(
      (product) => product.stock > 0 && product.slug !== inStock.slug,
    )!;
    add(inStock.slug, 2);
    add(second.slug, 1);

    renderShop(<CartView />);

    const expected = inStock.priceCents * 2 + second.priceCents;
    expect(screen.getByText(formatPrice(expected))).toBeInTheDocument();
  });

  test("[SHOP-5] removing the last item shows the empty state", async () => {
    const user = userEvent.setup();
    add(inStock.slug, 1);
    renderShop(<CartView />);

    await user.click(screen.getByRole("button", { name: /remove/i }));

    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });
});

describe("OrderForm", () => {
  /** Fills everything except the fulfilment-specific and payment fields. */
  async function fillContact(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/first name/i), "Ada");
    await user.type(screen.getByLabelText(/last name/i), "Lovelace");
    await user.type(screen.getByLabelText(/^email$/i), "ada@example.com");
  }

  test("[SHOP-9] cash is offered for pick-up but not for shipping", async () => {
    const user = userEvent.setup();
    add(inStock.slug, 1);
    renderShop(<OrderForm />);

    // Shipping is the default.
    expect(screen.queryByRole("radio", { name: /cash/i })).toBeNull();

    await user.click(screen.getByRole("radio", { name: /local pick-up/i }));

    expect(screen.getByRole("radio", { name: /cash/i })).toBeInTheDocument();
  });

  test("[SHOP-8] fulfilment shows an address or a drop-off list, never both", async () => {
    const user = userEvent.setup();
    add(inStock.slug, 1);
    renderShop(<OrderForm />);

    expect(screen.getByLabelText(/shipping address/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/drop-off spot/i)).toBeNull();

    await user.click(screen.getByRole("radio", { name: /local pick-up/i }));

    expect(screen.getByLabelText(/drop-off spot/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/shipping address/i)).toBeNull();
  });

  test("[SHOP-9] switching to shipping clears a cash selection", async () => {
    const user = userEvent.setup();
    add(inStock.slug, 1);
    renderShop(<OrderForm />);

    await user.click(screen.getByRole("radio", { name: /local pick-up/i }));
    await user.click(screen.getByRole("radio", { name: /cash/i }));
    expect(screen.getByRole("radio", { name: /cash/i })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: /ship it to me/i }));
    await fillContact(user);
    await user.type(screen.getByLabelText(/shipping address/i), "1 Main St");
    await user.click(screen.getByRole("button", { name: /review order/i }));

    // The cash choice must not survive as a hidden value and submit silently.
    expect(screen.getByRole("alert")).toHaveTextContent(/how you would like to pay/i);
  });

  test("[SHOP-13] an incomplete form does not submit and marks what is missing", async () => {
    const user = userEvent.setup();
    add(inStock.slug, 1);
    renderShop(<OrderForm />);

    await user.click(screen.getByRole("button", { name: /review order/i }));

    const errors = screen.getAllByRole("alert");
    expect(errors.length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText(/order request ready/i)).toBeNull();
  });

  test("[SHOP-13] a valid form submits slugs and quantities, never prices", async () => {
    const user = userEvent.setup();
    add(inStock.slug, 2);
    renderShop(<OrderForm />);

    await fillContact(user);
    await user.type(screen.getByLabelText(/shipping address/i), "1 Main St");
    await user.click(screen.getByRole("radio", { name: /zelle/i }));
    await user.click(screen.getByRole("button", { name: /review order/i }));

    expect(submitOrder).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(submitOrder).mock.calls[0][0] as Record<string, unknown>;

    expect(payload).toMatchObject({
      items: [{ slug: inStock.slug, quantity: 2 }],
      buyer: { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" },
      fulfilment: "shipping",
      shippingAddress: "1 Main St",
      paymentMethod: "zelle",
    });

    // docs/backend.md §3: prices are outputs. Nothing resembling money may
    // leave the browser, or an order could claim a price it was not charged.
    expect(JSON.stringify(payload).toLowerCase()).not.toMatch(
      /cents|price|total|subtotal/,
    );
  });

  test("[SHOP-13] the summary shows the server's numbers and empties the cart", async () => {
    const user = userEvent.setup();
    add(inStock.slug, 2);

    // Deliberately not the catalogue price: the confirmation must render what
    // the server computed, not what the browser had on screen.
    vi.mocked(submitOrder).mockResolvedValueOnce({
      ok: true,
      order: {
        id: "11111111-2222-3333-4444-555555555555",
        lines: [
          {
            slug: inStock.slug,
            name: inStock.name,
            quantity: 2,
            unitPriceCents: 1234,
            lineTotalCents: 2468,
          },
        ],
        subtotalCents: 2468,
        totalCents: 2468,
        fulfilment: "shipping",
        paymentMethod: "zelle",
        replayed: false,
      },
    });

    renderShop(<OrderForm />);
    await fillContact(user);
    await user.type(screen.getByLabelText(/shipping address/i), "1 Main St");
    await user.click(screen.getByRole("radio", { name: /zelle/i }));
    await user.click(screen.getByRole("button", { name: /review order/i }));

    expect(await screen.findByText(/order request ready/i)).toBeInTheDocument();
    // Twice: once as the line total, once as the order total.
    expect(screen.getAllByText(formatPrice(2468))).toHaveLength(2);
    expect(
      screen.getByText("11111111-2222-3333-4444-555555555555"),
    ).toBeInTheDocument();
    // The catalogue price must not appear anywhere in the confirmation.
    expect(
      screen.queryByText(formatPrice(inStock.priceCents * 2)),
    ).toBeNull();

    expect(
      JSON.parse(window.localStorage.getItem("azuki.cart.v1") ?? "[]"),
    ).toEqual([]);
  });

  test("[SHOP-13] a rejected order keeps the cart and shows why", async () => {
    const user = userEvent.setup();
    add(inStock.slug, 1);

    vi.mocked(submitOrder).mockResolvedValueOnce({
      ok: false,
      error: "Bunny plushie only has 0 left. Please adjust your cart.",
    });

    renderShop(<OrderForm />);
    await fillContact(user);
    await user.type(screen.getByLabelText(/shipping address/i), "1 Main St");
    await user.click(screen.getByRole("radio", { name: /zelle/i }));
    await user.click(screen.getByRole("button", { name: /review order/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/only has 0 left/i);
    expect(screen.queryByText(/order request ready/i)).toBeNull();

    // Losing the cart on a server-side rejection would be the worst possible
    // moment to lose it.
    expect(
      JSON.parse(window.localStorage.getItem("azuki.cart.v1") ?? "[]"),
    ).toHaveLength(1);
  });

  test("[SHOP-13] every attempt carries the same idempotency key", async () => {
    const user = userEvent.setup();
    add(inStock.slug, 1);

    vi.mocked(submitOrder).mockResolvedValue({
      ok: false,
      error: "Something went wrong saving your order. Please try again.",
    });

    renderShop(<OrderForm />);
    await fillContact(user);
    await user.type(screen.getByLabelText(/shipping address/i), "1 Main St");
    await user.click(screen.getByRole("radio", { name: /zelle/i }));

    await user.click(screen.getByRole("button", { name: /review order/i }));
    await user.click(screen.getByRole("button", { name: /review order/i }));

    const keys = vi
      .mocked(submitOrder)
      .mock.calls.map(
        (call) => (call[0] as { idempotencyKey: string }).idempotencyKey,
      );

    // A fresh key per click would turn a retry into a second real order.
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(1);
  });
});
