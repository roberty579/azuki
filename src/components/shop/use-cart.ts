"use client";

import { useMemo, useSyncExternalStore } from "react";
import { findProduct, type Product } from "@/content/shop";
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
 * React's view of the cart store.
 *
 * @implements SHOP-5, SHOP-6
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
  const ready = useHydrated();

  return useMemo(() => {
    const resolved = lines.flatMap<ResolvedLine>((line) => {
      const product = findProduct(line.slug);
      if (!product) return [];
      return [
        {
          product,
          quantity: line.quantity,
          lineTotalCents: product.priceCents * line.quantity,
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
      add: addLine,
      setQuantity: setLineQuantity,
      remove: removeLine,
      clear: clearLines,
    };
  }, [lines, ready]);
}
