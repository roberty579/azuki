import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navbar from "@/components/navbar";
import { navItems } from "@/content/navigation";
import { site } from "@/content/site";

const route = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));

function getToggle() {
  return screen.getByRole("button", { name: /menu/i });
}

/** The always-rendered inline list; CSS hides it below `lg`, which jsdom cannot see. */
function getInlineNav() {
  return screen.getByRole("navigation", { name: "Main" });
}

/** The collapsible panel, which only exists in the DOM while open. */
function queryPanel() {
  return screen.queryByRole("navigation", { name: "Menu" });
}

beforeEach(() => {
  route.pathname = "/";
});

describe("Navbar", () => {
  test("[HOME-1] shows a persistent logo linking home", () => {
    render(<Navbar />);

    expect(screen.getByRole("link", { name: site.name })).toHaveAttribute(
      "href",
      "/",
    );
  });

  test("[HOME-2] lists every main section inline for wide viewports", () => {
    render(<Navbar />);

    const nav = getInlineNav();
    for (const item of navItems) {
      expect(
        within(nav).getByRole("link", { name: item.label }),
      ).toHaveAttribute("href", item.href);
    }

    // Exactly the sections in the requirements, nothing extra.
    expect(within(nav).getAllByRole("link")).toHaveLength(navItems.length);
  });

  test("[HOME-4] marks the current section in the inline list", () => {
    route.pathname = "/shop";
    render(<Navbar />);

    const nav = getInlineNav();
    expect(within(nav).getByRole("link", { name: "Shop" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      within(nav).getByRole("link", { name: "Portfolio" }),
    ).not.toHaveAttribute("aria-current");
  });

  test("[HOME-3] menu is collapsed on first render", () => {
    render(<Navbar />);

    expect(getToggle()).toHaveAttribute("aria-expanded", "false");
    expect(queryPanel()).toBeNull();
  });

  test("[HOME-3] toggle button is labelled in both states", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    expect(
      screen.getByRole("button", { name: "Open menu" }),
    ).toBeInTheDocument();

    await user.click(getToggle());

    expect(
      screen.getByRole("button", { name: "Close menu" }),
    ).toBeInTheDocument();
  });

  test("[HOME-3] opening reveals every main section with the right href", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(getToggle());

    expect(getToggle()).toHaveAttribute("aria-expanded", "true");

    const panel = queryPanel();
    expect(panel).not.toBeNull();
    for (const item of navItems) {
      expect(
        within(panel!).getByRole("link", { name: item.label }),
      ).toHaveAttribute("href", item.href);
    }

    expect(within(panel!).getAllByRole("link")).toHaveLength(navItems.length);
  });

  test("[HOME-3] the toggle is wired to the panel it controls", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(getToggle());

    const controls = getToggle().getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    expect(queryPanel()).toHaveAttribute("id", controls);
  });

  test("[HOME-3] clicking the toggle again collapses the menu", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(getToggle());
    await user.click(getToggle());

    expect(getToggle()).toHaveAttribute("aria-expanded", "false");
    expect(queryPanel()).toBeNull();
  });

  test("[HOME-3] Escape collapses the menu", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(getToggle());
    await user.keyboard("{Escape}");

    expect(getToggle()).toHaveAttribute("aria-expanded", "false");
    expect(queryPanel()).toBeNull();
  });

  test("[HOME-3] choosing a section collapses the menu", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(getToggle());
    await user.click(within(queryPanel()!).getByRole("link", { name: "Shop" }));

    expect(getToggle()).toHaveAttribute("aria-expanded", "false");
    expect(queryPanel()).toBeNull();
  });

  test("[HOME-3] the menu can be operated by keyboard alone", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    getToggle().focus();
    await user.keyboard("{Enter}");

    expect(getToggle()).toHaveAttribute("aria-expanded", "true");
  });
});
