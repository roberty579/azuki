import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { render, screen, within } from "@testing-library/react";
import PieceCard from "@/components/portfolio/piece-card";
import {
  categories,
  findPortfolioItem,
  itemsByCategory,
  portfolioItems,
} from "@/content/portfolio";

const categoryIds = new Set(categories.map((category) => category.id));

/**
 * The catalogue is hand-edited whenever a piece is added, so these guard the
 * data itself — a broken image path or a slug that collides with a route would
 * otherwise only surface in the browser.
 */
describe("portfolio catalogue", () => {
  test("[PORT-7] is not empty and every piece has complete copy", () => {
    expect(portfolioItems.length).toBeGreaterThan(0);

    for (const item of portfolioItems) {
      expect(item.title.trim()).not.toBe("");
      expect(item.description.trim().length).toBeGreaterThan(20);
      expect(item.alt.trim()).not.toBe("");
      expect(item.yarnType.trim()).not.toBe("");
      expect(item.yarnColor.trim()).not.toBe("");
    }
  });

  test("[PORT-7] slugs are unique and URL-safe", () => {
    const slugs = portfolioItems.map((item) => item.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  test("[PORT-7] no slug collides with a sibling route under /portfolio", () => {
    // A static segment always wins over a dynamic one, so a piece slugged the
    // same as a real directory would be unreachable.
    const siblings = readdirSync(join(process.cwd(), "src", "app", "portfolio"), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("["))
      .map((entry) => entry.name);

    for (const item of portfolioItems) {
      expect(siblings).not.toContain(item.slug);
    }
  });

  test("[PORT-7] images are local and free of query strings", () => {
    for (const item of portfolioItems) {
      expect(item.image.startsWith("/")).toBe(true);
      // Query strings would require images.localPatterns.search in Next 16.
      expect(item.image).not.toContain("?");
    }
  });

  test("[PORT-7] every image file actually exists", () => {
    // jsdom never loads an image, so a typo'd path is invisible to component
    // tests. This is the cheap half of that check; e2e does the rest.
    const files = new Set(
      readdirSync(join(process.cwd(), "public", "portfolio")),
    );

    for (const item of portfolioItems) {
      expect(files, `missing file for ${item.slug}`).toContain(
        item.image.replace("/portfolio/", ""),
      );
    }
  });

  test("[PORT-2] every piece belongs to exactly one known category", () => {
    for (const item of portfolioItems) {
      expect(categoryIds).toContain(item.category);
    }
  });

  test("[PORT-2] both launch categories have work to show", () => {
    const launched = categories.filter((category) => category.launched);
    expect(launched.map((category) => category.id)).toEqual([
      "clothing",
      "plushie",
    ]);

    for (const category of launched) {
      expect(
        portfolioItems.some((item) => item.category === category.id),
        `${category.label} is a launch category with no items`,
      ).toBe(true);
    }
  });

  test("[PORT-2] grouping skips categories with nothing in them", () => {
    const groups = itemsByCategory();

    // The planned categories have no items yet and must not render as empty
    // sections.
    expect(groups.map((group) => group.id)).toEqual(["clothing", "plushie"]);
    for (const group of groups) {
      expect(group.items.length).toBeGreaterThan(0);
    }
  });

  test("[PORT-2] grouping loses no items and duplicates none", () => {
    const grouped = itemsByCategory().flatMap((group) => group.items);

    expect(grouped).toHaveLength(portfolioItems.length);
    expect(new Set(grouped.map((item) => item.slug)).size).toBe(
      portfolioItems.length,
    );
  });

  test("[PORT-5] a designer credit is either a real name or absent", () => {
    // "" or "unknown" would render as a credit to nobody.
    for (const item of portfolioItems) {
      if (item.designer !== null) {
        expect(item.designer.trim()).not.toBe("");
      }
    }

    // Both cases must exist in the placeholder data, or the conditional
    // rendering in the page is never exercised by the tests below.
    expect(portfolioItems.some((item) => item.designer !== null)).toBe(true);
    expect(portfolioItems.some((item) => item.designer === null)).toBe(true);
  });

  test("[PORT-4] findPortfolioItem resolves a slug, and only a real one", () => {
    expect(findPortfolioItem(portfolioItems[0].slug)).toBe(portfolioItems[0]);
    expect(findPortfolioItem("not-a-real-piece")).toBeUndefined();
  });

  test("[PORT-7] nothing in the portfolio carries a price", () => {
    // Portfolio pieces are past work, not stock. A price here would mean the
    // shop's rules — cart, checkout, stock — silently apply to something that
    // was never for sale.
    for (const item of portfolioItems) {
      expect(Object.keys(item)).not.toContain("priceCents");
      expect(Object.keys(item)).not.toContain("stock");
    }
  });
});

describe("PieceCard", () => {
  const item = portfolioItems[0];

  test("[PORT-1] shows the title and a described image", () => {
    render(<PieceCard item={item} />);

    expect(
      screen.getByRole("heading", { name: item.title }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(item.alt);
  });

  test("[PORT-3] the whole tile links to the piece", () => {
    render(<PieceCard item={item} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", `/portfolio/${item.slug}`);
    // The title lives inside the link, so the whole tile is one target rather
    // than a small text hitbox.
    expect(within(link).getByRole("heading")).toBeInTheDocument();
  });

  test("[PORT-1] shows no price", () => {
    render(<PieceCard item={item} />);

    expect(screen.queryByText(/\$\d/)).toBeNull();
  });
});
