"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "./use-cart";
import { formatPrice } from "@/lib/money";

/**
 * The cart's line items: quantity control, removal, and the subtotal.
 *
 * @implements SHOP-5
 */
export default function CartView() {
  const { lines, subtotalCents, setQuantity, remove, ready } = useCart();

  // Before localStorage has been read there is nothing truthful to show, and
  // rendering "empty" first would flash for anyone who has a cart.
  if (!ready) {
    return <p className="text-base text-ink-muted">Loading your cart…</p>;
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-lg text-ink-muted">Your cart is empty.</p>
        <Link
          href="/shop"
          className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-6 text-base font-medium text-on-accent transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Browse the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-4">
        {lines.map(({ product, quantity, lineTotalCents }) => (
          <li
            key={product.slug}
            className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface p-4"
          >
            <Image
              src={product.image}
              alt={product.alt}
              width={96}
              height={96}
              className="h-20 w-20 shrink-0 rounded-xl object-cover"
            />

            <div className="flex min-w-48 flex-1 flex-col gap-1">
              <Link
                href={`/shop/${product.slug}`}
                className="text-base font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {product.name}
              </Link>
              <p className="text-sm text-ink-muted">
                {formatPrice(product.priceCents)} each
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label
                htmlFor={`quantity-${product.slug}`}
                className="text-xs font-semibold uppercase tracking-widest text-ink-muted"
              >
                Qty
              </label>
              <input
                id={`quantity-${product.slug}`}
                type="number"
                min={1}
                max={product.stock}
                value={quantity}
                onChange={(event) =>
                  setQuantity(
                    product.slug,
                    Number.parseInt(event.target.value, 10) || 0,
                  )
                }
                className="h-11 w-20 rounded-full border border-border bg-background px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
            </div>

            <p className="w-24 text-right text-base font-semibold text-ink">
              {formatPrice(lineTotalCents)}
            </p>

            <button
              type="button"
              onClick={() => remove(product.slug)}
              aria-label={`Remove ${product.name} from cart`}
              className="rounded-full px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-accent-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
          Subtotal
        </span>
        <span className="text-2xl font-semibold text-ink">
          {formatPrice(subtotalCents)}
        </span>
      </div>
    </div>
  );
}
