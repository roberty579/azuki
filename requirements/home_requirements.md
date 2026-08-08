# Home Page Requirements

Source: section 2 ("Main / Home Page — User View") of `website-requirements.md`, expanded with the
decisions made while building the page. This file — not the root document — is authoritative for
the home page.

Each requirement below has a permanent ID. Implementation and tests are tagged with it, so grepping
an ID finds everything that serves it. See "Linked intent development" in `README.md` for the
tagging convention.

---

## Site header

### HOME-1 — Persistent header with a logo linking home

Every page has a header at the top holding a logo mark and the business name. The two together are
one link to `/`.

**Acceptance:** the header is a `banner` landmark; its logo link resolves to `/` and returns to the
home page from any sub-page.

### HOME-2 — Wide screens show every section across the top

At **1024px and above**, the header lists all six main sections
(Home, Schedule, Forms/Commissions, Build a Bunny, Shop, Portfolio) as links across the top, with
no hamburger.

**Acceptance:** at ≥1024px those links are visible and are exactly the sections in
`content/navigation.ts`, each pointing at its route; the hamburger button is hidden.

> **Amends the original spec.** Section 2 of `website-requirements.md` called for a hamburger at
> every width, and that shipped first. Seen on a desktop screen it hid where things were, so
> discoverability won over consistency. `requirements/navigation_requirements.md` still describes
> hamburger-only navigation and now contradicts this — it needs the same amendment, deferred
> because only this file is in scope.

### HOME-3 — Narrow screens collapse the sections behind a hamburger

Below **1024px** the same six sections sit in a collapsible panel behind a labelled hamburger
button, and the across-the-top links are hidden. Exactly one of the two is visible at any width.

**Acceptance:** below 1024px the panel starts collapsed; the button reports `aria-expanded` and
`aria-controls` for the panel it owns; the panel opens on click and closes on a second click, on
`Escape`, and after a section is chosen; the button is operable by keyboard alone and is labelled
in both states.

**Why 1024px:** the six labels need roughly 500px, so at 768px they crowd the business name. At
exactly 1024px about 190px of clearance remains between the name and the first link.

### HOME-4 — The header shows which section you are on

Whichever section the visitor is currently on is distinguished in the header, both in the
across-the-top links and in the collapsed panel.

**Acceptance:** the link matching the current path carries `aria-current="page"` and a visible
treatment; no other link does.

## Page content

### HOME-5 — The page opens with the tagline and the business name

The top of the page leads with the tagline, then the business name as the page's single main
heading.

**Acceptance:** there is exactly one `h1` and it is the business name; the tagline renders above
it.

### HOME-6 — A short "about the company" blurb

A brief summary of what the business makes and how ordering works, near the top of the page.

**Acceptance:** the blurb renders from the content module.

**Constraint:** the blurb's width is capped rather than filling the page. Run full width it
measures about 70 characters per line — the top of the comfortable 45–75 range — so widening it
would hurt readability even though the page around it is full width (HOME-10).

### HOME-7 — Direct routes to booking and to the shop

The page offers two prominent actions: booking a consultation (`/schedule`) and browsing the shop
(`/shop`) — the two things a visitor is most likely to want next.

**Acceptance:** both links render with those destinations, and one is visually ranked above the
other (filled vs. outlined).

### HOME-8 — Social accounts and a contact email

Links to each social media account, plus the contact email address.

**Acceptance:** one link per configured account, each labelled and pointing at its absolute URL;
external links carry `target="_blank"` **and** `rel="noopener noreferrer"`; the email renders as a
`mailto:` link.

### HOME-9 — Gallery of recent completed work

A gallery of finished customer orders — the "optional" item in the original spec, **decided in
favour of building it**, as a fixed responsive grid rather than a carousel.

**Acceptance:** a labelled region with one figure per configured item; every image has non-empty
alt text and a caption; the images actually load, catching a broken `/public` path.

**Scope:** customer-facing photos only. No admin or cost data appears here.

## Presentation

### HOME-10 — Full-width responsive layout

The page fills the width of the screen rather than sitting in a centred fixed-width column, with
padding that grows at wider breakpoints. Individual blocks of text may still cap their own width
(see HOME-6).

**Acceptance:** the main content region spans the screen at desktop widths; horizontal padding
steps up with the breakpoint; the spacing under the header stays tight enough that it does not read
as an empty gap.

### HOME-11 — All copy lives in one typed content module

Every customer-facing string, social URL, and gallery entry comes from `content/site.ts`.
Components and tests both read from it; neither hardcodes copy.

**Acceptance:** the module is typed; the email parses as an email address; name, tagline, and blurb
are non-empty; social URLs are absolute `https:`; gallery sources are unique, local, and free of
query strings — Next 16 would otherwise require `images.localPatterns.search`.

**Status:** every value is currently a visibly-marked placeholder. Replacing them with the real
business name, blurb, address, accounts, and order photos must stay a one-file edit.

### HOME-12 — Page title and description

The browser title and description are the real business's, not the scaffold's, with a template so
sub-pages extend the title instead of replacing it.

**Acceptance:** the home page's title is the business name and tagline; its description is the
blurb.

### HOME-13 — Colours meet WCAG AA

Every text-on-background colour pairing used at body size clears **4.5:1**, in both the light and
dark colour schemes.

**Acceptance:** normal text, muted text, and accent text on both the page and panel backgrounds;
button text on the accent fill; normal and accent text on the soft accent used for hover and
current-section states.

**Note:** dark mode follows the operating system (`prefers-color-scheme`); there is no in-app theme
toggle, so both palettes have to stand on their own.

---

## Decision log

| Date | Decision |
|---|---|
| 2026-08-08 | Gallery built as a fixed responsive grid, not a carousel (HOME-9). |
| 2026-08-08 | Copy kept as placeholders in a typed content module (HOME-11). |
| 2026-08-08 | Hamburger at every screen width — later reversed. |
| 2026-08-08 | Reversed: sections listed across the top at ≥1024px, hamburger below (HOME-2, HOME-3). |
| 2026-08-08 | Page goes full width, but the blurb keeps a capped width (HOME-10, HOME-6). |

## Open items

- `requirements/navigation_requirements.md` contradicts HOME-2 and needs the same amendment.
- Whether the top of the page should become two columns, to fill the empty right side on wide
  screens — raised, not yet decided.
- Whether `Home` should stay in the across-the-top links, given the logo already links to `/`.
