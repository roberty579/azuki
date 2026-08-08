/**
 * The Build a Bunny option catalogue.
 *
 * @implements BUNNY-9
 *
 * Everything here is PLACEHOLDER content, same contract as content/shop.ts:
 * swapping in real colours, prices, and photography is a one-file edit, and
 * tests import this module rather than hardcoding an option or a price.
 *
 * Marking differs slightly from the shop. There, every product name carries a
 * "[Placeholder]" prefix. Six colour swatches all prefixed the same way would
 * be unreadable, so the bases and add-ons — the entries that carry prices — are
 * marked individually, and `placeholderNotice` below covers the palette. The
 * page renders that notice, so nothing here is ever presented as final.
 *
 * Prices are integer cents. See src/lib/money.ts (BUNNY-7).
 */

export type BaseId = "naked" | "outfitted";

export type BunnyBase = {
  id: BaseId;
  label: string;
  /** One line explaining what this base includes. */
  description: string;
  /** Price in whole cents, e.g. 3500 for $35.00. */
  priceCents: number;
  /**
   * Whether this base comes wearing something. Drives BUNNY-3: the outfit
   * colour question only exists when there is an outfit to colour.
   */
  hasOutfit: boolean;
};

export type ColorOption = {
  /** Unique within its palette. Lowercase, hyphenated. */
  id: string;
  label: string;
  /**
   * Swatch fill, for decoration only. The label carries the meaning — BUNNY-2
   * requires the choice to work without colour vision.
   */
  swatch: string;
};

export type AddOn = {
  id: string;
  label: string;
  description: string;
  priceCents: number;
};

/** @implements BUNNY-1 — naked or pre-outfitted, and naked costs less. */
export const bases: readonly BunnyBase[] = [
  {
    id: "naked",
    label: "[Placeholder] Naked bunny",
    description: "Just the bunny, no clothes. The simplest version, and the least expensive.",
    priceCents: 3500,
    hasOutfit: false,
  },
  {
    id: "outfitted",
    label: "[Placeholder] Bunny in overalls",
    description: "The bunny comes wearing its standard outfit: a pair of overalls.",
    priceCents: 4800,
    hasOutfit: true,
  },
];

/** @implements BUNNY-2 — the palette for the bunny itself. */
export const bunnyColors: readonly ColorOption[] = [
  { id: "cream", label: "Cream", swatch: "#f0e4d8" },
  { id: "blush", label: "Blush pink", swatch: "#e8bfc4" },
  { id: "sage", label: "Sage green", swatch: "#b6c4ab" },
  { id: "sky", label: "Sky blue", swatch: "#b3c8d8" },
  { id: "cocoa", label: "Cocoa brown", swatch: "#a9836b" },
  { id: "charcoal", label: "Charcoal grey", swatch: "#6f6a67" },
];

/** @implements BUNNY-3 — the palette for the outfit, used only by an outfitted base. */
export const outfitColors: readonly ColorOption[] = [
  { id: "denim", label: "Denim blue", swatch: "#6c86a8" },
  { id: "mustard", label: "Mustard", swatch: "#d3a54a" },
  { id: "rose", label: "Dusty rose", swatch: "#c88f95" },
  { id: "forest", label: "Forest green", swatch: "#5f7a5c" },
];

/** @implements BUNNY-4 — optional extras, each priced on top of the base. */
export const addOns: readonly AddOn[] = [
  {
    id: "sweater",
    label: "[Placeholder] Knit sweater",
    description: "A second outfit, worked in a chunkier yarn.",
    priceCents: 1500,
  },
  {
    id: "scarf",
    label: "[Placeholder] Striped scarf",
    description: "A long scarf in two colours of your choosing.",
    priceCents: 800,
  },
  {
    id: "hat",
    label: "[Placeholder] Tiny hat",
    description: "A small brimmed hat, sized to sit between the ears.",
    priceCents: 900,
  },
  {
    id: "bow",
    label: "[Placeholder] Ribbon bow",
    description: "A satin bow at the neck or on one ear.",
    priceCents: 500,
  },
  {
    id: "keyring",
    label: "[Placeholder] Key ring loop",
    description: "A reinforced loop and clip, so the bunny can hang from a bag.",
    priceCents: 300,
  },
];

/**
 * @implements BUNNY-8 — the sample photo, and the credit that goes beside it.
 *
 * `designer` is null when the pattern is the maker's own. When it is set, the
 * page must render the name as visible text.
 */
export const sample = {
  image: "/bunny/sample.svg",
  alt: "Placeholder for a crocheted bunny wearing overalls, sitting upright",
  designer: {
    name: "[Placeholder] Pattern designer",
    href: null as string | null,
  },
} as const;

/**
 * Rendered on the page so the placeholder catalogue is never mistaken for a
 * real price list. Delete this line when the real options land.
 */
export const placeholderNotice =
  "[Placeholder] Colours, options, and prices below are examples while the shop is being set up.";

export function findBase(id: string): BunnyBase | undefined {
  return bases.find((base) => base.id === id);
}

export function findBunnyColor(id: string): ColorOption | undefined {
  return bunnyColors.find((color) => color.id === id);
}

export function findOutfitColor(id: string): ColorOption | undefined {
  return outfitColors.find((color) => color.id === id);
}

export function findAddOn(id: string): AddOn | undefined {
  return addOns.find((addOn) => addOn.id === id);
}
