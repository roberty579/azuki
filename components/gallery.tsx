import Image from "next/image";
import { site } from "@/content/site";

/**
 * Recent completed work, built as a fixed responsive grid rather than a carousel.
 *
 * @implements HOME-9
 *
 * Sources are SVG placeholders today; next/image serves .svg unoptimized
 * automatically, so no images config is needed. Swapping in real photos is an
 * edit to content/site.ts.
 */
export default function Gallery() {
  return (
    <section aria-labelledby="recent-work" className="flex flex-col gap-6">
      <h2
        id="recent-work"
        className="text-sm font-semibold uppercase tracking-widest text-ink-muted"
      >
        Recent work
      </h2>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {site.gallery.map((item) => (
          <li key={item.src}>
            <figure className="flex flex-col gap-2">
              <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                <Image
                  src={item.src}
                  alt={item.alt}
                  width={800}
                  height={800}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                  className="h-full w-full object-cover"
                />
              </div>
              <figcaption className="text-sm text-ink-muted">
                {item.title}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
