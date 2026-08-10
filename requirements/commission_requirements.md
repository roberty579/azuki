# Commission Requirements

Source: section 4 ("Forms Page — Commission Request") of `initial_requirements.md`, expanded with the
decisions made while building the page. This file — not the root document — is authoritative for the
commission form.

Each requirement below has a permanent ID. Implementation and tests are tagged with it, so grepping
an ID finds everything that serves it. See "Linked intent development" in `README.md` for the
tagging convention.

---

## Scope of this pass

**The form, not the pipeline.** This pass builds the request form and everything it enforces. It
does not persist anything: submitting produces a summary and hands it off as a prefilled email,
exactly as SHOP-13 and BUNNY-10 do, because there is still no server.

That is a real gap, not a finished state. `docs/backend.md` §6 lists this page as one of the three
that genuinely force a backend, precisely because submissions have nowhere to go. Until then, a
request lands in an inbox and nobody is notified automatically.

**A commission has no price.** Everything after submission — the consultation, the quote, the
signing document, payment — happens off this page and mostly by hand. The form collects a payment
*preference*, not a payment, and shows no total anywhere.

---

## The request

### COMM-1 — Who is asking

The form collects a first name, last name, and an email address, and optionally a phone number.

**Acceptance:** first name, last name and email are required; phone is optional and submitting
without it succeeds; the email is checked for a plausible shape before submission.

**Note:** the original spec lists only first and last name. Email is required because the whole
flow depends on replying to the customer to arrange a consultation, and a request with no way to
answer it is not actionable.

### COMM-2 — What they want made

The customer describes the piece in their own words, and says whether it is a gift or for
themselves.

**Acceptance:** the description is required free text; gift or personal is a required choice with
neither pre-selected, so the answer is always deliberate.

### COMM-3 — Yarn preferences

The customer gives the yarn colour, the yarn type, and the yarn thickness.

**Acceptance:** all three are required; colour and type are free text; thickness is chosen from the
standard yarn weights.

**Note:** thickness is a fixed list because yarn weight has a standard vocabulary. Colour and fibre
do not, and constraining them would turn away requests the maker would happily take.

## Fulfilment and payment

### COMM-4 — Shipping or local drop-off

The form asks for either a shipping address or a local drop-off spot, never both.

**Acceptance:** choosing shipping shows the address fields and no drop-off list; choosing drop-off
shows the list and no address fields; whichever is shown is required, and the other is not.

**Note:** the address is collected as separate lines, city, state and postcode rather than one free
text box, unlike the shop's checkout. A commission is posted to someone months after they ask for
it, and a structured address is what actually gets it there.

### COMM-5 — Cash is local-only

Payment is Zelle, Venmo, or cash, matching the shop. Cash is offered **only** for local drop-off.

**Acceptance:** the cash option is absent when shipping is selected; selecting cash and then
switching to shipping clears the selection rather than submitting it silently.

**Note:** this restates SHOP-9 for this form, and shares its implementation
(`availablePaymentMethods` in `src/content/ordering.ts`). A rule that only exists as a requirement on
another page is one nobody checks here.

### COMM-6 — Terms must be accepted

A terms and conditions checkbox must be ticked before the form will submit, and what was agreed to
is recorded with the request.

**Acceptance:** submitting with the box unticked fails and marks the checkbox; the terms text is
visible on the page, not behind a link that could go stale.

> **Blocking before launch: the terms text is a placeholder.** The original spec flags the refund
> policy as unfinalised, with a draft of "non-refundable unless damaged by me [the maker]". This is
> a legal and liability statement, so nothing has been invented for it. The checkbox, its
> enforcement, and the recorded acceptance are all built and tested; only the wording is missing.
> **The page must not go live until real terms replace it.**

## Submitting

### COMM-7 — An incomplete form does not submit

Submitting with anything missing or malformed stops, and marks every field that needs attention
rather than only the first.

**Acceptance:** an empty submit marks each required field and produces no summary; each message
names what to do; the messages are announced to screen readers, not only shown.

### COMM-8 — A completed form produces a request

Submitting a valid form produces a summary of everything asked for, and hands it off.

**Acceptance:** the summary names every answer given, including whether the piece is a gift and
which fulfilment and payment were chosen; the hand-off carries the same answers.

**Status:** there is no server, so the request is a prefilled email to the shop's contact address.
Replacing that with a real endpoint must not change any rule above it.

### COMM-9 — What happens next is explained

The confirmation tells the customer what follows: a consultation, then a quote and timeline, then a
document to sign, then payment.

**Acceptance:** the confirmation states that no payment is due yet and that a price follows the
consultation.

**Note:** without this, someone who has just described a bespoke piece and been shown no price has
no idea whether they have bought something. The steps come from the original spec's
post-submission flow.

## Presentation

### COMM-10 — Copy and options live in one typed module

The yarn thickness options, the terms text, and the "what happens next" steps come from
`src/content/commission.ts`. Payment methods and drop-off spots come from `src/content/ordering.ts`,
shared with the shop. Components and tests read from these; neither hardcodes copy.

**Acceptance:** the modules are typed; thickness option ids are unique and lowercase-hyphenated;
every option and step has non-empty copy.

**Status:** the terms text is a visibly-marked placeholder — see COMM-6.

---

## Decision log

| Date | Decision |
|---|---|
| 2026-08-08 | Single page with grouped sections, not a multi-step wizard — consistent with checkout and Build a Bunny. |
| 2026-08-08 | No persistence this pass; hand off by email as SHOP-13 and BUNNY-10 do. |
| 2026-08-08 | Email required, phone optional, though the original spec lists neither (COMM-1). |
| 2026-08-08 | Structured address rather than the shop's single free-text field (COMM-4). |
| 2026-08-08 | Payment and drop-off options reused from `src/content/ordering.ts` rather than duplicated. |
| 2026-08-08 | Terms text left as a marked placeholder; wording is a legal decision (COMM-6). |

## Open items

- **The terms wording — blocking, see COMM-6.**
- **Where requests should go.** They arrive as email today. `docs/backend.md` §6 covers persisting
  them to the `commissions` table; that work also needs an idempotency key and the cash-is-local-only
  constraint, neither of which the table currently has, though `orders` has both.
- **Nobody is notified.** A request sits in an inbox until someone looks. Same is true of shop
  orders. Worth solving before launch, and it needs a server.
- **Linking the consultation.** The confirmation explains that a consultation follows but cannot
  link to it, because `/schedule` is still a stub.
- **The quote and signing document.** Whether pricing and timeline are generated from a template or
  written by hand, and whether signing is e-signature or an email reply, are both still undecided in
  the original spec. All of it is admin-side.
- Whether the maker wants a deposit before starting work, which would change COMM-9's "nothing is
  due yet".
