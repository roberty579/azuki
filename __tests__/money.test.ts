import { describe, expect, test } from "vitest";
import { centsFromNumeric, formatPrice, numericFromCents } from "@/lib/money";

describe("money", () => {
  test("[SHOP-12] formats whole cents as currency", () => {
    expect(formatPrice(0)).toBe("$0.00");
    expect(formatPrice(500)).toBe("$5.00");
    expect(formatPrice(4899)).toBe("$48.99");
    expect(formatPrice(145000)).toBe("$1,450.00");
  });

  test("[SHOP-12] rejects fractional cents rather than rounding silently", () => {
    // A price of 4.5 cents means someone did float arithmetic upstream. Failing
    // loudly here is better than a subtotal that disagrees with its lines.
    expect(() => formatPrice(4.5)).toThrow(/whole cents/);
  });

  test("[SHOP-12] integer arithmetic keeps subtotals exact", () => {
    // The classic float failure: 0.1 + 0.2 !== 0.3. In cents it is exact.
    const lines = [10, 20, 30];
    expect(lines.reduce((total, cents) => total + cents, 0)).toBe(60);
    expect(formatPrice(60)).toBe("$0.60");
  });
});

/**
 * Money is stored as NUMERIC(10,2) and arrives from node-postgres as a string.
 * These guard the only place that string is converted, because a bug here is
 * silent: every price in the shop would simply be slightly wrong.
 */
describe("the database boundary", () => {
  test("[SHOP-12] reads a NUMERIC string as whole cents", () => {
    expect(centsFromNumeric("48.00")).toBe(4800);
    expect(centsFromNumeric("0.00")).toBe(0);
    expect(centsFromNumeric("0.07")).toBe(7);
    expect(centsFromNumeric("1450.00")).toBe(145000);
  });

  test("[SHOP-12] accepts the shapes Postgres actually emits", () => {
    // Depending on the column type and the driver, the fractional part may be
    // absent or shorter than two digits.
    expect(centsFromNumeric("48")).toBe(4800);
    expect(centsFromNumeric("48.5")).toBe(4850);
    expect(centsFromNumeric(" 48.00 ")).toBe(4800);
    expect(centsFromNumeric("-5.25")).toBe(-525);
  });

  test("[SHOP-12] does not lose the half-cent that float arithmetic loses", () => {
    // The whole reason this function exists. Math.round(parseFloat("1.005") *
    // 100) returns 100, because 1.005 is not exactly representable in binary.
    expect(Math.round(parseFloat("1.005") * 100)).toBe(100); // the trap
    expect(() => centsFromNumeric("1.005")).toThrow(/two decimal places/);
  });

  test("[SHOP-12] refuses input that is not a decimal amount", () => {
    for (const bad of ["", "abc", "1e3", "1.2.3", "$48.00", "NaN"]) {
      expect(() => centsFromNumeric(bad)).toThrow();
    }
  });

  test("[SHOP-12] writes whole cents back as a NUMERIC string", () => {
    expect(numericFromCents(4800)).toBe("48.00");
    expect(numericFromCents(7)).toBe("0.07");
    expect(numericFromCents(0)).toBe("0.00");
    expect(numericFromCents(145000)).toBe("1450.00");
    expect(numericFromCents(-525)).toBe("-5.25");
  });

  test("[SHOP-12] a value survives a round trip unchanged", () => {
    for (const cents of [0, 1, 7, 99, 100, 4800, 145000, 999999999]) {
      expect(centsFromNumeric(numericFromCents(cents))).toBe(cents);
    }
  });

  test("[SHOP-12] refuses to write a fractional cent", () => {
    expect(() => numericFromCents(4.5)).toThrow(/whole cents/);
  });
});
