"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navItems } from "@/content/navigation";
import { site } from "@/content/site";

const PANEL_ID = "primary-navigation";

/**
 * Persistent site header.
 *
 * @implements HOME-1 — logo mark plus business name, linking home.
 * @implements HOME-2 — every section listed across the top from `lg` (1024px) up.
 * @implements HOME-3 — the same sections behind a hamburger below `lg`, where six
 *   labels would crowd the business name.
 * @implements HOME-4 — the current section is marked in both layouts.
 */
export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur">
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link
          href="/"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-2 rounded-sm text-lg font-semibold tracking-tight text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <LogoMark />
          {site.name}
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <NavLink item={item} pathname={pathname} />
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls={PANEL_ID}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:hidden"
        >
          {isOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {isOpen && (
        <nav
          id={PANEL_ID}
          aria-label="Menu"
          className="border-t border-border bg-surface lg:hidden"
        >
          <ul className="flex w-full flex-col px-4 py-3 sm:px-6">
            {navItems.map((item) => (
              <li key={item.href}>
                <NavLink
                  item={item}
                  pathname={pathname}
                  onNavigate={() => setIsOpen(false)}
                  block
                />
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

/** @implements HOME-4 — aria-current plus a visible treatment on the active section. */
function NavLink({
  item,
  pathname,
  onNavigate,
  block = false,
}: {
  item: (typeof navItems)[number];
  pathname: string | null;
  onNavigate?: () => void;
  block?: boolean;
}) {
  const isCurrent = pathname === item.href;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isCurrent ? "page" : undefined}
      className={[
        block ? "block px-3 py-3 text-base" : "px-3 py-2 text-sm",
        "rounded-lg font-medium transition-colors hover:bg-accent-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        isCurrent ? "bg-accent-soft text-accent" : "text-ink-muted",
      ].join(" ")}
    >
      {item.label}
    </Link>
  );
}

/** Decorative yarn-ball mark; the adjacent business name carries the link's accessible name. */
function LogoMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-7 w-7 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M5 9.5c3.5 1 10 1 14 -1.5" />
      <path d="M4 14c4.5 .5 12 -1 15.5 -4" />
      <path d="M7.5 18.5c3.5 -1.5 8.5 -5 11 -9" />
      <path d="M19 16.5l2.5 4" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
