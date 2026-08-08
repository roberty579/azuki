import type { Metadata } from "next";
import CartView from "@/components/shop/cart-view";
import OrderForm from "@/components/shop/order-form";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review your order and send a request.",
};

/**
 * @implements SHOP-5, SHOP-13 — review the cart, then send the order request.
 */
export default function CartPage() {
  return (
    <main className="flex w-full flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <h1 className="text-4xl font-semibold tracking-tight text-ink">Cart</h1>

      <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <CartView />
        <OrderForm />
      </div>
    </main>
  );
}
