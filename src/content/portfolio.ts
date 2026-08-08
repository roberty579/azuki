/**
 * The portfolio catalogue.
 *
 * @implements PORT-7
 *
 * Everything here is PLACEHOLDER content, same contract as content/shop.ts:
 * swapping in real photography and copy is a one-file edit, and tests import
 * this module rather than hardcoding titles or yarn details.
 *
 * Deliberately a typed module and not a database table. This is read-only
 * content that never changes per request, so `/portfolio` prerenders — see
 * docs/backend.md §6. The portfolio_items and portfolio_images tables exist for
 * whenever admin management arrives.
 *
 * Note there are no prices here, and no stock. A portfolio piece is past work,
 * not something to buy; the route onward is a commission (PORT-6).
 */

/**
 * @implements PORT-2 — Clothes and Plushies are the launch categories. The rest
 *   are planned: valid values with no items yet, so launching one is a data
 *   change rather than a code change.
 */
export const categories = [
  { id: "clothing", label: "Clothes", launched: true },
  { id: "plushie", label: "Plushies", launched: true },
  { id: "crochet", label: "Crochet", launched: false },
  { id: "engineering", label: "Engineering", launched: false },
  { id: "jewelry", label: "Jewelry", launched: false },
] as const;

export type CategoryId = (typeof categories)[number]["id"];

export type PortfolioItem = {
  /** URL segment under /portfolio. Lowercase, hyphenated, unique. */
  slug: string;
  title: string;
  category: CategoryId;
  /** Shown on the detail page. */
  description: string;
  /** Path under /public. No query strings — Next 16 would need images.localPatterns.search. */
  image: string;
  /** Descriptive alt text. Never empty; these images carry the page. */
  alt: string;
  yarnType: string;
  yarnColor: string;
  /**
   * The designer of the original pattern, when it is not the maker's own.
   *
   * @implements PORT-5 — null means the design is the maker's own, and the page
   *   renders no credit at all rather than an empty label.
   */
  designer: string | null;
};

export const portfolioItems: readonly PortfolioItem[] = [
  {
    slug: "striped-cardigan",
    title: "[Placeholder] Striped cardigan",
    category: "clothing",
    description:
      "[Placeholder description] A cropped cardigan worked panel by panel and seamed by hand, " +
      "with balloon sleeves and a ribbed hem. Made to measure for the client.",
    image: "/portfolio/striped-cardigan.svg",
    alt: "Placeholder for a striped crocheted cardigan",
    yarnType: "Cotton blend, DK weight",
    yarnColor: "Cream and dusty rose",
    designer: null,
  },
  {
    slug: "garden-bunny",
    title: "[Placeholder] Garden bunny",
    category: "plushie",
    description:
      "[Placeholder description] A bunny worked in the round with embroidered features and a " +
      "weighted base, wearing a set of overalls with working straps.",
    image: "/portfolio/garden-bunny.svg",
    alt: "Placeholder for a crocheted bunny wearing overalls",
    yarnType: "Cotton, sport weight",
    yarnColor: "Sage green and denim",
    designer: "[Placeholder] Pattern designer",
  },
  {
    slug: "market-tote",
    title: "[Placeholder] Market tote",
    category: "clothing",
    description:
      "[Placeholder description] A tote worked in tight single crochet so it holds its shape " +
      "under weight, with a fabric-lined base and reinforced handles.",
    image: "/portfolio/market-tote.svg",
    alt: "Placeholder for a crocheted market tote bag",
    yarnType: "Cotton, worsted weight",
    yarnColor: "Natural",
    designer: null,
  },
  {
    slug: "sleepy-bear",
    title: "[Placeholder] Sleepy bear",
    category: "plushie",
    description:
      "[Placeholder description] A small bear with jointed arms and a hand-stitched face, " +
      "sized to sit in a cupped hand.",
    image: "/portfolio/sleepy-bear.svg",
    alt: "Placeholder for a small crocheted bear",
    yarnType: "Merino wool, fingering weight",
    yarnColor: "Cocoa",
    designer: "[Placeholder] Pattern designer",
  },
  {
    slug: "winter-scarf",
    title: "[Placeholder] Winter scarf",
    category: "clothing",
    description:
      "[Placeholder description] A long ribbed scarf with fringed ends, worked in a chunky " +
      "merino that blocks out to nearly two metres.",
    image: "/portfolio/winter-scarf.svg",
    alt: "Placeholder for a chunky crocheted scarf with fringe",
    yarnType: "Merino wool, chunky weight",
    yarnColor: "Charcoal",
    designer: null,
  },
];

/** @implements PORT-4 — resolves a URL segment to a piece, or undefined. */
export function findPortfolioItem(slug: string): PortfolioItem | undefined {
  return portfolioItems.find((item) => item.slug === slug);
}

/**
 * @implements PORT-2 — categories in declared order, each with its items, and
 *   only those that actually have something to show.
 */
export function itemsByCategory(): {
  id: CategoryId;
  label: string;
  items: PortfolioItem[];
}[] {
  return categories
    .map((category) => ({
      id: category.id,
      label: category.label,
      items: portfolioItems.filter((item) => item.category === category.id),
    }))
    .filter((group) => group.items.length > 0);
}
