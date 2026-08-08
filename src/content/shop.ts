/**
 * The shop catalogue — the seed source.
 *
 * @implements SHOP-11
 *
 * This is the file a human edits to change what the shop sells. It is no longer
 * what the pages read: `npm run db:seed` loads it into Postgres, and the pages
 * read from there via src/db/products.ts. That split is why
 * __tests__/shop-content.test.ts still earns its place — it guards the input to
 * the seed, which is exactly where a malformed price or a colliding slug would
 * be introduced.
 *
 * Everything here is PLACEHOLDER content, same contract as content/site.ts:
 * swapping in real products stays a one-file edit followed by a re-seed.
 *
 * Prices are integer cents. Money is never a float — 0.1 + 0.2 does not equal
 * 0.3, and a shop that rounds wrongly on a subtotal loses trust fast.
 */

import type { Product } from "@/lib/product";

export type { Product };

export const products: readonly Product[] = [
  {
    slug: "bunny-plush",
    name: "[Placeholder] Bunny plushie",
    summary: "Hand-crocheted bunny, about 10 inches tall.",
    description:
      "[Placeholder description] A soft hand-crocheted bunny worked in the round, " +
      "with embroidered features and a weighted base so it sits up on its own. " +
      "Made to order in the colour of your choice.",
    priceCents: 4800,
    image: "/shop/bunny-plush.svg",
    alt: "Placeholder for a crocheted bunny plushie sitting upright",
    stock: 4,
    details: [
      "Approx. 10in / 25cm tall",
      "Cotton yarn, polyester fill",
      "Surface wash only",
    ],
  },
  {
    slug: "cardigan",
    name: "[Placeholder] Cropped cardigan",
    summary: "Open-front cardigan in a soft cotton blend.",
    description:
      "[Placeholder description] A cropped open-front cardigan with balloon sleeves, " +
      "worked panel by panel and seamed by hand. Sizing is made to measure — " +
      "book a consultation if you would like a fit outside the standard range.",
    priceCents: 14500,
    image: "/shop/cardigan.svg",
    alt: "Placeholder for a crocheted cropped cardigan",
    stock: 2,
    details: [
      "Made to measure",
      "Cotton-blend yarn",
      "Hand wash cold, dry flat",
    ],
  },
  {
    slug: "tote-bag",
    name: "[Placeholder] Market tote",
    summary: "Sturdy everyday tote with a lined base.",
    description:
      "[Placeholder description] A market tote worked in a tight single crochet so it " +
      "holds its shape under weight, with a fabric-lined base and reinforced handles.",
    priceCents: 6200,
    image: "/shop/tote-bag.svg",
    alt: "Placeholder for a crocheted market tote bag with round handles",
    stock: 6,
    details: ["Approx. 14in x 13in", "Lined base", "Reinforced handles"],
  },
  {
    slug: "beanie",
    name: "[Placeholder] Ribbed beanie",
    summary: "Warm ribbed beanie with a folded brim.",
    description:
      "[Placeholder description] A ribbed beanie with a folded brim, worked in a " +
      "chunky merino. Stretches to fit most adult head sizes.",
    priceCents: 3800,
    image: "/shop/beanie.svg",
    alt: "Placeholder for a crocheted ribbed beanie with a folded brim",
    stock: 0,
    details: ["One size, stretches to fit", "Merino wool", "Hand wash cold"],
  },
  {
    slug: "coasters",
    name: "[Placeholder] Flower coasters",
    summary: "Set of four flower coasters.",
    description:
      "[Placeholder description] A set of four flower-motif coasters in cotton, " +
      "stiffened so they lie flat. Sold as a set; colours can be mixed on request.",
    priceCents: 2400,
    image: "/shop/coasters.svg",
    alt: "Placeholder for a set of four crocheted flower coasters",
    stock: 12,
    details: ["Set of 4", "100% cotton", "Machine washable"],
  },
  {
    slug: "baby-blanket",
    name: "[Placeholder] Baby blanket",
    summary: "Soft granny-square blanket for a crib.",
    description:
      "[Placeholder description] A granny-square baby blanket in a hypoallergenic " +
      "cotton, edged with a simple border. Sized for a crib or pram.",
    priceCents: 11000,
    image: "/shop/baby-blanket.svg",
    alt: "Placeholder for a crocheted granny-square baby blanket",
    stock: 3,
    details: ["Approx. 30in x 40in", "Hypoallergenic cotton", "Machine washable"],
  },
];

/** @implements SHOP-3 — resolves a URL segment to a product, or undefined. */
export function findProduct(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}
