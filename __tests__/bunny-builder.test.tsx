import { describe, expect, test } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BunnyBuilder from "@/components/bunny/bunny-builder";
import PriceEstimate from "@/components/bunny/price-estimate";
import { addOns, bases, bunnyColors, outfitColors } from "@/content/bunny";
import { defaultConfiguration, normaliseConfiguration } from "@/lib/bunny";
import { formatPrice } from "@/lib/money";

const naked = bases.find((base) => !base.hasOutfit)!;
const outfitted = bases.find((base) => base.hasOutfit)!;

/** The estimate panel's total line, which is the one under aria-live. */
function total(): string {
  return screen.getByText(/estimated total/i).parentElement!.textContent!;
}

/**
 * A base radio, found by its label. Not a RegExp: catalogue labels carry a
 * "[Placeholder]" prefix, which a regex would read as a character class and
 * silently match almost anything.
 */
function baseRadio(label: string): HTMLElement {
  return screen.getByRole("radio", { name: (name) => name.includes(label) });
}

describe("BunnyBuilder", () => {
  test("[BUNNY-1] opens with a base already selected, both priced", () => {
    render(<BunnyBuilder />);

    const group = screen.getByRole("group", { name: /^base$/i });
    const chosen = within(group)
      .getAllByRole("radio")
      .filter((radio) => (radio as HTMLInputElement).checked);

    expect(chosen).toHaveLength(1);
    for (const base of bases) {
      expect(
        within(group).getByText(formatPrice(base.priceCents)),
      ).toBeInTheDocument();
    }
  });

  test("[BUNNY-2] every bunny colour is selectable by name", async () => {
    const user = userEvent.setup();
    render(<BunnyBuilder />);

    const group = screen.getByRole("group", { name: /bunny colour/i });
    expect(within(group).getAllByRole("radio")).toHaveLength(
      bunnyColors.length,
    );

    const target = bunnyColors[2];
    await user.click(within(group).getByRole("radio", { name: target.label }));

    expect(
      within(group).getByRole("radio", { name: target.label }),
    ).toBeChecked();
  });

  test("[BUNNY-3] the outfit colour appears only for the outfitted base", async () => {
    const user = userEvent.setup();
    render(<BunnyBuilder />);

    await user.click(baseRadio(naked.label));
    expect(
      screen.queryByRole("group", { name: /outfit colour/i }),
    ).not.toBeInTheDocument();

    await user.click(
      baseRadio(outfitted.label),
    );
    const group = screen.getByRole("group", { name: /outfit colour/i });
    expect(
      within(group)
        .getAllByRole("radio")
        .filter((radio) => (radio as HTMLInputElement).checked),
    ).toHaveLength(1);
  });

  test("[BUNNY-3] a chosen outfit colour does not survive going naked", async () => {
    const user = userEvent.setup();
    render(<BunnyBuilder />);

    await user.click(
      baseRadio(outfitted.label),
    );
    await user.click(
      within(screen.getByRole("group", { name: /outfit colour/i })).getByRole(
        "radio",
        { name: outfitColors[2].label },
      ),
    );
    await user.click(baseRadio(naked.label));
    await user.click(
      baseRadio(outfitted.label),
    );

    // Back to the palette's first colour, not the one chosen before.
    const group = screen.getByRole("group", { name: /outfit colour/i });
    expect(
      within(group).getByRole("radio", { name: outfitColors[0].label }),
    ).toBeChecked();
    expect(
      within(group).getByRole("radio", { name: outfitColors[2].label }),
    ).not.toBeChecked();
  });

  test("[BUNNY-4] add-ons start unselected and toggle independently", async () => {
    const user = userEvent.setup();
    render(<BunnyBuilder />);

    const group = screen.getByRole("group", { name: /add-ons/i });
    const boxes = within(group).getAllByRole("checkbox");
    expect(boxes).toHaveLength(addOns.length);
    for (const box of boxes) expect(box).not.toBeChecked();

    await user.click(boxes[0]);
    expect(boxes[0]).toBeChecked();
    expect(boxes[1]).not.toBeChecked();

    await user.click(boxes[0]);
    expect(boxes[0]).not.toBeChecked();
  });

  test("[BUNNY-5] the total tracks the base and the add-ons", async () => {
    const user = userEvent.setup();
    render(<BunnyBuilder />);

    await user.click(baseRadio(naked.label));
    expect(total()).toContain(formatPrice(naked.priceCents));

    await user.click(
      baseRadio(outfitted.label),
    );
    expect(total()).toContain(formatPrice(outfitted.priceCents));

    const box = within(screen.getByRole("group", { name: /add-ons/i })).getAllByRole(
      "checkbox",
    )[0];
    await user.click(box);
    expect(total()).toContain(
      formatPrice(outfitted.priceCents + addOns[0].priceCents),
    );

    await user.click(box);
    expect(total()).toContain(formatPrice(outfitted.priceCents));
  });

  test("[BUNNY-10] submitting shows the request and keeps the configuration", async () => {
    const user = userEvent.setup();
    render(<BunnyBuilder />);

    const chosenColor = bunnyColors[3];
    await user.click(
      baseRadio(outfitted.label),
    );
    await user.click(screen.getByRole("radio", { name: chosenColor.label }));
    await user.click(
      within(screen.getByRole("group", { name: /add-ons/i })).getAllByRole(
        "checkbox",
      )[1],
    );
    await user.click(screen.getByRole("button", { name: /review request/i }));

    const summary = screen.getByRole("region", { name: /ready to send/i });
    expect(within(summary).getByText(outfitted.label)).toBeInTheDocument();
    expect(within(summary).getByText(chosenColor.label)).toBeInTheDocument();
    expect(within(summary).getByText(addOns[1].label)).toBeInTheDocument();

    // The form is still there, still holding the same choices.
    expect(
      baseRadio(outfitted.label),
    ).toBeChecked();
    expect(screen.getByRole("radio", { name: chosenColor.label })).toBeChecked();
  });

  test("[BUNNY-10] the request hands off by email with the choices in it", async () => {
    const user = userEvent.setup();
    render(<BunnyBuilder />);

    await user.click(screen.getByRole("button", { name: /review request/i }));

    const link = within(
      screen.getByRole("region", { name: /ready to send/i }),
    ).getByRole("link", { name: /send to/i });
    const href = link.getAttribute("href")!;

    expect(href.startsWith("mailto:")).toBe(true);
    expect(decodeURIComponent(href)).toContain(bases[0].label);
  });

  test("[BUNNY-10] changing an option withdraws the previous request", async () => {
    const user = userEvent.setup();
    render(<BunnyBuilder />);

    await user.click(screen.getByRole("button", { name: /review request/i }));
    expect(
      screen.getByRole("region", { name: /ready to send/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: bunnyColors[1].label }));

    // Otherwise a stale summary would sit next to a form that no longer matches
    // it, and the customer could send the wrong bunny.
    expect(
      screen.queryByRole("region", { name: /ready to send/i }),
    ).not.toBeInTheDocument();
  });
});

describe("PriceEstimate", () => {
  test("[BUNNY-6] itemises one line per choice, summing to the total", () => {
    const config = normaliseConfiguration({
      ...defaultConfiguration(),
      baseId: outfitted.id,
      addOnIds: [addOns[0].id, addOns[2].id],
    });
    render(<PriceEstimate config={config} />);

    const region = screen.getByRole("region", { name: /estimate/i });
    expect(within(region).getByText(outfitted.label)).toBeInTheDocument();
    expect(within(region).getByText(addOns[0].label)).toBeInTheDocument();
    expect(within(region).getByText(addOns[2].label)).toBeInTheDocument();

    expect(total()).toContain(
      formatPrice(
        outfitted.priceCents + addOns[0].priceCents + addOns[2].priceCents,
      ),
    );
  });

  test("[BUNNY-7] the total is labelled an estimate, not a quote", () => {
    render(<PriceEstimate config={defaultConfiguration()} />);

    expect(screen.getByText(/final pricing/i)).toBeInTheDocument();
  });
});
