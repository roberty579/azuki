# Shop Requirements

Source: section 6 ("Shop — Admin-Managed, Customer-Facing Purchase Flow") of
`initial_requirements.md`, expanded with the decisions made while building the page. This file —
not the root document — is authoritative for the shop.

Each requirement below has a permanent ID. Implementation and tests are tagged with it, so grepping
an ID finds everything that serves it. See "Linked intent development" in `README.md` for the
tagging convention.

## Scope of this pass

**Customer-facing only.** The admin side of the original section — adding items with photos, price,
and stock — needs authentication and a data store, and it overlaps
`requirements/admin_requirements.md`, which has its own unresolved Google Sheets question. It is
deliberately not built here, and carries no `SHOP-*` IDs. Until it exists, the catalogue is edited
in `src/content/shop.ts`.

---

## Browsing

### SHOP-1 — Gallery-style browsing grid

`/shop` lists everything for sale as a grid of image tiles, each showing the item's name, one-line
summary, and price. Items with no stock still appear, marked sold out.

**Acceptance:** one tile per catalogue item; every tile shows a name, a price, and an image with
non-empty alt text; a zero-stock item is visibly marked.

### SHOP-2 — A tile opens the item

Clicking anywhere on a tile opens that item's own page.

**Acceptance:** the whole tile is one link to `/shop/<slug>`, and following it lands on that item's
page.

### SHOP-3 — Item detail page

`/shop/<slug>` shows the item's full description, price, image, and a short list of details such as
size and material, plus a way back to the grid.

**Acceptance:** the item's name is the page's only main heading; description, price, and details all
render; a slug not in the catalogue returns 404 rather than an empty page.

## Cart

### SHOP-4 — Add to cart

An item's page lets the buyer choose a quantity and add it to the cart, with visible confirmation.

**Acceptance:** adding puts the item in the cart at the chosen quantity; adding the same item again
increases its quantity rather than duplicating the line; the confirmation is announced to screen
readers, not just shown.

### SHOP-5 — Review and change the cart

`/shop/cart` lists what is in the cart with per-item quantity controls, a remove control, line
totals, and a subtotal. An empty cart says so and offers a way back to the shop.

**Acceptance:** one row per item; changing a quantity updates that line's total and the subtotal;
setting a quantity below one removes the row; removing the last item shows the empty state.

### SHOP-6 — The cart survives navigation and reloads

The cart persists across page navigation, a full reload, and a closed tab.

**Acceptance:** items added on one page are still there after navigating elsewhere and after
reloading. Corrupt or stale stored data — an item since removed from the catalogue, a quantity above
stock — is discarded or clamped rather than shown.

**Note:** only the item slug and quantity are stored. Names, prices, and stock are always re-read
from the catalogue, so a cart from last week can never display last week's price.

### SHOP-7 — The cart is reachable from anywhere in the shop

Every shop page shows a link to the cart with the number of items in it.

**Acceptance:** the link is present on the grid, on an item page, and on the cart page; the count
reflects total units and is absent when the cart is empty.

**Note:** this lives in the shop's own bar, not the site header — HOME-2 requires the header to hold
exactly the sections in `src/content/navigation.ts`.

### SHOP-10 — Stock limits are enforced

A sold-out item cannot be added. No item can be added, or set, to more units than there is stock.

**Acceptance:** a zero-stock item offers no add control and says so; quantity controls cap at the
item's stock; a stored cart exceeding stock is clamped when read.

## Checkout

### SHOP-8 — Shipping or local pick-up

Checkout asks for either a shipping address or a local drop-off spot, never both.

**Acceptance:** choosing shipping shows an address field and no drop-off list; choosing pick-up shows
the drop-off list and no address field; whichever is shown is required.

### SHOP-9 — Cash is local-only

Payment is Zelle, Venmo, or cash, matching the commission flow. Cash is offered **only** for local
pick-up.

**Acceptance:** the cash option is absent when shipping is selected; selecting cash and then
switching to shipping clears the selection rather than submitting it silently; an order for shipping
can never carry cash even if the form is manipulated.

