# Portfolio Requirements

Source: section 7 ("Portfolio Page") of `initial_requirements.md`, expanded with the decisions made
while building the page. This file — not the root document — is authoritative for the portfolio.

Each requirement below has a permanent ID. Implementation and tests are tagged with it, so grepping
an ID finds everything that serves it. See "Linked intent development" in `README.md` for the
tagging convention.

---

## Scope of this pass

**A showcase, not a shop.** Portfolio items are past work. Nothing here is for sale, has a price, or
can be added to a cart — if a visitor wants something similar, the route is a commission. That is
the whole difference between this page and `/shop`, and it is why the two do not share components.

The catalogue is a typed module rather than a database table, per `docs/backend.md` §6: this is
read-only content that never changes per request, so the page prerenders. The `portfolio_items` and
`portfolio_images` tables exist in the schema for whenever admin management arrives; moving to them
is the same one-file swap the shop just demonstrated.

---

## Browsing

### PORT-1 — A gallery of past work

`/portfolio` shows every piece as a grid of images, each with its title and category.

**Acceptance:** one tile per item; every tile shows a title and an image with non-empty alt text;
the page has exactly one main heading.

### PORT-2 — Items are grouped by category

Work is organised by category so a visitor can find the kind of thing they came for. Clothes and
Plushies are the categories at launch.

**Acceptance:** every item belongs to exactly one category; each category with at least one item is
labelled on the page; a category with no items does not render an empty section.

**Note:** the original spec also lists Crochet (general), Engineering and Jewelry as planned but not
launch categories. They are valid values in the module and simply have no items yet, so adding one
later needs no code change.

### PORT-3 — A tile opens the piece

Clicking anywhere on a tile opens that piece's own page.

**Acceptance:** the whole tile is one link to `/portfolio/<slug>`, and following it lands on that
piece's page.

## The detail view

### PORT-4 — What a piece is made of

`/portfolio/<slug>` shows the piece's photograph, title, category, and a description, plus the yarn
type and colour it was made with.

**Acceptance:** the piece's title is the page's only main heading; yarn type and yarn colour both
render and are labelled; a slug not in the catalogue returns 404 rather than an empty page.

### PORT-5 — Credit where the pattern is not the maker's own

Where a piece follows another designer's pattern, that designer is credited on the detail page.
Where the design is the maker's own, no credit is shown and nothing implies one is missing.

**Acceptance:** an item with a credit renders the designer's name as visible text; an item without
one renders no credit element at all, rather than an empty label or "unknown".

### PORT-6 — A way onward

A visitor who likes a piece can get back to the gallery, and can reach the commission flow from the
detail page.

**Acceptance:** the detail page links back to `/portfolio` and to `/commission`.

## Presentation

### PORT-7 — The catalogue lives in one typed module

Every piece — title, category, description, yarn, images, credit — comes from
`src/content/portfolio.ts`. Components and tests read from it; neither hardcodes item data.

**Acceptance:** the module is typed; slugs are unique, lowercase-hyphenated, and free of collisions
with sibling routes; every item has non-empty copy, a local image path with no query string, and
non-empty alt text; every category is one of the known values.

**Status:** every value is a visibly-marked placeholder. Replacing them with real photography and
copy must stay a one-file edit.

---

## Decision log

| Date | Decision |
|---|---|
| 2026-08-08 | Typed content module, not the database — read-only content, so the page prerenders (`docs/backend.md` §6). |
| 2026-08-08 | Grouped by category on one page rather than a filter control; two launch categories do not justify the interaction. |
| 2026-08-08 | No prices and no cart. A portfolio piece routes to a commission, not a purchase (PORT-6). |
| 2026-08-08 | Planned categories are valid values with no items, so launching one is a data change. |

## Open items

- Real photography, titles, and yarn details — all placeholders today (PORT-7).
- Whether a piece should show when it was made. The schema has `created_at`; the module does not
  model a date, because a wrong date is worse than none.
- Whether multiple photographs per piece are needed. `portfolio_images` allows several; the module
  carries one, which is what the current layout shows.
- Engineering and Jewelry are listed as future categories but their detail pages would want
  different fields — yarn type means nothing for a jewelry piece. Revisit before launching either.
