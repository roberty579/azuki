/**
 * The shape of a product as the shop UI consumes it.
 *
 * Lives here rather than in content/shop.ts because it now has two producers:
 * the content module, which is the seed source a human edits, and src/db/
 * products.ts, which is what the pages actually read at runtime. One definition
 * means the two cannot drift.
 *
 * Prices are integer cents (SHOP-12). The database stores NUMERIC(10,2); the
 * conversion happens in the data-access layer, so nothing above it ever sees a
 * decimal string.
 */
export type Product = {
  /** URL segment under /shop. Lowercase, hyphenated, unique. */
  slug: string;
  name: string;
  /** One-line summary shown on the grid card. */
  summary: string;
  /** Full description shown on the detail page. */
  description: string;
  /** Price in whole cents, e.g. 4200 for $42.00. */
  priceCents: number;
  /** Path under /public. No query strings — Next 16 would need images.localPatterns.search. */
  image: string;
  /** Descriptive alt text. Never empty; these images carry meaning. */
  alt: string;
  /**
   * Units available to order. 0 means sold out: the item still lists and its
   * page still resolves, but it cannot be added to the cart.
   */
  stock: number;
  /** Shown on the detail page so buyers know what they are getting. */
  details: readonly string[];
};
