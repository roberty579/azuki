import type { Metadata } from "next";
import Image from "next/image";
import BunnyBuilder from "@/components/bunny/bunny-builder";
import { placeholderNotice, sample } from "@/content/bunny";

export const metadata: Metadata = {
  title: "Build a Bunny",
  description:
    "Choose a bunny, pick its colours, add accessories, and see the estimate as you go.",
};

/**
 * @implements BUNNY-8 — the sample photo and its designer credit.
 *
 * A Server Component: only the configurator below needs state, so only it is a
 * Client Component. The photo, the copy, and the credit stay server-rendered.
 */
export default function BuildABunnyPage() {
  return (
    <main className="flex w-full flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-semibold tracking-tight text-ink">
            Build a Bunny
          </h1>
          <p className="max-w-prose text-lg leading-8 text-ink-muted">
            Pick a bunny, choose its colours, and add whatever you&apos;d like it
            to wear. The estimate updates as you go, and nothing is charged until
            we&apos;ve talked through the details together.
          </p>
          <p className="max-w-prose text-sm text-ink-muted">
            {placeholderNotice}
          </p>
        </div>

        <figure className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <Image
              src={sample.image}
              alt={sample.alt}
              width={800}
              height={800}
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
              className="h-full w-full object-cover"
            />
          </div>
          {/*
            BUNNY-8: the credit is visible text next to the photo, not a tooltip
            and not lettering inside the image, so it survives alt text, dark
            mode, and a reader that never sees the picture.
          */}
          {sample.designer && (
            <figcaption className="text-sm text-ink-muted">
              Pattern by {sample.designer.name}
            </figcaption>
          )}
        </figure>
      </div>

      <BunnyBuilder />
    </main>
  );
}
