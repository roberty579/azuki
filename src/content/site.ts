/**
 * Single source of truth for customer-facing copy on the marketing pages.
 *
 * @implements HOME-11
 *
 * Everything here is PLACEHOLDER content. Replacing it with the real business
 * name, blurb, contact address, social accounts, and order photos is a
 * one-file edit — no component changes needed. Tests import this module rather
 * than hardcoding strings, so they keep passing when the copy changes.
 */

export type SocialLink = {
  /** Accessible name for the link, e.g. "Instagram". */
  label: string;
  /** Absolute URL to the profile. */
  href: string;
};

export type GalleryItem = {
  /** Path under /public. Avoid query strings — Next 16 requires images.localPatterns.search for those. */
  src: string;
  /** Descriptive alt text. Never empty; these images carry meaning. */
  alt: string;
  /** Short caption shown under the image. */
  title: string;
};

export type SiteContent = {
  name: string;
  tagline: string;
  about: string;
  email: string;
  socials: readonly SocialLink[];
  gallery: readonly GalleryItem[];
};

export const site: SiteContent = {
  name: "[Business Name]",
  tagline: "Handmade crochet, made to order",
  about:
    "[Placeholder blurb] We make handmade crochet pieces to order — plushies, " +
    "clothes, and one-of-a-kind commissions. Every piece is worked by hand, " +
    "start to finish, with yarn chosen for the project. Book a consultation to " +
    "talk through an idea, or browse ready-made pieces in the shop.",
  email: "hello@example.com",
  socials: [
    { label: "Instagram", href: "https://instagram.com/example" },
    { label: "TikTok", href: "https://tiktok.com/@example" },
    { label: "Etsy", href: "https://example.etsy.com" },
  ],
  gallery: [
    {
      src: "/gallery/piece-01.svg",
      alt: "Placeholder for a completed crochet bunny plushie in overalls",
      title: "Bunny in overalls",
    },
    {
      src: "/gallery/piece-02.svg",
      alt: "Placeholder for a completed crochet cardigan",
      title: "Cropped cardigan",
    },
    {
      src: "/gallery/piece-03.svg",
      alt: "Placeholder for a completed crochet tote bag",
      title: "Market tote",
    },
    {
      src: "/gallery/piece-04.svg",
      alt: "Placeholder for a completed crochet baby blanket",
      title: "Baby blanket",
    },
    {
      src: "/gallery/piece-05.svg",
      alt: "Placeholder for a set of completed crochet flower coasters",
      title: "Flower coasters",
    },
  ],
};
