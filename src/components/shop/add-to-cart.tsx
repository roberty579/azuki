"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "./use-cart";
import type { Product } from "@/lib/product";

/**
 * Quantity picker plus the add button on a product page.
 *
 * @implements SHOP-4 — an item can be added to the cart from its detail page.
 * @implements SHOP-10 — a sold-out item cannot be added, and the cart can never
 *   hold more units than there is stock.
 */
export default function AddToCart({ product }: { product: Product }) {
  const { add, lines } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const inCart =
    lines.find((line) => line.product.slug === product.slug)?.quantity ?? 0;
  const remaining = Math.max(product.stock - inCart, 0);
  const soldOut = product.stock < 1;

  if (soldOut) {
    return (
      <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink-muted">
        Sold out.{" "}
        <Link
          href="/commission"
          className="font-medium text-accent underline underline-offset-4"
        >
          Request one as a commission
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="quantity"
            className="text-xs font-semibold uppercase tracking-widest text-ink-muted"
          >
            Quantity
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            max={Math.max(remaining, 1)}
            value={quantity}
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              setQuantity(Number.isNaN(next) ? 1 : Math.max(1, next));
              setAdded(false);
            }}
            className="h-12 w-24 rounded-full border border-border bg-surface px-4 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </div>

        <button
          type="button"
          disabled={remaining < 1}
          onClick={() => {
            add(product.slug, quantity);
            setAdded(true);
          }}
          className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-6 text-base font-medium text-on-accent transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add to cart
        </button>
      </div>

      {/* aria-live so the confirmation is announced, not just shown. */}
      <p aria-live="polite" className="text-sm text-ink-muted">
        {remaining < 1 ? (
          <>All {product.stock} in stock are already in your cart.</>
        ) : added ? (
          <>
            Added.{" "}
            <Link
              href="/shop/cart"
              className="font-medium text-accent underline underline-offset-4"
            >
              View cart
            </Link>
          </>
        ) : (
          <>{remaining} available</>
        )}
      </p>
    </div>
  );
}
