import { beforeEach, describe, expect, test } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddToCart from "@/components/shop/add-to-cart";
import CartLink from "@/components/shop/cart-link";
import CartView from "@/components/shop/cart-view";
import OrderForm from "@/components/shop/order-form";
import ProductCard from "@/components/shop/product-card";
import { addLine, clearLines } from "@/components/shop/cart-store";
import { formatPrice } from "@/lib/money";
import { products } from "@/content/shop";
import { site } from "@/content/site";

const inStock = products.find((product) => product.stock > 2)!;
const soldOut = products.find((product) => product.stock === 0)!;

beforeEach(() => {
  window.localStorage.clear();
  clearLines();
});

describe("ProductCard", () => {
  test("[SHOP-1] shows name, price, and image", () => {
    render(<ProductCard product={inStock} />);

    expect(screen.getByRole("heading", { name: inStock.name })).toBeInTheDocument();
    expect(
      screen.getByText(formatPrice(inStock.priceCents)),
    ).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(inStock.alt);
  });

  test("[SHOP-2] the whole tile links to the item", () => {
    render(<ProductCard product={inStock} />);

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      `/shop/${inStock.slug}`,
    );
  });

  test("[SHOP-1] a sold-out item is marked", () => {
    render(<ProductCard product={soldOut} />);

    expect(screen.getByText(/sold out/i)).toBeInTheDocument();
  });
});

describe("AddToCart", () => {
  test("[SHOP-4] adds the chosen quantity", async () => {
    const user = userEvent.setup();
    render(<AddToCart product={inStock} />);

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
    render(<AddToCart product={soldOut} />);

    expect(screen.queryByRole("button", { name: /add to cart/i })).toBeNull();
    expect(screen.getByText(/sold out/i)).toBeInTheDocument();
  });

  test("[SHOP-10] the button disables once all stock is in the cart", async () => {
    const user = userEvent.setup();
    render(<AddToCart product={inStock} />);

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
    render(<CartLink />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/shop/cart");
  });

  test("[SHOP-7] shows no count while the cart is empty", () => {
    render(<CartLink />);

    expect(screen.queryByText(/in cart/i)).toBeNull();
    expect(screen.getByRole("link")).toHaveTextContent(/^Cart$/);
  });

  test("[SHOP-7] counts total units, not lines", () => {
    const second = products.find(
      (product) => product.stock > 0 && product.slug !== inStock.slug,
    )!;
    addLine(inStock.slug, 2);
    addLine(second.slug, 1);

    render(<CartLink />);

    expect(screen.getByLabelText("3 items in cart")).toHaveTextContent("3");
  });

  test("[SHOP-7] labels a single item in the singular", () => {
    addLine(inStock.slug, 1);
    render(<CartLink />);

    expect(screen.getByLabelText("1 item in cart")).toBeInTheDocument();
  });
});

describe("CartView", () => {
  test("[SHOP-5] an empty cart says so and offers a way back", () => {
    render(<CartView />);

    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /browse the shop/i }),
    ).toHaveAttribute("href", "/shop");
  });

  test("[SHOP-5] shows a row per item with its line total", () => {
    addLine(inStock.slug, 2);
    render(<CartView />);

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
    addLine(inStock.slug, 2);
    addLine(second.slug, 1);

    render(<CartView />);

    const expected = inStock.priceCents * 2 + second.priceCents;
    expect(screen.getByText(formatPrice(expected))).toBeInTheDocument();
  });

  test("[SHOP-5] removing the last item shows the empty state", async () => {
    const user = userEvent.setup();
    addLine(inStock.slug, 1);
    render(<CartView />);

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
    addLine(inStock.slug, 1);
    render(<OrderForm />);

    // Shipping is the default.
    expect(screen.queryByRole("radio", { name: /cash/i })).toBeNull();

    await user.click(screen.getByRole("radio", { name: /local pick-up/i }));

    expect(screen.getByRole("radio", { name: /cash/i })).toBeInTheDocument();
  });

  test("[SHOP-8] fulfilment shows an address or a drop-off list, never both", async () => {
    const user = userEvent.setup();
    addLine(inStock.slug, 1);
    render(<OrderForm />);

    expect(screen.getByLabelText(/shipping address/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/drop-off spot/i)).toBeNull();

    await user.click(screen.getByRole("radio", { name: /local pick-up/i }));

    expect(screen.getByLabelText(/drop-off spot/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/shipping address/i)).toBeNull();
  });

  test("[SHOP-9] switching to shipping clears a cash selection", async () => {
    const user = userEvent.setup();
    addLine(inStock.slug, 1);
    render(<OrderForm />);

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
    addLine(inStock.slug, 1);
    render(<OrderForm />);

    await user.click(screen.getByRole("button", { name: /review order/i }));

    const errors = screen.getAllByRole("alert");
    expect(errors.length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText(/order request ready/i)).toBeNull();
  });

  test("[SHOP-13] a valid form produces the summary and empties the cart", async () => {
    const user = userEvent.setup();
    addLine(inStock.slug, 2);
    render(<OrderForm />);

    await fillContact(user);
    await user.type(screen.getByLabelText(/shipping address/i), "1 Main St");
    await user.click(screen.getByRole("radio", { name: /zelle/i }));
    await user.click(screen.getByRole("button", { name: /review order/i }));

    expect(screen.getByText(/order request ready/i)).toBeInTheDocument();

    const summary = screen.getByText(/order request from ada lovelace/i);
    expect(summary).toHaveTextContent(inStock.name);
    expect(summary).toHaveTextContent(formatPrice(inStock.priceCents * 2));
    expect(summary).toHaveTextContent("1 Main St");

    // Hands off to email, since there is no server yet.
    expect(
      screen.getByRole("link", { name: new RegExp(site.email, "i") }),
    ).toHaveAttribute("href", expect.stringContaining(`mailto:${site.email}`));

    expect(
      JSON.parse(window.localStorage.getItem("azuki.cart.v1") ?? "[]"),
    ).toEqual([]);
  });
});
