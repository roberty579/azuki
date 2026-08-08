/**
 * Build a Bunny: configuration rules and pricing.
 *
 * Pure functions over the catalogue in content/bunny.ts. No React, no storage,
 * no side effects — which is what lets the rules below be unit-tested directly
 * rather than only through the UI, and what lets a server re-run them unchanged
 * once one exists (docs/backend.md §3).
 */

import {
  addOns,
  bases,
  bunnyColors,
  findAddOn,
  findBase,
  findBunnyColor,
  findOutfitColor,
  outfitColors,
  type BaseId,
} from "@/content/bunny";

/**
 * A configured bunny, as ids only.
 *
 * @implements BUNNY-11 — this is also the shape that leaves the page. There is
 *   deliberately no price field anywhere in it: prices are outputs, derived
 *   from these ids and the catalogue.
 */
export type BunnyConfiguration = {
  baseId: BaseId;
  bunnyColorId: string;
  /** Null for a naked bunny, which has no outfit to colour (BUNNY-3). */
  outfitColorId: string | null;
  addOnIds: readonly string[];
};

/** One row of the itemised total. */
export type PriceLine = {
  id: string;
  label: string;
  amountCents: number;
};

/**
 * @implements BUNNY-1 — the page opens on a valid, fully-selected configuration
 *   rather than on an empty form the customer has to complete before seeing a
 *   price.
 */
export function defaultConfiguration(): BunnyConfiguration {
  return normaliseConfiguration({
    baseId: bases[0].id,
    bunnyColorId: bunnyColors[0].id,
    outfitColorId: null,
    addOnIds: [],
  });
}

/**
 * Forces a configuration to be internally consistent, whatever it was built
 * from.
 *
 * @implements BUNNY-3 — a naked bunny never carries an outfit colour, and an
 *   outfitted one always has a valid colour. Enforced here rather than only in
 *   the UI so the rule survives a manipulated form, a stale link, or a future
 *   server call.
 *
 * Unknown ids are dropped rather than rejected: an option removed from the
 * catalogue should quietly disappear from a configuration, not break the page.
 */
export function normaliseConfiguration(
  config: BunnyConfiguration,
): BunnyConfiguration {
  const base = findBase(config.baseId) ?? bases[0];
  const bunnyColor = findBunnyColor(config.bunnyColorId) ?? bunnyColors[0];

  let outfitColorId: string | null = null;
  if (base.hasOutfit) {
    const chosen =
      config.outfitColorId === null
        ? undefined
        : findOutfitColor(config.outfitColorId);
    outfitColorId = (chosen ?? outfitColors[0]).id;
  }

  // Filtered through the catalogue rather than the input, so the order of the
  // lines on screen is the catalogue's order and duplicates cannot survive.
  const chosen = new Set(config.addOnIds);
  const addOnIds = addOns
    .filter((addOn) => chosen.has(addOn.id))
    .map((addOn) => addOn.id);

  return { baseId: base.id, bunnyColorId: bunnyColor.id, outfitColorId, addOnIds };
}

/**
 * @implements BUNNY-6 — the total broken into the choices that make it up.
 * @implements BUNNY-7 — every amount is whole cents.
 *
 * Colours do not appear: they change what the bunny looks like, not what it
 * costs. Adding a colour surcharge later means adding a line here.
 */
export function priceLines(config: BunnyConfiguration): PriceLine[] {
  const normalised = normaliseConfiguration(config);
  const base = findBase(normalised.baseId) ?? bases[0];

  const lines: PriceLine[] = [
    { id: "base", label: base.label, amountCents: base.priceCents },
  ];

  for (const id of normalised.addOnIds) {
    const addOn = findAddOn(id);
    if (addOn) {
      lines.push({ id: addOn.id, label: addOn.label, amountCents: addOn.priceCents });
    }
  }

  return lines;
}

/**
 * @implements BUNNY-5 — the running total, recomputed from the configuration on
 *   every change rather than accumulated, so it cannot drift out of step with
 *   what is selected.
 */
export function totalCents(config: BunnyConfiguration): number {
  return priceLines(config).reduce((sum, line) => sum + line.amountCents, 0);
}

/** One row of the human-readable summary. */
export type SummaryRow = { label: string; value: string };

/**
 * @implements BUNNY-10 — names every choice made, including the ones left
 *   empty, so the summary is unambiguous about what was and was not asked for.
 */
export function describeConfiguration(config: BunnyConfiguration): SummaryRow[] {
  const normalised = normaliseConfiguration(config);
  const base = findBase(normalised.baseId) ?? bases[0];
  const bunnyColor = findBunnyColor(normalised.bunnyColorId) ?? bunnyColors[0];

  const rows: SummaryRow[] = [
    { label: "Base", value: base.label },
    { label: "Bunny colour", value: bunnyColor.label },
  ];

  if (normalised.outfitColorId !== null) {
    const outfitColor = findOutfitColor(normalised.outfitColorId);
    if (outfitColor) {
      rows.push({ label: "Outfit colour", value: outfitColor.label });
    }
  }

  const chosenAddOns = normalised.addOnIds
    .map((id) => findAddOn(id)?.label)
    .filter((label): label is string => Boolean(label));

  rows.push({
    label: "Add-ons",
    value: chosenAddOns.length > 0 ? chosenAddOns.join(", ") : "None",
  });

  return rows;
}

/**
 * @implements BUNNY-11 — what leaves the page: option ids and nothing else.
 *
 * The estimated total is recomputed from these ids, so it is never something
 * the recipient has to trust. Keep this returning exactly `BunnyConfiguration`
 * — the moment a price is added here, the estimate becomes a claim rather than
 * a derivation.
 */
export function requestPayload(config: BunnyConfiguration): BunnyConfiguration {
  return normaliseConfiguration(config);
}
