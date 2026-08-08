import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  categories,
  findPortfolioItem,
  portfolioItems,
} from "@/content/portfolio";

type PageParams = { params: Promise<{ slug: string }> };

/** Prerenders one page per piece at build time. */
export async function generateStaticParams() {
  return portfolioItems.map((item) => ({ slug: item.slug }));
}

/**
 * The catalogue is a fixed list, so anything not generated above is a genuine
 * 404 rather than something to render on demand. Unlike the shop, nothing here
 * changes per request — there is no stock to go stale — so these stay static.
 */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  // Next 16: params is a Promise and must be awaited.
  const { slug } = await params;
  const item = findPortfolioItem(slug);
  if (!item) return {};

  return { title: item.title, description: item.description };
}

/**
 * @implements PORT-4 — the detail view: photograph, category, description, and
 *   what the piece is made of.
 * @implements PORT-5 — the designer credit, shown only where the pattern is
 *   someone else's.
 * @implements PORT-6 — a way back to the gallery, and on to a commission.
 */
export default async function PortfolioItemPage({ params }: PageParams) {
  const { slug } = await params;
  const item = findPortfolioItem(slug);
  if (!item) notFound();

  const category = categories.find((entry) => entry.id === item.category);

  return (
    <main className="flex w-full flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <nav aria-label="Breadcrumb">
        <Link
          href="/portfolio"
          className="text-sm font-medium text-ink-muted underline underline-offset-4 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          ← Back to portfolio
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <Image
            src={item.image}
            alt={item.alt}
            width={800}
            height={800}
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
              {category?.label}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {item.title}
            </h1>
            <p className="max-w-prose text-lg leading-8 text-ink-muted">
              {item.description}
            </p>
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
              Details
            </h2>
            <dl className="flex flex-col gap-2 text-base">
              <div className="flex flex-wrap gap-2">
                <dt className="text-ink-muted">Yarn type</dt>
                <dd className="text-ink">{item.yarnType}</dd>
              </div>
              <div className="flex flex-wrap gap-2">
                <dt className="text-ink-muted">Colour</dt>
                <dd className="text-ink">{item.yarnColor}</dd>
              </div>
              {/*
                PORT-5: rendered only when the pattern is someone else's. An
                empty label, or "unknown", would imply a missing credit where
                the design is the maker's own.
              */}
              {item.designer && (
                <div className="flex flex-wrap gap-2">
                  <dt className="text-ink-muted">Pattern by</dt>
                  <dd className="text-ink">{item.designer}</dd>
                </div>
              )}
            </dl>
          </div>

          <Link
            href="/commission"
            className="inline-flex h-12 w-fit items-center justify-center rounded-full bg-accent px-6 text-base font-medium text-on-accent transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Request something similar
          </Link>
        </div>
      </div>
    </main>
  );
}
