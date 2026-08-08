# Build a Bunny Requirements

Source: section 5 ("Build a Bunny") of `initial_requirements.md`, expanded with the decisions made
while building the page. This file — not the root document — is authoritative for the configurator.

Each requirement below has a permanent ID. Implementation and tests are tagged with it, so grepping
an ID finds everything that serves it. See "Linked intent development" in `README.md` for the
tagging convention.

---

## Scope of this pass

**A configurator, not a checkout.** Build a Bunny is a made-to-order piece: the customer describes
what they want and the maker confirms price and timeline before anything is made. So this page ends
in a *request*, not a purchase. It does not touch the shop cart, and it carries no stock.

The original section asks whether pricing is calculated live or whether the page routes into the
commission form. **Both** — the page prices live so the customer sees the cost of each choice as
they make it, and the finished configuration is then handed off the same way a commission is. The
two are not alternatives.

---

## Configuration

### BUNNY-1 — Choose a base bunny

The customer picks one of two starting points: a **naked** bunny or a **pre-outfitted** bunny whose
standard outfit is overalls. Naked costs less, and the difference is visible before choosing.

**Acceptance:** exactly one base is selected at all times; both options show their own price; the
page opens on a valid default rather than nothing selected.

### BUNNY-2 — Choose the bunny's colour

The customer picks the yarn colour of the bunny itself, from a fixed palette.

**Acceptance:** exactly one colour is selected at all times; each option is identified by name, not
by swatch alone, so the choice does not depend on colour vision.

### BUNNY-3 — Outfit colour appears only when there is an outfit

The outfit colour choice is offered for the pre-outfitted base and is absent for the naked one.

**Acceptance:** switching to naked removes the outfit colour control entirely; switching back
restores it with a valid selection; a naked bunny can never carry an outfit colour, even if the
form is manipulated.

### BUNNY-4 — Optional add-ons

Additional clothes and accessories can be added, each priced separately on top of the base. Any
number may be chosen, including none.

**Acceptance:** each add-on shows its own price; selecting and deselecting is reversible; none are
selected by default; add-ons are independent of one another.

## Pricing

### BUNNY-5 — A running total, updated as options change

The price total is visible while configuring and updates immediately on every change, so the
customer never has to submit to find out what something costs.

**Acceptance:** the total equals the base price plus every selected add-on; changing the base
changes the total; adding and then removing an add-on returns the total to its previous value.

### BUNNY-6 — The total is itemised

The total is shown broken down into the lines that make it up — the base, and one line per add-on —
rather than as a single number.

**Acceptance:** one line per contributing choice, each with its own price; the lines sum exactly to
the displayed total.

### BUNNY-7 — Money is handled in whole cents

Prices are integers in cents everywhere, converted to a currency string only for display, matching
SHOP-12.

**Acceptance:** no price is stored or computed as a fractional value; the total always equals the
sum of its lines exactly; formatting a non-integer is an error rather than a silent rounding.

**Note:** the maker confirms final pricing after the request. The number shown here is an estimate
from the listed options, and the page says so — it is not a quote.

## Presentation

### BUNNY-8 — Sample photo with designer credit

A sample photo shows what the finished piece looks like. Where the base pattern is another
designer's work, that designer is credited next to the photo.

**Acceptance:** the photo has non-empty alt text; when a credit exists it renders as visible text
naming the designer, not as a tooltip or an image caption baked into the picture.

### BUNNY-9 — The options live in one typed module

Every base, colour, add-on, price, and credit comes from `src/content/bunny.ts`. Components and
tests read from it; neither hardcodes an option or a price.

**Acceptance:** the module is typed; ids are unique within their group and lowercase-hyphenated;
every option has a non-empty label and a non-negative whole-cent price.

**Status:** every value is a visibly-marked placeholder, same contract as `src/content/shop.ts`.
Replacing them with real options must stay a one-file edit.

## Request

### BUNNY-10 — A completed configuration produces a request

Submitting a configuration produces a summary of the chosen bunny — base, colours, add-ons, and the
estimated total — along with what happens next, and the customer keeps their configuration on screen
rather than losing it.

**Acceptance:** the summary names every choice made; it states that the maker confirms final pricing
and timeline before work begins; submitting does not clear the configuration.

**Status:** there is no server, so the request is handed off as a prefilled email to the shop's
contact address, mirroring SHOP-13. When the commission form exists this becomes its entry point;
replacing the hand-off must not change any rule above it.

### BUNNY-11 — The request carries choices, not prices

What leaves the page identifies the chosen options by id. It does not carry prices, line totals, or
the estimated total as authoritative values.

**Acceptance:** the request payload contains option ids and no price fields; the estimate is
re-derivable from those ids and the catalogue alone.

**Why:** `docs/backend.md` §3 sets the rule that the server re-derives an order rather than
validating what the client sent. Building the payload that way now means the eventual Server Action
needs no reshaping — and it is why the on-screen total is labelled an estimate.

---

## Decision log

| Date | Decision |
|---|---|
| 2026-08-08 | Live pricing **and** a commission-style hand-off, not one or the other (BUNNY-5, BUNNY-10). |
| 2026-08-08 | Configurator is separate from the shop cart — made to order, no stock (scope). |
| 2026-08-08 | Options as a typed content module, mirroring SHOP-11 (BUNNY-9). |
| 2026-08-08 | The displayed total is an estimate, not a quote; the maker confirms (BUNNY-7). |
| 2026-08-08 | Payload carries option ids only, per `docs/backend.md` §3 (BUNNY-11). |

## Open items

- Real photography, colour names, and prices — all placeholders today (BUNNY-9).
- Whether the customer can request a colour that is not in the palette, or whether that is what the
  full commission flow is for.
- Whether add-ons should be limited in number, or conflict with one another (two hats).
- Where the request goes once a backend exists — the commission pipeline in
  `requirements/commission_requirements.md`, per `docs/backend.md` §6.
- Whether a configured bunny should show a preview image that reflects the chosen colours, rather
  than one fixed sample photo. Out of scope here; it needs artwork per combination.
