import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * The palette in app/globals.css is hand-edited, so these assert the token
 * pairs that actually end up as text-on-background meet WCAG AA (4.5:1 for
 * body-size text) in both colour schemes.
 */

const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

function parseTokens(block: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(
    /--([a-z-]+):\s*(#[0-9a-fA-F]{6});/g,
  )) {
    tokens[name] = value;
  }
  return tokens;
}

/** The bare `:root { … }` block — the light palette. */
function lightPalette(): Record<string, string> {
  const match = css.match(/(?<!@media[^{]*\{\s*):root\s*\{([^}]*)\}/);
  if (!match) throw new Error("could not find :root block");
  return parseTokens(match[1]);
}

/** `:root` nested inside the prefers-color-scheme: dark media query. */
function darkPalette(): Record<string, string> {
  const match = css.match(
    /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^}]*)\}/,
  );
  if (!match) throw new Error("could not find dark :root block");
  return { ...lightPalette(), ...parseTokens(match[1]) };
}

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const value = hex.replace("#", "");
  const r = channelLuminance(parseInt(value.slice(0, 2), 16));
  const g = channelLuminance(parseInt(value.slice(2, 4), 16));
  const b = channelLuminance(parseInt(value.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

/** Foreground/background token pairs that appear as body-size text in the UI. */
const pairs: ReadonlyArray<[fg: string, bg: string]> = [
  ["ink", "background"],
  ["ink-muted", "background"],
  ["accent", "background"],
  ["ink", "surface"],
  ["ink-muted", "surface"],
  ["accent", "surface"],
  // Primary CTA: text sitting on the accent fill.
  ["on-accent", "accent"],
  // Nav hover state.
  ["ink", "accent-soft"],
  // Current-section pill in the header.
  ["accent", "accent-soft"],
];

describe.each([
  ["light", lightPalette()],
  ["dark", darkPalette()],
])("%s palette", (_scheme, palette) => {
  test.each(pairs)("[HOME-13] %s on %s meets AA", (fg, bg) => {
    expect(palette[fg], `missing --${fg}`).toBeDefined();
    expect(palette[bg], `missing --${bg}`).toBeDefined();

    expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
  });
});

describe("contrast helper", () => {
  test("matches known reference ratios", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    // Sanity check against a widely published value.
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
  });
});
