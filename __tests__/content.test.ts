import { describe, expect, test } from "vitest";
import { navItems } from "@/content/navigation";
import { site } from "@/content/site";

/**
 * The content module is hand-edited whenever copy changes, so these guard the
 * data itself — a malformed email or a gallery entry missing alt text would
 * otherwise only surface in the browser.
 */
describe("site content", () => {
  test("[HOME-11] has a usable contact email", () => {
    expect(site.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  test("[HOME-11] has non-empty name, tagline, and about copy", () => {
    expect(site.name.trim()).not.toBe("");
    expect(site.tagline.trim()).not.toBe("");
    expect(site.about.trim().length).toBeGreaterThan(40);
  });

  test("[HOME-11] every social link is labelled and absolute", () => {
    expect(site.socials.length).toBeGreaterThan(0);

    for (const social of site.socials) {
      expect(social.label.trim()).not.toBe("");
      expect(() => new URL(social.href)).not.toThrow();
      expect(social.href).toMatch(/^https:\/\//);
    }
  });

  test("[HOME-11] every gallery item has a local source and descriptive alt text", () => {
    expect(site.gallery.length).toBeGreaterThan(0);

    for (const item of site.gallery) {
      expect(item.src.startsWith("/")).toBe(true);
      // Query strings on local images would require images.localPatterns.search in Next 16.
      expect(item.src).not.toContain("?");
      expect(item.alt.trim()).not.toBe("");
      expect(item.title.trim()).not.toBe("");
    }
  });

  test("[HOME-11] gallery sources are unique", () => {
    const sources = site.gallery.map((item) => item.src);
    expect(new Set(sources).size).toBe(sources.length);
  });
});

describe("navigation content", () => {
  test("[HOME-2] [HOME-3] covers every section named in the requirements", () => {
    expect(navItems.map((item) => item.label)).toEqual([
      "Home",
      "Schedule",
      "Forms/Commissions",
      "Build a Bunny",
      "Shop",
      "Portfolio",
    ]);
  });

  test("[HOME-2] [HOME-3] every destination is a root-relative path", () => {
    for (const item of navItems) {
      expect(item.href.startsWith("/")).toBe(true);
    }
  });

  test("[HOME-2] [HOME-3] has no duplicate destinations", () => {
    const hrefs = navItems.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
