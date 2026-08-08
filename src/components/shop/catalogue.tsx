"use client";

import { createContext, useContext, useMemo } from "react";
import type { Product } from "@/lib/product";

/**
 * The catalogue, handed from the server to the cart.
 *
 * The cart stores `{ slug, quantity }` and nothing else (SHOP-6), so something
 * has to turn a slug into a name and a price. That used to be a direct import of
 * the content module, which worked only while the catalogue was a file the
 * browser could also read. Once products live in Postgres the browser cannot
 * look them up, so the server passes them down instead.
 *
 * This is a context and not another external store on purpose: the value is
 * server-rendered props that never change during a page's life. There is no
 * state here and no effect — the cart itself stays the external store it was
 * (cart-store.ts), which is what keeps it consistent across tabs.
 */

const CatalogueContext = createContext<readonly Product[] | null>(null);

export function CatalogueProvider({
  products,
  children,
}: {
  products: readonly Product[];
  children: React.ReactNode;
}) {
  return (
    <CatalogueContext value={products}>{children}</CatalogueContext>
  );
}

export function useCatalogue(): readonly Product[] {
  const products = useContext(CatalogueContext);
  if (products === null) {
    throw new Error(
      "useCatalogue must be used inside a CatalogueProvider — the shop layout provides it.",
    );
  }
  return products;
}

/** Slug lookup, memoised so resolving a cart is not quadratic in catalogue size. */
export function useProductLookup(): (slug: string) => Product | undefined {
  const products = useCatalogue();

  return useMemo(() => {
    const bySlug = new Map(products.map((product) => [product.slug, product]));
    return (slug: string) => bySlug.get(slug);
  }, [products]);
}
