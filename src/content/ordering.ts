/**
 * Fulfilment and payment options shared by the shop and (later) the commission
 * form — requirements/commission_requirements.md §4 defines the same Zelle /
 * Venmo / cash rules, so they live in one place rather than being duplicated.
 *
 * @implements SHOP-8, SHOP-9
 */

export type FulfilmentMethod = "shipping" | "pickup";

export type PaymentMethod = {
  id: "zelle" | "venmo" | "cash";
  label: string;
  /** Shown once the method is chosen, so the buyer knows what happens next. */
  instructions: string;
  /**
   * Cash is local-only: it cannot be offered when the order is being shipped.
   * The commission spec states this rule explicitly.
   */
  localOnly: boolean;
};

export const paymentMethods: readonly PaymentMethod[] = [
  {
    id: "zelle",
    label: "Zelle",
    instructions:
      "[Placeholder] Send payment by Zelle to the address in the confirmation email. Your order is reserved once payment clears.",
    localOnly: false,
  },
  {
    id: "venmo",
    label: "Venmo",
    instructions:
      "[Placeholder] Send payment by Venmo to the handle in the confirmation email. Your order is reserved once payment clears.",
    localOnly: false,
  },
  {
    id: "cash",
    label: "Cash",
    instructions:
      "[Placeholder] Pay in cash at the drop-off. Available for local pick-up only.",
    localOnly: true,
  },
];

/** Local drop-off points offered instead of shipping. */
export const pickupLocations: readonly string[] = [
  "[Placeholder] Saturday farmers market — 9am to 1pm",
  "[Placeholder] Downtown library entrance — by arrangement",
  "[Placeholder] Community centre car park — by arrangement",
];

/**
 * @implements SHOP-9 — cash disappears when the order is being shipped, rather
 * than being offered and rejected later.
 */
export function availablePaymentMethods(
  fulfilment: FulfilmentMethod,
): readonly PaymentMethod[] {
  return fulfilment === "pickup"
    ? paymentMethods
    : paymentMethods.filter((method) => !method.localOnly);
}
