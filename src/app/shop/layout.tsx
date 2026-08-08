import Link from "next/link";
import CartLink from "@/components/shop/cart-link";

/**
 * Shop-wide bar holding the cart link.
 *
 * @implements SHOP-7
 *
 * The cart itself needs no provider: it is an external store (see cart-store.ts)
 * that every component subscribes to directly, so it survives navigation
 * between the grid, a product page, and checkout without a React boundary.
 */
export default function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex w-full items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6 lg:px-10">
        <Link
          href="/shop"
          className="text-sm font-semibold uppercase tracking-widest text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Shop
        </Link>
        <CartLink />
      </div>
      {children}
    </div>
  );
}
