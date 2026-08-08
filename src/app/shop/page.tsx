import type { Metadata } from "next";
import ProductCard from "@/components/shop/product-card";
import { products } from "@/content/shop";

export const metadata: Metadata = {
  title: "Shop",
  description: "Ready-made crochet pieces available to order.",
};

/**
 * @implements SHOP-1 — gallery-style browsing grid of everything for sale.
 */
export default function ShopPage() {
  return (
    <main className="flex w-full flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight text-ink">Shop</h1>
        <p className="max-w-2xl text-lg leading-8 text-ink-muted">
          Ready-made pieces, each worked by hand. Looking for something that
          isn&apos;t here?{" "}
          <a
            href="/commission"
            className="font-medium text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Request a commission
          </a>
          .
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <li key={product.slug} className="flex">
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </main>
  );
}
