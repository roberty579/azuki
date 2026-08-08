import { describe, expect, test } from "vitest";
import { formatPrice } from "@/lib/money";

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
