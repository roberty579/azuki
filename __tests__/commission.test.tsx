import { describe, expect, test } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CommissionForm from "@/components/commission/commission-form";
import { nextSteps, terms, yarnThicknesses } from "@/content/commission";
import { pickupLocations } from "@/content/ordering";
import { site } from "@/content/site";
import {
  buildRequest,
  describeRequest,
  emptyDraft,
  validate,
  type CommissionDraft,
} from "@/lib/commission";

/** A draft that passes validation, for tests to bend one field at a time. */
function validDraft(overrides: Partial<CommissionDraft> = {}): CommissionDraft {
  return {
    ...emptyDraft(),
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    itemDescription: "A cardigan with balloon sleeves.",
    purpose: "personal",
    yarnColor: "Sage green",
    yarnType: "Cotton blend",
    yarnThickness: yarnThicknesses[0].id,
    fulfilment: "shipping",
    address: {
      line1: "1 Main St",
      line2: "",
      city: "Springfield",
      state: "IL",
      zip: "62701",
    },
    payment: "zelle",
    termsAccepted: true,
    ...overrides,
  };
}

describe("commission rules", () => {
  test("[COMM-1] name and email are required, phone is not", () => {
    expect(validate(validDraft())).toEqual({});
    expect(validate(validDraft({ phone: "" }))).toEqual({});

    expect(validate(validDraft({ firstName: "  " }))).toHaveProperty("firstName");
    expect(validate(validDraft({ lastName: "" }))).toHaveProperty("lastName");
    for (const bad of ["", "nope", "a@b", "a b@c.co"]) {
      expect(validate(validDraft({ email: bad }))).toHaveProperty("email");
    }
  });

  test("[COMM-2] a description and a purpose are both required", () => {
    expect(validate(validDraft({ itemDescription: "   " }))).toHaveProperty(
      "itemDescription",
    );
    // "" is the unanswered state — nothing is pre-selected, so the answer is
    // always deliberate.
    expect(emptyDraft().purpose).toBe("");
    expect(validate(validDraft({ purpose: "" }))).toHaveProperty("purpose");
  });

  test("[COMM-3] yarn colour, type and thickness are required", () => {
    expect(validate(validDraft({ yarnColor: "" }))).toHaveProperty("yarnColor");
    expect(validate(validDraft({ yarnType: "" }))).toHaveProperty("yarnType");
    expect(validate(validDraft({ yarnThickness: "" }))).toHaveProperty(
      "yarnThickness",
    );
    // An id that is not in the list is rejected, not passed through.
    expect(
      validate(validDraft({ yarnThickness: "spaghetti" })),
    ).toHaveProperty("yarnThickness");
  });

  test("[COMM-4] only the chosen fulfilment's fields are required", () => {
    // Shipping: the address matters, the drop-off spot does not.
    const shipping = validate(
      validDraft({ fulfilment: "shipping", dropoffLocation: "" }),
    );
    expect(shipping).toEqual({});

    const missingAddress = validate(
      validDraft({
        fulfilment: "shipping",
        address: { line1: "", line2: "", city: "", state: "", zip: "" },
      }),
    );
    expect(Object.keys(missingAddress).sort()).toEqual([
      "address.city",
      "address.line1",
      "address.state",
      "address.zip",
    ]);

    // Drop-off: the reverse, and an empty address must not block it.
    const pickup = validate(
      validDraft({
        fulfilment: "pickup",
        dropoffLocation: pickupLocations[0],
        address: { line1: "", line2: "", city: "", state: "", zip: "" },
      }),
    );
    expect(pickup).toEqual({});
  });

  test("[COMM-4] a drop-off spot must be one that is offered", () => {
    expect(
      validate(
        validDraft({ fulfilment: "pickup", dropoffLocation: "Behind the bins" }),
      ),
    ).toHaveProperty("dropoffLocation");
  });

  test("[COMM-5] cash is rejected for a shipped commission", () => {
    expect(
      validate(validDraft({ fulfilment: "shipping", payment: "cash" })),
    ).toHaveProperty("payment");

    expect(
      validate(
        validDraft({
          fulfilment: "pickup",
          dropoffLocation: pickupLocations[0],
          payment: "cash",
        }),
      ),
    ).toEqual({});
  });

  test("[COMM-6] the terms must be accepted", () => {
    expect(validate(validDraft({ termsAccepted: false }))).toHaveProperty(
      "termsAccepted",
    );
  });

  test("[COMM-7] an empty form reports every problem at once", () => {
    const errors = validate(emptyDraft());

    // Not just the first failure — the customer should be able to fix the form
    // in one pass.
    expect(Object.keys(errors).length).toBeGreaterThanOrEqual(10);
    for (const message of Object.values(errors)) {
      expect(message?.trim()).not.toBe("");
    }
  });

  test("[COMM-8] a request is only built from a valid draft", () => {
    expect(buildRequest(emptyDraft())).toBeNull();
    expect(buildRequest(validDraft({ termsAccepted: false }))).toBeNull();
    expect(buildRequest(validDraft())).not.toBeNull();
  });

  test("[COMM-8] the request carries the answers, trimmed", () => {
    const request = buildRequest(
      validDraft({ firstName: "  Ada  ", phone: "  555-0100  " }),
    )!;

    expect(request.firstName).toBe("Ada");
    expect(request.phone).toBe("555-0100");
    expect(request.isGift).toBe(false);
    expect(request.termsAccepted).toBe(true);
  });

  test("[COMM-8] an omitted phone becomes null rather than an empty string", () => {
    expect(buildRequest(validDraft({ phone: "   " }))!.phone).toBeNull();
  });

  test("[COMM-4] the unused fulfilment branch is dropped, not sent empty", () => {
    // A half-filled address the customer never intended must not travel with
    // the request.
    const posted = buildRequest(validDraft())!;
    expect(posted.shippingAddress).not.toBeNull();
    expect(posted.dropoffLocation).toBeNull();

    const collected = buildRequest(
      validDraft({
        fulfilment: "pickup",
        dropoffLocation: pickupLocations[1],
        address: {
          line1: "abandoned",
          line2: "",
          city: "x",
          state: "y",
          zip: "z",
        },
      }),
    )!;
    expect(collected.shippingAddress).toBeNull();
    expect(collected.dropoffLocation).toBe(pickupLocations[1]);
  });

  test("[COMM-8] nothing in the request looks like a price", () => {
    // A commission has no price until after the consultation. A total here
    // would imply one had been agreed.
    const request = buildRequest(validDraft())!;
    expect(JSON.stringify(request).toLowerCase()).not.toMatch(
      /cents|price|total|subtotal/,
    );
  });

  test("[COMM-8] the summary names every answer", () => {
    const rows = describeRequest(buildRequest(validDraft({ purpose: "gift" }))!);
    const labels = rows.map((row) => row.label);

    expect(labels).toContain("What to make");
    expect(labels).toContain("Yarn thickness");
    expect(labels).toContain("Ship to");
    expect(rows.find((row) => row.label === "Purpose")?.value).toBe("A gift");
    // The readable label, not the raw id.
    expect(rows.find((row) => row.label === "Yarn thickness")?.value).toBe(
      yarnThicknesses[0].label,
    );
    for (const row of rows) expect(row.value.trim()).not.toBe("");
  });
});

