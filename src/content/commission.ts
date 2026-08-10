/**
 * Copy and options for the commission form.
 *
 * @implements COMM-10
 *
 * Payment methods and drop-off spots deliberately are NOT here — they live in
 * content/ordering.ts, shared with the shop, because SHOP-9 and COMM-5 are the
 * same rule. Duplicating them is how the two pages would drift.
 */

export type YarnThickness = {
  /** Unique, lowercase-hyphenated. */
  id: string;
  label: string;
};

/**
 * @implements COMM-3 — yarn weight has a standard vocabulary, so this is a
 *   fixed list. Colour and fibre do not, and are free text: constraining them
 *   would turn away requests the maker would happily take.
 */
export const yarnThicknesses: readonly YarnThickness[] = [
  { id: "lace", label: "Lace (0)" },
  { id: "super-fine", label: "Super fine / sock (1)" },
  { id: "fine", label: "Fine / sport (2)" },
  { id: "light", label: "Light / DK (3)" },
  { id: "medium", label: "Medium / worsted (4)" },
  { id: "bulky", label: "Bulky / chunky (5)" },
  { id: "super-bulky", label: "Super bulky (6)" },
  { id: "not-sure", label: "Not sure — help me choose" },
];

/**
 * @implements COMM-6 — PLACEHOLDER. This is the one piece of copy on the site
 *   with legal weight, so nothing has been invented for it.
 *
 * requirements/commission_requirements.md records the maker's draft idea
 * ("non-refundable unless damaged by me") and marks finalising it as blocking
 * before launch. The checkbox, its enforcement, and recording what was accepted
 * are all built and tested — only the wording is missing.
 */
export const terms = {
  heading: "Terms and conditions",
  /** Rendered verbatim next to the checkbox. */
  body:
    "[Placeholder] The terms of a commission — including the refund policy — have not been " +
    "finalised yet. This text is a placeholder and is not a statement of policy. Real terms must " +
    "replace it before this page goes live.",
  checkboxLabel: "I have read and agree to the terms and conditions",
} as const;

export type NextStep = {
  title: string;
  detail: string;
};

/**
 * @implements COMM-9 — what follows a submitted request, from the original
 *   spec's post-submission flow.
 *
 * Someone who has just described a bespoke piece and been shown no price needs
 * to know a quote is coming rather than wondering whether they have bought
 * something.
 */
export const nextSteps: readonly NextStep[] = [
  {
    title: "We talk it through",
    detail:
      "We'll reply to arrange a consultation and go over the details — size, yarn, timing, anything you're unsure about.",
  },
  {
    title: "You get a price and a timeline",
    detail:
      "After the consultation we'll send the final price and an estimated finish date, written down.",
  },
  {
    title: "You confirm",
    detail:
      "If you're happy, you'll get a short document confirming what was agreed, to sign before work starts.",
  },
  {
    title: "Payment, then making",
    detail:
      "Payment is arranged once everything is confirmed. Nothing is due now, and nothing is charged by this form.",
  },
];
