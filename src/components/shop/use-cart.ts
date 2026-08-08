"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useProductLookup } from "./catalogue";
import type { Product } from "@/lib/product";
import {
  addLine,
  clearLines,
  getServerSnapshot,
  getSnapshot,
  removeLine,
  setLineQuantity,
  subscribe,
} from "./cart-store";

/**
 * React's view of the cart store, resolved against the catalogue.
 *
 * @implements SHOP-5, SHOP-6
 *
 * The store persists slugs and quantities; this is where they become products.
 * It is also where a stored cart is reconciled with reality — an item since
 * removed from the catalogue is dropped, and a quantity above stock is clamped,
 * on every read rather than only at write time. That means a cart stored a week
 * ago is correct as soon as it is displayed, without needing to know what
 * changed in between.
 */

export type ResolvedLine = {
  product: Product;
  quantity: number;
  lineTotalCents: number;
};

/** Never changes, so components subscribing only to hydration never re-render. */
const noopSubscribe = () => () => {};

/**
 * True once React has hydrated. Server-rendered markup cannot know the cart, so
 * components use this to avoid claiming "your cart is empty" before they know.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function useCart() {
  const lines = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const lookup = useProductLookup();
  const ready = useHydrated();

  /** Stock caps come from the catalogue, so callers do not have to carry them. */
  const add = useCallback(
    (slug: string, quantity = 1) =>
      addLine(slug, quantity, lookup(slug)?.stock ?? 0),
    [lookup],
  );

  const setQuantity = useCallback(
    (slug: string, quantity: number) =>
      setLineQuantity(slug, quantity, lookup(slug)?.stock ?? 0),
    [lookup],
  );

  return useMemo(() => {
    const resolved = lines.flatMap<ResolvedLine>((line) => {
      const product = lookup(line.slug);
      // Gone from the catalogue, or sold out since it was added.
      if (!product || product.stock < 1) return [];

      const quantity = Math.min(line.quantity, product.stock);
      return [
        {
          product,
          quantity,
          lineTotalCents: product.priceCents * quantity,
        },
      ];
    });

    return {
      lines: resolved,
      /** Total units — the number on the cart badge. */
      count: resolved.reduce((total, line) => total + line.quantity, 0),
      subtotalCents: resolved.reduce(
        (total, line) => total + line.lineTotalCents,
        0,
      ),
      ready,
      add,
      setQuantity,
      remove: removeLine,
      clear: clearLines,
    };
  }, [lines, lookup, ready, add, setQuantity]);
}
