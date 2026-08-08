/**
 * Money formatting.
 *
 * @implements SHOP-12
 *
 * Amounts are integer cents everywhere in the app; they become a decimal string
 * only at the moment of display. Keeping the arithmetic in integers avoids the
 * floating-point rounding that makes subtotals disagree with their line items.
 */

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatPrice(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error(`price must be whole cents, received ${cents}`);
  }
  return formatter.format(cents / 100);
}
