/**
 * Commission request: the shape of a request, and the rules it must satisfy.
 *
 * Pure functions over plain objects — no React, no storage, no side effects.
 * That is what lets every rule below be tested directly rather than only by
 * driving the form, and what will let a server re-run them unchanged once one
 * exists (docs/backend.md §3: the server re-applies what the form applies,
 * because the form can be skipped).
 */

import { pickupLocations, type FulfilmentMethod } from "@/content/ordering";
import { yarnThicknesses } from "@/content/commission";

export type PaymentChoice = "zelle" | "venmo" | "cash";

/** Collected separately rather than as one free-text box — see COMM-4. */
export type ShippingAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
};

/**
 * What the customer typed, before validation. Every field is a string because
 * that is what form controls produce; `buildRequest` is what turns this into
 * the typed request below.
 */
export type CommissionDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  itemDescription: string;
  /** "" until chosen, so nothing is pre-selected — COMM-2. */
  purpose: "" | "gift" | "personal";
  yarnColor: string;
  yarnType: string;
  yarnThickness: string;
  fulfilment: FulfilmentMethod;
  address: ShippingAddress;
  dropoffLocation: string;
  payment: "" | PaymentChoice;
  termsAccepted: boolean;
};

/**
 * The request that leaves the page.
 *
 * Mirrors the `commissions` columns on purpose, so persisting it later is a new
 * caller rather than a reshape — the same trick `requestPayload` in
 * src/lib/bunny.ts uses.
 *
 * There is deliberately no price field. A commission has no price until after
 * the consultation; what is collected here is a payment *preference*.
 */
export type CommissionRequest = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  itemDescription: string;
  isGift: boolean;
  yarnColor: string;
  yarnType: string;
  yarnThickness: string;
  fulfilment: FulfilmentMethod;
  shippingAddress: ShippingAddress | null;
  dropoffLocation: string | null;
  paymentMethod: PaymentChoice;
  termsAccepted: true;
};

export type Errors = Partial<Record<string, string>>;

export function emptyDraft(): CommissionDraft {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    itemDescription: "",
    purpose: "",
    yarnColor: "",
    yarnType: "",
    yarnThickness: "",
    fulfilment: "shipping",
    address: { line1: "", line2: "", city: "", state: "", zip: "" },
    dropoffLocation: "",
    payment: "",
    termsAccepted: false,
  };
}

/** Deliberately loose. Rejecting unusual but valid addresses is worse than accepting a typo. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @implements COMM-7 — every problem at once, not the first one found, so the
 *   customer fixes the form in one pass instead of discovering faults one
 *   submit at a time.
 * @implements COMM-1, COMM-2, COMM-3 — required fields.
 * @implements COMM-4 — whichever fulfilment is chosen is required; the other is
 *   not, and must not block submission.
 * @implements COMM-5 — cash cannot survive a switch to shipping.
 * @implements COMM-6 — terms must be accepted.
 */
