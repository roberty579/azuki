"use client";

import Link from "next/link";
import { useCart } from "./use-cart";

/**
 * Persistent link to the cart, showing how many units are in it.
 *
 * @implements SHOP-7
 *
 * This lives in the shop's own bar rather than the site header: HOME-2 requires
 * the header to contain exactly the sections in content/navigation.ts, and a
 * cart badge there would contradict it.
 */
export default function CartLink() {
  const { count, ready } = useCart();

  return (
    <Link
      href="/shop/cart"
      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      Cart
      {/* Rendered only once localStorage has been read, so the server-rendered
          markup and the first client render agree. */}
      {ready && count > 0 && (
        <span
          className="inline-flex min-w-6 items-center justify-center rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-on-accent"
          aria-label={`${count} ${count === 1 ? "item" : "items"} in cart`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
