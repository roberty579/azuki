import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/money";
import type { Product } from "@/lib/product";

/**
 * One tile in the browsing grid.
 *
 * @implements SHOP-1, SHOP-2 — the whole tile is the link into the detail page.
 */
export default function ProductCard({ product }: { product: Product }) {
  const soldOut = product.stock < 1;

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group flex h-full flex-col gap-3 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface">
        <Image
          src={product.image}
          alt={product.alt}
          width={800}
          height={800}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {soldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-ink px-3 py-1 text-xs font-semibold uppercase tracking-wide text-background">
            Sold out
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-base font-medium text-ink group-hover:text-accent">
          {product.name}
        </h2>
        <p className="text-sm text-ink-muted">{product.summary}</p>
        <p className="text-sm font-semibold text-ink">
          {formatPrice(product.priceCents)}
        </p>
      </div>
    </Link>
  );
}
