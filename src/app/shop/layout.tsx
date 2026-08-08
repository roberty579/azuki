import Link from "next/link";
import CartLink from "@/components/shop/cart-link";
import { CatalogueProvider } from "@/components/shop/catalogue";
import { listProducts } from "@/db/products";

/**
 * Shop-wide bar holding the cart link, and the catalogue every cart component
 * resolves against.
 *
 * @implements SHOP-7
 *
 * The cart itself is still an external store (see cart-store.ts) that every
 * component subscribes to directly, so it survives navigation between the grid,
 * a product page, and checkout without a React boundary. What the provider
 * carries is the *catalogue*, not the cart: the browser can no longer look a
 * slug up for itself now that products live in Postgres, so the server passes
 * them down once, here, for the whole shop.
 */
/**
 * Applies to every route under /shop, including the grid and item pages.
 *
 * Without it Next would try to prerender them at build time, which means
 * `next build` would need a reachable database — and would bake stock levels
 * into the output, advertising sold-out items as available until the next
 * deploy. Revalidation on write is the optimisation to revisit once the write
 * path is proven; correctness first.
 */
export const dynamic = "force-dynamic";

export default async function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const products = await listProducts();

  return (
    <CatalogueProvider products={products}>
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
    </CatalogueProvider>
  );
}
