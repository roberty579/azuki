import type { Metadata } from "next";
import PieceCard from "@/components/portfolio/piece-card";
import { itemsByCategory } from "@/content/portfolio";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Past work — clothes and plushies made to order by hand.",
};

/**
 * @implements PORT-1 — the gallery of past work.
 * @implements PORT-2 — grouped by category, and only categories with items.
 */
export default function PortfolioPage() {
  const groups = itemsByCategory();

  return (
    <main className="flex w-full flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight text-ink">
          Portfolio
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-ink-muted">
          A few pieces made for past clients. Nothing here is for sale as-is —
          if something catches your eye,{" "}
          <a
            href="/commission"
            className="font-medium text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            request a commission
          </a>{" "}
          and we&apos;ll make one for you.
        </p>
      </div>

      {groups.map((group) => (
        <section
          key={group.id}
          aria-labelledby={`category-${group.id}`}
          className="flex flex-col gap-5"
        >
          <h2
            id={`category-${group.id}`}
            className="text-sm font-semibold uppercase tracking-widest text-ink-muted"
          >
            {group.label}
          </h2>

          <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {group.items.map((item) => (
              <li key={item.slug} className="flex">
                <PieceCard item={item} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
