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

/**
 * The database boundary.
 *
 * Money is stored as NUMERIC(10,2), which node-postgres hands back as a
 * *string* — deliberately, because parsing it into a JavaScript number would
 * lose precision on large values. These two functions are the only place that
 * string is created or consumed.
 *
 * The obvious conversion is wrong:
 *
 *     Math.round(parseFloat("1.005") * 100)   // → 100, not 101
 *
 * `1.005` has no exact binary representation, so multiplying by 100 lands just
 * below 100.5 and rounds down. Everything below therefore works on the digits
 * of the string and never goes near a float.
 */

const NUMERIC_PATTERN = /^(-?)(\d+)(?:\.(\d+))?$/;

/** `"48.00"` → `4800`. Throws rather than guessing at anything unexpected. */
export function centsFromNumeric(value: string): number {
  const match = NUMERIC_PATTERN.exec(value.trim());
  if (!match) {
    throw new Error(`expected a decimal amount from the database, got "${value}"`);
  }

  const [, sign, whole, fraction = ""] = match;

  // The column is NUMERIC(10,2); anything longer means a constraint is missing
  // or something wrote past the boundary. Silently truncating would hide it.
  if (fraction.length > 2) {
    throw new Error(
      `amount "${value}" has more than two decimal places, so it cannot be whole cents`,
    );
  }

  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) {
    throw new Error(`amount "${value}" is too large to hold as cents`);
  }

  return sign === "-" ? -cents : cents;
}

/** `4800` → `"48.00"`, the form NUMERIC(10,2) expects on the way in. */
export function numericFromCents(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error(`price must be whole cents, received ${cents}`);
  }

  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100);
  const fraction = absolute % 100;

  return `${sign}${whole}.${String(fraction).padStart(2, "0")}`;
}
