"use client";

import { useState } from "react";
import PriceEstimate from "./price-estimate";
import RequestSummary from "./request-summary";
import { formatPrice } from "@/lib/money";
import {
  addOns,
  bases,
  bunnyColors,
  findBase,
  outfitColors,
  type ColorOption,
} from "@/content/bunny";
import {
  defaultConfiguration,
  normaliseConfiguration,
  type BunnyConfiguration,
} from "@/lib/bunny";

/**
 * The configurator.
 *
 * @implements BUNNY-1 — base choice, opening on a valid default.
 * @implements BUNNY-2 — bunny colour.
 * @implements BUNNY-3 — outfit colour, present only for an outfitted base.
 * @implements BUNNY-4 — optional add-ons.
 * @implements BUNNY-10 — submitting produces the request without clearing the
 *   configuration.
 *
 * Every state change goes through `normaliseConfiguration`, so the rules live
 * in one tested place rather than being re-implemented per control. That is
 * what makes "switch to naked" drop the outfit colour without an effect
 * watching for it.
 */
export default function BunnyBuilder() {
  const [config, setConfig] = useState<BunnyConfiguration>(
    defaultConfiguration,
  );
  const [sent, setSent] = useState(false);

  function update(changes: Partial<BunnyConfiguration>) {
    setConfig((current) => normaliseConfiguration({ ...current, ...changes }));
    // The summary reflects a configuration, so changing one invalidates it.
    setSent(false);
  }

  function toggleAddOn(id: string) {
    const chosen = new Set(config.addOnIds);
    if (chosen.has(id)) {
      chosen.delete(id);
    } else {
      chosen.add(id);
    }
    update({ addOnIds: [...chosen] });
  }

  const base = findBase(config.baseId) ?? bases[0];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSent(true);
        }}
        className="flex flex-col gap-8"
      >
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
            Base
          </legend>
          {bases.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer gap-3 rounded-xl border border-border bg-surface p-4"
            >
              <input
                type="radio"
                name="base"
                value={option.id}
                checked={config.baseId === option.id}
                onChange={() => update({ baseId: option.id })}
                className="mt-1 h-4 w-4 shrink-0 accent-accent"
              />
              <span className="flex flex-col gap-1">
                <span className="flex flex-wrap items-baseline gap-2 text-base font-medium text-ink">
                  {option.label}
                  <span className="tabular-nums text-ink-muted">
                    {formatPrice(option.priceCents)}
                  </span>
                </span>
                <span className="text-sm text-ink-muted">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <ColorGroup
          name="bunny-color"
          legend="Bunny colour"
          options={bunnyColors}
          selected={config.bunnyColorId}
          onChange={(id) => update({ bunnyColorId: id })}
        />

        {/*
          BUNNY-3: rendered only for a base that has an outfit. Removed from the
          DOM rather than disabled — there is nothing to colour, so an inert
          control would be a question with no answer.
        */}
        {base.hasOutfit && config.outfitColorId !== null && (
          <ColorGroup
            name="outfit-color"
            legend="Outfit colour"
            options={outfitColors}
            selected={config.outfitColorId}
            onChange={(id) => update({ outfitColorId: id })}
          />
        )}

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
            Add-ons
          </legend>
          {addOns.map((addOn) => (
            <label
              key={addOn.id}
              className="flex cursor-pointer gap-3 rounded-xl border border-border bg-surface p-4"
            >
              <input
                type="checkbox"
                name="add-on"
                value={addOn.id}
                checked={config.addOnIds.includes(addOn.id)}
                onChange={() => toggleAddOn(addOn.id)}
                className="mt-1 h-4 w-4 shrink-0 accent-accent"
              />
              <span className="flex flex-col gap-1">
                <span className="flex flex-wrap items-baseline gap-2 text-base font-medium text-ink">
                  {addOn.label}
                  <span className="tabular-nums text-ink-muted">
                    +{formatPrice(addOn.priceCents)}
                  </span>
                </span>
                <span className="text-sm text-ink-muted">
                  {addOn.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <button
          type="submit"
          className="inline-flex h-12 w-fit items-center justify-center rounded-full bg-accent px-6 text-base font-medium text-on-accent transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Review request
        </button>
      </form>

      <div className="flex flex-col gap-6 lg:sticky lg:top-6">
        <PriceEstimate config={config} />
        {/* BUNNY-10: shown alongside the form, which stays as it was. */}
        {sent && <RequestSummary config={config} />}
      </div>
    </div>
  );
}

/** @implements BUNNY-2 — a named swatch list; the label carries the meaning. */
function ColorGroup({
  name,
  legend,
  options,
  selected,
  onChange,
}: {
  name: string;
  legend: string;
  options: readonly ColorOption[];
  selected: string;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.id}
            /*
              `relative` matters: the radio below is an absolutely positioned
              transparent overlay, and without a positioned ancestor it escapes
              the chip entirely — off-screen for a pointer, and unclickable.

              The radio is also the reason for has-[:focus-visible]: it is
              invisible, so the focus ring has to be drawn by the chip or
              keyboard users lose their place.
            */
            className={`relative flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
              selected === option.id
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-surface text-ink-muted"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={selected === option.id}
              onChange={() => onChange(option.id)}
              /*
                Transparent rather than sr-only, and stretched over the whole
                chip: the swatch and the label sit on top of a real radio, so a
                tap anywhere on the chip hits the control itself. Opacity keeps
                it in the accessibility tree, unlike display:none.
              */
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <span
              aria-hidden="true"
              style={{ backgroundColor: option.swatch }}
              className="h-4 w-4 rounded-full border border-border"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