export function validate(draft: CommissionDraft): Errors {
  const errors: Errors = {};

  if (!draft.firstName.trim()) errors.firstName = "Enter your first name.";
  if (!draft.lastName.trim()) errors.lastName = "Enter your last name.";
  if (!EMAIL_PATTERN.test(draft.email.trim())) {
    errors.email = "Enter an email address we can reply to.";
  }

  if (!draft.itemDescription.trim()) {
    errors.itemDescription = "Tell us what you would like made.";
  }
  if (!draft.purpose) {
    errors.purpose = "Let us know if this is a gift.";
  }

  if (!draft.yarnColor.trim()) errors.yarnColor = "Enter a yarn colour.";
  if (!draft.yarnType.trim()) errors.yarnType = "Enter a yarn type.";
  if (!draft.yarnThickness) {
    errors.yarnThickness = "Choose a yarn thickness.";
  } else if (!yarnThicknesses.some((option) => option.id === draft.yarnThickness)) {
    errors.yarnThickness = "Choose a yarn thickness from the list.";
  }

  if (draft.fulfilment === "shipping") {
    if (!draft.address.line1.trim()) errors["address.line1"] = "Enter a street address.";
    if (!draft.address.city.trim()) errors["address.city"] = "Enter a city.";
    if (!draft.address.state.trim()) errors["address.state"] = "Enter a state.";
    if (!draft.address.zip.trim()) errors["address.zip"] = "Enter a postcode.";
    // line2 is deliberately optional.
  } else {
    if (!draft.dropoffLocation) {
      errors.dropoffLocation = "Choose a drop-off spot.";
    } else if (!pickupLocations.includes(draft.dropoffLocation)) {
      errors.dropoffLocation = "Choose a drop-off spot from the list.";
    }
  }

  if (!draft.payment) {
    errors.payment = "Choose how you would like to pay.";
  } else if (draft.payment === "cash" && draft.fulfilment !== "pickup") {
    // Belt and braces: the UI removes the cash option when shipping is chosen,
    // but a request must never go out claiming cash on a posted item.
    errors.payment = "Cash is available for local drop-off only.";
  }

  if (!draft.termsAccepted) {
    errors.termsAccepted = "Please agree to the terms and conditions.";
  }

  return errors;
}

/**
 * @implements COMM-8 — the request that leaves the page.
 *
 * Returns null when the draft is invalid, so there is no way to build a request
 * that skipped validation. The unused branch of the fulfilment choice is
 * dropped rather than sent empty: a request must not carry a half-filled
 * address the customer never intended.
 */
export function buildRequest(draft: CommissionDraft): CommissionRequest | null {
  if (Object.keys(validate(draft)).length > 0) return null;

  const shipping = draft.fulfilment === "shipping";

  return {
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim() || null,
    itemDescription: draft.itemDescription.trim(),
    isGift: draft.purpose === "gift",
    yarnColor: draft.yarnColor.trim(),
    yarnType: draft.yarnType.trim(),
    yarnThickness: draft.yarnThickness,
    fulfilment: draft.fulfilment,
    shippingAddress: shipping
      ? {
          line1: draft.address.line1.trim(),
          line2: draft.address.line2.trim(),
          city: draft.address.city.trim(),
          state: draft.address.state.trim(),
          zip: draft.address.zip.trim(),
        }
      : null,
    dropoffLocation: shipping ? null : draft.dropoffLocation,
    paymentMethod: draft.payment as PaymentChoice,
    termsAccepted: true,
  };
}

/** One row of the human-readable summary. */
export type SummaryRow = { label: string; value: string };

/** @implements COMM-8 — names every answer, including the ones easy to forget. */
export function describeRequest(request: CommissionRequest): SummaryRow[] {
  const thickness =
    yarnThicknesses.find((option) => option.id === request.yarnThickness)?.label ??
    request.yarnThickness;

  const rows: SummaryRow[] = [
    { label: "Name", value: `${request.firstName} ${request.lastName}` },
    { label: "Email", value: request.email },
  ];

  if (request.phone) rows.push({ label: "Phone", value: request.phone });

  rows.push(
    { label: "What to make", value: request.itemDescription },
    { label: "Purpose", value: request.isGift ? "A gift" : "For myself" },
    { label: "Yarn colour", value: request.yarnColor },
    { label: "Yarn type", value: request.yarnType },
    { label: "Yarn thickness", value: thickness },
  );

  if (request.shippingAddress) {
    const { line1, line2, city, state, zip } = request.shippingAddress;
    rows.push({
      label: "Ship to",
      value: [line1, line2, `${city}, ${state} ${zip}`].filter(Boolean).join(", "),
    });
  } else {
    rows.push({ label: "Local drop-off", value: request.dropoffLocation ?? "" });
  }

  rows.push({ label: "Payment", value: request.paymentMethod });

  return rows;
}
