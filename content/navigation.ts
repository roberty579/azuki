/**
 * The site's main sections, per requirements/navigation_requirements.md.
 * Shared by the navbar and by the tests that assert every section is reachable.
 *
 * @implements HOME-2, HOME-3 — the one list both header layouts render from, so
 *   they can never drift apart.
 */

export type NavItem = {
  label: string;
  href: string;
};

export const navItems: readonly NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Schedule", href: "/schedule" },
  { label: "Forms/Commissions", href: "/commission" },
  { label: "Build a Bunny", href: "/build-a-bunny" },
  { label: "Shop", href: "/shop" },
  { label: "Portfolio", href: "/portfolio" },
];