describe("commission content", () => {
  test("[COMM-10] yarn thicknesses are unique, labelled, and URL-safe ids", () => {
    const ids = yarnThicknesses.map((option) => option.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);

    for (const option of yarnThicknesses) {
      expect(option.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(option.label.trim()).not.toBe("");
    }
  });

  test("[COMM-10] every next step has a title and detail", () => {
    expect(nextSteps.length).toBeGreaterThan(0);
    for (const step of nextSteps) {
      expect(step.title.trim()).not.toBe("");
      expect(step.detail.trim()).not.toBe("");
    }
  });

  test("[COMM-6] the terms text is present and still marked as a placeholder", () => {
    expect(terms.body.trim()).not.toBe("");
    expect(terms.checkboxLabel.trim()).not.toBe("");
    // Fails the day real terms land, which is the reminder to close the
    // blocking open item in requirements/commission_requirements.md.
    expect(terms.body).toContain("[Placeholder]");
  });
});

describe("CommissionForm", () => {
  /** Fills everything except fulfilment-specific fields, payment, and terms. */
  async function fillCore(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/first name/i), "Ada");
    await user.type(screen.getByLabelText(/last name/i), "Lovelace");
    await user.type(screen.getByLabelText(/^email$/i), "ada@example.com");
    await user.type(
      screen.getByLabelText(/describe the piece/i),
      "A cardigan with balloon sleeves.",
    );
    await user.click(screen.getByRole("radio", { name: /it's for me/i }));
    await user.type(screen.getByLabelText(/^colour$/i), "Sage green");
    await user.type(screen.getByLabelText(/^type$/i), "Cotton blend");
    await user.selectOptions(
      screen.getByLabelText(/thickness/i),
      yarnThicknesses[0].id,
    );
  }

  async function fillShipping(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/street address/i), "1 Main St");
    await user.type(screen.getByLabelText(/^city$/i), "Springfield");
    await user.type(screen.getByLabelText(/^state$/i), "IL");
    await user.type(screen.getByLabelText(/postcode/i), "62701");
  }

  test("[COMM-1] [COMM-2] [COMM-3] every field is present and labelled", () => {
    render(<CommissionForm />);

    for (const label of [
      /first name/i,
      /last name/i,
      /^email$/i,
      /phone/i,
      /describe the piece/i,
      /^colour$/i,
      /^type$/i,
      /thickness/i,
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  test("[COMM-4] fulfilment shows an address or a drop-off list, never both", async () => {
    const user = userEvent.setup();
    render(<CommissionForm />);

    // Shipping is the default.
    expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/drop-off spot/i)).toBeNull();

    await user.click(screen.getByRole("radio", { name: /local drop-off/i }));

    expect(screen.getByLabelText(/drop-off spot/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/street address/i)).toBeNull();
  });

  test("[COMM-5] cash is offered for drop-off but not for shipping", async () => {
    const user = userEvent.setup();
    render(<CommissionForm />);

    expect(screen.queryByRole("radio", { name: /cash/i })).toBeNull();

    await user.click(screen.getByRole("radio", { name: /local drop-off/i }));

    expect(screen.getByRole("radio", { name: /cash/i })).toBeInTheDocument();
  });

  test("[COMM-5] switching to shipping clears a cash selection", async () => {
    const user = userEvent.setup();
    render(<CommissionForm />);

    await user.click(screen.getByRole("radio", { name: /local drop-off/i }));
    await user.click(screen.getByRole("radio", { name: /cash/i }));
    expect(screen.getByRole("radio", { name: /cash/i })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: /ship it to me/i }));
    await fillCore(user);
    await fillShipping(user);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /review request/i }));

    // The cash choice must not survive as a hidden value and submit silently.
    const alerts = screen.getAllByRole("alert").map((node) => node.textContent);
    expect(alerts.join(" ")).toMatch(/how you would like to pay/i);
    expect(screen.queryByText(/ready to send/i)).toBeNull();
  });

  test("[COMM-6] the terms are shown in full and must be ticked", async () => {
    const user = userEvent.setup();
    render(<CommissionForm />);

    expect(screen.getByText(terms.body)).toBeInTheDocument();

    await fillCore(user);
    await fillShipping(user);
    await user.click(screen.getByRole("radio", { name: /zelle/i }));
    await user.click(screen.getByRole("button", { name: /review request/i }));

    expect(
      screen.getAllByRole("alert").map((node) => node.textContent).join(" "),
    ).toMatch(/agree to the terms/i);
    expect(screen.queryByText(/ready to send/i)).toBeNull();
  });

  test("[COMM-7] an empty submit marks what is missing and sends nothing", async () => {
    const user = userEvent.setup();
    render(<CommissionForm />);

    await user.click(screen.getByRole("button", { name: /review request/i }));

    expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(10);
    expect(screen.queryByText(/ready to send/i)).toBeNull();
  });

  test("[COMM-8] [COMM-9] a valid form shows the summary, next steps, and hand-off", async () => {
    const user = userEvent.setup();
    render(<CommissionForm />);

    await fillCore(user);
    await fillShipping(user);
    await user.click(screen.getByRole("radio", { name: /zelle/i }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /review request/i }));

    const summary = screen.getByRole("region", { name: /ready to send/i });
    expect(within(summary).getByText("Ada Lovelace")).toBeInTheDocument();
    expect(
      within(summary).getByText("A cardigan with balloon sleeves."),
    ).toBeInTheDocument();
    expect(within(summary).getByText(/1 Main St/)).toBeInTheDocument();

    // COMM-9: what happens next, so nobody thinks they just bought something.
    const steps = screen.getByRole("region", { name: /what happens next/i });
    expect(within(steps).getAllByRole("listitem")).toHaveLength(nextSteps.length);
    expect(within(steps).getByText(/nothing is due now/i)).toBeInTheDocument();

    const link = within(summary).getByRole("link", { name: /send to/i });
    const href = decodeURIComponent(link.getAttribute("href")!);
    expect(href.startsWith(`mailto:${site.email}`)).toBe(true);
    expect(href).toContain("A cardigan with balloon sleeves.");
    expect(href).toContain("Terms accepted: yes");
  });
});
