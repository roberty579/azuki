import { describe, expect, test } from "vitest";
import {
  addOns,
  bases,
  bunnyColors,
  findAddOn,
  findBase,
  outfitColors,
  placeholderNotice,
  sample,
  type ColorOption,
} from "@/content/bunny";
import {
  defaultConfiguration,
  describeConfiguration,
  normaliseConfiguration,
  priceLines,
  requestPayload,
  totalCents,
  type BunnyConfiguration,
} from "@/lib/bunny";

/**
 * The catalogue is hand-edited, so these guard the data itself. The pricing
 * block below guards the rules, which is where the interesting failures are —
 * a naked bunny that keeps an outfit colour costs the maker a wrong order.
 */
describe("bunny catalogue", () => {
  test("[BUNNY-9] every group has options with complete copy", () => {
    expect(bases.length).toBe(2);
    expect(bunnyColors.length).toBeGreaterThan(0);
    expect(outfitColors.length).toBeGreaterThan(0);
    expect(addOns.length).toBeGreaterThan(0);

    for (const base of bases) {
      expect(base.label.trim()).not.toBe("");
      expect(base.description.trim().length).toBeGreaterThan(20);
    }
    for (const addOn of addOns) {
      expect(addOn.label.trim()).not.toBe("");
      expect(addOn.description.trim()).not.toBe("");
    }
  });

  test("[BUNNY-9] ids are unique within their group and URL-safe", () => {
    const groups: readonly (readonly { id: string }[])[] = [
      bases,
      bunnyColors,
      outfitColors,
      addOns,
    ];

    for (const group of groups) {
      const ids = group.map((option) => option.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) {
        expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      }
    }
  });

  test("[BUNNY-7] every price is a non-negative whole number of cents", () => {
    for (const priced of [...bases, ...addOns]) {
      expect(Number.isInteger(priced.priceCents)).toBe(true);
      expect(priced.priceCents).toBeGreaterThanOrEqual(0);
    }
  });

  test("[BUNNY-1] exactly one base has an outfit, and it costs more", () => {
    const naked = bases.filter((base) => !base.hasOutfit);
    const outfitted = bases.filter((base) => base.hasOutfit);

    expect(naked.length).toBe(1);
    expect(outfitted.length).toBe(1);
    expect(naked[0].priceCents).toBeLessThan(outfitted[0].priceCents);
  });

  test("[BUNNY-2] every colour is named, not swatch-only", () => {
    const palettes: readonly (readonly ColorOption[])[] = [
      bunnyColors,
      outfitColors,
    ];

    for (const palette of palettes) {
      for (const color of palette) {
        expect(color.label.trim()).not.toBe("");
        expect(color.swatch).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  test("[BUNNY-8] the sample photo is local, described, and credited", () => {
    expect(sample.image.startsWith("/")).toBe(true);
    // A query string would require images.localPatterns.search in Next 16.
    expect(sample.image).not.toContain("?");
    expect(sample.alt.trim()).not.toBe("");
    expect(sample.designer?.name.trim()).not.toBe("");
  });

  test("[BUNNY-9] the placeholder notice is present while the data is fake", () => {
    expect(placeholderNotice.trim()).not.toBe("");
  });

  test("[BUNNY-9] lookups resolve a real id, and only a real one", () => {
    expect(findBase(bases[0].id)).toBe(bases[0]);
    expect(findBase("not-a-base")).toBeUndefined();
    expect(findAddOn(addOns[0].id)).toBe(addOns[0]);
    expect(findAddOn("not-an-add-on")).toBeUndefined();
  });
});

describe("bunny configuration", () => {
  const naked = bases.find((base) => !base.hasOutfit)!;
  const outfitted = bases.find((base) => base.hasOutfit)!;

  function configure(overrides: Partial<BunnyConfiguration> = {}) {
    return normaliseConfiguration({ ...defaultConfiguration(), ...overrides });
  }

  test("[BUNNY-1] the default configuration is complete and valid", () => {
    const config = defaultConfiguration();

    expect(findBase(config.baseId)).toBeDefined();
    expect(bunnyColors.map((color) => color.id)).toContain(config.bunnyColorId);
    expect(config.addOnIds).toEqual([]);
    expect(config).toEqual(normaliseConfiguration(config));
  });

  test("[BUNNY-3] a naked bunny carries no outfit colour, even if one is set", () => {
    const config = configure({
      baseId: naked.id,
      outfitColorId: outfitColors[0].id,
    });

    expect(config.outfitColorId).toBeNull();
  });

  test("[BUNNY-3] an outfitted bunny always ends up with a valid outfit colour", () => {
    expect(configure({ baseId: outfitted.id }).outfitColorId).not.toBeNull();
    expect(
      configure({ baseId: outfitted.id, outfitColorId: "not-a-colour" })
        .outfitColorId,
    ).toBe(outfitColors[0].id);
  });

  test("[BUNNY-3] switching to naked and back restores a valid outfit colour", () => {
    const chosen = outfitColors[1].id;
    const dressed = configure({ baseId: outfitted.id, outfitColorId: chosen });
    const stripped = normaliseConfiguration({ ...dressed, baseId: naked.id });
    const redressed = normaliseConfiguration({
      ...stripped,
      baseId: outfitted.id,
    });

    expect(stripped.outfitColorId).toBeNull();
    expect(redressed.outfitColorId).toBe(outfitColors[0].id);
  });

  test("[BUNNY-9] unknown ids are dropped rather than shown", () => {
    const config = configure({
      baseId: "ghost-bunny" as BunnyConfiguration["baseId"],
      bunnyColorId: "invisible",
      addOnIds: [addOns[0].id, "jetpack"],
    });

    expect(config.baseId).toBe(bases[0].id);
    expect(config.bunnyColorId).toBe(bunnyColors[0].id);
    expect(config.addOnIds).toEqual([addOns[0].id]);
  });

  test("[BUNNY-4] add-ons are deduplicated and follow catalogue order", () => {
    const config = configure({
      addOnIds: [addOns[2].id, addOns[0].id, addOns[2].id],
    });

    expect(config.addOnIds).toEqual([addOns[0].id, addOns[2].id]);
  });
});

describe("bunny pricing", () => {
  const naked = bases.find((base) => !base.hasOutfit)!;
  const outfitted = bases.find((base) => base.hasOutfit)!;

  test("[BUNNY-5] the total is the base plus every selected add-on", () => {
    const config = normaliseConfiguration({
      ...defaultConfiguration(),
      baseId: outfitted.id,
      addOnIds: [addOns[0].id, addOns[1].id],
    });

    expect(totalCents(config)).toBe(
      outfitted.priceCents + addOns[0].priceCents + addOns[1].priceCents,
    );
  });

  test("[BUNNY-5] changing the base changes the total", () => {
    const asNaked = normaliseConfiguration({
      ...defaultConfiguration(),
      baseId: naked.id,
    });
    const asOutfitted = normaliseConfiguration({
      ...asNaked,
      baseId: outfitted.id,
    });

    expect(totalCents(asOutfitted) - totalCents(asNaked)).toBe(
      outfitted.priceCents - naked.priceCents,
    );
  });

  test("[BUNNY-5] adding then removing an add-on returns the original total", () => {
    const before = defaultConfiguration();
    const added = normaliseConfiguration({
      ...before,
      addOnIds: [addOns[3].id],
    });
    const removed = normaliseConfiguration({ ...added, addOnIds: [] });

    expect(totalCents(added)).toBeGreaterThan(totalCents(before));
    expect(totalCents(removed)).toBe(totalCents(before));
  });

  test("[BUNNY-6] the lines are one per choice and sum to the total", () => {
    const config = normaliseConfiguration({
      ...defaultConfiguration(),
      addOnIds: [addOns[0].id, addOns[2].id],
    });
    const lines = priceLines(config);

    expect(lines).toHaveLength(3);
    expect(lines[0].id).toBe("base");
    expect(lines.map((line) => line.id).slice(1)).toEqual([
      addOns[0].id,
      addOns[2].id,
    ]);
    expect(lines.reduce((sum, line) => sum + line.amountCents, 0)).toBe(
      totalCents(config),
    );
  });

  test("[BUNNY-7] every line amount is whole cents", () => {
    const config = normaliseConfiguration({
      ...defaultConfiguration(),
      addOnIds: addOns.map((addOn) => addOn.id),
    });

    for (const line of priceLines(config)) {
      expect(Number.isInteger(line.amountCents)).toBe(true);
    }
    expect(Number.isInteger(totalCents(config))).toBe(true);
  });

  test("[BUNNY-7] colour choices do not change the price", () => {
    const first = normaliseConfiguration({
      ...defaultConfiguration(),
      bunnyColorId: bunnyColors[0].id,
    });
    const second = normaliseConfiguration({
      ...first,
      bunnyColorId: bunnyColors[bunnyColors.length - 1].id,
    });

    expect(totalCents(second)).toBe(totalCents(first));
  });
});

describe("bunny request", () => {
  const outfitted = bases.find((base) => base.hasOutfit)!;

  test("[BUNNY-10] the summary names every choice, including an empty one", () => {
    const config = normaliseConfiguration({
      ...defaultConfiguration(),
      baseId: outfitted.id,
      addOnIds: [],
    });
    const rows = describeConfiguration(config);
    const labels = rows.map((row) => row.label);

    expect(labels).toEqual(["Base", "Bunny colour", "Outfit colour", "Add-ons"]);
    expect(rows.find((row) => row.label === "Add-ons")?.value).toBe("None");
    for (const row of rows) {
      expect(row.value.trim()).not.toBe("");
    }
  });

  test("[BUNNY-10] a naked bunny's summary omits the outfit colour", () => {
    const naked = bases.find((base) => !base.hasOutfit)!;
    const rows = describeConfiguration(
      normaliseConfiguration({ ...defaultConfiguration(), baseId: naked.id }),
    );

    expect(rows.map((row) => row.label)).not.toContain("Outfit colour");
  });

  test("[BUNNY-11] the payload carries ids and no prices", () => {
    const config = normaliseConfiguration({
      ...defaultConfiguration(),
      baseId: outfitted.id,
      addOnIds: [addOns[0].id],
    });
    const payload = requestPayload(config);

    expect(Object.keys(payload).sort()).toEqual([
      "addOnIds",
      "baseId",
      "bunnyColorId",
      "outfitColorId",
    ]);

    // Nothing anywhere in the payload may look like money — a nested price
    // would be just as spoofable as a top-level one.
    const serialised = JSON.stringify(payload);
    expect(serialised.toLowerCase()).not.toMatch(/cents|price|total|subtotal/);
  });

  test("[BUNNY-11] the estimate is re-derivable from the payload alone", () => {
    const config = normaliseConfiguration({
      ...defaultConfiguration(),
      addOnIds: [addOns[1].id, addOns[4].id],
    });
    const payload = requestPayload(config);

    // Round-tripping through JSON is what a server would receive.
    const received: BunnyConfiguration = JSON.parse(JSON.stringify(payload));

    expect(totalCents(received)).toBe(totalCents(config));
  });

  test("[BUNNY-11] a payload sent with an impossible combination is corrected", () => {
    const naked = bases.find((base) => !base.hasOutfit)!;
    const payload = requestPayload({
      baseId: naked.id,
      bunnyColorId: bunnyColors[0].id,
      outfitColorId: outfitColors[0].id,
      addOnIds: [],
    });

    expect(payload.outfitColorId).toBeNull();
  });
});