> **Deferred: does the shop need a real payment processor?** The original section flags this. Decided
> for now: **no** — reuse the manual Zelle/Venmo/cash flow from commissions. Adding Stripe or Square
> later should replace SHOP-13's hand-off without touching SHOP-1 to SHOP-10.

### SHOP-13 — A completed request produces an order summary

Submitting a valid checkout produces a summary of the order — items, quantities, subtotal,
fulfilment choice, and payment method — along with what to do next for the chosen payment method,
and empties the cart.

**Acceptance:** an incomplete form does not submit and marks each missing field; a valid one shows
the summary and payment instructions and leaves the cart empty.

**Status:** the order is written to Postgres by a Server Action, and the summary shows the totals
that action computed. Every figure is the server's: the browser sends slugs and quantities only, so
an order cannot claim a price it was not charged. Payment is still arranged manually afterwards —
SHOP-9's deferral is unchanged.

**Note:** the form's validation is UX, not enforcement. A Server Action is a public POST endpoint
reachable without the form, so every rule above is re-applied server-side. Both copies must exist,
and the server's is the one that counts.

## Presentation

### SHOP-11 — The catalogue has one editable source

Every product — name, copy, price, image, stock, details — is defined in one place a human edits,
`src/content/shop.ts`, and loaded into the database by `npm run db:seed`. Pages read the database;
no component or test hardcodes product data.

**Acceptance:** the source module is typed; slugs are unique, lowercase-hyphenated, and free of
collisions with sibling routes such as `/shop/cart`; every item has non-empty copy, a local image
path with no query string, non-empty alt text, and a non-negative whole-cent price. The same rules
hold for rows that did not come from the seed.

**Status:** every value is a visibly-marked placeholder. Replacing them with real products stays a
one-file edit followed by a re-seed.

**Note:** this module used to be what the pages read. It is now the seed source, which is why
`__tests__/shop-content.test.ts` still earns its place — it guards the input, where a malformed
price or a colliding slug is actually introduced. The rules that must also survive a write from psql
or a future admin screen are database constraints instead: a unique slug, non-negative stock, and
image paths restricted to local `/…` with no query string.

### SHOP-12 — Money is handled in whole cents

Prices are integers in cents everywhere, converted to a currency string only for display.

**Acceptance:** no price is stored or computed as a fractional value; a subtotal always equals the
sum of its line totals exactly; formatting a non-integer is an error rather than a silent rounding.

---

## Decision log

| Date | Decision |
|---|---|
| 2026-08-08 | Manual payment (Zelle/Venmo/cash) rather than a processor for now (SHOP-9, SHOP-13). |
| 2026-08-08 | Catalogue as a typed content module, mirroring HOME-11 (SHOP-11). |
| 2026-08-08 | Admin item management out of scope for this pass. |
| 2026-08-08 | Cart lives in browser storage, keyed by slug only (SHOP-6). |
| 2026-08-08 | Cart link in the shop's own bar, not the site header, to preserve HOME-2 (SHOP-7). |
| 2026-08-08 | Orders go to Postgres via a Server Action; the email hand-off is retired (SHOP-13). |
| 2026-08-08 | Stock decrements when the order is placed, not when payment clears (SHOP-10). |
| 2026-08-08 | The catalogue module becomes the seed source; pages read the database (SHOP-11). |
| 2026-08-08 | Shop routes render dynamically — prerendered stock would advertise sold-out items. |

## Open items

- Whether the shop needs a real payment processor — deferred, see SHOP-9.
- **Releasing stock on cancellation.** Stock is held from the moment an order is placed, so an
  abandoned request holds inventory until someone intervenes — and nothing yet restores it when an
  order is cancelled. This is the cost of the decision above, and it needs the admin page.
- **The shipping address is one free-text field.** The database has a single `shipping_address`
  column because the form collects a single textarea. Splitting both into line 1 / line 2 / city /
  state / zip is a UI change with its own tests; `commissions` is already structured, so the two
  disagree until then.
- Shipping cost and tax are not modelled; the subtotal is currently the total. Both are separate
  columns already, so adding them does not mean discovering that "subtotal" meant "total".
- Admin item management still has no home. Until it exists, changing the catalogue means editing
  `src/content/shop.ts` and re-seeding.
