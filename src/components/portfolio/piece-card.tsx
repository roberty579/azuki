import Image from "next/image";
import Link from "next/link";
import type { PortfolioItem } from "@/content/portfolio";

/**
 * One tile in the portfolio gallery.
 *
 * @implements PORT-1, PORT-3 — the whole tile is the link into the detail page.
 *
 * Close to ProductCard but deliberately separate: this one has no price and no
 * sold-out state, and sharing a component would mean threading "is this for
 * sale?" through both. The two pages answer different questions.
 */
export default function PieceCard({ item }: { item: PortfolioItem }) {
  return (
    <Link
      href={`/portfolio/${item.slug}`}
      className="group flex h-full flex-col gap-3 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <Image
          src={item.image}
          alt={item.alt}
          width={800}
          height={800}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>

      <h3 className="text-base font-medium text-ink group-hover:text-accent">
        {item.title}
      </h3>
    </Link>
  );
}
