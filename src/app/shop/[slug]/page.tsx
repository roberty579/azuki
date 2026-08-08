import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCart from "@/components/shop/add-to-cart";
import { getProduct } from "@/db/products";
import { formatPrice } from "@/lib/money";

type PageParams = { params: Promise<{ slug: string }> };

/**
 * No generateStaticParams and no dynamicParams: the catalogue is no longer a
 * fixed list known at build time, and prerendering stock would show sold-out
 * items as available. An unknown slug still 404s — now because getProduct
 * returns nothing and notFound() runs, rather than because the route was never
 * generated. Same status code, same test.
 *
 * A useful side effect: nothing here prerenders, so `next build` does not need
 * a reachable database.
 */
export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  // Next 16: params is a Promise and must be awaited.
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};

  return { title: product.name, description: product.summary };
}

/**
 * @implements SHOP-2, SHOP-3 — the detail view behind each grid tile.
 */
export default async function ProductPage({ params }: PageParams) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  return (
    <main className="flex w-full flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <nav aria-label="Breadcrumb">
        <Link
          href="/shop"
          className="text-sm font-medium text-ink-muted underline underline-offset-4 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          ← Back to shop
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <Image
            src={product.image}
            alt={product.alt}
            width={800}
            height={800}
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {product.name}
            </h1>
            <p className="text-2xl font-semibold text-ink">
              {formatPrice(product.priceCents)}
            </p>
            <p className="max-w-prose text-lg leading-8 text-ink-muted">
              {product.description}
            </p>
          </div>

          <AddToCart product={product} />

          <div className="flex flex-col gap-2 border-t border-border pt-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
              Details
            </h2>
            <ul className="flex flex-col gap-1 text-base text-ink-muted">
              {product.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
