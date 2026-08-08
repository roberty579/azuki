import Link from "next/link";
import Gallery from "@/components/gallery";
import SocialLinks from "@/components/social-links";
import { site } from "@/content/site";

/**
 * @implements HOME-10 — full-width main region; padding grows with the breakpoint.
 */
export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="flex w-full flex-col gap-16 px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
        <section className="flex flex-col gap-6">
          {/* @implements HOME-5 — tagline, then the business name as the only h1. */}
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            {site.tagline}
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            {site.name}
          </h1>
          {/* @implements HOME-6 — width capped at ~70 characters per line; see the spec. */}
          <p className="max-w-2xl text-lg leading-8 text-ink-muted">
            {site.about}
          </p>
          {/* @implements HOME-7 — booking ranked above the shop. */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/schedule"
              className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-6 text-base font-medium text-on-accent transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Book a consultation
            </Link>
            <Link
              href="/shop"
              className="inline-flex h-12 items-center justify-center rounded-full border border-border px-6 text-base font-medium text-ink transition-colors hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Browse the shop
            </Link>
          </div>
        </section>

        <Gallery />

        <SocialLinks />
      </main>
    </div>
  );
}
